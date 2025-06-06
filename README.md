# Book Management System

A simple book management system that helps you manage books, orders, and warehouse inventory.

## What This System Does

- Manage books (add, update, delete, list)
- Handle customer orders
- Track books in the warehouse
- Show stock levels for each book

## Getting Started

1. Install the required software:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm run start-server
   ```
   The server will start at http://localhost:3000

3. Start the frontend:
   ```bash
   mcmasterful-books
   ```
   You can then access:
   - Book list: http://localhost:9080
   - Control panel: http://localhost:9080/edit_list

## Available Features

### Books
- View all books
- Add new books
- Update existing books
- Delete books
- Search books by title or author

### Orders
- Create new orders
- View order status
- Fulfill orders
- Track order history

### Warehouse
- Add books to shelves
- Remove books from shelves
- Check stock levels
- View shelf contents

## Development

This project uses:
- TypeScript for type safety
- Koa for the web server
- MongoDB for data storage
- Docker for running the database

## Testing

Run the tests with:
```bash
npm test
```

Run tests in watch mode (for development):
```bash
npm run test:watch
```

## Need Help?

If you run into any issues:
1. Check the console for error messages
2. Make sure MongoDB is running
3. Verify all dependencies are installed
4. Check that the ports (3000 and 9080) are available
