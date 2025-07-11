import * as amqp from 'amqplib';

/**
 * Event types that can be published across our microservices
 */
export interface BookEvent {
  type: 'BookAdded' | 'BookUpdated' | 'BookDeleted';
  bookId: string;
  book?: {
    id: string;
    name: string;
    author: string;
    description: string;
    price: number;
    image?: string;
  };
  timestamp: Date;
}

export interface StockEvent {
  type: 'StockUpdated' | 'StockReserved';
  bookId: string;
  shelfId: string;
  quantity: number;
  timestamp: Date;
}

export interface OrderEvent {
  type: 'OrderCreated' | 'OrderFulfilled' | 'OrderCancelled';
  orderId: string;
  items: Array<{
    bookId: string;
    quantity: number;
  }>;
  timestamp: Date;
}

export type DomainEvent = BookEvent | StockEvent | OrderEvent;

/**
 * MessagingService provides a simple interface for RabbitMQ operations
 * This service handles connecting to RabbitMQ and managing exchanges/queues
 */
export class MessagingService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private connection: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private channel: any = null;
  private readonly exchangeName = 'bookstore_events';
  private readonly rabbitmqUrl: string;

  constructor(rabbitmqUrl: string = process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672') {
    this.rabbitmqUrl = rabbitmqUrl;
  }

  /**
   * Connect to RabbitMQ and set up the exchange
   * This should be called when the service starts
   */
  async connect(): Promise<void> {
    try {
      console.log('Connecting to RabbitMQ...');
      
      // Connect to RabbitMQ
      this.connection = await amqp.connect(this.rabbitmqUrl);
      console.log('Connected to RabbitMQ');

      // Create a channel
      this.channel = await this.connection.createChannel();
      console.log('Created RabbitMQ channel');

      // Declare the exchange (this creates it if it doesn't exist)
      await this.channel.assertExchange(this.exchangeName, 'topic', {
        durable: true // Survives broker restarts
      });
      console.log(`Exchange '${this.exchangeName}' is ready`);

    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  /**
   * Publish an event to the exchange
   * @param event The event to publish
   * @param routingKey The routing key for the event (e.g., 'book.added', 'stock.updated')
   */
  async publishEvent(event: DomainEvent, routingKey: string): Promise<void> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ. Call connect() first.');
    }

    try {
      const message = JSON.stringify(event);
      
      // Publish the message to the exchange
      const success = this.channel.publish(
        this.exchangeName,
        routingKey,
        Buffer.from(message),
        {
          persistent: true // Message survives broker restarts
        }
      );

      if (success) {
        console.log(`Published event: ${event.type} with routing key: ${routingKey}`);
      } else {
        throw new Error('Failed to publish message to RabbitMQ');
      }
    } catch (error) {
      console.error('Failed to publish event:', error);
      throw error;
    }
  }

  /**
   * Subscribe to events with a specific routing key
   * @param routingKey The routing key to subscribe to (e.g., 'book.*', 'stock.updated')
   * @param handler Function to handle received events
   */
  async subscribeToEvents(routingKey: string, handler: (event: DomainEvent) => Promise<void>): Promise<void> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ. Call connect() first.');
    }

    try {
      // Create a queue for this service (RabbitMQ will generate a unique name)
      const queueResult = await this.channel.assertQueue('', {
        exclusive: true // Queue will be deleted when connection closes
      });
      const queueName = queueResult.queue;

      // Bind the queue to the exchange with the routing key
      await this.channel.bindQueue(queueName, this.exchangeName, routingKey);
      console.log(`Subscribed to events with routing key: ${routingKey}`);

      // Start consuming messages
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.channel.consume(queueName, async (message: any) => {
        if (message) {
          try {
            // Parse the event
            const event: DomainEvent = JSON.parse(message.content.toString());
            console.log(`Received event: ${event.type}`);

            // Handle the event
            await handler(event);

            // Acknowledge the message (tell RabbitMQ we processed it successfully)
            this.channel?.ack(message);
          } catch (error) {
            console.error('Error processing message:', error);
            // Reject the message (tell RabbitMQ to requeue it)
            this.channel?.nack(message, false, true);
          }
        }
      });

      console.log(`Listening for events with routing key: ${routingKey}`);
    } catch (error) {
      console.error('Failed to subscribe to events:', error);
      throw error;
    }
  }

  /**
   * Close the connection to RabbitMQ
   * This should be called when the service shuts down
   */
  async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      console.log('Disconnected from RabbitMQ');
    } catch (error) {
      console.error('Error disconnecting from RabbitMQ:', error);
      throw error;
    }
  }

  /**
   * Check if the service is connected to RabbitMQ
   */
  isConnected(): boolean {
    return this.connection !== null && this.channel !== null;
  }
}

/**
 * Helper function to create a MessagingService instance
 * This makes it easier to create messaging services in different microservices
 */
export function createMessagingService(): MessagingService {
  return new MessagingService();
} 