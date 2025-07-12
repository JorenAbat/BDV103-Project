/**
 * Mock Messaging Service for Testing
 * 
 * This mock service simulates the event-driven messaging system
 * without requiring a real RabbitMQ connection during tests.
 * It provides the same interface as the real MessagingService
 * but stores events in memory for testing purposes.
 */

export interface MockEvent {
  type: string;
  bookId?: string;
  book?: Record<string, unknown>;
  shelfId?: string;
  quantity?: number;
  timestamp: Date;
}

export class MockMessagingService {
  private events: MockEvent[] = [];
  private subscribers: Map<string, ((event: MockEvent) => Promise<void>)[]> = new Map();

  /**
   * Simulate connecting to RabbitMQ (does nothing in mock)
   */
  async connect(): Promise<void> {
    console.log('🔗 Mock: Connected to RabbitMQ');
  }

  /**
   * Publish an event to the mock event bus
   */
  async publishEvent(event: MockEvent, routingKey: string): Promise<void> {
    console.log(`📢 Mock: Published event ${event.type} with routing key: ${routingKey}`);
    this.events.push(event);
    
    // Notify subscribers
    const subscribers = this.subscribers.get(routingKey) || [];
    for (const subscriber of subscribers) {
      try {
        await subscriber(event);
      } catch (error) {
        console.error('❌ Mock: Error in event subscriber:', error);
      }
    }
  }

  /**
   * Subscribe to events with a routing key
   */
  async subscribeToEvents(routingKey: string, handler: (event: MockEvent) => Promise<void>): Promise<void> {
    console.log(`📡 Mock: Subscribed to events with routing key: ${routingKey}`);
    
    if (!this.subscribers.has(routingKey)) {
      this.subscribers.set(routingKey, []);
    }
    this.subscribers.get(routingKey)!.push(handler);
  }

  /**
   * Disconnect from the mock event bus
   */
  async disconnect(): Promise<void> {
    console.log('🔌 Mock: Disconnected from RabbitMQ');
    this.events = [];
    this.subscribers.clear();
  }

  /**
   * Check if the mock service is connected
   */
  isConnected(): boolean {
    return true; // Mock is always "connected"
  }

  /**
   * Get all published events (for testing)
   */
  getEvents(): MockEvent[] {
    return [...this.events];
  }

  /**
   * Clear all events (for testing)
   */
  clearEvents(): void {
    this.events = [];
  }

  /**
   * Get events by type (for testing)
   */
  getEventsByType(type: string): MockEvent[] {
    return this.events.filter(event => event.type === type);
  }

  /**
   * Get events by routing key (for testing)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getEventsByRoutingKey(_routingKey: string): MockEvent[] {
    // In the mock, we'll return all events since we don't track routing keys separately
    return [...this.events];
  }
}

/**
 * Create a mock messaging service instance
 */
export function createMockMessagingService(): MockMessagingService {
  return new MockMessagingService();
} 