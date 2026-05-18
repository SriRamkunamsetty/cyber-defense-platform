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
  parseInvestigationEvidence,
} from "../db";
import { storagePut } from "../storage";
import { runInvestigationAsync } from "../analysis/investigationService";
import { askSocCopilot } from "../analysis/aiEngine";

export const investigationRouter = router({
  createFromUpload: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileData: z.union([
          z.instanceof(Buffer),
          z.instanceof(Uint8Array),
        ]),
        fileSize: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.fileName.toLowerCase().endsWith(".apk")) {
        throw new Error("Only APK files are supported");
      }
      if (input.fileSize > 50 * 1024 * 1024) {
        throw new Error("APK file exceeds 50MB limit");
      }

      const fileBuffer = Buffer.isBuffer(input.fileData)
        ? input.fileData
        : Buffer.from(input.fileData);

      const fileKey = `apk-files/${ctx.user.id}/${Date.now()}-${input.fileName}`;
      const { url } = await storagePut(
        fileKey,
        fileBuffer,
        "application/vnd.android.package-archive"
      );

      const investigationId = await createInvestigation(
        ctx.user.id,
        input.fileName,
        fileKey,
        input.fileSize
      );

      if (!investigationId) {
        throw new Error("Failed to create investigation record");
      }

      runInvestigationAsync({
        investigationId,
        apkFileName: input.fileName,
        apkFileKey: fileKey,
        userId: ctx.user.id,
      });

      return {
        success: true,
        investigationId,
        fileUrl: url,
        fileKey,
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
      const { evidence, attackChain } = parseInvestigationEvidence(investigation);

      let mitigations: string[] = [];
      try {
        if (investigation.mitigationRecommendations) {
          mitigations = JSON.parse(investigation.mitigationRecommendations);
        }
      } catch {
        mitigations = [];
      }

      return {
        investigation,
        iocs,
        agentLogs,
        evidence,
        attackChain,
        mitigations,
      };
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
