import { auth } from './auth';
import { WebSocketMessage } from './types';

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: ((message: WebSocketMessage) => void)[] = [];

  connect(token?: string) {
    const authToken = token || auth.getToken();
    if (!authToken) {
      console.warn('No auth token available for WebSocket connection');
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://trauma-board-api.onrender.com/ws';
    const url = `${wsUrl}?token=${authToken}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('WebSocket connected successfully to:', url);
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        console.log('WebSocket raw message received:', event.data);
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('WebSocket parsed message:', message);
          this.notifyListeners(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error, 'Raw data:', event.data);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
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
      this.ws.close();
      this.ws = null;
    }
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
}

export const wsClient = new WebSocketClient();
