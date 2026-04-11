# WebSocket Architecture Plan

## Problem Statement

The current HTTP request/response architecture has a fundamental limitation: the AI can only send one response per user message. This creates issues when we need multiple sequential operations like:

1. Save user profile (background operation)
2. Book flight (primary operation) 
3. Provide status updates throughout the process

Currently, the AI gets "stuck" after saving a profile because it can't send multiple messages to guide the user through the complete booking flow.

## Proposed WebSocket Solution

### Architecture Overview

```
User Input → WebSocket → AI Processing → Multiple Streaming Messages → Frontend Updates
```

### Current Flow (HTTP)
```
User: "Jane Doe 01/15/1990 5551234567 jane@example.com"
↓ (single HTTP request)
AI: Calls update_user_profile → gets stuck, no follow-up
✗ User sees: "First, let me save your information to your profile:" (no continuation)
```

### Proposed Flow (WebSocket)
```
User: "Jane Doe 01/15/1990 5551234567 jane@example.com"
↓ (WebSocket message)
AI: Stream 1 → "Saving your profile information..."
AI: Stream 2 → "Profile saved! Now booking your flight..."
AI: Stream 3 → "Processing booking with American Airlines..."
AI: Stream 4 → "✅ Flight booked successfully! Reference: ABC123"
```

## Technical Implementation

### 1. Backend WebSocket Server

**File: `src/websocket-server.ts`**
- Add WebSocket support alongside existing HTTP server
- Handle real-time bidirectional communication
- Support streaming responses from Claude
- Maintain connection state and chat history

**Dependencies:**
- `ws` library for WebSocket server
- Integration with existing Claude client
- Reuse existing MCP tools and HTTP server logic

### 2. Frontend WebSocket Client

**File: `frontend/src/hooks/useWebSocket.js`**
- Replace fetch-based chat with WebSocket connection
- Handle connection states (connecting, connected, disconnected)
- Support message streaming and real-time updates
- Graceful fallback to HTTP if WebSocket fails

### 3. Streaming AI Responses

**Enhanced Claude Integration:**
- Modify Claude client to support streaming responses
- Enable multiple tool calls with progress updates
- Send intermediate messages during long operations

## Benefits

### User Experience
- **Real-time feedback**: See operations as they happen
- **Progress indicators**: Know when profile is saving, flight is booking
- **Natural conversation flow**: AI can send multiple messages like a human
- **No more stuck states**: Operations complete smoothly

### Technical Benefits
- **Better error handling**: Can report issues immediately
- **Improved debugging**: Real-time operation visibility
- **Future extensibility**: Enables features like typing indicators, live search results
- **Bandwidth efficiency**: Keep connection open vs. multiple HTTP requests

## Implementation Phases

### Phase 1: Basic WebSocket Infrastructure
1. Add WebSocket server endpoint (`/ws`)
2. Create frontend WebSocket hook
3. Replace chat interface to use WebSocket
4. Maintain feature parity with HTTP version

### Phase 2: Streaming Responses
1. Enable Claude to send multiple messages per user input
2. Add progress indicators for long operations
3. Stream tool execution results in real-time

### Phase 3: Enhanced Features
1. Typing indicators
2. Live flight search results
3. Real-time booking status updates
4. Connection recovery and offline support

## Migration Strategy

### Backward Compatibility
- Keep existing HTTP `/chat` endpoint during transition
- Add feature flag to toggle between HTTP/WebSocket modes
- Gradual rollout with fallback support

### Deployment Considerations
- WebSocket connections require persistent server instances
- Consider connection limits and scaling
- Add connection monitoring and health checks

## File Structure Changes

```
src/
├── http-server.ts (existing)
├── websocket-server.ts (new)
├── services/
│   ├── ai/
│   │   ├── claude-client.ts (enhance for streaming)
│   │   └── streaming-client.ts (new)
│   └── websocket/
│       ├── connection-manager.ts (new)
│       └── message-handler.ts (new)

frontend/src/
├── hooks/
│   ├── useWebSocket.js (new)
│   └── useChat.js (enhance to use WebSocket)
├── components/
│   ├── ChatInterface.js (update for streaming)
│   └── ConnectionStatus.js (new)
```

## Success Metrics

- ✅ User can complete booking flow without getting stuck
- ✅ Profile operations happen transparently in background  
- ✅ Real-time feedback throughout booking process
- ✅ Improved user satisfaction with booking experience
- ✅ Reduced support requests about "stuck" booking states

## Next Steps

1. **Document this architecture plan** ✓
2. **Implement WebSocket server endpoint**
3. **Create WebSocket client in frontend** 
4. **Add streaming responses from Claude**
5. **Test and iterate on user experience**