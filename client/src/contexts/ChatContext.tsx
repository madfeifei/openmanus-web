/**
 * Chat Context
 * Manages chat sessions, messages, and WebSocket connection
 */

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { api, WebSocketMessage } from '@/lib/api';
import { nanoid } from 'nanoid';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

interface ChatContextType {
  sessions: ChatSession[];
  currentSessionId: string | null;
  currentSession: ChatSession | null;
  isConnected: boolean;
  isProcessing: boolean;
  createSession: () => void;
  selectSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  sendMessage: (content: string) => void;
  clearCurrentSession: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const maxReconnectAttempts = 5;
  
  // Get current session
  const currentSession = sessions.find(s => s.id === currentSessionId) || null;
  
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
        }
      );
      
      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0; // Reset counter on successful connection
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.info('Backend connection failed. This is expected if backend is not deployed yet.');
      setIsConnected(false);
    }
  }, []);
  
  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    setSessions(prev => {
      const current = prev.find(s => s.id === currentSessionId);
      if (!current) return prev;
      
      const updatedSessions = [...prev];
      const sessionIndex = updatedSessions.findIndex(s => s.id === currentSessionId);
      
      switch (message.type) {
        case 'task_started':
          setIsProcessing(true);
          break;
          
        case 'status':
        case 'log':
          // Add system message for status updates
          if (message.message) {
            const statusMessage: Message = {
              id: nanoid(),
              role: 'system',
              content: message.message,
              timestamp: new Date(message.timestamp),
              status: 'sent',
            };
            updatedSessions[sessionIndex].messages.push(statusMessage);
            updatedSessions[sessionIndex].updatedAt = new Date();
          }
          break;
          
        case 'task_completed':
          setIsProcessing(false);
          if (message.result) {
            const resultMessage: Message = {
              id: nanoid(),
              role: 'assistant',
              content: message.result,
              timestamp: new Date(message.timestamp),
              status: 'sent',
            };
            updatedSessions[sessionIndex].messages.push(resultMessage);
            updatedSessions[sessionIndex].updatedAt = new Date();
          }
          break;
          
        case 'task_failed':
          setIsProcessing(false);
          const errorMessage: Message = {
            id: nanoid(),
            role: 'system',
            content: `Error: ${message.error || 'Task failed'}`,
            timestamp: new Date(message.timestamp),
            status: 'error',
          };
          updatedSessions[sessionIndex].messages.push(errorMessage);
          updatedSessions[sessionIndex].updatedAt = new Date();
          break;
          
        case 'error':
          setIsProcessing(false);
          const errMsg: Message = {
            id: nanoid(),
            role: 'system',
            content: `Error: ${message.message || 'Unknown error'}`,
            timestamp: new Date(message.timestamp),
            status: 'error',
          };
          updatedSessions[sessionIndex].messages.push(errMsg);
          updatedSessions[sessionIndex].updatedAt = new Date();
          break;
      }
      
      return updatedSessions;
    });
  }, [currentSessionId]);
  
  // Create new session
  const createSession = useCallback(() => {
    const newSession: ChatSession = {
      id: nanoid(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  }, []);
  
  // Select session
  const selectSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
  }, []);
  
  // Delete session
  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
    }
  }, [currentSessionId]);
  
  // Send message
  const sendMessage = useCallback((content: string) => {
    if (!currentSessionId || !wsRef.current || !isConnected) {
      console.error('Cannot send message: not connected or no session');
      return;
    }
    
    const userMessage: Message = {
      id: nanoid(),
      role: 'user',
      content,
      timestamp: new Date(),
      status: 'sending',
    };
    
    setSessions(prev => {
      const updatedSessions = [...prev];
      const sessionIndex = updatedSessions.findIndex(s => s.id === currentSessionId);
      
      if (sessionIndex !== -1) {
        updatedSessions[sessionIndex].messages.push(userMessage);
        updatedSessions[sessionIndex].updatedAt = new Date();
        
        // Update title if it's the first message
        if (updatedSessions[sessionIndex].messages.length === 1) {
          updatedSessions[sessionIndex].title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
        }
      }
      
      return updatedSessions;
    });
    
    // Send via WebSocket
    try {
      api.sendTask(wsRef.current, {
        prompt: content,
        task_id: nanoid(),
      });
      
      // Update message status
      setSessions(prev => {
        const updatedSessions = [...prev];
        const sessionIndex = updatedSessions.findIndex(s => s.id === currentSessionId);
        if (sessionIndex !== -1) {
          const msgIndex = updatedSessions[sessionIndex].messages.findIndex(m => m.id === userMessage.id);
          if (msgIndex !== -1) {
            updatedSessions[sessionIndex].messages[msgIndex].status = 'sent';
          }
        }
        return updatedSessions;
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Update message status to error
      setSessions(prev => {
        const updatedSessions = [...prev];
        const sessionIndex = updatedSessions.findIndex(s => s.id === currentSessionId);
        if (sessionIndex !== -1) {
          const msgIndex = updatedSessions[sessionIndex].messages.findIndex(m => m.id === userMessage.id);
          if (msgIndex !== -1) {
            updatedSessions[sessionIndex].messages[msgIndex].status = 'error';
          }
        }
        return updatedSessions;
      });
    }
  }, [currentSessionId, isConnected]);
  
  // Clear current session
  const clearCurrentSession = useCallback(() => {
    if (!currentSessionId) return;
    
    setSessions(prev => {
      const updatedSessions = [...prev];
      const sessionIndex = updatedSessions.findIndex(s => s.id === currentSessionId);
      if (sessionIndex !== -1) {
        updatedSessions[sessionIndex].messages = [];
        updatedSessions[sessionIndex].updatedAt = new Date();
      }
      return updatedSessions;
    });
  }, [currentSessionId]);
  
  // Initialize: create first session and connect WebSocket
  useEffect(() => {
    if (sessions.length === 0) {
      createSession();
    }
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);
  
  const value: ChatContextType = {
    sessions,
    currentSessionId,
    currentSession,
    isConnected,
    isProcessing,
    createSession,
    selectSession,
    deleteSession,
    sendMessage,
    clearCurrentSession,
  };
  
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
}
