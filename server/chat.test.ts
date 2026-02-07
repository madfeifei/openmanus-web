import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as chatDb from "./chatDb";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("chat.createSession", () => {
  it("creates a new chat session and returns session ID", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.createSession({ title: "Test Chat" });

    expect(result).toHaveProperty("sessionId");
    expect(typeof result.sessionId).toBe("number");
    expect(result.sessionId).toBeGreaterThan(0);
  });
});

describe("chat.getSessions", () => {
  it("returns all sessions for the current user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a session first
    await caller.chat.createSession({ title: "Test Chat 1" });
    await caller.chat.createSession({ title: "Test Chat 2" });

    const sessions = await caller.chat.getSessions();

    expect(Array.isArray(sessions)).toBe(true);
    expect(sessions.length).toBeGreaterThanOrEqual(2);
    expect(sessions[0]).toHaveProperty("id");
    expect(sessions[0]).toHaveProperty("title");
    expect(sessions[0]).toHaveProperty("userId");
  });
});

describe("chat.addMessage", () => {
  it("adds a message to a session", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a session
    const { sessionId } = await caller.chat.createSession({ title: "Test Chat" });

    // Add a message
    const result = await caller.chat.addMessage({
      sessionId,
      role: "user",
      content: "Hello, world!",
    });

    expect(result).toHaveProperty("messageId");
    expect(typeof result.messageId).toBe("number");
  });

  it("prevents adding messages to another user's session", async () => {
    const { ctx: ctx1 } = createAuthContext(1);
    const { ctx: ctx2 } = createAuthContext(2);
    const caller1 = appRouter.createCaller(ctx1);
    const caller2 = appRouter.createCaller(ctx2);

    // User 1 creates a session
    const { sessionId } = await caller1.chat.createSession({ title: "User 1 Chat" });

    // User 2 tries to add a message to User 1's session
    await expect(
      caller2.chat.addMessage({
        sessionId,
        role: "user",
        content: "Unauthorized message",
      })
    ).rejects.toThrow("Session not found or access denied");
  });
});

describe("chat.getMessages", () => {
  it("returns all messages for a session", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a session
    const { sessionId } = await caller.chat.createSession({ title: "Test Chat" });

    // Add messages
    await caller.chat.addMessage({
      sessionId,
      role: "user",
      content: "Message 1",
    });
    await caller.chat.addMessage({
      sessionId,
      role: "assistant",
      content: "Message 2",
    });

    // Get messages
    const messages = await caller.chat.getMessages({ sessionId });

    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThanOrEqual(2);
    
    // Find our test messages
    const msg1 = messages.find(m => m.content === "Message 1");
    const msg2 = messages.find(m => m.content === "Message 2");
    
    expect(msg1).toBeDefined();
    expect(msg2).toBeDefined();
    expect(msg1?.role).toBe("user");
    expect(msg2?.role).toBe("assistant");
  });
});

describe("chat.deleteSession", () => {
  it("deletes a session and all its messages", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a session and add messages
    const { sessionId } = await caller.chat.createSession({ title: "Test Chat" });
    await caller.chat.addMessage({
      sessionId,
      role: "user",
      content: "Test message",
    });

    // Delete the session
    const result = await caller.chat.deleteSession({ sessionId });
    expect(result.success).toBe(true);

    // Verify session is deleted
    await expect(caller.chat.getMessages({ sessionId })).rejects.toThrow(
      "Session not found or access denied"
    );
  });
});
