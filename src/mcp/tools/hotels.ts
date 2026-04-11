import { CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js';
import { DuffelStaysClient } from '../../services/duffel/stays-client.js';
import { logger } from '../../utils/logger.js';
import { SearchParams } from '../../types/index.js';

export class HotelTools {
  private duffelStaysClient: DuffelStaysClient;

  constructor() {
    this.duffelStaysClient = new DuffelStaysClient();
  }

  async searchHotels(args: any): Promise<CallToolResult> {
    try {
      logger.info('Searching hotels', args);

      const params: SearchParams = {
        location: {
          radius: args.location.radius,
          geographic_coordinates: {
            latitude: args.location.geographic_coordinates.latitude,
            longitude: args.location.geographic_coordinates.longitude,
          },
        },
        check_in_date: args.check_in_date,
        check_out_date: args.check_out_date,
        adults: args.adults,
        rooms: args.rooms,
        loyalty_program_account: args.loyalty_program_account,
      };

      const results = await this.duffelStaysClient.searchHotels(params);

      const content: TextContent = {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: results,
          message: `Found ${results.properties.length} hotel properties`,
        }, null, 2),
      };

      return {
        content: [content],
      };
    } catch (error) {
      logger.error('Hotel search error:', error);
      
      const content: TextContent = {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Failed to search hotels',
        }, null, 2),
      };

      return {
        content: [content],
      };
    }
  }

  async getHotelRate(args: any): Promise<CallToolResult> {
    try {
      logger.info('Getting hotel rate', args);

      const rateInfo = await this.duffelStaysClient.getHotelRate(args.property_id, args.rate_id);

      const content: TextContent = {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: rateInfo,
          message: 'Hotel rate information retrieved successfully',
        }, null, 2),
      };

      return {
        content: [content],
      };
    } catch (error) {
      logger.error('Hotel rate error:', error);
      
      const content: TextContent = {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Failed to get hotel rate',
        }, null, 2),
      };

      return {
        content: [content],
      };
    }
  }

  async bookHotel(args: any): Promise<CallToolResult> {
    try {
      logger.info('Booking hotel', { property_id: args.property_id, rate_id: args.rate_id });

      const guestInfo = {
        given_name: args.guest_info.given_name,
        family_name: args.guest_info.family_name,
        email: args.guest_info.email,
        phone_number: args.guest_info.phone_number,
      };

      // For demo purposes, we'll use a mock payment method
      const payment = {
        type: 'balance',
        currency: 'USD',
      };

      const booking = await this.duffelStaysClient.bookHotel(
        args.property_id,
        args.rate_id,
        guestInfo,
        payment
      );

      const content: TextContent = {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: booking,
          message: 'Hotel booking completed successfully',
        }, null, 2),
      };

      return {
        content: [content],
      };
    } catch (error) {
      logger.error('Hotel booking error:', error);
      
      const content: TextContent = {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Failed to book hotel',
        }, null, 2),
      };

      return {
        content: [content],
      };
    }
  }

  async getHotelAvailability(args: any): Promise<CallToolResult> {
    try {
      logger.info('Getting hotel availability', args);

      // This would typically be a specific API call to check availability
      // For now, we'll use the search functionality as a proxy
      const params: SearchParams = {
        location: args.location,
        check_in_date: args.check_in_date,
        check_out_date: args.check_out_date,
        adults: args.adults,
        rooms: args.rooms,
      };

      const results = await this.duffelStaysClient.searchHotels(params);

      // Filter to specific property if provided
      let availability = results.properties;
      if (args.property_id) {
        availability = availability.filter((property: any) => property.id === args.property_id);
      }

      const content: TextContent = {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            available: availability.length > 0,
            properties: availability,
          },
          message: `Found ${availability.length} available properties`,
        }, null, 2),
      };

      return {
        content: [content],
      };
    } catch (error) {
      logger.error('Hotel availability error:', error);
      
      const content: TextContent = {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Failed to check hotel availability',
        }, null, 2),
      };

      return {
        content: [content],
      };
    }
  }

  async getHotelDetails(args: any): Promise<CallToolResult> {
    try {
      logger.info('Getting hotel details', args);

      // This would typically be a specific API call to get detailed property information
      // For now, we'll search and filter for the specific property
      const searchResults = await this.duffelStaysClient.searchHotels({
        location: {
          radius: 1000, // Small radius to get this specific property
          geographic_coordinates: args.coordinates || { latitude: 0, longitude: 0 },
        },
        check_in_date: args.check_in_date || new Date().toISOString().split('T')[0],
        check_out_date: args.check_out_date || new Date(Date.now() + 86400000).toISOString().split('T')[0],
        adults: 1,
        rooms: 1,
      });

      const property = searchResults.properties.find((p: any) => p.id === args.property_id);

      if (!property) {
        throw new Error('Property not found');
      }

      const content: TextContent = {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: property,
          message: 'Hotel details retrieved successfully',
        }, null, 2),
      };

      return {
        content: [content],
      };
    } catch (error) {
      logger.error('Hotel details error:', error);
      
      const content: TextContent = {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Failed to get hotel details',
        }, null, 2),
      };

      return {
        content: [content],
      };
    }
  }
}

export function setupHotelTools(): HotelTools {
  return new HotelTools();
}