/* eslint-disable */
import axios from 'axios';

const BASE_URL = 'http://localhost:8080';

async function testEventSubscriptions() {
  console.log('🧪 Testing Event Subscription Functionality...\n');

  try {
    // Step 1: Add a book to trigger BookAdded event
    console.log('📚 Step 1: Adding a book to trigger BookAdded event...');
    const bookData = {
      name: 'Test Book for Events',
      title: 'Test Book for Events',
      author: 'Test Author',
      description: 'A test book to verify event subscriptions',
      price: 29.99
    };

    const addBookResponse = await axios.post(`${BASE_URL}/api/books`, bookData);
    const bookId = addBookResponse.data.id;
    console.log(`✅ Book added with ID: ${bookId}`);
    
    // Wait a moment for events to propagate
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Add stock to warehouse to trigger StockUpdated event
    console.log('\n📦 Step 2: Adding stock to warehouse to trigger StockUpdated event...');
    const stockData = {
      bookId: bookId,
      shelfId: 'SHELF-A1',
      quantity: 50
    };

    await axios.post(`${BASE_URL}/api/warehouse/add-books`, stockData);
    console.log('✅ Stock added to warehouse');
    
    // Wait a moment for events to propagate
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Check if books service received stock update
    console.log('\n🔍 Step 3: Checking if books service received stock update...');
    const bookResponse = await axios.get(`${BASE_URL}/api/books/${bookId}`);
    const book = bookResponse.data;
    console.log(`📊 Book stock in books service: ${book.totalStock}`);
    
    if (book.totalStock > 0) {
      console.log('✅ Books service successfully received stock update event!');
    } else {
      console.log('❌ Books service did not receive stock update event');
    }

    // Step 4: Check if warehouse service received book info
    console.log('\n🔍 Step 4: Checking if warehouse service received book info...');
    const warehouseResponse = await axios.get(`${BASE_URL}/api/warehouse/${bookId}`);
    console.log(`📦 Warehouse data for book:`, warehouseResponse.data);
    
    // Step 5: Check if orders service has book in cache
    console.log('\n🔍 Step 5: Checking if orders service has book in cache...');
    try {
      const ordersResponse = await axios.get(`${BASE_URL}/api/orders`);
      console.log('✅ Orders service is responding (cache should be updated)');
    } catch (error) {
      console.log('❌ Orders service not responding');
    }

    // Step 6: Update book to trigger BookUpdated event
    console.log('\n📝 Step 6: Updating book to trigger BookUpdated event...');
    const updatedBookData = {
      ...bookData,
      id: bookId,
      name: 'Updated Test Book for Events',
      title: 'Updated Test Book for Events',
      price: 39.99
    };

    await axios.put(`${BASE_URL}/api/books/${bookId}`, updatedBookData);
    console.log('✅ Book updated');
    
    // Wait a moment for events to propagate
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 7: Remove stock to test negative stock updates
    console.log('\n📦 Step 7: Removing stock to test negative stock updates...');
    const removeStockData = {
      bookId: bookId,
      shelfId: 'SHELF-A1',
      quantity: 10
    };

    await axios.post(`${BASE_URL}/api/warehouse/remove-books`, removeStockData);
    console.log('✅ Stock removed from warehouse');
    
    // Wait a moment for events to propagate
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 8: Check final stock level
    console.log('\n🔍 Step 8: Checking final stock level...');
    const finalBookResponse = await axios.get(`${BASE_URL}/api/books/${bookId}`);
    const finalBook = finalBookResponse.data;
    console.log(`📊 Final book stock: ${finalBook.totalStock}`);
    
    if (finalBook.totalStock > 0) {
      console.log('✅ Stock updates working correctly!');
    } else {
      console.log('❌ Stock updates not working correctly');
    }

    console.log('\n🎉 Event subscription test completed!');
    console.log('\n📋 Summary:');
    console.log('- Books service should receive stock updates');
    console.log('- Warehouse service should receive book info updates');
    console.log('- Orders service should maintain book cache');
    console.log('- All events should propagate between services');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testEventSubscriptions(); 