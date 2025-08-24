import { auth } from './auth';
import { WebSocketMessage } from './types';

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: ((message: WebSocketMessage) => void)[] = [];
  private isConnecting = false;

  connect(token?: string) {
    if (this.isConnecting) {
      console.warn('WebSocket connection already in progress');
      return;
    }

    const authToken = token || auth.getToken();
    if (!authToken) {
      console.warn('No auth token available for WebSocket connection');
      return;
    }

    this.isConnecting = true;
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://trauma-board-api.onrender.com/ws';
    const url = `${wsUrl}?token=${authToken}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('WebSocket connected successfully');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.notifyListeners(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected', event.code, event.reason);
        this.isConnecting = false;
        
        // Don't reconnect if it was a clean close or auth error
        if (event.code === 1000 || event.code === 1001 || event.code === 1008) {
          console.log('WebSocket closed cleanly, not reconnecting');
          return;
        }
        
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.isConnecting = false;
  }

  onMessage(callback: (message: WebSocketMessage) => void) {
    this.listeners.push(callback);
  }

  removeListener(callback: (message: WebSocketMessage) => void) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private notifyListeners(message: WebSocketMessage) {
    this.listeners.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('Error in WebSocket listener:', error);
      }
    });
  }

  send(message: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const wsClient = new WebSocketClient();
