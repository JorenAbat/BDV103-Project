// A unique identifier for an order
export type OrderId = string;

// Represents a single book in an order
export interface OrderItem {
    bookId: string;     // The ID of the book being ordered
    quantity: number;   // How many copies of the book are ordered
}

// Represents a complete order in the system
export interface Order {
    id: OrderId;                    // Unique order identifier
    items: OrderItem[];            // List of books in the order
    status: 'pending' | 'fulfilled' | 'cancelled';  // Current status of the order
    createdAt: Date;               // When the order was created
    fulfilledAt?: Date;            // When the order was fulfilled (if it has been)
}

// Interface for managing orders in the system
export interface OrderRepository {
    // Create a new order with the given items
    createOrder(items: OrderItem[]): Promise<Order>;
    
    // Get a specific order by its ID
    getOrder(id: OrderId): Promise<Order | null>;
    
    // Get all orders in the system
    getAllOrders(): Promise<Order[]>;
    
    // Update the status of an order
    updateOrderStatus(id: OrderId, status: Order['status']): Promise<void>;
    
    // Fulfill an order (mark as fulfilled and update inventory)
    fulfillOrder(orderId: string): Promise<Order>;
} 