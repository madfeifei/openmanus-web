/**
 * Chat Context
 * Manages chat sessions, messages, and WebSocket connection with database persistence
 */

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { api, WebSocketMessage } from '@/lib/api';
import { trpc } from '@/lib/trpc';

export interface Message {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
}

export interface ChatSession {
  id: number;
  title: string;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ChatContextType {
  sessions: ChatSession[];
  currentSessionId: number | null;
  currentMessages: Message[];
  isConnected: boolean;
  isProcessing: boolean;
  isLoadingSessions: boolean;
  isLoadingMessages: boolean;
  createSession: () => Promise<void>;
  selectSession: (sessionId: number) => void;
  deleteSession: (sessionId: number) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const maxReconnectAttempts = 5;
  
  // tRPC queries
  const utils = trpc.useUtils();
  const { data: sessions = [], isLoading: isLoadingSessions } = trpc.chat.getSessions.useQuery();
  const { data: currentMessages = [], isLoading: isLoadingMessages } = trpc.chat.getMessages.useQuery(
    { sessionId: currentSessionId! },
    { enabled: currentSessionId !== null }
  );
  
  // tRPC mutations
  const createSessionMutation = trpc.chat.createSession.useMutation({
    onSuccess: () => {
      utils.chat.getSessions.invalidate();
    },
  });
  
  const deleteSessionMutation = trpc.chat.deleteSession.useMutation({
    onSuccess: () => {
      utils.chat.getSessions.invalidate();
    },
  });
  
  const addMessageMutation = trpc.chat.addMessage.useMutation({
    onSuccess: () => {
      if (currentSessionId) {
        utils.chat.getMessages.invalidate({ sessionId: currentSessionId });
        utils.chat.getSessions.invalidate();
      }
    },
  });
  
  // Initialize WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }
    
    // Check if we've exceeded max reconnect attempts
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.warn('Max reconnection attempts reached. Backend may be unavailable.');
      setIsConnected(false);
      return;
    }
    
    try {
      const ws = api.createWebSocket(
        (message: WebSocketMessage) => {
          handleWebSocketMessage(message);
        },
        (error) => {
          // Silently handle WebSocket errors - user will see connection status in UI
          setIsConnected(false);
        },
        (event) => {
          setIsConnected(false);
          
          // Only attempt to reconnect if we haven't exceeded max attempts
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
            
            const delay = Math.min(3000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
            reconnectTimeoutRef.current = window.setTimeout(() => {
              reconnectAttemptsRef.current += 1;
              console.info(`Reconnection attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}...`);
              connectWebSocket();
            }, delay);
          }
        },
        () => {
          // onOpen callback
          console.log('WebSocket connected successfully');
          setIsConnected(true);
          reconnectAttemptsRef.current = 0; // Reset counter on successful connection
        }
      );
      
      wsRef.current = ws;
    } catch (error) {
      console.info('Backend connection failed. This is expected if backend is not deployed yet.');
      setIsConnected(false);
    }
  }, []);
  
  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    if (!currentSessionId) return;
    
    switch (message.type) {
      case 'task_started':
        setIsProcessing(true);
        break;
        
      case 'status':
      case 'log':
        // Add system/assistant message chunk
        if (message.message && currentSessionId) {
          addMessageMutation.mutate({
            sessionId: currentSessionId,
            role: 'system',
            content: message.message,
          });
        }
        break;
        
      case 'task_completed':
        setIsProcessing(false);
        if (message.result && currentSessionId) {
          addMessageMutation.mutate({
            sessionId: currentSessionId,
            role: 'assistant',
            content: message.result,
          });
        }
        break;
        
      case 'task_failed':
      case 'error':
        setIsProcessing(false);
        if (currentSessionId) {
          addMessageMutation.mutate({
            sessionId: currentSessionId,
            role: 'system',
            content: `Error: ${message.error || message.message || 'Unknown error'}`,
          });
        }
        break;
    }
  }, [currentSessionId, addMessageMutation]);
  
  // Connect WebSocket on mount
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);
  
  // Create a new session
  const createSession = useCallback(async () => {
    const result = await createSessionMutation.mutateAsync({
      title: 'New Chat',
    });
    setCurrentSessionId(result.sessionId);
  }, [createSessionMutation]);
  
  // Select a session
  const selectSession = useCallback((sessionId: number) => {
    setCurrentSessionId(sessionId);
  }, []);
  
  // Delete a session
  const deleteSession = useCallback(async (sessionId: number) => {
    await deleteSessionMutation.mutateAsync({ sessionId });
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
    }
  }, [deleteSessionMutation, currentSessionId]);
  
  // Send a message
  const sendMessage = useCallback(async (content: string) => {
    if (!currentSessionId || !isConnected) return;
    
    // Save user message to database
    await addMessageMutation.mutateAsync({
      sessionId: currentSessionId,
      role: 'user',
      content,
    });
    
    // Send to backend via WebSocket
    if (wsRef.current) {
      try {
        api.sendTask(wsRef.current, {
          prompt: content,
          task_id: `task-${Date.now()}`,
        });
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }
  }, [currentSessionId, isConnected, addMessageMutation]);
  
  const value: ChatContextType = {
    sessions,
    currentSessionId,
    currentMessages,
    isConnected,
    isProcessing,
    isLoadingSessions,
    isLoadingMessages,
    createSession,
    selectSession,
    deleteSession,
    sendMessage,
  };
  
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
