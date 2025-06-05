import { BookID } from '../../adapter/assignment-4.js';

// Types for warehouse inventory
export type ShelfId = string;

export interface WarehouseItem {
    bookId: BookID;
    shelfId: ShelfId;
    quantity: number;
}

// Types for orders
export type OrderId = string;

export interface OrderItem {
    bookId: BookID;
    quantity: number;
}

export interface Order {
    id: OrderId;
    items: OrderItem[];
    status: 'pending' | 'fulfilled';
    createdAt: Date;
}

// Ports (interfaces) for our domain
export interface WarehousePort {
    // Warehouse operations
    addBooksToShelf(bookId: BookID, shelfId: ShelfId, quantity: number): Promise<void>;
    removeBooksFromShelf(bookId: BookID, shelfId: ShelfId, quantity: number): Promise<void>;
    getBooksOnShelf(shelfId: ShelfId): Promise<WarehouseItem[]>;
    getBookLocations(bookId: BookID): Promise<Array<{ shelfId: ShelfId; quantity: number }>>;
    getTotalBookQuantity(bookId: BookID): Promise<number>;
}

export interface OrderPort {
    // Order operations
    createOrder(items: OrderItem[]): Promise<OrderId>;
    getOrder(orderId: OrderId): Promise<Order | null>;
    listOrders(): Promise<Order[]>;
    fulfillOrder(orderId: OrderId, fulfilledItems: Array<{ bookId: BookID; shelfId: ShelfId; quantity: number }>): Promise<void>;
    getOldestPendingOrder(): Promise<Order | null>;
} 