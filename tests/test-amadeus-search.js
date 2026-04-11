#!/usr/bin/env node

import { spawn } from 'child_process';
import { resolve } from 'path';

const serverPath = resolve('./dist/index.js');

console.log('🛫 Testing Amadeus Flight Search with Concier Travel MCP Server...\n');

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

// Create a custom tool call for Amadeus search
const amadeusSearchRequest = {
  jsonrpc: '2.0',
  id: 4,
  method: 'tools/call',
  params: {
    name: 'search_flights_amadeus',
    arguments: {
      origin: 'NYC',
      destination: 'LAX',
      departure_date: '2025-07-15',
      adults: 1,
      max: 5
    }
  }
};

let responseCount = 0;

server.stdout.on('data', (data) => {
  const response = data.toString().trim();
  if (response) {
    console.log(`📤 Response ${++responseCount}:`, response);
    
    // Pretty print JSON responses
    try {
      const json = JSON.parse(response);
      if (json.result && json.result.content) {
        const content = JSON.parse(json.result.content[0].text);
        if (content.success && content.data) {
          console.log('✨ Flight Search Results:');
          console.log(`Found ${content.data.length} flights`);
          if (content.data.length > 0) {
            console.log('First flight:', {
              id: content.data[0].id,
              price: content.data[0].price?.total + ' ' + content.data[0].price?.currency,
              validatingAirlines: content.data[0].validatingAirlineCodes
            });
          }
        } else {
          console.log('✨ Response:', content);
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
  console.log(`\n🏁 Test completed with code ${code}`);
});

// Send requests
setTimeout(() => {
  console.log('📨 Initializing server...');
  server.stdin.write(JSON.stringify(initRequest) + '\n');
}, 500);

setTimeout(() => {
  console.log('📨 Searching for flights NYC → LAX with Amadeus...');
  server.stdin.write(JSON.stringify(amadeusSearchRequest) + '\n');
}, 1500);

setTimeout(() => {
  console.log('⏹️  Stopping server...');
  server.kill();
}, 10000);