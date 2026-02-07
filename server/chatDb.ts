import { eq, desc, and } from "drizzle-orm";
import { chatSessions, chatMessages, InsertChatSession, InsertChatMessage } from "../drizzle/schema";
import { getDb } from "./db";

/**
 * Create a new chat session
 */
export async function createChatSession(userId: number, title: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const newSession: InsertChatSession = {
    userId,
    title,
  };

  await db.insert(chatSessions).values(newSession);
  
  // Get the newly created session
  const sessions = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.userId, userId))
    .orderBy(desc(chatSessions.createdAt))
    .limit(1);
  
  return sessions[0]!.id;
}

/**
 * Get all chat sessions for a user
 */
export async function getUserChatSessions(userId: number) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.userId, userId))
    .orderBy(desc(chatSessions.updatedAt));
}

/**
 * Get a specific chat session
 */
export async function getChatSession(sessionId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    return null;
  }

  const results = await db
    .select()
    .from(chatSessions)
    .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)))
    .limit(1);

  return results[0] || null;
}

/**
 * Update chat session title and timestamp
 */
export async function updateChatSession(sessionId: number, userId: number, title: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(chatSessions)
    .set({ title, updatedAt: new Date() })
    .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)));
}

/**
 * Delete a chat session and all its messages
 */
export async function deleteChatSession(sessionId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Delete all messages first
  await db.delete(chatMessages).where(eq(chatMessages.sessionId, sessionId));

  // Then delete the session
  await db
    .delete(chatSessions)
    .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)));
}

/**
 * Add a message to a chat session
 */
export async function addChatMessage(
  sessionId: number,
  role: "user" | "assistant" | "system",
  content: string
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const newMessage: InsertChatMessage = {
    sessionId,
    role,
    content,
  };

  await db.insert(chatMessages).values(newMessage);

  // Update session's updatedAt timestamp
  await db
    .update(chatSessions)
    .set({ updatedAt: new Date() })
    .where(eq(chatSessions.id, sessionId));

  // Get the newly created message
  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(1);
  
  return messages[0]!.id;
}

/**
 * Get all messages for a chat session
 */
export async function getChatMessages(sessionId: number) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(chatMessages.createdAt);
}
