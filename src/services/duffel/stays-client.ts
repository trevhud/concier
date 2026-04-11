import { Duffel } from '@duffel/api';
import { CONFIG } from '../../utils/config.js';
import { logger } from '../../utils/logger.js';
import { SearchParams } from '../../types/index.js';

export class DuffelStaysClient {
  private client: Duffel;

  constructor() {
    this.client = new Duffel({
      token: CONFIG.duffel.accessToken,
    });
  }

  async searchHotels(params: SearchParams): Promise<{ id: string; properties: any[] }> {
    try {
      logger.info('Searching hotels with Duffel SDK', params);

      const searchParams = {
        rooms: params.rooms || 1,
        location: {
          radius: params.location.radius,
          geographic_coordinates: {
            longitude: params.location.geographic_coordinates.longitude,
            latitude: params.location.geographic_coordinates.latitude,
          },
        },
        check_out_date: params.check_out_date,
        check_in_date: params.check_in_date,
        guests: Array.from({ length: params.adults || 1 }, () => ({ type: 'adult', age: 25 })),
      };

      const searchResults = await this.client.stays.search(searchParams as any);

      return {
        id: (searchResults as any).data?.[0]?.id || '',
        properties: (searchResults as any).data || [],
      };
    } catch (error) {
      logger.error('Duffel SDK hotel search error:', error);
      throw new Error(`Failed to search hotels: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getHotelRate(propertyId: string, rateId: string): Promise<any> {
    try {
      logger.info('Getting hotel rate', { propertyId, rateId });

      // First fetch all rates for the search result
      const rates = await (this.client.stays.searchResults as any).fetchAllRates(propertyId);
      
      // Find the specific rate
      const rate = (rates as any).data.find((r: any) => r.id === rateId);
      
      if (!rate) {
        throw new Error(`Rate ${rateId} not found for property ${propertyId}`);
      }

      return {
        room_type: rate.room_type,
        bed_configurations: rate.bed_configurations,
        amenities: rate.amenities,
        cancellation_policy: rate.cancellation_policy,
        total_amount: parseFloat(rate.total_amount),
        currency: rate.currency,
      };
    } catch (error) {
      logger.error('Duffel SDK get hotel rate error:', error);
      throw new Error(`Failed to get hotel rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async bookHotel(propertyId: string, rateId: string, guestInfo: any, payment: any): Promise<any> {
    try {
      logger.info('Booking hotel', { propertyId, rateId });

      // First create a quote for the rate
      const quote = await this.client.stays.quotes.create(rateId as any);

      // Then create the booking using the quote
      const booking = await this.client.stays.bookings.create({
        quote_id: quote.data.id,
        phone_number: guestInfo.phone_number,
        guests: [
          {
            given_name: guestInfo.given_name,
            family_name: guestInfo.family_name,
            // born_on: guestInfo.born_on, // Removed as not supported by API
          },
        ],
        email: guestInfo.email,
        accommodation_special_requests: guestInfo.special_requests || '',
        // Note: Payment handling may need to be implemented separately
        // depending on Duffel's payment flow for stays
      });

      return {
        id: booking.data.id,
        reference: booking.data.reference,
        status: booking.data.status,
        total_amount: (booking.data as any).total_amount || '0',
        currency: (booking.data as any).currency || 'USD',
        check_in_date: booking.data.check_in_date,
        check_out_date: booking.data.check_out_date,
      };
    } catch (error) {
      logger.error('Duffel SDK hotel booking error:', error);
      throw new Error(`Failed to book hotel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}