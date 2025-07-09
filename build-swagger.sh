#!/bin/bash

# Build combined swagger documentation for all microservices
echo "🔨 Building combined Swagger documentation..."

# Create build directory
mkdir -p build

# For now, since TSOA routes are temporarily disabled, 
# we'll use the basic swagger doc from our swagger-docs service
echo "📝 Using basic swagger documentation (TSOA integration pending)"

# Create a simple combined swagger.json that documents our microservices architecture
cat > build/swagger.json << 'EOF'
{
  "openapi": "3.0.0",
  "info": {
    "title": "BDV103 Microservices API",
    "description": "Combined API documentation for Books, Warehouse, and Orders microservices",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "http://localhost:8080/api",
      "description": "Development server (via nginx reverse proxy)"
    }
  ],
  "paths": {
    "/books": {
      "get": {
        "summary": "Get all books",
        "tags": ["Books"],
        "description": "Retrieve a list of all books from the books microservice",
        "parameters": [
          {
            "name": "from",
            "in": "query",
            "description": "Minimum price filter",
            "schema": {
              "type": "number"
            }
          },
          {
            "name": "to", 
            "in": "query",
            "description": "Maximum price filter",
            "schema": {
              "type": "number"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List of books",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/Book"
                  }
                }
              }
            }
          }
        }
      }
    },
    "/books/{id}": {
      "get": {
        "summary": "Get book by ID",
        "tags": ["Books"],
        "description": "Retrieve a specific book by its ID",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "Book ID",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Book details",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Book"
                }
              }
            }
          },
          "404": {
            "description": "Book not found"
          }
        }
      }
    },
    "/warehouse/stock": {
      "get": {
        "summary": "Get warehouse stock",
        "tags": ["Warehouse"],
        "description": "Retrieve current warehouse stock levels",
        "responses": {
          "200": {
            "description": "Stock information",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/StockItem"
                  }
                }
              }
            }
          }
        }
      }
    },
    "/orders": {
      "get": {
        "summary": "Get orders",
        "tags": ["Orders"],
        "description": "Retrieve order information",
        "responses": {
          "200": {
            "description": "List of orders",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/Order"
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "summary": "Create new order",
        "tags": ["Orders"],
        "description": "Create a new order",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateOrderRequest"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Order created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CreateOrderResponse"
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "Book": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "description": "Unique book identifier"
          },
          "name": {
            "type": "string",
            "description": "Book title"
          },
          "author": {
            "type": "string",
            "description": "Book author"
          },
          "description": {
            "type": "string",
            "description": "Book description"
          },
          "price": {
            "type": "number",
            "description": "Book price"
          },
          "image": {
            "type": "string",
            "description": "Book cover image URL"
          }
        },
        "required": ["id", "name", "author", "description", "price"]
      },
      "StockItem": {
        "type": "object",
        "properties": {
          "bookId": {
            "type": "string",
            "description": "Book identifier"
          },
          "quantity": {
            "type": "integer",
            "description": "Available quantity"
          }
        },
        "required": ["bookId", "quantity"]
      },
      "Order": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "description": "Order identifier"
          },
          "items": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/OrderItem"
            }
          },
          "total": {
            "type": "number",
            "description": "Order total amount"
          }
        },
        "required": ["id", "items", "total"]
      },
      "OrderItem": {
        "type": "object",
        "properties": {
          "bookId": {
            "type": "string",
            "description": "Book identifier"
          },
          "quantity": {
            "type": "integer",
            "description": "Quantity ordered"
          }
        },
        "required": ["bookId", "quantity"]
      },
      "CreateOrderRequest": {
        "type": "object",
        "properties": {
          "items": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/OrderItem"
            }
          }
        },
        "required": ["items"]
      },
      "CreateOrderResponse": {
        "type": "object",
        "properties": {
          "orderId": {
            "type": "string",
            "description": "Created order identifier"
          }
        },
        "required": ["orderId"]
      }
    }
  },
  "tags": [
    {
      "name": "Books",
      "description": "Book listing and management operations"
    },
    {
      "name": "Warehouse",
      "description": "Warehouse and inventory management operations"
    },
    {
      "name": "Orders",
      "description": "Order processing and management operations"
    }
  ]
}
EOF

echo "✅ Combined swagger.json created in build/ directory"
echo "📄 Documentation includes all microservice endpoints"
echo "🔄 Note: Full TSOA integration will be completed in Phase 2" 