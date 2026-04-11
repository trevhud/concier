// Shared tool definitions for both MCP server and Claude client
export const TOOL_DEFINITIONS = {
  search_flights: {
    name: 'search_flights',
    description: 'Search for flights between two locations',
    inputSchema: {
      type: 'object',
      properties: {
        origin: { type: 'string', description: 'Origin airport code' },
        destination: { type: 'string', description: 'Destination airport code' },
        departure_date: { type: 'string', description: 'Departure date (YYYY-MM-DD)' },
        return_date: { type: 'string', description: 'Return date (YYYY-MM-DD), optional' },
        adults: { type: 'number', description: 'Number of adult passengers' },
        cabin_class: { type: 'string', description: 'Cabin class (economy, business, first)', enum: ['economy', 'business', 'first'] }
      },
      required: ['origin', 'destination', 'departure_date', 'adults']
    }
  },
  
  get_flight_details: {
    name: 'get_flight_details',
    description: 'Get detailed information about a specific flight offer',
    inputSchema: {
      type: 'object',
      properties: {
        offer_id: { type: 'string', description: 'Flight offer ID' }
      },
      required: ['offer_id']
    }
  },
  
  book_flight: {
    name: 'book_flight',
    description: 'Book a flight with passenger information. IMPORTANT: After a successful booking/hold, you MUST immediately call generate_payment_link with the order details.',
    inputSchema: {
      type: 'object',
      properties: {
        offer_id: { type: 'string', description: 'Flight offer ID' },
        passenger: {
          type: 'object',
          properties: {
            given_name: { type: 'string' },
            family_name: { type: 'string' },
            email: { type: 'string' },
            phone_number: { type: 'string', description: 'Phone number in international format (e.g., +1555123456)' },
            born_on: { type: 'string', description: 'Date of birth (YYYY-MM-DD)' },
            title: { type: 'string', enum: ['mr', 'ms', 'mrs', 'dr'] },
            gender: { type: 'string', enum: ['m', 'f'] }
          },
          required: ['given_name', 'family_name', 'email', 'phone_number', 'born_on', 'title', 'gender']
        }
      },
      required: ['offer_id', 'passenger']
    }
  },
  
  search_hotels: {
    name: 'search_hotels',
    description: 'Search for hotels in a specific location',
    inputSchema: {
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
    }
  },
  
  get_hotel_rate: {
    name: 'get_hotel_rate',
    description: 'Get detailed rate information for a specific hotel property',
    inputSchema: {
      type: 'object',
      properties: {
        property_id: { type: 'string', description: 'Hotel property ID' },
        rate_id: { type: 'string', description: 'Rate ID' }
      },
      required: ['property_id', 'rate_id']
    }
  },
  
  book_hotel: {
    name: 'book_hotel',
    description: 'Book a hotel room',
    inputSchema: {
      type: 'object',
      properties: {
        property_id: { type: 'string', description: 'Hotel property ID' },
        rate_id: { type: 'string', description: 'Rate ID' },
        guest_info: {
          type: 'object',
          properties: {
            given_name: { type: 'string' },
            family_name: { type: 'string' },
            email: { type: 'string' },
            phone_number: { type: 'string', description: 'Phone number in international format (e.g., +1555123456)' }
          },
          required: ['given_name', 'family_name', 'email', 'phone_number']
        }
      },
      required: ['property_id', 'rate_id', 'guest_info']
    }
  },
  
  update_user_profile: {
    name: 'update_user_profile',
    description: 'Update user profile information based on conversation data',
    inputSchema: {
      type: 'object',
      properties: {
        device_id: { type: 'string', description: 'Device identifier for the user' },
        first_name: { type: 'string', description: 'User first name' },
        last_name: { type: 'string', description: 'User last name' },
        email: { type: 'string', description: 'User email address' },
        phone: { type: 'string', description: 'User phone number' },
        date_of_birth: { type: 'string', description: 'Date of birth (YYYY-MM-DD)' },
        title: { type: 'string', description: 'Title (Mr, Mrs, Ms, Dr, etc.)' },
        gender: { type: 'string', description: 'Gender (male, female, other)' }
      },
      required: ['device_id']
    }
  },
  
  get_user_profile: {
    name: 'get_user_profile',
    description: 'Retrieve stored user profile information. Returns null/empty for new users - this is normal, not an error.',
    inputSchema: {
      type: 'object',
      properties: {
        device_id: { type: 'string', description: 'Device identifier for the user' }
      },
      required: ['device_id']
    }
  },

  generate_payment_link: {
    name: 'generate_payment_link',
    description: 'Generate a secure payment link for completing flight or hotel booking payments',
    inputSchema: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'Order ID that needs payment' },
        amount: { type: 'string', description: 'Payment amount' },
        currency: { type: 'string', description: 'Payment currency (e.g., USD, EUR)' },
        description: { type: 'string', description: 'Optional payment description' }
      },
      required: ['orderId', 'amount', 'currency']
    }
  },

  get_payment_status: {
    name: 'get_payment_status',
    description: 'Check the payment status for a specific order',
    inputSchema: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'Order ID to check payment status for' }
      },
      required: ['orderId']
    }
  }
};

// Convert MCP schema to Anthropic Tool format
export function convertToAnthropicTool(toolDef: any): any {
  return {
    name: toolDef.name,
    description: toolDef.description,
    input_schema: toolDef.inputSchema
  };
}

// Get all tools as MCP format
export function getMCPTools(): any[] {
  return Object.values(TOOL_DEFINITIONS);
}

// Get all tools as Anthropic format
export function getAnthropicTools(): any[] {
  return Object.values(TOOL_DEFINITIONS).map(convertToAnthropicTool);
}