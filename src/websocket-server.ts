import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { ClaudeClient } from './services/ai/claude-client.js';
import { setupFlightTools } from './mcp/tools/flights.js';
import { setupHotelTools } from './mcp/tools/hotels.js';
import { UserProfileTools } from './mcp/tools/user-profile.js';
import { setupPaymentTools } from './mcp/tools/payments.js';
import { logger } from './utils/logger.js';

interface ChatMessage {
  text: string;
  sender: 'user' | 'bot';
}

interface WebSocketMessage {
  type: 'chat' | 'clear_chat';
  payload?: {
    input?: string;
    context?: {
      isAuthenticated?: boolean;
      profile?: any;
    };
  };
}

interface WebSocketResponse {
  type: 'message' | 'error' | 'status' | 'flight_results' | 'hotel_results' | 'booking_confirmation' | 'payment_modal';
  payload: {
    text?: string;
    sender?: 'user' | 'bot';
    status?: string;
    error?: string;
    flights?: any[];
    hotels?: any[];
    bookingDetails?: any;
    paymentDetails?: {
      orderId: string;
      amount: string;
      currency: string;
      description?: string;
    };
  };
}

export class WebSocketTravelServer {
  private wss: WebSocketServer;
  private claudeClient: ClaudeClient;
  private flightTools: ReturnType<typeof setupFlightTools>;
  private hotelTools: ReturnType<typeof setupHotelTools>;
  private userProfileTools: UserProfileTools;
  private paymentTools: ReturnType<typeof setupPaymentTools>;
  private chatHistories: Map<string, ChatMessage[]> = new Map();

