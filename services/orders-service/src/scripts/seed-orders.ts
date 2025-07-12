import { MongoClient } from 'mongodb';

// Sample book cache data for the orders service
const sampleBookCacheData = [
  {
    bookId: 'book-001',
    bookName: 'The Great Gatsby',
    bookAuthor: 'F. Scott Fitzgerald',
    price: 12.99,
    totalStock: 50,
    lastUpdated: new Date()
  },
  {
    bookId: 'book-002',
    bookName: 'To Kill a Mockingbird',
    bookAuthor: 'Harper Lee',
    price: 14.99,
    totalStock: 35,
    lastUpdated: new Date()
  },
  {
    bookId: 'book-003',
    bookName: '1984',
    bookAuthor: 'George Orwell',
    price: 11.99,
    totalStock: 40,
    lastUpdated: new Date()
  },
  {
    bookId: 'book-004',
    bookName: 'Pride and Prejudice',
    bookAuthor: 'Jane Austen',
    price: 13.99,
    totalStock: 30,
    lastUpdated: new Date()
  },
  {
    bookId: 'book-005',
    bookName: 'The Hobbit',
    bookAuthor: 'J.R.R. Tolkien',
    price: 16.99,
    totalStock: 45,
    lastUpdated: new Date()
  }
];

async function seedOrders() {
  console.log('📦 Starting orders service seeding...');
  
  // Connect to MongoDB
  const mongoUrl = process.env.MONGODB_URI || 'mongodb://root:example@mongo-orders:27017/bookstore?authSource=admin';
  const client = new MongoClient(mongoUrl);
  
  try {
    // Connect to MongoDB
    console.log('🗄️ Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('bookstore');
    const bookCacheCollection = db.collection('book_cache');
    
    // Clear existing book cache (for clean seeding)
    console.log('🧹 Clearing existing book cache...');
    await bookCacheCollection.deleteMany({});
    console.log('✅ Cleared existing book cache');
    
    // Add book cache data
    console.log('📚 Adding sample book cache data...');
    for (const bookCache of sampleBookCacheData) {
      await bookCacheCollection.insertOne(bookCache);
      console.log(`✅ Added book cache for: ${bookCache.bookName} by ${bookCache.bookAuthor} (Stock: ${bookCache.totalStock})`);
    }
    
    console.log('✅ Orders service seeding completed successfully!');
    console.log(`📊 Seeded ${sampleBookCacheData.length} book cache entries`);
    
  } catch (error) {
    console.error('❌ Error during orders seeding:', error);
    throw error;
  } finally {
    // Close connections
    await client.close();
    console.log('🔌 Closed MongoDB connection');
  }
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  seedOrders()
    .then(() => {
      console.log('🎉 Orders service seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Orders service seeding failed:', error);
      process.exit(1);
    });
}

export { seedOrders }; 