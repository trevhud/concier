import { Prompt } from '@modelcontextprotocol/sdk/types.js';

export const TRAVEL_PROMPTS: Prompt[] = [
  {
    name: 'flight_search_assistant',
    description: 'Helps users search for flights with step-by-step guidance',
    arguments: [
      {
        name: 'user_request',
        description: 'The user\'s flight search request',
        required: true,
      },
    ],
  },
  {
    name: 'hotel_booking_assistant',
    description: 'Guides users through hotel search and booking process',
    arguments: [
      {
        name: 'user_request',
        description: 'The user\'s hotel booking request',
        required: true,
      },
    ],
  },
  {
    name: 'travel_itinerary_planner',
    description: 'Creates comprehensive travel itineraries',
    arguments: [
      {
        name: 'destination',
        description: 'Travel destination',
        required: true,
      },
      {
        name: 'duration',
        description: 'Trip duration',
        required: true,
      },
      {
        name: 'preferences',
        description: 'Travel preferences and interests',
        required: false,
      },
    ],
  },
];

export function getFlightSearchPrompt(userRequest: string): string {
  return `
I'll help you search for flights. Let me analyze your request: "${userRequest}"

To find the best flights for you, I need the following information:

**Required Information:**
- Origin airport (3-letter code like JFK, LAX)
- Destination airport (3-letter code)
- Departure date (YYYY-MM-DD format)
- Number of adult passengers

**Optional Information:**
- Return date (for round-trip flights)
- Preferred cabin class (economy, business, first)
- Specific airline preferences
- Time preferences (morning, afternoon, evening)

Based on your request, let me extract what I can and ask for any missing details:

If I have enough information, I'll search for flights using our integrated Duffel and Amadeus APIs, which provide:
- Real-time flight availability
- Competitive pricing
- Multiple airline options
- Flexible date searches

Would you like me to proceed with the search, or do you need help with any of these details?
`;
}

export function getHotelBookingPrompt(userRequest: string): string {
  return `
I'll help you find and book the perfect hotel. Let me review your request: "${userRequest}"

For hotel searches, I need:

**Required Information:**
- Location (city name or coordinates)
- Check-in date (YYYY-MM-DD format)
- Check-out date (YYYY-MM-DD format)  
- Number of adult guests
- Number of rooms needed

**Optional Information:**
- Hotel preferences (luxury, budget, boutique)
- Amenities needed (pool, gym, spa, WiFi)
- Neighborhood preferences
- Special requests

Our hotel search provides:
- Real-time availability and pricing
- Detailed property information
- Guest reviews and ratings
- Flexible cancellation options
- Secure booking process

Let me know what additional details you need, or I can proceed with the search if I have enough information.
`;
}

export function getTravelItineraryPrompt(destination: string, duration: string, preferences?: string): string {
  return `
I'll create a comprehensive travel itinerary for your trip to ${destination} for ${duration}.

**Your Trip Details:**
- Destination: ${destination}
- Duration: ${duration}
- Preferences: ${preferences || 'Not specified'}

**I'll help you plan:**

1. **Transportation**
   - Flight options to/from ${destination}
   - Local transportation recommendations
   - Airport transfers

2. **Accommodation**
   - Hotel recommendations by area
   - Budget and luxury options
   - Booking assistance

3. **Activities & Attractions**
   - Must-see landmarks and attractions
   - Cultural experiences
   - Local dining recommendations
   - Entertainment options

4. **Practical Information**
   - Weather considerations
   - Local customs and etiquette
   - Currency and payment methods
   - Safety tips

5. **Day-by-Day Schedule**
   - Optimized routing
   - Time management
   - Flexibility for spontaneous activities

Would you like me to start with flights and hotels, or would you prefer to focus on a specific aspect of your trip planning?
`;
}