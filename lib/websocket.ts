import apiClient from './api';
import { WebSocketSubscription, WebSocketMessage } from './types';

class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private subscriptions: WebSocketSubscription[] = [];
  private callbacks: {
    onCaseUpdate?: (message: WebSocketMessage) => void;
    onScheduleUpdate?: (message: WebSocketMessage) => void;
    onTheatreUpdate?: (message: WebSocketMessage) => void;
    onSessionUpdate?: (message: WebSocketMessage) => void;
    onBulkScheduleUpdate?: (message: WebSocketMessage) => void;
    onSystemUpdate?: (message: WebSocketMessage) => void;
  } = {};

  constructor() {
    this.connect();
  }

  private getWebSocketUrl(): string {
    const token = apiClient.getAuthToken();
    if (token) {
      return `wss://trauma-board-api.onrender.com/ws/updates?token=${token}`;
    }
    return 'wss://trauma-board-api.onrender.com/ws/updates';
  }

  private connect(): void {
    try {
      this.ws = new WebSocket(this.getWebSocketUrl());
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.subscribeToAll();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(`Scheduling WebSocket reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
      setTimeout(() => this.connect(), delay);
    } else {
      console.error('Max WebSocket reconnect attempts reached');
    }
  }

  private subscribeToAll(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.subscriptions.forEach(subscription => {
        this.ws!.send(JSON.stringify({
          action: 'subscribe',
          ...subscription
        }));
      });
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'case_update':
        this.callbacks.onCaseUpdate?.(message);
        break;
      case 'schedule_update':
        this.callbacks.onScheduleUpdate?.(message);
        break;
      case 'theatre_update':
        this.callbacks.onTheatreUpdate?.(message);
        break;
      case 'session_update':
        this.callbacks.onSessionUpdate?.(message);
        break;
      case 'bulk_schedule_update':
        this.callbacks.onBulkScheduleUpdate?.(message);
        break;
      case 'system_update':
        this.callbacks.onSystemUpdate?.(message);
        break;
    }
  }

  subscribe(subscription: WebSocketSubscription): void {
    this.subscriptions.push(subscription);
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'subscribe',
        ...subscription
      }));
    }
  }

  unsubscribe(subscription: WebSocketSubscription): void {
    const index = this.subscriptions.findIndex(sub => 
      sub.type === subscription.type && 
      JSON.stringify(sub.filters) === JSON.stringify(subscription.filters)
    );
    
    if (index !== -1) {
      this.subscriptions.splice(index, 1);
      
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          action: 'unsubscribe',
          ...subscription
        }));
      }
    }
  }

  onCaseUpdate(callback: (message: WebSocketMessage) => void): void {
    this.callbacks.onCaseUpdate = callback;
  }

  onScheduleUpdate(callback: (message: WebSocketMessage) => void): void {
    this.callbacks.onScheduleUpdate = callback;
  }

  onTheatreUpdate(callback: (message: WebSocketMessage) => void): void {
    this.callbacks.onTheatreUpdate = callback;
  }

  onSessionUpdate(callback: (message: WebSocketMessage) => void): void {
    this.callbacks.onSessionUpdate = callback;
  }

  onBulkScheduleUpdate(callback: (message: WebSocketMessage) => void): void {
    this.callbacks.onBulkScheduleUpdate = callback;
  }

  onSystemUpdate(callback: (message: WebSocketMessage) => void): void {
    this.callbacks.onSystemUpdate = callback;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getConnectionStatus(): string {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'unknown';
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // Reconnect manually
  reconnect(): void {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  }
}

export const wsClient = new WebSocketClient();
export default wsClient;
