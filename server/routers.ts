import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as chatDb from "./chatDb";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  chat: router({
    // Get all sessions for the current user
    getSessions: protectedProcedure.query(async ({ ctx }) => {
      return chatDb.getUserChatSessions(ctx.user.id);
    }),

    // Create a new chat session
    createSession: protectedProcedure
      .input(z.object({ title: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const sessionId = await chatDb.createChatSession(ctx.user.id, input.title);
        return { sessionId };
      }),

    // Get messages for a specific session
    getMessages: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verify user owns this session
        const session = await chatDb.getChatSession(input.sessionId, ctx.user.id);
        if (!session) {
          throw new Error("Session not found or access denied");
        }
        return chatDb.getChatMessages(input.sessionId);
      }),

    // Add a message to a session
    addMessage: protectedProcedure
      .input(
        z.object({
          sessionId: z.number(),
          role: z.enum(["user", "assistant", "system"]),
          content: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verify user owns this session
        const session = await chatDb.getChatSession(input.sessionId, ctx.user.id);
        if (!session) {
          throw new Error("Session not found or access denied");
        }
        const messageId = await chatDb.addChatMessage(
          input.sessionId,
          input.role,
          input.content
        );
        return { messageId };
      }),

    // Update session title
    updateSession: protectedProcedure
      .input(z.object({ sessionId: z.number(), title: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await chatDb.updateChatSession(input.sessionId, ctx.user.id, input.title);
        return { success: true };
      }),

    // Delete a session
    deleteSession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await chatDb.deleteChatSession(input.sessionId, ctx.user.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
