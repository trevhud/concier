import { Duffel } from '@duffel/api';
import { CONFIG } from '../../utils/config.js';
import { logger } from '../../utils/logger.js';
import {
  FlightSearchParams,
  FlightSearchResponse,
  PassengerInfo,
  PaymentInfo
} from '../../types/index.js';

export class DuffelSDKClient {
  private client: Duffel;

  public getClient(): Duffel {
    return this.client;
  }

  constructor() {
    this.client = new Duffel({
      token: CONFIG.duffel.accessToken,
    });
  }

  async searchFlights(params: FlightSearchParams): Promise<FlightSearchResponse> {
    try {
      logger.info('Searching flights with Duffel SDK', params);

      const slices = [
        {
          origin: params.origin,
          destination: params.destination,
          departure_date: params.departure_date,
        },
      ];

      if (params.return_date) {
        slices.push({
          origin: params.destination,
          destination: params.origin,
          departure_date: params.return_date,
        });
      }

      const offerRequest = await this.client.offerRequests.create({
        slices: slices as any,
        passengers: [{ type: 'adult' }],
        cabin_class: (params.cabin_class || 'economy') as any,
      });

      logger.info(`Created offer request: ${offerRequest.data.id}`);
      logger.info(`Found ${offerRequest.data.offers.length} offers`);

      const offers = offerRequest.data.offers.slice(0, 10).map((offer: any) => ({
        id: offer.id,
        airline: offer.owner?.name || 'Unknown',
        flights: {
          outbound: {
            departing_at: offer.slices[0]?.segments[0]?.departing_at || '',
            arriving_at: offer.slices[0]?.segments[offer.slices[0].segments.length - 1]?.arriving_at || '',
          },
          ...(offer.slices[1] && {
            return: {
              departing_at: offer.slices[1].segments[0]?.departing_at || '',
              arriving_at: offer.slices[1].segments[offer.slices[1].segments.length - 1]?.arriving_at || '',
            },
          }),
        },
        total_amount: offer.total_amount || '0',
        total_currency: offer.total_currency || 'USD',
      }));

      return {
        partial_offer_request_id: offerRequest.data.id,
        offers,
      };
    } catch (error) {
      logger.error('Duffel SDK flight search error:', error);
      
      // Extract detailed error information
      let errorMessage = 'Unknown error';
      if (error && typeof error === 'object') {
        if ('errors' in error) {
          const errors = (error as any).errors;
          if (Array.isArray(errors) && errors.length > 0) {
            errorMessage = errors.map((e: any) => `${e.title || e.code}: ${e.message || e.detail}`).join(', ');
          }
        } else if ('message' in error) {
          errorMessage = (error as Error).message;
        } else if ('status' in error) {
          errorMessage = `HTTP ${(error as any).status}: ${(error as any).statusText || 'API Error'}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      logger.error('Detailed Duffel error:', errorMessage);
      throw new Error(`Duffel flight search failed: ${errorMessage}`);
    }
  }

  async getFlightOffer(offerId: string): Promise<any> {
    try {
      logger.info('Getting flight offer', { offerId });
      
      const offer = await this.client.offers.get(offerId);
      return offer.data;
    } catch (error) {
      logger.error('Duffel SDK get offer error:', error);
      throw new Error(`Failed to get flight offer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async holdFlight(offerId: string, passenger: PassengerInfo): Promise<any> {
    try {
      logger.info('Holding flight', { offerId, passenger });

      const offer = await this.getFlightOffer(offerId);
      
      // Check if offer supports holding
      if (offer.payment_requirements?.requires_instant_payment) {
        throw new Error('This offer requires instant payment and cannot be held');
      }

      const order = await this.client.orders.create({
        type: 'pay_later',
        selected_offers: [offerId],
        passengers: [
          {
            id: offer.passengers[0].id,
            phone_number: passenger.phone_number,
            email: passenger.email,
            title: passenger.title as any,
            gender: passenger.gender as any,
            family_name: passenger.family_name,
            given_name: passenger.given_name,
            born_on: passenger.born_on,
          },
        ],
        // No payments field for hold orders
      });

      return order.data;
    } catch (error) {
      logger.error('Duffel SDK hold flight error (full):', error);
      logger.error('Duffel SDK hold flight error (stringified):', JSON.stringify(error, null, 2));
      
      // Extract more detailed error information
      let errorMessage = 'Unknown error';
      if (error && typeof error === 'object' && 'errors' in error) {
        const errors = (error as any).errors;
        if (Array.isArray(errors) && errors.length > 0) {
          // Check for specific error: offer already booked
          const offerAlreadyBookedError = errors.find((e: any) => 
            e.code === 'offer_request_already_booked'
          );
          
          if (offerAlreadyBookedError) {
            throw new Error('This flight offer has already been booked or held. The booking may have been successful on the previous attempt. Please check your email for confirmation or start a new flight search.');
          }
          
          errorMessage = errors.map((e: any) => `${e.title}: ${e.message}`).join(', ');
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      throw new Error(`Failed to hold flight: ${errorMessage}`);
    }
  }


  async cancelOrder(orderId: string): Promise<any> {
    try {
      logger.info('Canceling order', { orderId });

      const cancellation = await this.client.orderCancellations.create({
        order_id: orderId,
      });

      return cancellation.data;
    } catch (error) {
      logger.error('Duffel SDK cancel order error:', error);
      throw new Error(`Failed to cancel order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createThreeDSecureSession(cardId: string, resourceId: string, isOffer: boolean = false): Promise<any> {
    try {
      logger.info('Creating 3D Secure session', { cardId, resourceId, isOffer });

      const sessionData: any = {
        card_id: cardId,
      };

      // Set the appropriate resource type
      if (isOffer) {
        sessionData.offer_id = resourceId;
      } else {
        sessionData.order_id = resourceId;
      }

      const session = await this.client.three_d_secure_sessions.create(sessionData);
      return session.data;
    } catch (error) {
      logger.error('Duffel SDK 3D Secure session error:', error);
      throw new Error(`Failed to create 3D Secure session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createPayment(orderId: string, payment: PaymentInfo): Promise<any> {
    try {
      logger.info('Creating payment for order', { orderId, payment });

      const paymentResult = await this.client.payments.create({
        order_id: orderId,
        payment: {
          type: payment.payment_type as any || 'balance',
          amount: payment.amount,
          currency: payment.currency,
        } as any,
      });

      return paymentResult.data;
    } catch (error) {
      logger.error('Duffel SDK payment error:', error);
      throw new Error(`Failed to create payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async bookFlightInstant(offerId: string, passenger: PassengerInfo, payment: PaymentInfo): Promise<any> {
    try {
      logger.info('Booking flight with instant payment', { offerId, passenger, payment });

      const offer = await this.getFlightOffer(offerId);

      const order = await this.client.orders.create({
        type: 'instant',
        selected_offers: [offerId],
        passengers: [
          {
            id: offer.passengers[0].id,
            phone_number: passenger.phone_number,
            email: passenger.email,
            title: passenger.title as any,
            gender: passenger.gender as any,
            family_name: passenger.family_name,
            given_name: passenger.given_name,
            born_on: passenger.born_on,
          },
        ],
        payments: [
          {
            type: payment.payment_type as any || 'balance',
            amount: payment.amount,
            currency: payment.currency,
          } as any,
        ],
      });

      return order.data;
    } catch (error) {
      logger.error('Duffel SDK instant booking error:', error);
      
      let errorMessage = 'Unknown error';
      if (error && typeof error === 'object' && 'errors' in error) {
        const errors = (error as any).errors;
        if (Array.isArray(errors) && errors.length > 0) {
          errorMessage = errors.map((e: any) => `${e.title}: ${e.message}`).join(', ');
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      throw new Error(`Failed to book flight with instant payment: ${errorMessage}`);
    }
  }
}