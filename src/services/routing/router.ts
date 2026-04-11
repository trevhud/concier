import { logger } from '../../utils/logger.js';
import { RequestType, RouteRequest } from '../../types/index.js';

export class RequestRouter {
  private flightKeywords = new Set([
    'flight', 'fly', 'flying', 'airport', 'airline', 'travel', 'trip',
    'departure', 'arrival', 'boarding', 'ticket', 'booking', 'seat',
    'runway', 'takeoff', 'landing', 'pilot', 'crew', 'baggage',
    'check-in', 'gate', 'terminal', 'domestic', 'international'
  ]);

  private hotelKeywords = new Set([
    'hotel', 'stay', 'staying', 'room', 'accommodation', 'lodge', 'resort',
    'inn', 'motel', 'hostel', 'bed', 'breakfast', 'suite', 'reservation',
    'check-in', 'check-out', 'guest', 'concierge', 'lobby', 'amenities',
    'spa', 'pool', 'gym', 'wifi', 'parking', 'breakfast', 'dinner'
  ]);

  /**
   * Routes a user request to determine if it's flight or hotel related
   */
  public route(request: RouteRequest): RequestType {
    const query = request.query.toLowerCase();
    
    // If explicit type is provided, use it
    if (request.type) {
      logger.debug(`Using explicit request type: ${request.type}`);
      return request.type;
    }

    // Analyze query for keywords
    const flightScore = this.calculateKeywordScore(query, this.flightKeywords);
    const hotelScore = this.calculateKeywordScore(query, this.hotelKeywords);

    logger.debug('Routing analysis', {
      query: request.query,
      flightScore,
      hotelScore
    });

    // If no clear indication, default to flight
    if (flightScore === hotelScore) {
      logger.debug('No clear preference, defaulting to flight');
      return 'flight';
    }

    const result = flightScore > hotelScore ? 'flight' : 'hotel';
    logger.debug(`Routed request to: ${result}`);
    return result;
  }

  /**
   * Calculate a score based on keyword matches
   */
  private calculateKeywordScore(query: string, keywords: Set<string>): number {
    const words = query.split(/\s+/);
    let score = 0;

    for (const word of words) {
      // Clean word of punctuation
      const cleanWord = word.replace(/[^\w]/g, '');
      
      if (keywords.has(cleanWord)) {
        score += 1;
      }
      
      // Check for partial matches (e.g., "flights" contains "flight")
      for (const keyword of keywords) {
        if (cleanWord.includes(keyword) || keyword.includes(cleanWord)) {
          score += 0.5;
          break; // Only count once per word
        }
      }
    }

    return score;
  }

  /**
   * Get contextual suggestions based on the request
   */
  public getContextualSuggestions(request: RouteRequest): string[] {
    const requestType = this.route(request);
    
    if (requestType === 'flight') {
      return [
        'Search for flights between two cities',
        'Get flight status information',
        'Find flight inspirations from your location',
        'Book a flight with passenger details',
        'Check cheapest flight dates'
      ];
    } else {
      return [
        'Search for hotels in a specific location',
        'Get detailed hotel room rates',
        'Book a hotel room',
        'Check hotel availability',
        'Get hotel property details and amenities'
      ];
    }
  }

  /**
   * Extract potential parameters from the query
   */
  public extractParameters(request: RouteRequest): Record<string, any> {
    const query = request.query.toLowerCase();
    const params: Record<string, any> = {};

    // Extract dates (YYYY-MM-DD format)
    const dateRegex = /\b(\d{4}-\d{2}-\d{2})\b/g;
    const dates = query.match(dateRegex);
    if (dates) {
      params.dates = dates;
      if (dates[0]) params.departure_date = dates[0];
      if (dates[1]) params.return_date = dates[1];
      if (dates[0]) params.check_in_date = dates[0];
      if (dates[1]) params.check_out_date = dates[1];
    }

    // Extract airport codes (3 letter codes)
    const airportRegex = /\b[A-Z]{3}\b/g;
    const airports = query.match(airportRegex);
    if (airports) {
      params.airports = airports;
      if (airports[0]) params.origin = airports[0];
      if (airports[1]) params.destination = airports[1];
    }

    // Extract numbers (adults, rooms, etc.)
    const numberRegex = /\b(\d+)\s*(adult|passenger|room|guest)/g;
    let match;
    while ((match = numberRegex.exec(query)) !== null) {
      const number = parseInt(match[1]);
      const type = match[2];
      
      if (type.includes('adult') || type.includes('passenger')) {
        params.adults = number;
      }
      if (type.includes('room')) {
        params.rooms = number;
      }
      if (type.includes('guest')) {
        params.guests = number;
      }
    }

    // Extract cabin class
    if (query.includes('business')) params.cabin_class = 'business';
    if (query.includes('first')) params.cabin_class = 'first';
    if (query.includes('economy')) params.cabin_class = 'economy';

    logger.debug('Extracted parameters', params);
    return params;
  }

  /**
   * Validate that required parameters are present for a request type
   */
  public validateParameters(requestType: RequestType, params: Record<string, any>): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    if (requestType === 'flight') {
      if (!params.origin) missing.push('origin airport code');
      if (!params.destination) missing.push('destination airport code');
      if (!params.departure_date) missing.push('departure date');
      if (!params.adults) missing.push('number of adults');
    } else if (requestType === 'hotel') {
      if (!params.location && (!params.latitude || !params.longitude)) {
        missing.push('location coordinates');
      }
      if (!params.check_in_date) missing.push('check-in date');
      if (!params.check_out_date) missing.push('check-out date');
      if (!params.adults) missing.push('number of adults');
      if (!params.rooms) missing.push('number of rooms');
    }

    return {
      valid: missing.length === 0,
      missing
    };
  }
}

export const requestRouter = new RequestRouter();