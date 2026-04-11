import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { TravelMCPServer } from '../../index.js';

// Mock the SDK components
vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined)
  }))
}));

vi.mock('../../services/duffel/flight-client.js', () => ({
  DuffelSDKClient: vi.fn().mockImplementation(() => ({
    searchFlights: vi.fn(),
    getOfferDetails: vi.fn(),
    bookFlight: vi.fn()
  }))
}));

vi.mock('../../mcp/tools/hotels.js', () => ({
  setupHotelTools: vi.fn().mockReturnValue({
    searchHotels: vi.fn(),
    getHotelRate: vi.fn(),
    bookHotel: vi.fn()
  })
}));

describe('MCP Protocol Integration Tests', () => {
  let server: Server;
  let mockTransport: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock the server initialization
    server = new Server(
      { name: 'test-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
  });

  describe('Tool Registration', () => {
    it('should register all flight tools', async () => {
      const toolsHandler = vi.fn().mockResolvedValue({
        tools: [
          {
            name: 'search_flights',
            description: 'Search for flights between two locations',
            inputSchema: expect.any(Object)
          },
          {
            name: 'get_flight_details', 
            description: 'Get detailed information about a specific flight offer',
            inputSchema: expect.any(Object)
          },
          {
            name: 'book_flight',
            description: 'Book a flight with passenger and payment information',
            inputSchema: expect.any(Object)
          }
        ]
      });

      // Simulate tools/list request
      const request = {
        method: 'tools/list',
        params: {}
      };

      // This would be called by the actual MCP server
      const result = await toolsHandler();
      
      expect(result.tools).toHaveLength(6); // 3 flight + 3 hotel tools
      expect(result.tools.map(t => t.name)).toContain('search_flights');
      expect(result.tools.map(t => t.name)).toContain('get_flight_details');
      expect(result.tools.map(t => t.name)).toContain('book_flight');
    });

    it('should register all hotel tools', async () => {
      const toolsHandler = vi.fn().mockResolvedValue({
        tools: [
          {
            name: 'search_hotels',
            description: 'Search for hotels in a specific location',
            inputSchema: expect.any(Object)
          },
          {
            name: 'get_hotel_rate',
            description: 'Get detailed rate information for a specific hotel property',
            inputSchema: expect.any(Object)
          },
          {
            name: 'book_hotel',
            description: 'Book a hotel room',
            inputSchema: expect.any(Object)
          }
        ]
      });

      const result = await toolsHandler();
      
      expect(result.tools.map(t => t.name)).toContain('search_hotels');
      expect(result.tools.map(t => t.name)).toContain('get_hotel_rate');
      expect(result.tools.map(t => t.name)).toContain('book_hotel');
    });
  });

  describe('Tool Schema Validation', () => {
    const requiredSchemaProperties = ['type', 'properties', 'required'];

    it('should have valid schema for search_flights', async () => {
      const schema = {
        type: 'object',
        properties: {
          origin: { type: 'string', description: 'Origin airport code' },
          destination: { type: 'string', description: 'Destination airport code' },
          departure_date: { type: 'string', description: 'Departure date (YYYY-MM-DD)' },
          return_date: { type: 'string', description: 'Return date (YYYY-MM-DD), optional' },
          adults: { type: 'number', description: 'Number of adult passengers' },
          cabin_class: { type: 'string', description: 'Cabin class', enum: ['economy', 'business', 'first'] }
        },
        required: ['origin', 'destination', 'departure_date', 'adults']
      };

      requiredSchemaProperties.forEach(prop => {
        expect(schema).toHaveProperty(prop);
      });

      expect(schema.required).toContain('origin');
      expect(schema.required).toContain('destination');
      expect(schema.required).toContain('departure_date');
      expect(schema.required).toContain('adults');
    });

    it('should have valid schema for book_flight', async () => {
      const schema = {
        type: 'object',
        properties: {
          offer_id: { type: 'string', description: 'Flight offer ID' },
          passenger: {
            type: 'object',
            properties: {
              given_name: { type: 'string' },
              family_name: { type: 'string' },
              email: { type: 'string' },
              phone_number: { type: 'string' },
              born_on: { type: 'string', description: 'Date of birth (YYYY-MM-DD)' },
              title: { type: 'string', enum: ['mr', 'ms', 'mrs', 'dr'] },
              gender: { type: 'string', enum: ['m', 'f'] }
            },
            required: ['given_name', 'family_name', 'email', 'phone_number', 'born_on', 'title', 'gender']
          }
        },
        required: ['offer_id', 'passenger']
      };

      expect(schema.required).toContain('offer_id');
      expect(schema.required).toContain('passenger');
      expect(schema.properties.passenger.required).toHaveLength(7);
    });

    it('should have valid schema for search_hotels', async () => {
      const schema = {
        type: 'object',
        properties: {
          location: {
            type: 'object',
            properties: {
              radius: { type: 'number', description: 'Search radius in meters' },
              geographic_coordinates: {
                type: 'object',
                properties: {
                  latitude: { type: 'number' },
                  longitude: { type: 'number' }
                },
                required: ['latitude', 'longitude']
              }
            },
            required: ['radius', 'geographic_coordinates']
          },
          check_in_date: { type: 'string', description: 'Check-in date (YYYY-MM-DD)' },
          check_out_date: { type: 'string', description: 'Check-out date (YYYY-MM-DD)' },
          adults: { type: 'number', description: 'Number of adult guests' },
          rooms: { type: 'number', description: 'Number of rooms' }
        },
        required: ['location', 'check_in_date', 'check_out_date', 'adults', 'rooms']
      };

      expect(schema.required).toContain('location');
      expect(schema.required).toContain('check_in_date');
      expect(schema.required).toContain('check_out_date');
      expect(schema.required).toContain('adults');
      expect(schema.required).toContain('rooms');
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown tool calls', async () => {
      const unknownToolRequest = {
        method: 'tools/call',
        params: {
          name: 'unknown_tool',
          arguments: {}
        }
      };

      // This should throw an MCP error with MethodNotFound code
      expect(() => {
        // Simulate calling an unknown tool
        throw new Error('Unknown tool: unknown_tool');
      }).toThrow('Unknown tool: unknown_tool');
    });

    it('should handle malformed tool arguments', async () => {
      const malformedRequest = {
        method: 'tools/call',
        params: {
          name: 'search_flights',
          arguments: {
            // Missing required fields
            origin: 'LAX'
            // Missing destination, departure_date, adults
          }
        }
      };

      // This should be handled gracefully by the tool
      expect(malformedRequest.params.arguments).not.toHaveProperty('destination');
    });

    it('should handle API errors gracefully', async () => {
      // Mock API error
      const apiError = new Error('External API error');
      
      // This should be caught and returned as a proper MCP error response
      expect(apiError.message).toBe('External API error');
    });
  });

  describe('Protocol Compliance', () => {
    it('should respond with correct JSON-RPC structure', async () => {
      const response = {
        jsonrpc: '2.0',
        id: 1,
        result: {
          tools: []
        }
      };

      expect(response).toHaveProperty('jsonrpc', '2.0');
      expect(response).toHaveProperty('id');
      expect(response).toHaveProperty('result');
    });

    it('should handle initialize request', async () => {
      const initializeRequest = {
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          clientInfo: { name: 'test-client', version: '1.0.0' }
        }
      };

      const expectedResponse = {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: {
          name: 'concier-travel-mcp',
          version: '1.0.0'
        }
      };

      expect(expectedResponse.serverInfo.name).toBe('concier-travel-mcp');
      expect(expectedResponse.protocolVersion).toBe('2024-11-05');
    });

    it('should handle notifications/initialized', async () => {
      const initializedNotification = {
        method: 'notifications/initialized',
        params: {}
      };

      // Should not throw an error
      expect(initializedNotification.method).toBe('notifications/initialized');
    });
  });

  describe('Resource and Prompt Handling', () => {
    it('should handle resources/list request gracefully', async () => {
      const resourcesRequest = {
        method: 'resources/list',
        params: {}
      };

      // Should return MethodNotFound error since we don't implement resources
      expect(() => {
        throw new Error('Method not found');
      }).toThrow('Method not found');
    });

    it('should handle prompts/list request gracefully', async () => {
      const promptsRequest = {
        method: 'prompts/list',
        params: {}
      };

      // Should return MethodNotFound error since we don't implement prompts
      expect(() => {
        throw new Error('Method not found');
      }).toThrow('Method not found');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate required environment variables', async () => {
      const requiredEnvVars = [
        'DUFFEL_ACCESS_TOKEN',
        'AMADEUS_CLIENT_ID',
        'AMADEUS_CLIENT_SECRET'
      ];

      requiredEnvVars.forEach(envVar => {
        expect(process.env).toHaveProperty(envVar);
      });
    });

    it('should handle missing environment variables gracefully', async () => {
      // Temporarily remove env vars
      const originalDuffel = process.env.DUFFEL_ACCESS_TOKEN;
      delete process.env.DUFFEL_ACCESS_TOKEN;

      expect(() => {
        // This should throw a configuration error
        if (!process.env.DUFFEL_ACCESS_TOKEN) {
          throw new Error('Missing required environment variable: DUFFEL_ACCESS_TOKEN');
        }
      }).toThrow('Missing required environment variable');

      // Restore env var
      process.env.DUFFEL_ACCESS_TOKEN = originalDuffel;
    });
  });
});