import { config } from 'dotenv';
import { logger } from './logger.js';

config();

export const CONFIG = {
  duffel: {
    accessToken: process.env.DUFFEL_ACCESS_TOKEN || '',
    apiUrl: 'https://api.duffel.com',
    version: 'v2',
    staysVersion: 'v1',
  },
  amadeus: {
    clientId: process.env.AMADEUS_CLIENT_ID || '',
    clientSecret: process.env.AMADEUS_CLIENT_SECRET || '',
    hostname: process.env.NODE_ENV === 'production' ? 'production' : 'test',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  },
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
  },
  server: {
    name: 'concier-travel-mcp',
    version: '1.0.0',
  },
} as const;

export function validateConfig(mode: 'mcp' | 'http' = 'mcp'): void {
  const errors: string[] = [];

  // Use logger instead of console.log to avoid interfering with MCP JSON-RPC
  logger.info(`Validating configuration for ${mode} mode...`);
  logger.info('Duffel token present:', !!CONFIG.duffel.accessToken);
  logger.info('Amadeus client ID present:', !!CONFIG.amadeus.clientId);
  logger.info('Amadeus client secret present:', !!CONFIG.amadeus.clientSecret);
  
  // Core API keys required for both modes
  if (!CONFIG.duffel.accessToken) {
    errors.push('DUFFEL_ACCESS_TOKEN is required');
  }

  if (!CONFIG.amadeus.clientId) {
    errors.push('AMADEUS_CLIENT_ID is required');
  }

  if (!CONFIG.amadeus.clientSecret) {
    errors.push('AMADEUS_CLIENT_SECRET is required');
  }

  // Anthropic API key only required for HTTP mode (web server with AI)
  if (mode === 'http') {
    logger.info('Anthropic API key present:', !!CONFIG.anthropic.apiKey);
    if (!CONFIG.anthropic.apiKey) {
      errors.push('ANTHROPIC_API_KEY is required for HTTP mode');
    }
  } else {
    logger.info('Anthropic API key not required for MCP mode');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }

  logger.info('Configuration validation passed!');
}
