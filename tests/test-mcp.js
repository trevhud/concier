#!/usr/bin/env node

import { spawn } from 'child_process';
import { resolve } from 'path';

const serverPath = resolve('./dist/index.js');

console.log('🚀 Starting Concier Travel MCP Server...\n');

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: {
    ...process.env,
    DUFFEL_ACCESS_TOKEN: process.env.DUFFEL_ACCESS_TOKEN || 'your-duffel-test-token',
    AMADEUS_CLIENT_ID: process.env.AMADEUS_CLIENT_ID || 'your-amadeus-client-id',
    AMADEUS_CLIENT_SECRET: process.env.AMADEUS_CLIENT_SECRET || 'your-amadeus-client-secret'
  }
});

// Test initialize request
const initRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: {}
    },
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  }
};

// Test list tools request
const listToolsRequest = {
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/list'
};

server.stdout.on('data', (data) => {
  console.log('📤 Server response:', data.toString());
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

server.on('close', (code) => {
  console.log(`\n🏁 Server exited with code ${code}`);
});

// Send test requests
setTimeout(() => {
  console.log('📨 Sending initialize request...');
  server.stdin.write(JSON.stringify(initRequest) + '\n');
}, 1000);

setTimeout(() => {
  console.log('📨 Sending list tools request...');
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
}, 2000);

setTimeout(() => {
  console.log('⏹️  Stopping server...');
  server.kill();
}, 5000);