import { MongoClient } from 'mongodb';

// Sample books data with stock information
const sampleBooks = [
  {
    id: 'book-001',
    name: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    description: 'A story of the fabulously wealthy Jay Gatsby and his love for the beautiful Daisy Buchanan.',
    price: 12.99,
    image: 'https://example.com/gatsby.jpg',
    totalStock: 50
  },
  {
    id: 'book-002',
    name: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    description: 'The story of young Scout Finch and her father Atticus in a racially divided Alabama town.',
    price: 14.99,
    image: 'https://example.com/mockingbird.jpg',
    totalStock: 35
  },
  {
    id: 'book-003',
    name: '1984',
    author: 'George Orwell',
    description: 'A dystopian novel about totalitarianism and surveillance society.',
    price: 11.99,
    image: 'https://example.com/1984.jpg',
    totalStock: 40
  },
  {
    id: 'book-004',
    name: 'Pride and Prejudice',
    author: 'Jane Austen',
    description: 'A romantic novel of manners that follows the emotional development of Elizabeth Bennet.',
    price: 13.99,
    image: 'https://example.com/pride.jpg',
    totalStock: 30
  },
  {
    id: 'book-005',
    name: 'The Hobbit',
    author: 'J.R.R. Tolkien',
    description: 'A fantasy novel about Bilbo Baggins, a hobbit who embarks on a quest with thirteen dwarves.',
    price: 16.99,
    image: 'https://example.com/hobbit.jpg',
    totalStock: 45
  }
];

async function seedBooks() {
  console.log('🌱 Starting books service seeding...');
  
  // Connect to MongoDB
  const mongoUrl = process.env.MONGODB_URI || 'mongodb://root:example@mongo-books:27017/bookstore?authSource=admin';
  const client = new MongoClient(mongoUrl);
  
  try {
    // Connect to MongoDB
    console.log('🗄️ Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('bookstore');
    const booksCollection = db.collection('books');
    
    // Clear existing books (for clean seeding)
    console.log('🧹 Clearing existing books...');
    await booksCollection.deleteMany({});
    console.log('✅ Cleared existing books');
    
    // Add books to database
    console.log('📚 Adding sample books...');
    for (const book of sampleBooks) {
      // Add book to database
      await booksCollection.insertOne(book);
      console.log(`✅ Added book: ${book.name} by ${book.author} (Stock: ${book.totalStock})`);
    }
    
    console.log('✅ Books seeding completed successfully!');
    console.log(`📊 Seeded ${sampleBooks.length} books with stock information`);
    
  } catch (error) {
    console.error('❌ Error during books seeding:', error);
    throw error;
  } finally {
    // Close connections
    await client.close();
    console.log('🔌 Closed MongoDB connection');
  }
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  seedBooks()
    .then(() => {
      console.log('🎉 Books seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Books seeding failed:', error);
      process.exit(1);
    });
}

export { seedBooks }; 