import { CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js';
import { DuffelSDKClient } from '../../services/duffel/flight-client.js';
import { logger } from '../../utils/logger.js';
import { FlightSearchParams, PassengerInfo } from '../../types/index.js';

export class FlightTools {
  private duffelClient: DuffelSDKClient;

  constructor() {
    this.duffelClient = new DuffelSDKClient();
  }

  async searchFlights(args: any): Promise<CallToolResult> {
    try {
      logger.info('Searching flights', args);

      const params: FlightSearchParams = {
        origin: args.origin,
        destination: args.destination,
        departure_date: args.departure_date,
        return_date: args.return_date,
        cabin_class: args.cabin_class,
        adults: args.adults,
      };

      // Use Duffel SDK for flight search
      const results = await this.duffelClient.searchFlights(params);

      const content: TextContent = {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: results,
          message: `Found ${results.offers.length} flight offers`,
        }, null, 2),
      };

      return {
        content: [content],
      };
    } catch (error) {
      logger.error('Flight search error:', error);
      
      const content: TextContent = {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Failed to search flights',
        }, null, 2),
      };

      return {
        content: [content],
      };
    }
  }

  async getFlightDetails(args: any): Promise<CallToolResult> {
    try {
      logger.info('Getting flight details', args);

      const offer = await this.duffelClient.getFlightOffer(args.offer_id);

      const content: TextContent = {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: offer,
          message: 'Flight details retrieved successfully',
        }, null, 2),
      };

      return {
        content: [content],
      };
    } catch (error) {
      logger.error('Flight details error:', error);
      
      const content: TextContent = {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Failed to get flight details',
        }, null, 2),
      };

      return {
        content: [content],
      };
    }
  }

  async bookFlight(args: any): Promise<CallToolResult> {
    try {
      logger.info('Booking flight - full args:', args);

      const passenger: PassengerInfo = {
        given_name: args.passenger.given_name,
        family_name: args.passenger.family_name,
        email: args.passenger.email,
        phone_number: args.passenger.phone_number,
        born_on: args.passenger.born_on,
        title: args.passenger.title,
        gender: args.passenger.gender,
      };

      // First, check the offer's payment requirements
      logger.info('Checking flight offer payment requirements before attempting booking');
      const offer = await this.duffelClient.getFlightOffer(args.offer_id);
      
      if (offer?.payment_requirements?.requires_instant_payment) {
        logger.info('Flight requires instant payment - skipping hold attempt');
        
        const content: TextContent = {
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: {
              order_id: args.offer_id, // Use offer_id as order_id for payment processing
              booking_reference: 'PENDING_PAYMENT',
              status: 'requires_instant_payment',
              total_amount: offer.total_amount,
              total_currency: offer.total_currency || 'USD',
              message: 'Flight requires immediate payment. Ready to proceed with secure payment form.',
            },
            message: 'Flight requires immediate payment. Ready to proceed with secure payment form.',
          }, null, 2),
        };
        
        return {
          content: [content],
        };
      }

      let order;
      let status;
      let message;

      if (args.payment && args.booking_type === 'instant') {
        // Create instant booking with payment
        const payment = {
          amount: args.payment.amount,
          currency: args.payment.currency,
          payment_type: args.payment.payment_type || 'balance',
        };
        
        order = await this.duffelClient.bookFlightInstant(args.offer_id, passenger, payment);
        status = 'confirmed';
        message = 'Flight booking confirmed successfully';
      } else {
        // Hold the flight for later payment
        order = await this.duffelClient.holdFlight(args.offer_id, passenger);
        status = 'held';
        
        message = `Flight booking held successfully! 

Booking reference: ${order.booking_reference || order.id}
Total amount: ${order.total_amount} ${order.total_currency}

Next step: Generate payment link to complete booking.`;
      }

      const content: TextContent = {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            order_id: order.id,
            booking_reference: order.booking_reference,
            status: status,
            total_amount: order.total_amount,
            total_currency: order.total_currency,
            documents: order.documents || [],
            passengers: order.passengers || [],
            slices: order.slices || [],
            message: message,
          },
          message: message,
        }, null, 2),
      };

      return {
        content: [content],
      };
    } catch (error) {
      logger.error('Flight booking error:', error);
      logger.error('Error type:', typeof error);
      logger.error('Error instanceof Error:', error instanceof Error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Final error message:', errorMessage);
      
      const content: TextContent = {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: errorMessage,
          message: 'Failed to book flight',
        }, null, 2),
      };

      return {
        content: [content],
      };
    }
  }

  async cancelFlightOrder(args: any): Promise<CallToolResult> {
    try {
      logger.info('Canceling flight order', { order_id: args.order_id });

      const cancellation = await this.duffelClient.cancelOrder(args.order_id);

      const content: TextContent = {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            order_id: args.order_id,
            cancellation_id: cancellation.id,
            status: 'cancelled',
            refund_amount: cancellation.refund_amount,
            refund_currency: cancellation.refund_currency,
            message: 'Flight order cancelled successfully',
          },
          message: 'Flight order cancelled successfully',
        }, null, 2),
      };

      return {
        content: [content],
      };
    } catch (error) {
      logger.error('Flight order cancellation error:', error);
      
      const content: TextContent = {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Failed to cancel flight order',
        }, null, 2),
      };

      return {
        content: [content],
      };
    }
  }

  async payForHeldOrder(args: any): Promise<CallToolResult> {
    try {
      logger.info('Paying for held order', { order_id: args.order_id });

      const payment = {
        amount: args.payment.amount,
        currency: args.payment.currency,
        payment_type: args.payment.payment_type || 'balance',
      };

      const paymentResult = await this.duffelClient.createPayment(args.order_id, payment);

      const content: TextContent = {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            order_id: args.order_id,
            payment_id: paymentResult.id,
            status: 'paid',
            amount: paymentResult.amount,
            currency: paymentResult.currency,
            message: 'Payment processed successfully',
          },
          message: 'Payment processed successfully',
        }, null, 2),
      };

      return {
        content: [content],
      };
    } catch (error) {
      logger.error('Payment processing error:', error);
      
      const content: TextContent = {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Failed to process payment',
        }, null, 2),
      };

      return {
        content: [content],
      };
    }
  }

  private generatePaymentLink(orderId: string, amount: string, currency: string): string {
    // Generate a secure payment link that directs to our payment form
    // This could be a direct link to our app with payment form, or a payment intent URL from Duffel
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    return `${baseUrl}/payment?order=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(amount)}&currency=${encodeURIComponent(currency)}`;
  }

}

export function setupFlightTools(): FlightTools {
  return new FlightTools();
}