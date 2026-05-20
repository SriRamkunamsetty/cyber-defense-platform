import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createInvestigation,
  getInvestigationById,
  getUserInvestigations,
  getInvestigationIOCs,
  getInvestigationAgentLogs,
  getInvestigationChatHistory,
  createChatMessage,
  getInvestigationEvidenceLineage,
  parseInvestigationEvidence,
} from "../db";
import { getInvestigationEvents } from "../_core/eventStore";
import { writeAuditLog } from "../_core/audit";
import { storagePut, storageGetBuffer, storageGetPresignedUploadUrl } from "../storage";
import { runInvestigationAsync } from "../analysis/investigationService";
import { askSocCopilot } from "../analysis/aiEngine";

export const investigationRouter = router({
  getPresignedUploadUrl: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileSize: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.fileName.toLowerCase().endsWith(".apk")) {
        throw new Error("Only APK files are supported");
      }
      if (input.fileSize > 150 * 1024 * 1024) {
        throw new Error("APK file exceeds 150MB limit");
      }
      const fileKey = `apk-files/${ctx.user.id}/${Date.now()}-${input.fileName}`;
      const { uploadUrl, key } = await storageGetPresignedUploadUrl(
        fileKey,
        "application/vnd.android.package-archive"
      );
      return { uploadUrl, fileKey: key };
    }),

  createFromUpload: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileData: z.union([z.instanceof(Buffer), z.instanceof(Uint8Array)]).optional(),
        fileKey: z.string().optional(),
        fileSize: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let fileBuffer: Buffer;
      let fileKey = input.fileKey;

      if (fileKey) {
        fileBuffer = await storageGetBuffer(fileKey);
      } else if (input.fileData) {
        fileBuffer = Buffer.isBuffer(input.fileData)
          ? input.fileData
          : Buffer.from(input.fileData);
        fileKey = `apk-files/${ctx.user.id}/${Date.now()}-${input.fileName}`;
        await storagePut(
          fileKey,
          fileBuffer,
          "application/vnd.android.package-archive"
        );
      } else {
        throw new Error("Missing fileData or fileKey");
      }

      // Verify ZIP magic bytes (PK header: 0x50, 0x4B, 0x03, 0x04)
      if (
        fileBuffer.length < 4 ||
        fileBuffer[0] !== 0x50 ||
        fileBuffer[1] !== 0x4b ||
        fileBuffer[2] !== 0x03 ||
        fileBuffer[3] !== 0x04
      ) {
        throw new Error("Invalid APK file: not a valid ZIP/APK archive");
      }

      if (!input.fileName.toLowerCase().endsWith(".apk")) {
        throw new Error("Only APK files are supported");
      }
      if (input.fileSize > 150 * 1024 * 1024) {
        throw new Error("APK file exceeds 150MB limit");
      }

      const investigationId = await createInvestigation(
        ctx.user.id,
        input.fileName,
        fileKey!,
        input.fileSize
      );

      if (!investigationId) {
        throw new Error("Failed to create investigation record");
      }

      await writeAuditLog({
        userId: ctx.user.id,
        action: "investigation.upload",
        resourceType: "investigation",
        resourceId: String(investigationId),
        metadata: { fileName: input.fileName, fileSize: input.fileSize },
      });

      const job = await runInvestigationAsync({
        investigationId,
        apkFileName: input.fileName,
        apkFileKey: fileKey!,
        userId: ctx.user.id,
      });

      await writeAuditLog({
        userId: ctx.user.id,
        action: "investigation.start",
        resourceType: "investigation",
        resourceId: String(investigationId),
        metadata: { queueMode: job.mode },
      });

      return {
        success: true,
        investigationId,
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const investigation = await getInvestigationById(input.id);
      if (!investigation) throw new Error("Investigation not found");
      if (investigation.userId !== ctx.user.id) throw new Error("Unauthorized");
      return investigation;
    }),

  listUserInvestigations: protectedProcedure.query(async ({ ctx }) => {
    return await getUserInvestigations(ctx.user.id);
  }),

  getWithDetails: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const investigation = await getInvestigationById(input.id);
      if (!investigation || investigation.userId !== ctx.user.id) {
        throw new Error("Investigation not found or unauthorized");
      }

      const iocs = await getInvestigationIOCs(input.id);
      const agentLogs = await getInvestigationAgentLogs(input.id);
      const { evidence, attackChain, consensus } =
        parseInvestigationEvidence(investigation);

      let mitigations: string[] = [];
      try {
        if (investigation.mitigationRecommendations) {
          mitigations = JSON.parse(investigation.mitigationRecommendations);
        }
      } catch {
        mitigations = [];
      }

      await writeAuditLog({
        userId: ctx.user.id,
        action: "investigation.view",
        resourceType: "investigation",
        resourceId: String(input.id),
      });

      return {
        investigation,
        iocs,
        agentLogs,
        evidence,
        attackChain,
        consensus,
        mitigations,
        riskBreakdown: {
          dataExfiltration: investigation.dataExfiltrationScore ?? 0,
          credentialHarvesting: investigation.credentialHarvestingScore ?? 0,
          c2Communication: investigation.c2CommunicationScore ?? 0,
          bankingTrojan: investigation.bankingTrojanScore ?? 0,
        },
      };
    }),

  getEventHistory: protectedProcedure
    .input(z.object({ investigationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const investigation = await getInvestigationById(input.investigationId);
      if (!investigation || investigation.userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }
      const events = await getInvestigationEvents(input.investigationId);
      return events.map((e) => {
        let payload: unknown = null;
        if (e.payload) {
          try {
            payload = JSON.parse(e.payload);
          } catch {
            payload = e.payload;
          }
        }
        return {
          id: e.id,
          sequence: e.id,
          eventType: e.eventType,
          payload,
          createdAt: e.createdAt,
        };
      });
    }),

  getEvidenceLineage: protectedProcedure
    .input(z.object({ investigationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const investigation = await getInvestigationById(input.investigationId);
      if (!investigation || investigation.userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      return getInvestigationEvidenceLineage(input.investigationId);
    }),

  getChatHistory: protectedProcedure
    .input(z.object({ investigationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const investigation = await getInvestigationById(input.investigationId);
      if (!investigation || investigation.userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }
      return await getInvestigationChatHistory(input.investigationId);
    }),

  addChatMessage: protectedProcedure
    .input(
      z.object({
        investigationId: z.number(),
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const investigation = await getInvestigationById(input.investigationId);
      if (!investigation || investigation.userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }
      await createChatMessage(
        input.investigationId,
        ctx.user.id,
        input.role,
        input.content
      );
      return { success: true };
    }),

  askCopilot: protectedProcedure
    .input(
      z.object({
        investigationId: z.number(),
        query: z.string().min(1).max(4000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const investigation = await getInvestigationById(input.investigationId);
      if (!investigation || investigation.userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      const { evidence } = parseInvestigationEvidence(investigation);
      const history = await getInvestigationChatHistory(input.investigationId);

      await createChatMessage(
        input.investigationId,
        ctx.user.id,
        "user",
        input.query
      );

      await writeAuditLog({
        userId: ctx.user.id,
        action: "copilot.query",
        resourceType: "investigation",
        resourceId: String(input.investigationId),
        metadata: { queryLength: input.query.length },
      });

      const response = await askSocCopilot(
        input.investigationId,
        evidence,
        investigation.aiReasoning || investigation.threatSummary || "",
        input.query,
        history.map((m) => ({ role: m.role, content: m.content }))
      );

      await createChatMessage(
        input.investigationId,
        ctx.user.id,
        "assistant",
        response
      );

      return { response };
    }),
});
