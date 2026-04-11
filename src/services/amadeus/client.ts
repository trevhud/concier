import Amadeus from 'amadeus';
import { CONFIG } from '../../utils/config.js';
import { logger } from '../../utils/logger.js';

export interface AmadeusFlightSearchParams {
  originLocationCode: string;
  destinationLocationCode: string;
  departureDate: string;
  adults: number;
  returnDate?: string;
  max?: number;
}

export interface AmadeusFlightOffer {
  id: string;
  source: string;
  instantTicketingRequired: boolean;
  nonHomogeneous: boolean;
  oneWay: boolean;
  lastTicketingDate: string;
  numberOfBookableSeats: number;
  itineraries: any[];
  price: {
    currency: string;
    total: string;
    base: string;
    fees: any[];
    grandTotal: string;
  };
  pricingOptions: {
    fareType: string[];
    includedCheckedBagsOnly: boolean;
  };
  validatingAirlineCodes: string[];
  travelerPricings: any[];
}

export class AmadeusClient {
  private client: Amadeus;

  constructor() {
    this.client = new Amadeus({
      clientId: CONFIG.amadeus.clientId,
      clientSecret: CONFIG.amadeus.clientSecret,
      hostname: CONFIG.amadeus.hostname,
      logLevel: 'warn',
    });
  }

  async searchFlights(params: AmadeusFlightSearchParams): Promise<AmadeusFlightOffer[]> {
    try {
      logger.debug('Searching flights with Amadeus', params);

      const searchParams: any = {
        originLocationCode: params.originLocationCode,
        destinationLocationCode: params.destinationLocationCode,
        departureDate: params.departureDate,
        adults: params.adults,
        max: params.max || 250,
      };

      if (params.returnDate) {
        searchParams.returnDate = params.returnDate;
      }

      const response = await this.client.shopping.flightOffersSearch.get(searchParams);
      
      logger.debug(`Found ${response.data.length} flight offers`);
      return response.data as AmadeusFlightOffer[];
    } catch (error) {
      logger.error('Error searching flights with Amadeus:', error);
      throw new Error(`Amadeus flight search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getFlightInspirations(origin: string): Promise<any[]> {
    try {
      logger.debug('Getting flight inspirations', { origin });
      
      const response = await this.client.shopping.flightDestinations.get({
        origin,
      });
      
      return response.data || [];
    } catch (error) {
      logger.error('Error getting flight inspirations:', error);
      throw new Error(`Amadeus flight inspirations failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCheapestFlightDates(origin: string, destination: string): Promise<any[]> {
    try {
      logger.debug('Getting cheapest flight dates', { origin, destination });
      
      const response = await this.client.shopping.flightDates.get({
        origin,
        destination,
      });
      
      return response.data || [];
    } catch (error) {
      logger.error('Error getting cheapest flight dates:', error);
      throw new Error(`Amadeus cheapest dates search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async confirmFlightPrice(flightOffers: AmadeusFlightOffer[]): Promise<any> {
    try {
      logger.debug('Confirming flight price', { offerCount: flightOffers.length });
      
      const response = await this.client.shopping.flightOffers.pricing.post(
        JSON.stringify({
          data: {
            type: 'flight-offers-pricing',
            flightOffers,
          },
        })
      );
      
      return response.data;
    } catch (error) {
      logger.error('Error confirming flight price:', error);
      throw new Error(`Amadeus price confirmation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async bookFlight(flightOffer: AmadeusFlightOffer, travelers: any[]): Promise<any> {
    try {
      logger.debug('Booking flight', { offerId: flightOffer.id, travelerCount: travelers.length });
      
      const response = await this.client.booking.flightOrders.post(
        JSON.stringify({
          data: {
            type: 'flight-order',
            flightOffers: [flightOffer],
            travelers,
          },
        })
      );
      
      return response.data;
    } catch (error) {
      logger.error('Error booking flight:', error);
      throw new Error(`Amadeus flight booking failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getFlightOrder(flightOrderId: string): Promise<any> {
    try {
      logger.debug('Getting flight order', { flightOrderId });
      
      const response = await this.client.booking.flightOrder(flightOrderId).get();
      
      return response.data;
    } catch (error) {
      logger.error('Error getting flight order:', error);
      throw new Error(`Amadeus flight order retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getFlightStatus(carrierCode: string, flightNumber: string, scheduledDepartureDate: string): Promise<any> {
    try {
      logger.debug('Getting flight status', { carrierCode, flightNumber, scheduledDepartureDate });
      
      const response = await this.client.schedule.flights.get({
        carrierCode,
        flightNumber,
        scheduledDepartureDate,
      });
      
      return response.data;
    } catch (error) {
      logger.error('Error getting flight status:', error);
      throw new Error(`Amadeus flight status failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCheckinLinks(airlineCode: string): Promise<any> {
    try {
      logger.debug('Getting checkin links', { airlineCode });
      
      const response = await this.client.referenceData.urls.checkinLinks.get({
        airlineCode,
      });
      
      return response.data;
    } catch (error) {
      logger.error('Error getting checkin links:', error);
      throw new Error(`Amadeus checkin links failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async predictFlightChoice(flightOffers: AmadeusFlightOffer[]): Promise<any> {
    try {
      logger.debug('Predicting flight choice', { offerCount: flightOffers.length });
      
      const response = await this.client.shopping.flightOffers.prediction.post(
        JSON.stringify({
          data: {
            type: 'flight-choice-prediction',
            flightOffers,
          },
        })
      );
      
      return response.data;
    } catch (error) {
      logger.error('Error predicting flight choice:', error);
      throw new Error(`Amadeus flight choice prediction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}