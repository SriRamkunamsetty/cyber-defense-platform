import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  createInvestigation,
  getInvestigationById,
  getUserInvestigations,
  updateInvestigationStatus,
  getInvestigationIOCs,
  getInvestigationAgentLogs,
  getInvestigationChatHistory,
  createChatMessage,
} from "../db";
import { storagePut } from "../storage";
import { runInvestigationAsync } from "../analysis/investigationService";

export const investigationRouter = router({
  // Create a new investigation from APK upload
  createFromUpload: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileData: z.instanceof(Buffer),
        fileSize: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Store file in S3
        const fileKey = `apk-files/${ctx.user.id}/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, input.fileData, "application/vnd.android.package-archive");

        // Create investigation record
        await createInvestigation(
          ctx.user.id,
          input.fileName,
          fileKey,
          input.fileSize
        );

        // Get the investigation we just created
        const investigations = await getUserInvestigations(ctx.user.id);
        const newInvestigation = investigations[investigations.length - 1];

        // Start analysis pipeline asynchronously
        if (newInvestigation?.id) {
          runInvestigationAsync({
            investigationId: newInvestigation.id,
            apkFileName: input.fileName,
            apkFileKey: fileKey,
            userId: ctx.user.id,
          }).catch((error) => {
            console.error("Failed to start investigation:", error);
          });
        }

        return {
          success: true,
          investigationId: newInvestigation?.id || 0,
          fileUrl: url,
          fileKey,
        };
      } catch (error) {
        console.error("Failed to create investigation:", error);
        throw new Error("Failed to upload and create investigation");
      }
    }),

  // Get investigation by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const investigation = await getInvestigationById(input.id);

      if (!investigation) {
        throw new Error("Investigation not found");
      }

      // Verify ownership
      if (investigation.userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      return investigation;
    }),

  // Get user's investigations
  listUserInvestigations: protectedProcedure.query(async ({ ctx }) => {
    return await getUserInvestigations(ctx.user.id);
  }),

  // Get investigation with all details
  getWithDetails: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const investigation = await getInvestigationById(input.id);

      if (!investigation || investigation.userId !== ctx.user.id) {
        throw new Error("Investigation not found or unauthorized");
      }

      const iocs = await getInvestigationIOCs(input.id);
      const agentLogs = await getInvestigationAgentLogs(input.id);

      return {
        investigation,
        iocs,
        agentLogs,
      };
    }),

  // Get chat history for investigation
  getChatHistory: protectedProcedure
    .input(z.object({ investigationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const investigation = await getInvestigationById(input.investigationId);

      if (!investigation || investigation.userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      return await getInvestigationChatHistory(input.investigationId);
    }),

  // Add chat message
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

  // Update investigation status (for backend use)
  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "analyzing", "completed", "failed"]),
        riskScore: z.number().optional(),
        threatSummary: z.string().optional(),
        aiReasoning: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await updateInvestigationStatus(
        input.id,
        input.status,
        input.riskScore,
        input.threatSummary,
        input.aiReasoning
      );

      return { success: true };
    }),
});
