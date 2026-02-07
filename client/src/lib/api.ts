/**
 * API Service for OpenManus Backend
 * Handles REST and WebSocket communication
 */

export interface TaskRequest {
  type: 'task';
  prompt: string;
  task_id?: string;
}

export interface TaskResponse {
  task_id: string;
  status: string;
  message: string;
}

export interface TaskStatus {
  task_id: string;
  status: string;
  created_at: string;
  completed_at?: string;
  result?: string;
  error?: string;
}

export interface WebSocketMessage {
  type: 'task_started' | 'status' | 'log' | 'task_completed' | 'task_failed' | 'error';
  task_id?: string;
  message?: string;
  level?: string;
  result?: string;
  error?: string;
  timestamp: string;
}

// Get backend URL from environment or use default
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export class OpenManusAPI {
  private baseUrl: string;
  
  constructor(baseUrl: string = BACKEND_URL) {
    this.baseUrl = baseUrl;
  }
  
  /**
   * Create a new task (non-blocking)
   */
  async createTask(request: TaskRequest): Promise<TaskResponse> {
    const response = await fetch(`${this.baseUrl}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create task: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  /**
   * Get task status
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    const response = await fetch(`${this.baseUrl}/api/tasks/${taskId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get task status: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  /**
   * List all tasks
   */
  async listTasks(): Promise<TaskStatus[]> {
    const response = await fetch(`${this.baseUrl}/api/tasks`);
    
    if (!response.ok) {
      throw new Error(`Failed to list tasks: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  /**
   * Create WebSocket connection for real-time task execution
   */
  createWebSocket(
    onMessage: (message: WebSocketMessage) => void,
    onError?: (error: Event) => void,
    onClose?: (event: CloseEvent) => void
  ): WebSocket {
    const wsUrl = this.baseUrl.replace('http', 'ws');
    const ws = new WebSocket(`${wsUrl}/ws/chat`);
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        onMessage(message);
      } catch (error) {
        // Silently handle parse errors
      }
    };
    
    ws.onerror = (error) => {
      // Silently handle WebSocket errors - connection status shown in UI
      onError?.(error);
    };
    
    ws.onclose = (event) => {
      // Only log if it's an abnormal closure
      if (event.code !== 1000 && event.code !== 1001) {
        console.info('WebSocket closed unexpectedly:', event.code, event.reason);
      }
      onClose?.(event);
    };
    
    return ws;
  }
  
  /**
   * Send task via WebSocket
   */
  sendTask(ws: WebSocket, request: Omit<TaskRequest, 'type'>): void {
    if (ws.readyState === WebSocket.OPEN) {
      const message: TaskRequest = {
        type: 'task',
        ...request
      };
      ws.send(JSON.stringify(message));
    } else {
      throw new Error('WebSocket is not open');
    }
  }
}


// Export singleton instance
export const api = new OpenManusAPI();
