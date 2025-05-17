# Book Management System

A simple book management system built with TypeScript, Koa, and MongoDB.

## Features

- CRUD operations for books
- MongoDB database integration
- RESTful API endpoints
- TypeScript implementation

## Setup

1. Install dependencies:
   ```bash
npm install
```

2. Start the server:
   ```bash
   npm run start-server
```

The server will run on http://localhost:3000

## Frontend

To use the frontend interface, run the following command:
```bash
mcmasterful-books
```
This will start the frontend, which you can access at:
- http://localhost:9080 (Book list)
- http://localhost:9080/edit_list (Control panel)

## API Endpoints

- `GET /books` - List all books
- `POST /books` - Create a new book
- `PUT /books/:id` - Update a book
- `DELETE /books/:id` - Delete a book

## Development

This project uses:
- TypeScript for type safety
- Koa for the web server
- MongoDB for data storage
- Docker for containerization
