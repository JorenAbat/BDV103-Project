import { MongoClient } from 'mongodb';

// Sample warehouse data with book information
const sampleWarehouseData = [
  {
    bookId: 'book-001',
    bookName: 'The Great Gatsby',
    bookAuthor: 'F. Scott Fitzgerald',
    locations: [
      { shelfId: 'SHELF-A1', quantity: 25 },
      { shelfId: 'SHELF-A2', quantity: 25 }
    ]
  },
  {
    bookId: 'book-002',
    bookName: 'To Kill a Mockingbird',
    bookAuthor: 'Harper Lee',
    locations: [
      { shelfId: 'SHELF-B1', quantity: 20 },
      { shelfId: 'SHELF-B2', quantity: 15 }
    ]
  },
  {
    bookId: 'book-003',
    bookName: '1984',
    bookAuthor: 'George Orwell',
    locations: [
      { shelfId: 'SHELF-C1', quantity: 30 },
      { shelfId: 'SHELF-C2', quantity: 10 }
    ]
  },
  {
    bookId: 'book-004',
    bookName: 'Pride and Prejudice',
    bookAuthor: 'Jane Austen',
    locations: [
      { shelfId: 'SHELF-D1', quantity: 15 },
      { shelfId: 'SHELF-D2', quantity: 15 }
    ]
  },
  {
    bookId: 'book-005',
    bookName: 'The Hobbit',
    bookAuthor: 'J.R.R. Tolkien',
    locations: [
      { shelfId: 'SHELF-E1', quantity: 25 },
      { shelfId: 'SHELF-E2', quantity: 20 }
    ]
  }
];

async function seedWarehouse() {
  console.log('🏭 Starting warehouse service seeding...');
  
  // Connect to MongoDB
  const mongoUrl = process.env.MONGODB_URI || 'mongodb://root:example@mongo-warehouse:27017/bookstore?authSource=admin';
  const client = new MongoClient(mongoUrl);
  
  try {
    // Connect to MongoDB
    console.log('🗄️ Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('bookstore');
    const warehouseCollection = db.collection('warehouse');
    
    // Clear existing warehouse data (for clean seeding)
    console.log('🧹 Clearing existing warehouse data...');
    await warehouseCollection.deleteMany({});
    console.log('✅ Cleared existing warehouse data');
    
    // Add warehouse data
    console.log('📦 Adding sample warehouse data...');
    for (const warehouseItem of sampleWarehouseData) {
      // Add warehouse item to database
      await warehouseCollection.insertOne(warehouseItem);
      console.log(`✅ Added warehouse item for: ${warehouseItem.bookName}`);
      
      // Log stock information for each location
      for (const location of warehouseItem.locations) {
        console.log(`  📍 Location ${location.shelfId}: ${location.quantity} books`);
      }
    }
    
    console.log('✅ Warehouse seeding completed successfully!');
    console.log(`📊 Seeded ${sampleWarehouseData.length} warehouse items with stock information`);
    
  } catch (error) {
    console.error('❌ Error during warehouse seeding:', error);
    throw error;
  } finally {
    // Close connections
    await client.close();
    console.log('🔌 Closed MongoDB connection');
  }
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  seedWarehouse()
    .then(() => {
      console.log('🎉 Warehouse seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Warehouse seeding failed:', error);
      process.exit(1);
    });
}

export { seedWarehouse }; 