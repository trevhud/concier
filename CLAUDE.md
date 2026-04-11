# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development Workflow
- **Build**: `npm run build` or `make build`
- **Build frontend**: `npm run build:frontend` - Builds React frontend
- **Build all**: `npm run build:all` - Builds both frontend and backend
- **Development server (MCP)**: `npm run dev` or `make dev` (with watch mode)
- **Development server (HTTP + Frontend)**: `npm run dev:full` - One command for full stack
- **Hot Module Replacement (HMR)**: `npm run dev:hmr` - **RECOMMENDED** Auto-rebuilds frontend on changes
- **Start MCP server**: `npm run start` or `make start`
- **Start HTTP server**: `npm run start:http` - Serves API and frontend on port 8080
- **Start full application**: `npm run start:full` - Production build and start

#### HMR Development (Recommended)
For the best development experience with automatic frontend rebuilding:
```bash
npm run dev:hmr
```
This runs both the HTTP server with watch mode AND watches frontend files for changes, automatically rebuilding when you edit React components, styles, or other frontend files. The server runs on http://localhost:8080.

### Testing
- **Run all tests**: `npm run test:all` or `tsx src/tests/test-runner.ts all`
- **Run specific test categories**: 
  - `npm run test:flights` - Flight-related tests only
  - `npm run test:integration` - MCP protocol compliance tests
  - `npm run test:coverage` - Generate coverage report
- **Run single test file**: `npx vitest src/tests/flights/search.test.ts`
- **Watch mode**: `npm run test:watch`
- **Test UI**: `npm run test:ui`

### Code Quality
- **Lint**: `npm run lint` or `make lint`
- **Format**: `npm run format` or `make format`
- **Type checking**: `npm run typecheck` or `make typecheck`

## Architecture Overview

This is a TypeScript-based travel booking system with dual interfaces:
1. **MCP Server**: Model Context Protocol server for LLM integrations
2. **HTTP Server**: Web API with React frontend for direct user interaction

Both interfaces use the same underlying travel booking tools and services.

### Core Components

**MCP Server (`src/index.ts`)**
- Main entry point that implements the MCP protocol
- Registers 6 tools: 3 for flights, 3 for hotels
- Handles JSON-RPC communication via stdio transport
- Uses `@modelcontextprotocol/sdk` for protocol compliance

**HTTP Server (`src/http-server.ts`)**
- Express.js server providing `/chat` and `/clear_chat` endpoints
- Integrates Claude Sonnet 4 for natural language processing
- Serves React frontend statically from `frontend/build/`
- Executes same MCP tools based on AI-parsed user requests

**WebSocket Server (`src/websocket-server.ts`)**
- Real-time bidirectional communication via WebSocket on `/ws` endpoint
- Enables streaming responses and multiple sequential operations
- Implements ReACT pattern (Reasoning → Acting → Observing → Responding)
- Uses Anthropic's structured output with JSON mode for flight/hotel results
- Supports message types: chat, status, flight_results, hotel_results, booking_confirmation, error

**AI Integration (`src/services/ai/claude-client.ts`)**
- Claude Sonnet 4 client for natural language understanding
- Converts user messages to structured MCP tool calls
- Handles conversation context and tool call orchestration

**Service Layer (`src/services/`)**
- **Duffel SDK Client** (`duffel/sdk-client.ts`): Primary API for flights and hotels
- **Amadeus Client** (`amadeus/client.ts`): Secondary flight API for additional coverage
- **Router** (`routing/router.ts`): Intelligent request classification (flight vs hotel)

**Frontend (`frontend/`)**
- React-based chat interface for user interaction
- WebSocket-powered real-time communication with connection management
- Reactive state management using custom `useWebSocket` hook
- Displays flight cards, hotel results, and booking confirmations with structured data
- Connection status indicators and automatic reconnection handling

**Tool Implementation (`src/mcp/tools/`)**
- **Flight Tools** (`flights.ts`): Search, details, and booking operations
- **Hotel Tools** (`hotels.ts`): Search, rates, and booking operations
- Each tool returns standardized `CallToolResult` with JSON-formatted responses

**Type System (`src/types/`)**
- **Core Types** (`index.ts`): Flight/hotel search params, passenger info, shared types
- **Amadeus Types** (`amadeus.d.ts`): API-specific type definitions
- Full TypeScript coverage with strict typing enabled

### Key Architectural Patterns

**Multi-Provider Strategy**
- Duffel as primary provider for comprehensive coverage
- Amadeus as secondary provider for additional flight data
- Abstracted through service layer for easy provider switching

**MCP Protocol Implementation**
- Tool registration with JSON schemas for validation
- Standardized error handling with `McpError` types
- JSON-RPC 2.0 compliant request/response handling

**Type-Safe API Integration**
- Pydantic-style validation through TypeScript interfaces
- Structured error responses with success/failure indicators
- Comprehensive logging for debugging and monitoring

**WebSocket Real-Time Architecture**
- Streaming tool execution with progress indicators
- Reactive state management driven by message types
- Connection resilience with automatic reconnection
- Structured data separation from conversational text

## Development Guidelines

### Code Style
- Use TypeScript ES2022+ features with strict type checking
- Follow ESM module syntax (`.js` extensions in imports)
- Prefer `async/await` over promises for I/O operations
- Use descriptive variable names and comprehensive error handling

### Testing Strategy
- **Mock-driven testing**: All external APIs are mocked using Vitest
- **Comprehensive coverage**: 85 tests covering all flight booking permutations
- **Test categories**: Unit tests for tools, integration tests for MCP protocol
- **Edge case testing**: Error scenarios, invalid inputs, API failures

### API Integration
- Environment variables: `DUFFEL_ACCESS_TOKEN`, `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET`, `ANTHROPIC_API_KEY`
- Configuration management through `src/utils/config.ts`
- Structured logging via `src/utils/logger.ts`

## Usage Modes

### MCP Mode (Default)
For LLM integrations via Model Context Protocol:
```bash
npm run dev        # Development
npm run start      # Production
```

### HTTP Mode with Frontend
For direct user interaction with web interface:
```bash
npm run dev:full   # Development (builds frontend + starts server)
npm run start:full # Production (builds all + starts server)
```

The HTTP server runs on port 8080 and serves both the API endpoints and the React frontend.

### WebSocket Mode (Real-Time)
For real-time streaming responses and multiple sequential operations:
```bash
npm run dev:hmr    # Development with WebSocket + HMR (RECOMMENDED)
npm run start:full # Production with WebSocket support
```

The WebSocket server runs on the same port as HTTP (8080) with `/ws` endpoint. This enables:
- Streaming tool execution with live progress updates
- Multiple sequential AI responses (e.g., "Profile saved" → "Searching flights..." → "Found results")
- Real-time connection status and error handling
- Reactive state management without imperative loading states

## Migration Context

This codebase was migrated from Python/LangGraph to TypeScript/MCP:
- **From**: Python with LangGraph state management
- **To**: TypeScript with MCP protocol for LLM tool integration
- **Key changes**: Service-oriented architecture, standardized tool interface, enhanced type safety

The .cursorrules file contains outdated Python guidance and should be ignored for this TypeScript implementation.