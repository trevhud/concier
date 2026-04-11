#!/usr/bin/env node

import { spawn } from 'child_process';
import { resolve } from 'path';

const serverPath = resolve('./dist/index.js');

console.log('🛫 Testing Complete Flight Booking Flow with Concier Travel MCP Server...\n');

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: {
    ...process.env,
    DUFFEL_ACCESS_TOKEN: process.env.DUFFEL_ACCESS_TOKEN || 'your-duffel-test-token',
    AMADEUS_CLIENT_ID: process.env.AMADEUS_CLIENT_ID || 'your-amadeus-client-id',
    AMADEUS_CLIENT_SECRET: process.env.AMADEUS_CLIENT_SECRET || 'your-amadeus-client-secret'
  }
});

// Initialize
const initRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: { tools: {} },
    clientInfo: { name: 'test-client', version: '1.0.0' }
  }
};

// Step 1: Search for flights
const flightSearchRequest = {
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
};

let selectedOfferId = null;
let responseCount = 0;

server.stdout.on('data', (data) => {
  const response = data.toString().trim();
  if (response) {
    console.log(`📤 Response ${++responseCount}:`, response);
    
    try {
      const json = JSON.parse(response);
      
      // Handle flight search results
      if (json.id === 2 && json.result && json.result.content) {
        const content = JSON.parse(json.result.content[0].text);
        if (content.success && content.data && content.data.offers.length > 0) {
          selectedOfferId = content.data.offers[0].id;
          console.log(`✈️  Selected flight offer: ${selectedOfferId}`);
          console.log(`   Price: ${content.data.offers[0].total_amount} ${content.data.offers[0].total_currency}`);
          console.log(`   Airline: ${content.data.offers[0].airline}`);
          
          // Step 2: Get flight details
          setTimeout(() => {
            console.log('\n📨 Getting flight details...');
            const getDetailsRequest = {
              jsonrpc: '2.0',
              id: 3,
              method: 'tools/call',
              params: {
                name: 'get_flight_details',
                arguments: {
                  offer_id: selectedOfferId
                }
              }
            };
            server.stdin.write(JSON.stringify(getDetailsRequest) + '\n');
          }, 1000);
        }
      }
      
      // Handle flight details response
      if (json.id === 3 && json.result && selectedOfferId) {
        console.log('✅ Flight details retrieved');
        
        // Step 3: Book the flight
        setTimeout(() => {
          console.log('\n📨 Booking the flight...');
          const bookFlightRequest = {
            jsonrpc: '2.0',
            id: 4,
            method: 'tools/call',
            params: {
              name: 'book_flight',
              arguments: {
                offer_id: selectedOfferId,
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
          server.stdin.write(JSON.stringify(bookFlightRequest) + '\n');
        }, 1000);
      }
      
      // Handle booking response
      if (json.id === 4 && json.result && json.result.content) {
        const content = JSON.parse(json.result.content[0].text);
        if (content.success) {
          console.log('\n🎉 BOOKING SUCCESSFUL!');
          console.log('📋 Booking Details:');
          console.log(`   Order ID: ${content.data.order_id}`);
          console.log(`   Booking Reference: ${content.data.booking_reference}`);
          console.log(`   Status: ${content.data.status}`);
          console.log(`   Message: ${content.data.message}`);
        } else {
          console.log('\n❌ Booking failed:', content.error);
        }
        
        // Stop server after booking attempt
        setTimeout(() => {
          console.log('\n⏹️  Stopping server...');
          server.kill();
        }, 2000);
      }
      
    } catch (e) {
      // Not JSON, ignore
    }
  }
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

server.on('close', (code) => {
  console.log(`\n🏁 Complete booking flow test finished with code ${code}`);
});

// Start the flow
setTimeout(() => {
  console.log('📨 Initializing server...');
  server.stdin.write(JSON.stringify(initRequest) + '\n');
}, 500);

setTimeout(() => {
  console.log('📨 Step 1: Searching for flights JFK → LAX...');
  server.stdin.write(JSON.stringify(flightSearchRequest) + '\n');
}, 1500);

// Fallback timeout
setTimeout(() => {
  console.log('⏰ Test timeout reached, stopping server...');
  server.kill();
}, 20000);