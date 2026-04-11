#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError
} from '@modelcontextprotocol/sdk/types.js';

import { CONFIG, validateConfig } from './utils/config.js';
import { logger } from './utils/logger.js';
import { setupFlightTools } from './mcp/tools/flights.js';
import { setupHotelTools } from './mcp/tools/hotels.js';
import { UserProfileTools } from './mcp/tools/user-profile.js';
import { setupPaymentTools } from './mcp/tools/payments.js';
import { getMCPTools } from './mcp/schemas/tools.js';

class TravelMCPServer {
  private server: Server;
  private userProfileTools: UserProfileTools;

  constructor() {
    this.userProfileTools = new UserProfileTools();
    this.server = new Server(
      {
        name: CONFIG.server.name,
        version: CONFIG.server.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: getMCPTools()
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_flights':
            return await setupFlightTools().searchFlights(args);
          case 'get_flight_details':
            return await setupFlightTools().getFlightDetails(args);
          case 'book_flight':
            return await setupFlightTools().bookFlight(args);
          case 'search_hotels':
            return await setupHotelTools().searchHotels(args);
          case 'get_hotel_rate':
            return await setupHotelTools().getHotelRate(args);
          case 'book_hotel':
            return await setupHotelTools().bookHotel(args);
          case 'update_user_profile':
            return await this.userProfileTools.updateUserProfile(args);
          case 'get_user_profile':
            return await this.userProfileTools.getUserProfile(args);
          case 'generate_payment_link':
            return await setupPaymentTools().generatePaymentLink(args);
          case 'get_payment_status':
            return await setupPaymentTools().getPaymentStatus(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        logger.error(`Error executing tool ${name}:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to execute tool: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });
  }

  async run(): Promise<void> {
    try {
      validateConfig('mcp');
      
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      logger.info(`${CONFIG.server.name} v${CONFIG.server.version} started`);
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // Check if we should run in HTTP mode
  const args = process.argv.slice(2);
  const isHttpMode = args.includes('--http') || process.env.HTTP_MODE === 'true';

  if (isHttpMode) {
    // Run HTTP server for frontend
    import('./http-server.js').then(({ HTTPTravelServer }) => {
      const httpServer = new HTTPTravelServer();
      const port = parseInt(process.env.PORT || '8080');
      httpServer.start(port).catch((error) => {
        logger.error('HTTP server crashed:', error);
        process.exit(1);
      });
    });
  } else {
    // Run MCP server (default mode)
    const server = new TravelMCPServer();
    server.run().catch((error) => {
      logger.error('Server crashed:', error);
      process.exit(1);
    });
  }
}