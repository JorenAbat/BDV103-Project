declare module '../shared/dist/messaging.js' {
  export interface DomainEvent {
    type: string;
    [key: string]: unknown;
  }

  export interface MessagingService {
    connect(): Promise<void>;
    publishEvent(event: DomainEvent, routingKey: string): Promise<void>;
    subscribeToEvents(routingKey: string, handler: (event: DomainEvent) => Promise<void>): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
  }
  
  export function createMessagingService(): MessagingService;
} 