  constructor(server: any) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });
    
    this.claudeClient = new ClaudeClient();
    this.flightTools = setupFlightTools();
    this.hotelTools = setupHotelTools();
    this.userProfileTools = new UserProfileTools();
    this.paymentTools = setupPaymentTools();
    
    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers(): void {
    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      const connectionId = this.generateConnectionId();
      this.chatHistories.set(connectionId, []);
      
      logger.info(`WebSocket connection established: ${connectionId}`);
      
      // Send welcome message
      this.sendMessage(ws, {
        type: 'status',
        payload: { status: 'connected' }
      });

      ws.on('message', async (data: Buffer) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          await this.handleMessage(ws, connectionId, message);
        } catch (error) {
          logger.error('Error parsing WebSocket message:', error);
          this.sendMessage(ws, {
            type: 'error',
            payload: { error: 'Invalid message format' }
          });
        }
      });

      ws.on('close', () => {
        logger.info(`WebSocket connection closed: ${connectionId}`);
        this.chatHistories.delete(connectionId);
      });

      ws.on('error', (error: Error) => {
        logger.error(`WebSocket error for ${connectionId}:`, error);
      });
    });
  }

  private async handleMessage(ws: WebSocket, connectionId: string, message: WebSocketMessage): Promise<void> {
    const chatHistory = this.chatHistories.get(connectionId) || [];

    switch (message.type) {
      case 'chat':
        if (!message.payload?.input) {
          this.sendMessage(ws, {
            type: 'error',
            payload: { error: 'Missing input in chat message' }
          });
          return;
        }

        await this.handleChatMessage(ws, connectionId, message.payload.input, chatHistory, message.payload.context);
        break;

      case 'clear_chat':
        this.chatHistories.set(connectionId, []);
        this.sendMessage(ws, {
          type: 'status',
          payload: { status: 'chat_cleared' }
        });
        break;

      default:
        this.sendMessage(ws, {
          type: 'error',
          payload: { error: `Unknown message type: ${message.type}` }
        });
    }
  }

  private async handleChatMessage(ws: WebSocket, connectionId: string, input: string, chatHistory: ChatMessage[], context?: { isAuthenticated?: boolean; profile?: any }): Promise<void> {
    // Add user message to history
    const userMessage: ChatMessage = { text: input, sender: 'user' };
    chatHistory.push(userMessage);
    this.chatHistories.set(connectionId, chatHistory);

    // Send typing indicator
    this.sendMessage(ws, {
      type: 'status',
      payload: { status: 'thinking' }
    });

    try {
      // Create enhanced chat history with authentication context
      const enhancedChatHistory = this.injectAuthenticationContext(chatHistory, context);
      
      // Get AI response
      const aiResponse = await this.claudeClient.processMessage(input, enhancedChatHistory);
      
      // ReAct Pattern: Reasoning → Acting → Observing → (repeat if needed)
      if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
        await this.executeReActLoop(ws, input, enhancedChatHistory, chatHistory, connectionId, aiResponse);
      } else {
        // No tool calls, send AI text response directly
        if (aiResponse.text.trim()) {
          const botMessage: ChatMessage = { text: aiResponse.text, sender: 'bot' };
          chatHistory.push(botMessage);
          this.chatHistories.set(connectionId, chatHistory);

          this.sendMessage(ws, {
            type: 'message',
            payload: { text: aiResponse.text, sender: 'bot' }
          });
        }
      }

    } catch (error) {
      logger.error('Error processing chat message:', error);
      this.sendMessage(ws, {
        type: 'error',
        payload: { error: 'Failed to process message' }
      });
    }
  }

  private async executeToolsAndCollectResults(ws: WebSocket, toolCalls: any[]): Promise<Array<{name: string, result: any, error?: string}>> {
    const results = [];
    
    for (const toolCall of toolCalls) {
      logger.info(`=== EXECUTING TOOL: ${toolCall.name} ===`);
      logger.info('Tool arguments:', JSON.stringify(toolCall.arguments, null, 2));
      
      try {
        // Send status update for each tool
        this.sendMessage(ws, {
          type: 'status',
          payload: { status: `Executing ${toolCall.name.replace('_', ' ')}...` }
        });

        let result;
        switch (toolCall.name) {
          case 'search_flights':
            result = await this.flightTools.searchFlights(toolCall.arguments);
            break;
          case 'get_flight_details':
            result = await this.flightTools.getFlightDetails(toolCall.arguments);
            break;
          case 'book_flight':
            result = await this.flightTools.bookFlight(toolCall.arguments);
            break;
          case 'search_hotels':
            result = await this.hotelTools.searchHotels(toolCall.arguments);
            break;
          case 'get_hotel_rate':
            result = await this.hotelTools.getHotelRate(toolCall.arguments);
            break;
          case 'book_hotel':
            result = await this.hotelTools.bookHotel(toolCall.arguments);
            break;
          case 'update_user_profile':
            result = await this.userProfileTools.updateUserProfile(toolCall.arguments);
            this.sendMessage(ws, {
              type: 'status',
              payload: { status: 'Profile information saved' }
            });
            break;
          case 'get_user_profile':
            result = await this.userProfileTools.getUserProfile(toolCall.arguments);
            break;
          case 'generate_payment_link':
            result = await this.paymentTools.generatePaymentLink(toolCall.arguments, { isWebSocket: true });
            break;
          case 'get_payment_status':
            result = await this.paymentTools.getPaymentStatus(toolCall.arguments);
            break;
          default:
            throw new Error(`Unknown tool: ${toolCall.name}`);
        }

        logger.info(`=== TOOL ${toolCall.name} SUCCESS ===`);
        logger.info('Tool result:', JSON.stringify(result, null, 2));
        results.push({ name: toolCall.name, result });

      } catch (error) {
        logger.error(`=== TOOL ${toolCall.name} ERROR ===`);
        logger.error(`Error executing tool ${toolCall.name}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error message:', errorMessage);
        results.push({ 
          name: toolCall.name, 
          result: null, 
          error: errorMessage 
        });
      }
    }
    
    return results;
  }

  private async sendStructuredResponse(ws: WebSocket, response: any, chatHistory: ChatMessage[], connectionId: string): Promise<void> {
    // Add to chat history
    const botMessage: ChatMessage = { text: response.text, sender: 'bot' };
    chatHistory.push(botMessage);
    this.chatHistories.set(connectionId, chatHistory);

    // Send structured response based on type
    if (response.structuredData) {
      switch (response.structuredData.type) {
        case 'flight_results':
          this.sendMessage(ws, {
            type: 'flight_results',
            payload: {
              text: response.text,
              flights: response.structuredData.data
            }
          });
          break;
        case 'hotel_results':
          this.sendMessage(ws, {
            type: 'hotel_results',
            payload: {
              text: response.text,
              hotels: response.structuredData.data
            }
          });
          break;
        case 'booking_confirmation':
          this.sendMessage(ws, {
            type: 'booking_confirmation',
            payload: {
              text: response.text,
              bookingDetails: response.structuredData.data
            }
          });
          break;
        case 'payment_modal':
          logger.info('=== SENDING PAYMENT MODAL WEBSOCKET MESSAGE ===');
          logger.info('Payment modal data:', JSON.stringify(response.structuredData.data, null, 2));
          this.sendMessage(ws, {
            type: 'payment_modal',
            payload: {
              text: response.text,
              sender: 'bot',
              paymentDetails: {
                orderId: response.structuredData.data.orderId,
                amount: response.structuredData.data.amount,
                currency: response.structuredData.data.currency,
                description: response.structuredData.data.description
              }
            }
          });
          break;
        default:
          // Fallback to regular message
          this.sendMessage(ws, {
            type: 'message',
            payload: { text: response.text, sender: 'bot' }
          });
      }
    } else {
      // Check if this is a payment modal trigger (fallback method)
      const paymentModalTrigger = this.checkForPaymentModalTrigger(response.text);
      if (paymentModalTrigger) {
        logger.info('=== PAYMENT MODAL DETECTED VIA FALLBACK METHOD ===');
        logger.info('Payment modal trigger data:', JSON.stringify(paymentModalTrigger, null, 2));
        this.sendMessage(ws, {
          type: 'payment_modal',
          payload: {
            text: response.text,
            sender: 'bot',
            paymentDetails: paymentModalTrigger
          }
        });
      } else {
        // No structured data, send as regular message
        this.sendMessage(ws, {
          type: 'message',
          payload: { text: response.text, sender: 'bot' }
        });
      }
    }
  }

  private sendMessage(ws: WebSocket, response: WebSocketResponse): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(response));
    }
  }

  private injectAuthenticationContext(chatHistory: ChatMessage[], context?: { isAuthenticated?: boolean; profile?: any }): ChatMessage[] {
    if (!context) {
      return chatHistory;
    }

    // Create a system message that provides authentication context to the AI
    let systemMessage = '';
    
    if (context.isAuthenticated && context.profile) {
      // User is authenticated with profile data
      const profile = context.profile;
      systemMessage = `[SYSTEM CONTEXT] User is authenticated and has saved profile information:`;
      if (profile.firstName) systemMessage += `\n- Name: ${profile.firstName} ${profile.lastName || ''}`;
      if (profile.email) systemMessage += `\n- Email: ${profile.email}`;
      if (profile.phone) systemMessage += `\n- Phone: ${profile.phone}`;
      if (profile.dateOfBirth) systemMessage += `\n- Date of Birth: ${profile.dateOfBirth}`;
      if (profile.title) systemMessage += `\n- Title: ${profile.title}`;
      if (profile.gender) systemMessage += `\n- Gender: ${profile.gender}`;
      systemMessage += `\n\nFor bookings, use this profile information automatically without asking the user to provide it again. The user expects you to use their saved profile for a seamless booking experience.`;
    } else if (context.isAuthenticated) {
      // User is authenticated but no profile saved yet
      systemMessage = `[SYSTEM CONTEXT] User is authenticated but has not saved profile information yet. For bookings, you will need to collect their passenger details (name, email, phone, date of birth, title, gender).`;
    } else {
      // User is not authenticated
      systemMessage = `[SYSTEM CONTEXT] User is not authenticated. For bookings, you will need to collect their passenger details (name, email, phone, date of birth, title, gender). Consider suggesting they sign in to save their information for future bookings.`;
    }

    // Add the system message as a bot message that won't be displayed to the user
    // but will provide context to the AI
    return [
      ...chatHistory,
      { text: systemMessage, sender: 'bot' as const }
    ];
  }

  private generateConnectionId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private checkForPaymentModalTrigger(responseText: string): { orderId: string; amount: string; currency: string; description?: string } | null {
    try {
      // Look for the specific payment modal trigger in the response
      if (responseText.includes('Opening the secure payment form') || responseText.includes('opening seamlessly')) {
        // Try to extract payment details from the text
        const orderIdMatch = responseText.match(/Order ID: ([^\n\r,]+)/);
        const amountMatch = responseText.match(/Amount: ([^\s]+)\s+([A-Z]{3})/);
        
        if (orderIdMatch && amountMatch) {
          return {
            orderId: orderIdMatch[1].trim(),
            amount: amountMatch[1].trim(),
            currency: amountMatch[2].trim(),
            description: `Payment for order ${orderIdMatch[1].trim()}`
          };
        }
      }
      
      // Also check if we have a generate_payment_link tool result with payment_modal type
      if (responseText.includes('"type": "payment_modal"')) {
        try {
          const jsonMatch = responseText.match(/\{[\s\S]*?"type": "payment_modal"[\s\S]*?\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.data && parsed.data.orderId) {
              return {
                orderId: parsed.data.orderId,
                amount: parsed.data.amount,
                currency: parsed.data.currency,
                description: parsed.data.description
              };
            }
          }
        } catch (parseError) {
          logger.warn('Failed to parse payment modal JSON:', parseError);
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Error checking for payment modal trigger:', error);
      return null;
    }
  }

  private async executeReActLoop(
    ws: WebSocket, 
    originalInput: string, 
    enhancedChatHistory: ChatMessage[], 
    chatHistory: ChatMessage[], 
    connectionId: string, 
    initialResponse: any,
    maxIterations: number = 5
  ): Promise<void> {
    logger.info('=== STARTING REACT LOOP ===');
    logger.info('Initial AI response tool calls:', JSON.stringify(initialResponse.toolCalls, null, 2));
    let currentResponse = initialResponse;
    let iteration = 0;
    let workingChatHistory = [...enhancedChatHistory];
    let allToolResults: Array<{name: string, result: any, error?: string}> = [];

    while (currentResponse.toolCalls?.length > 0 && iteration < maxIterations) {
      iteration++;
      logger.info(`ReAct loop iteration ${iteration}/${maxIterations}`);

      // Acting: Execute the tool calls
      logger.info(`=== REACT ITERATION ${iteration}: ACTING ===`);
      logger.info('About to execute tools:', currentResponse.toolCalls.map((tc: any) => tc.name));
      const toolResults = await this.executeToolsAndCollectResults(ws, currentResponse.toolCalls);
      logger.info(`=== REACT ITERATION ${iteration}: TOOL RESULTS ===`);
      logger.info('Tool results:', JSON.stringify(toolResults, null, 2));
      
      // Collect all tool results for structured data processing
      allToolResults.push(...toolResults);
      
      // Observing: Let Claude see the tool results and reason about next steps
      logger.info(`=== REACT ITERATION ${iteration}: OBSERVING ===`);
      try {
        currentResponse = await this.claudeClient.processWithToolResults(
          originalInput, 
          workingChatHistory, 
          toolResults
        );
        logger.info(`=== REACT ITERATION ${iteration}: AI RESPONSE ===`);
        logger.info('AI next response text:', currentResponse.text.substring(0, 200));
        logger.info('AI next tool calls:', JSON.stringify(currentResponse.toolCalls, null, 2));

        // Add tool results to working history for next iteration
        const toolResultsMessage: ChatMessage = {
          text: `Tool results: ${JSON.stringify(toolResults, null, 2)}`,
          sender: 'bot'
        };
        workingChatHistory.push(toolResultsMessage);

        // If Claude wants to call more tools, continue the loop
        // Otherwise, break and send the final response
        if (!currentResponse.toolCalls || currentResponse.toolCalls.length === 0) {
          logger.info(`=== REACT LOOP COMPLETE: No more tool calls ===`);
          break;
        } else {
          logger.info(`=== REACT LOOP CONTINUING: ${currentResponse.toolCalls.length} more tool calls ===`);
        }

        // Send status update
        this.sendMessage(ws, {
          type: 'status',
          payload: { status: 'Processing additional steps...' }
        });

      } catch (error) {
        logger.error('Error in ReAct loop:', error);
        currentResponse = {
          text: 'I encountered an error while processing. Please try again.',
          toolCalls: []
        };
        break;
      }
    }

    if (iteration >= maxIterations) {
      logger.warn('ReAct loop reached maximum iterations');
      currentResponse.text += '\n\n(Reached maximum processing steps)';
    }

    logger.info('=== REACT LOOP FINAL RESPONSE ===');
    logger.info('Final response text:', currentResponse.text.substring(0, 200));
    logger.info('Final response has structured data:', !!currentResponse.structuredData);
    logger.info('All tool results from ReAct loop:', JSON.stringify(allToolResults, null, 2));
    
    // Check for payment modal in tool results and inject structured data
    const paymentModalData = this.extractPaymentModalFromToolResults(allToolResults);
    if (paymentModalData) {
      logger.info('=== PAYMENT MODAL DETECTED FROM TOOL RESULTS ===');
      logger.info('Payment modal data:', JSON.stringify(paymentModalData, null, 2));
      currentResponse.structuredData = {
        type: 'payment_modal',
        data: paymentModalData
      };
    }
    
    // Send final response
    await this.sendStructuredResponse(ws, currentResponse, chatHistory, connectionId);
  }

  public clearAllChatHistories(): void {
    logger.info('Clearing all WebSocket chat histories');
    this.chatHistories.clear();
  }

  private extractPaymentModalFromToolResults(toolResults: Array<{name: string, result: any, error?: string}>): any | null {
    try {
      // Look for generate_payment_link tool results
      const paymentToolResult = toolResults.find(tr => 
        tr.name === 'generate_payment_link' && !tr.error && tr.result
      );
      
      if (!paymentToolResult) {
        logger.info('No generate_payment_link tool result found');
        return null;
      }
      
      logger.info('Found generate_payment_link tool result:', JSON.stringify(paymentToolResult, null, 2));
      
      // Extract content from MCP CallToolResult format
      let content = paymentToolResult.result?.content || paymentToolResult.result;
      if (Array.isArray(content) && content[0]?.type === 'text') {
        const textContent = content[0].text;
        logger.info('Payment tool text content:', textContent);
        
        try {
          const parsed = JSON.parse(textContent);
          logger.info('Parsed payment tool data:', JSON.stringify(parsed, null, 2));
          
          // Check if this is a payment modal result
          if (parsed.success && parsed.data && parsed.data.type === 'payment_modal') {
            logger.info('Payment modal data extracted successfully');
            return {
              orderId: parsed.data.orderId,
              amount: parsed.data.amount,
              currency: parsed.data.currency,
              description: parsed.data.description
            };
          }
        } catch (parseError) {
          logger.warn('Failed to parse payment tool result JSON:', parseError);
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Error extracting payment modal from tool results:', error);
      return null;
    }
  }
}