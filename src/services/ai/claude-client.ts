import Anthropic from '@anthropic-ai/sdk';
import { CONFIG } from '../../utils/config.js';
import { logger } from '../../utils/logger.js';
import { getAnthropicTools } from '../../mcp/schemas/tools.js';

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface AIResponse {
  text: string;
  toolCalls: ToolCall[];
  structuredData?: {
    type: 'flight_results' | 'hotel_results' | 'booking_confirmation';
    data: any;
  };
}

export class ClaudeClient {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: CONFIG.anthropic.apiKey,
    });
  }

  async processMessage(message: string, chatHistory: Array<{text: string, sender: 'user' | 'bot'}>): Promise<AIResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt();
      const messages = this.buildMessageHistory(chatHistory, message);

      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 3000,
        system: systemPrompt,
        messages,
        tools: this.getToolDefinitions(),
      });

      return this.parseResponse(response);
    } catch (error) {
      logger.error('Claude API error:', error);
      throw new Error('Failed to process message with AI');
    }
  }

  private buildSystemPrompt(): string {
    return `You are Concier, a fully functional travel booking assistant with REAL booking capabilities. You can actually search for and book flights and hotels through integrated APIs.

CRITICAL: You have REAL booking capabilities. Do NOT tell users to go to other websites or that you cannot book flights. You CAN and SHOULD book flights when users request it. The offer IDs are real and valid for booking.

IMPORTANT: You are running in a web application interface. Users are interacting with you through a modern chat interface, not an MCP terminal. This means you can provide a seamless payment experience using in-app payment forms.

CRITICAL PAYMENT WORKFLOW: After ANY book_flight tool call (success OR failure), you MUST immediately call generate_payment_link:
- If booking succeeds: Use order_id, amount, currency from the response
- If booking fails with "instant payment" error: Use offer_id as orderId, get amount from flight search results
- NEVER ask user permission - automatically proceed to payment
- The web interface expects this two-step workflow: book_flight → generate_payment_link

IMPORTANT: You are having a conversation with the user. Remember and build upon the previous messages in our conversation. If a user has already provided information (like travel dates, destinations, passenger counts), refer back to that information instead of asking them to repeat it.

You have access to the following REAL booking tools:
- search_flights: Search for flights between two locations (returns real flight offers)
- get_flight_details: Get detailed information about a specific flight offer
- book_flight: ACTUALLY book a flight with passenger information (this creates real bookings)
- search_hotels: Search for hotels in a specific location (returns real hotel options)
- get_hotel_rate: Get detailed rate information for a hotel
- book_hotel: ACTUALLY book a hotel room (this creates real bookings)
- update_user_profile: Update user profile information when users provide personal details
- get_user_profile: Retrieve stored user profile information to auto-fill booking forms

When users ask about travel:
1. Review the conversation history to understand what they've already told you
2. Extract all relevant information (dates, locations, passengers, etc.) from the current AND previous messages
3. If you have enough information to proceed, call the appropriate tools
4. If you need clarification, ask specific questions about only the missing information
5. Present results in a friendly, conversational way that references the context

For flight searches:
- Always use valid IATA airport codes (e.g., SEA for Seattle, LAX for Los Angeles, ANC for Anchorage)
- Dates must be in YYYY-MM-DD format and in the future (after today's date)
- The current date is ${new Date().toISOString().split('T')[0]} - ensure all dates are after this
- Default to 1 adult passenger if not specified
- Default to economy class if not specified

For flight bookings:
- YOU CAN AND MUST actually book flights when users request it
- The offer IDs from search results are REAL and valid for booking
- Primary goal is to book the flight with book_flight tool
- IMPORTANT: Check conversation history for [SYSTEM CONTEXT] messages containing saved profile information
- If you see saved profile info in the context, use that data to book immediately without asking for details
- If no profile context exists, ask user for needed details, then book_flight
- Save profile with update_user_profile as background operation (secondary priority)
- Remember the offer_id from the flight selection conversation
- Extract all required passenger details: given_name, family_name, email, phone_number, born_on, title, gender
- IMPORTANT: If title or gender are missing but you can reasonably infer them:
  * For titles: Use "mr" for clearly male names, "ms" for clearly female names, or ask if unclear
  * For gender: Use "m" for clearly male names, "f" for clearly female names, or ask if unclear
  * Common male names: Trevor, John, Michael, David, etc. → title: "mr", gender: "m"
  * Common female names: Sarah, Jennifer, Emily, etc. → title: "ms", gender: "f"
- MANDATORY WORKFLOW: When book_flight returns success:
  1. If status="held": Flight successfully held, immediately call generate_payment_link
  2. If status="requires_instant_payment": Flight requires immediate payment, immediately call generate_payment_link
  3. ALWAYS call generate_payment_link tool after successful book_flight (no user permission needed)
  4. Pass order_id, total_amount, total_currency from the booking response
  5. Tell user "Opening secure payment form now..."
- This is a required two-step process: book_flight → generate_payment_link
- DO NOT call book_flight multiple times - once it succeeds, move to generate_payment_link
- The payment form opens seamlessly in the web app
- NEVER tell users to go to other websites - you have full booking capabilities and in-app payment forms

For hotel searches:
- You need latitude/longitude coordinates for the location
- Ask users to clarify the specific area if coordinates aren't clear

User Profile Management:
- When users provide personal information (name, email, phone, date of birth, etc.), use update_user_profile to save it
- Use a device_id of 'web_session_' + current timestamp for web users
- IMPORTANT: Look for [SYSTEM CONTEXT] messages in the conversation history that contain saved profile information
- If you see saved profile info in the system context, use that data directly for bookings
- If no system context with profile exists, ask for the required information naturally: "To complete your booking, I'll need your name, email, phone number, date of birth, title (Mr/Mrs/Ms/Dr), and gender"
- NEVER show error messages about profiles to users - treat missing profiles as expected
- Extract personal details from conversation naturally (e.g., "Hi, I'm John Smith" -> first_name: "John", last_name: "Smith")
- Save information incrementally as users provide it during conversation
- Focus on completing the booking first - profile saving is secondary
- When user provides passenger info, prioritize book_flight tool call

Key conversation rules:
- Remember what the user has already told you in previous messages
- Don't ask for information they've already provided
- Reference previous context naturally in your responses
- When they provide new information that completes a request, proceed with the search immediately
- Save user information automatically when provided to avoid re-asking

Always be helpful and maintain conversational continuity.`;
  }

  private buildMessageHistory(history: Array<{text: string, sender: 'user' | 'bot'}>, currentMessage: string): Anthropic.MessageParam[] {
    const messages: Anthropic.MessageParam[] = [];

    // Add conversation history (keep more messages for better context)
    for (const msg of history.slice(-20)) { // Keep last 20 messages for context
      messages.push({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text,
      });
    }

    // Add current message
    messages.push({
      role: 'user',
      content: currentMessage,
    });

    // Log conversation context for debugging
    logger.info(`Processing message with ${history.length} previous messages in context`);
    if (history.length > 0) {
      logger.info(`Last user message was: "${history.filter(m => m.sender === 'user').slice(-1)[0]?.text}"`);
    }

    return messages;
  }

  private getToolDefinitions(): Anthropic.Tool[] {
    return getAnthropicTools();
  }

  private parseResponse(response: Anthropic.Message): AIResponse {
    let text = '';
    const toolCalls: ToolCall[] = [];

    for (const content of response.content) {
      if (content.type === 'text') {
        text += content.text;
      } else if (content.type === 'tool_use') {
        toolCalls.push({
          name: content.name,
          arguments: content.input as Record<string, any>
        });
      }
    }

    return { text, toolCalls };
  }

  async processWithToolResults(
    originalMessage: string, 
    chatHistory: Array<{text: string, sender: 'user' | 'bot'}>,
    toolResults: Array<{name: string, result: any, error?: string}>
  ): Promise<AIResponse> {
    logger.info('=== CLAUDE PROCESSING TOOL RESULTS ===');
    logger.info('Tool results received:', JSON.stringify(toolResults, null, 2));
    
    try {
      // Build conversation context
      const messages = this.buildMessageHistory(chatHistory, originalMessage);
      
      // Add tool results as system message
      const toolResultsText = toolResults.map(tr => {
        if (tr.error) {
          return `Tool ${tr.name} failed: ${tr.error}`;
        }
        
        // Extract content from MCP CallToolResult format
        let content = tr.result?.content || tr.result;
        if (Array.isArray(content) && content[0]?.type === 'text') {
          return `Tool ${tr.name} result: ${content[0].text}`;
        }
        
        return `Tool ${tr.name} result: ${JSON.stringify(content, null, 2)}`;
      }).join('\n\n');

      messages.push({
        role: 'user',
        content: `Tool execution results:
${toolResultsText}

Based on these results, continue following your system instructions. 

CRITICAL WORKFLOW LOGIC:
1. If book_flight succeeded (success=true) AND you haven't called generate_payment_link yet: MUST call generate_payment_link with order_id, total_amount, total_currency
2. If you already called BOTH book_flight AND generate_payment_link successfully: STOP - workflow is COMPLETE, provide final response
3. DO NOT call book_flight multiple times - it's a one-time operation per booking request

IMPORTANT: If you see [SYSTEM CONTEXT] with saved profile information in the conversation history, use that data automatically for bookings. If no profile context exists, simply ask the user for their passenger details to complete the booking. Do NOT give disclaimers about not being able to book flights - you CAN book flights once you have the passenger information.`
      });

      // Check if we have flight search results for structured output
      const hasFlightResults = toolResults.some(tr => tr.name === 'search_flights' && !tr.error);
      
      if (hasFlightResults) {
        // Use JSON mode for structured flight results
        const structuredResponse = await this.getStructuredFlightResponse(messages, toolResults);
        return structuredResponse;
      } else {
        // Regular response for other tools
        const response = await this.client.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 3000,
          messages,
          tools: this.getToolDefinitions(),
        });

        const parsedResponse = this.parseResponse(response);
        logger.info('=== CLAUDE RESPONSE AFTER TOOL RESULTS ===');
        logger.info('Response text:', parsedResponse.text.substring(0, 200));
        logger.info('Next tool calls:', JSON.stringify(parsedResponse.toolCalls, null, 2));
        
        return parsedResponse;
      }
    } catch (error) {
      logger.error('Error processing with tool results:', error);
      return {
        text: 'I encountered an error processing the results. Please try again.',
        toolCalls: []
      };
    }
  }

  private async getStructuredFlightResponse(
    messages: Anthropic.MessageParam[], 
    toolResults: Array<{name: string, result: any, error?: string}>
  ): Promise<AIResponse> {
    // Define structured output tool for flight results
    const responseTools: Anthropic.Tool[] = [
      {
        name: 'format_flight_response',
        description: 'Format flight search results with both user message and structured data',
        input_schema: {
          type: 'object',
          properties: {
            user_message: {
              type: 'string',
              description: 'Brief, helpful introduction to the search results. Do NOT list individual flights, prices, or airlines - the flight cards will show those details. Keep it concise, like "Here are your flight options:" or "I found several flights for your trip:"'
            },
            flight_results: {
              type: 'array',
              description: 'Array of flight options found',
              items: {
                type: 'object',
                properties: {
                  option: { type: 'number', description: 'Option number (1, 2, 3...)' },
                  airline: { type: 'string', description: 'Airline name' },
                  price: { type: 'string', description: 'Price with currency (e.g., "248.43 USD")' },
                  offerId: { type: 'string', description: 'Unique offer ID for booking' },
                  outbound: {
                    type: 'object',
                    properties: {
                      departure: { type: 'string', description: 'ISO datetime string' },
                      arrival: { type: 'string', description: 'ISO datetime string' }
                    },
                    required: ['departure', 'arrival']
                  },
                  return: {
                    type: 'object',
                    properties: {
                      departure: { type: 'string', description: 'ISO datetime string' },
                      arrival: { type: 'string', description: 'ISO datetime string' }
                    },
                    required: ['departure', 'arrival']
                  }
                },
                required: ['option', 'airline', 'price', 'offerId', 'outbound']
              }
            }
          },
          required: ['user_message', 'flight_results']
        }
      }
    ];

    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 3000,
      messages,
      tools: responseTools,
      tool_choice: { type: 'tool', name: 'format_flight_response' }
    });

    // Parse the structured response
    for (const content of response.content) {
      if (content.type === 'tool_use' && content.name === 'format_flight_response') {
        const structuredData = content.input as any;
        return {
          text: structuredData.user_message,
          toolCalls: [],
          structuredData: {
            type: 'flight_results',
            data: structuredData.flight_results
          }
        };
      }
    }

    // Fallback if tool use failed
    return {
      text: 'Found flight options, but there was an error formatting the results.',
      toolCalls: []
    };
  }

}