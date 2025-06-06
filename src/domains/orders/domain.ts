// A book in an order
export interface OrderItem {
    // The ID of the book being ordered
    bookId: string;
    // How many copies of the book are ordered
    quantity: number;
}

// A complete order in our system
export interface Order {
    // Unique order identifier
    id: string;
    // List of books in the order
    items: OrderItem[];
    // Current status of the order
    status: 'pending' | 'fulfilled' | 'cancelled';
    // When the order was created
    createdAt: Date;
    // When the order was fulfilled (if it has been)
    fulfilledAt?: Date;
}

// Interface for managing orders in our system
export interface OrderRepository {
    // Create a new order
    createOrder(items: OrderItem[]): Promise<Order>;
    
    // Get a specific order by its ID
    getOrder(id: string): Promise<Order | null>;
    
    // Get all orders in the system
    getAllOrders(): Promise<Order[]>;
    
    // Update an order's status
    updateOrderStatus(id: string, status: Order['status']): Promise<void>;
    
    // Fulfill an order (mark as fulfilled and update inventory)
    fulfillOrder(orderId: string): Promise<Order>;
} 