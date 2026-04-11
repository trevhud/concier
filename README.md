# Concier

An AI-powered travel booking assistant that searches, books, and manages flights and hotels through a conversational chat interface, powered by Claude and exposed as an MCP server.

## Features

- **Flight search and booking** -- real-time flight offers via the Duffel API with hold-and-pay or instant booking workflows
- **Hotel search and booking** -- hotel availability and reservations via the Amadeus API with geographic coordinate-based search
- **Secure payments** -- in-app payment processing with Duffel Components, 3D Secure support, and price validation
- **User profiles** -- persistent traveler profiles stored in Supabase for one-click bookings
- **Multi-transport server** -- runs as an MCP server (stdio), HTTP server, or WebSocket server depending on your use case
- **ReAct agent loop** -- Claude autonomously chains tool calls (search, book, pay) in a reasoning-acting-observing loop with up to 5 iterations
- **Structured responses** -- flight and hotel results are returned as typed structured data, not just text, enabling rich UI rendering

## Architecture

```
React Chat UI
     |
     v
WebSocket / HTTP Server
     |
     v
Claude AI Engine (claude-3-5-sonnet)
     |
     v
MCP Tool Dispatcher
     |
     +---> Duffel API (flights, payments)
     +---> Amadeus API (hotels)
     +---> Supabase (user profiles, auth)
```

The system uses Claude as the AI backbone. User messages arrive via WebSocket, are processed by `ClaudeClient` with a system prompt and tool definitions, and Claude decides which MCP tools to invoke. Tool results feed back into Claude for further reasoning or a final response. The React frontend renders structured results (flight cards, payment modals) based on typed WebSocket messages.

In MCP (stdio) mode, the server exposes the same tools directly to any MCP-compatible client (Claude Desktop, Claude Code, etc.) without the AI layer -- the host application provides its own LLM.

## Tech Stack

**Backend**
- TypeScript, Node.js, Express
- `@modelcontextprotocol/sdk` -- MCP server implementation
- `@anthropic-ai/sdk` -- Claude AI client
- `@duffel/api` -- flight search, booking, and payments
- `amadeus` -- hotel search and booking
- `@supabase/supabase-js` -- database and authentication
- `ws` -- WebSocket server
- `zod` -- runtime schema validation

**Frontend**
- React 18 with React Router
- Tailwind CSS with `@tailwindcss/typography`
- `@duffel/components` -- payment UI components with 3D Secure
- `@supabase/auth-ui-react` -- authentication UI
- Framer Motion -- animations
- `react-markdown` -- message rendering

**Testing**
- Vitest with coverage and UI modes

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm
- API keys for Anthropic, Duffel, and Amadeus
- A Supabase project (for auth and user profiles)

### Install

```bash
git clone https://github.com/trevhud/concier.git
cd concier
npm install
cd frontend && npm install && cd ..
```

### Configure

Copy the example environment file and fill in your API keys:

```bash
cp .env.example .env
```

Required variables:

```
DUFFEL_ACCESS_TOKEN=your_duffel_token
AMADEUS_CLIENT_ID=your_amadeus_client_id
AMADEUS_CLIENT_SECRET=your_amadeus_client_secret
ANTHROPIC_API_KEY=your_anthropic_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

The Anthropic API key is only required for HTTP/WebSocket mode. In MCP (stdio) mode, the host application provides the LLM.

### Run

**MCP mode (stdio)** -- for use with Claude Desktop, Claude Code, or any MCP client:

```bash
npm start
```

**HTTP + WebSocket mode** -- serves the React frontend and exposes the WebSocket chat endpoint:

```bash
# Development with hot reload
npm run dev:http

# Development with frontend hot reload
npm run dev:hmr

# Production build and start
npm run start:full
```

The HTTP server starts on port 8080 by default. The WebSocket endpoint is available at `ws://localhost:8080/ws`. Set the `PORT` environment variable or pass `--http` to switch modes.

**MCP client configuration** (e.g., for Claude Desktop `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "concier": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/concier"
    }
  }
}
```

## MCP Tools

The server exposes 10 tools organized into four categories:

### Flights (Duffel API)

| Tool | Description |
|------|-------------|
| `search_flights` | Search for flights by origin, destination, date, passenger count, and cabin class |
| `get_flight_details` | Retrieve detailed information for a specific flight offer by offer ID |
| `book_flight` | Book a flight with full passenger details (name, DOB, contact, title, gender) |

### Hotels (Amadeus API)

| Tool | Description |
|------|-------------|
| `search_hotels` | Search hotels by geographic coordinates, radius, dates, and guest count |
| `get_hotel_rate` | Get detailed rate and availability for a specific hotel property |
| `book_hotel` | Book a hotel room with guest information |

### Payments

| Tool | Description |
|------|-------------|
| `generate_payment_link` | Generate a secure payment session for a flight or hotel order |
| `get_payment_status` | Check payment status for an existing order |

### User Profiles (Supabase)

| Tool | Description |
|------|-------------|
| `update_user_profile` | Save or update traveler profile information |
| `get_user_profile` | Retrieve a stored traveler profile by device ID |

## Frontend

The React frontend provides a chat interface with:

- Real-time WebSocket communication with typing indicators
- Structured flight result cards with airline, price, and schedule details
- In-app payment modal using Duffel Components (credit card entry with 3D Secure)
- Supabase authentication (sign up, sign in, profile management)
- Markdown rendering for AI responses

To run the frontend independently for development:

```bash
cd frontend
npm start
```

This starts the React dev server on port 3000. For full-stack development with both backend and frontend hot reload:

```bash
npm run dev:hmr
```

## License

MIT
