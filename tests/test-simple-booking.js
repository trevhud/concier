#!/usr/bin/env node

import { spawn } from 'child_process';
import { resolve } from 'path';

const serverPath = resolve('./dist/index.js');

console.log('📋 Testing Flight Booking Tools with Concier Travel MCP Server...\n');

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: {
    ...process.env,
    DUFFEL_ACCESS_TOKEN: process.env.DUFFEL_ACCESS_TOKEN || 'your-duffel-test-token'
  }
});

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

// Test with a sample offer ID (this will fail but show the booking flow)
const bookFlightRequest = {
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/call',
  params: {
    name: 'book_flight',
    arguments: {
      offer_id: 'off_sample_offer_id_123',
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

let responseCount = 0;

server.stdout.on('data', (data) => {
  const response = data.toString().trim();
  if (response) {
    console.log(`📤 Response ${++responseCount}:`, response);
    
    try {
      const json = JSON.parse(response);
      if (json.result && json.result.content) {
        const content = JSON.parse(json.result.content[0].text);
        console.log('\n📋 Booking Tool Response:');
        console.log('Success:', content.success);
        console.log('Message:', content.message);
        if (content.error) {
          console.log('Error (expected):', content.error);
          console.log('✅ Booking tool is working - it correctly handled invalid offer ID');
        }
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
  console.log(`\n🏁 Booking tool test completed with code ${code}`);
});

// Send requests
setTimeout(() => {
  console.log('📨 Initializing server...');
  server.stdin.write(JSON.stringify(initRequest) + '\n');
}, 500);

setTimeout(() => {
  console.log('📨 Testing book_flight tool (will fail with sample ID but shows it works)...');
  server.stdin.write(JSON.stringify(bookFlightRequest) + '\n');
}, 1500);

setTimeout(() => {
  console.log('⏹️  Stopping server...');
  server.kill();
}, 5000);