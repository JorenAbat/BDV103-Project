// A book in an order
export interface OrderItem {
    // The unique identifier of the book being ordered
    bookId: string;
    // The number of copies of the book being ordered
    quantity: number;
}

// A complete order in our system
export interface Order {
    // A unique identifier for the order
    id: string;
    // The list of books being ordered
    items: OrderItem[];
    // The current status of the order
    status: 'pending' | 'fulfilled' | 'cancelled';
    // The date and time when the order was created
    createdAt: Date;
    // The date and time when the order was fulfilled (if it has been)
    fulfilledAt?: Date;
}

// Interface for managing orders in our system
export interface OrderRepository {
    // Create a new order with the specified books
    createOrder(items: OrderItem[]): Promise<Order>;
    
    // Get a specific order by its unique identifier
    getOrder(id: string): Promise<Order | null>;
    
    // Get a list of all orders in the system
    getAllOrders(): Promise<Order[]>;
    
    // Update the status of an existing order
    updateOrderStatus(id: string, status: Order['status']): Promise<void>;
    
    // Fulfill an order by marking it as fulfilled and updating inventory
    fulfillOrder(orderId: string): Promise<Order>;
} 