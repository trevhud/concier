#!/usr/bin/env node

import { spawn } from 'child_process';
import { resolve } from 'path';

const serverPath = resolve('./dist/index.js');

console.log('🛫 Testing Complete Flight Search → Booking Flow...\n');

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: {
    ...process.env,
    DUFFEL_ACCESS_TOKEN: process.env.DUFFEL_ACCESS_TOKEN || 'your-duffel-test-token'
  }
});

// State tracking
let currentStep = 0;
let selectedOfferId = null;
let bookingData = null;

// Test steps
const steps = [
  'initialize',
  'search',
  'details', 
  'book'
];

const requests = {
  initialize: {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      clientInfo: { name: 'complete-booking-test', version: '1.0.0' }
    }
  },
  
  search: {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'search_flights',
      arguments: {
        origin: 'JFK',
        destination: 'LAX', 
        departure_date: '2025-07-15',
        adults: 1,
        cabin_class: 'economy'
      }
    }
  }
};

function createDetailsRequest(offerId) {
  return {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'get_flight_details',
      arguments: {
        offer_id: offerId
      }
    }
  };
}

function createBookingRequest(offerId) {
  return {
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'book_flight',
      arguments: {
        offer_id: offerId,
        passenger: {
          given_name: 'John',
          family_name: 'Doe',
          email: 'john.doe@example.com',
          phone_number: '+1234567890',
          born_on: '1990-01-01',
          title: 'mr',
          gender: 'm'
        }
      }
    }
  };
}

function sendNextRequest() {
  const step = steps[currentStep];
  
  if (step === 'initialize') {
    console.log('\n📨 Step 1: Initializing MCP server...');
    server.stdin.write(JSON.stringify(requests.initialize) + '\n');
    
  } else if (step === 'search') {
    console.log('\n📨 Step 2: Searching for flights JFK → LAX...');
    server.stdin.write(JSON.stringify(requests.search) + '\n');
    
  } else if (step === 'details' && selectedOfferId) {
    console.log(`\n📨 Step 3: Getting details for offer ${selectedOfferId}...`);
    server.stdin.write(JSON.stringify(createDetailsRequest(selectedOfferId)) + '\n');
    
  } else if (step === 'book' && selectedOfferId) {
    console.log(`\n📨 Step 4: Booking flight ${selectedOfferId}...`);
    server.stdin.write(JSON.stringify(createBookingRequest(selectedOfferId)) + '\n');
    
  } else {
    console.log('✅ All steps completed!');
    setTimeout(() => server.kill(), 2000);
  }
}

server.stdout.on('data', (data) => {
  const response = data.toString().trim();
  if (!response) return;
  
  try {
    const json = JSON.parse(response);
    
    // Handle initialization
    if (json.id === 1 && json.result) {
      console.log('✅ Server initialized successfully');
      currentStep++;
      setTimeout(sendNextRequest, 500);
    }
    
    // Handle search results  
    else if (json.id === 2 && json.result?.content) {
      const content = JSON.parse(json.result.content[0].text);
      if (content.success && content.data?.offers?.length > 0) {
        selectedOfferId = content.data.offers[0].id;
        const offer = content.data.offers[0];
        
        console.log('✅ Flight search successful!');
        console.log(`   Found ${content.data.offers.length} offers`);
        console.log(`   Selected: ${offer.airline} - $${offer.total_amount} ${offer.total_currency}`);
        console.log(`   Offer ID: ${selectedOfferId}`);
        
        currentStep++;
        setTimeout(sendNextRequest, 1000);
      } else {
        console.log('❌ No flights found');
        server.kill();
      }
    }
    
    // Handle flight details
    else if (json.id === 3 && json.result?.content) {
      const content = JSON.parse(json.result.content[0].text);
      if (content.success) {
        console.log('✅ Flight details retrieved successfully');
        console.log('   Ready to proceed with booking...');
        
        currentStep++;
        setTimeout(sendNextRequest, 1000);
      } else {
        console.log('❌ Failed to get flight details:', content.error);
        server.kill();
      }
    }
    
    // Handle booking result
    else if (json.id === 4 && json.result?.content) {
      const content = JSON.parse(json.result.content[0].text);
      console.log('\n🎯 BOOKING RESULT:');
      console.log(`   Success: ${content.success}`);
      
      if (content.success && content.data) {
        console.log('🎉 FLIGHT BOOKING SUCCESSFUL!');
        console.log(`   Order ID: ${content.data.order_id}`);
        console.log(`   Booking Reference: ${content.data.booking_reference}`);
        console.log(`   Status: ${content.data.status}`);
        console.log(`   Message: ${content.data.message}`);
        bookingData = content.data;
      } else {
        console.log('❌ Booking failed:', content.error);
      }
      
      currentStep++;
      setTimeout(sendNextRequest, 1000);
    }
    
  } catch (e) {
    // Log non-JSON responses (like status messages)
    if (response.includes('INFO:') || response.includes('ERROR:')) {
      console.log(`   ${response}`);
    }
  }
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

server.on('close', (code) => {
  console.log('\n' + '='.repeat(50));
  console.log('📋 COMPLETE BOOKING FLOW TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Steps completed: ${currentStep}/${steps.length}`);
  console.log(`Selected offer: ${selectedOfferId || 'None'}`);
  console.log(`Booking data: ${bookingData ? 'Success' : 'None'}`);
  console.log(`Server exit code: ${code}`);
  console.log('='.repeat(50));
});

// Start the test
console.log('🚀 Starting complete booking flow test...');
sendNextRequest();