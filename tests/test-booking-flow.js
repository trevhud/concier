#!/usr/bin/env node

import { spawn } from 'child_process';
import { resolve } from 'path';

const serverPath = resolve('./dist/index.js');

console.log('🎯 Simple Flight Search → Booking Test\n');

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: {
    ...process.env,
    DUFFEL_ACCESS_TOKEN: process.env.DUFFEL_ACCESS_TOKEN || 'your-duffel-test-token'
  }
});

let step = 0;
let selectedOfferId = null;

const sendRequest = (request) => {
  console.log(`📨 Sending: ${request.params.name || request.method}`);
  server.stdin.write(JSON.stringify(request) + '\n');
};

const handleResponse = (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    if (line.includes('{"result":')) {
      try {
        const json = JSON.parse(line);
        
        if (json.id === 1) {
          console.log('✅ Server initialized');
          step++;
          // Search for flights
          setTimeout(() => {
            sendRequest({
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
            });
          }, 500);
        }
        
        else if (json.id === 2 && json.result?.content) {
          const content = JSON.parse(json.result.content[0].text);
          if (content.success && content.data?.offers?.length > 0) {
            selectedOfferId = content.data.offers[0].id;
            const offer = content.data.offers[0];
            
            console.log(`✅ Found flights! Selected: ${offer.airline} - $${offer.total_amount}`);
            console.log(`📋 Offer ID: ${selectedOfferId}`);
            step++;
            
            // Book the flight
            setTimeout(() => {
              sendRequest({
                jsonrpc: '2.0',
                id: 3,
                method: 'tools/call',
                params: {
                  name: 'book_flight',
                  arguments: {
                    offer_id: selectedOfferId,
                    passenger: {
                      given_name: 'John',
                      family_name: 'Doe',
                      email: 'john.doe@example.com',
                      phone_number: '+447700900000',
                      born_on: '1990-01-01',
                      title: 'mr',
                      gender: 'm'
                    }
                  }
                }
              });
            }, 1000);
          }
        }
        
        else if (json.id === 3 && json.result?.content) {
          const content = JSON.parse(json.result.content[0].text);
          
          console.log('\n🎯 BOOKING RESULT:');
          console.log(`   Success: ${content.success}`);
          console.log(`   Message: ${content.message}`);
          
          if (content.success && content.data) {
            console.log('\n🎉 BOOKING SUCCESSFUL!');
            console.log(`   Order ID: ${content.data.order_id}`);
            console.log(`   Booking Reference: ${content.data.booking_reference}`);
            console.log(`   Status: ${content.data.status}`);
          } else {
            console.log(`   Error: ${content.error}`);
          }
          
          step++;
          // End test
          setTimeout(() => {
            console.log('\n✅ Test completed successfully!');
            server.kill();
          }, 1000);
        }
        
      } catch (e) {
        // Ignore non-JSON lines
      }
    }
  }
};

server.stdout.on('data', handleResponse);

server.on('close', (code) => {
  console.log('\n' + '='.repeat(40));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(40));
  console.log(`Steps completed: ${step}/3`);
  console.log(`Offer ID acquired: ${selectedOfferId ? 'Yes' : 'No'}`);
  console.log(`Exit code: ${code}`);
  console.log('='.repeat(40));
});

// Start test
setTimeout(() => {
  sendRequest({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      clientInfo: { name: 'booking-flow-test', version: '1.0.0' }
    }
  });
}, 500);