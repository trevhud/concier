import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FlightTools } from '../../mcp/tools/flights.js';
import { mockFlightOffer, mockPassenger } from '../setup.js';

// Test payment cards from Duffel documentation
const TEST_PAYMENT_CARDS = {
  SUCCESS_GB: '4000008260000000', // Great Britain - Payment succeeds
  SUCCESS_IE: '4000003720000005', // Ireland - Payment succeeds  
  SUCCESS_AU: '4000003600000006', // Australia - Payment succeeds
  SUCCESS_US: '4242424242424242', // USA - Payment succeeds
  SUCCESS_3DS: '4000000000003220', // 3D Secure authentication + success
  FAILURE_INSUFFICIENT: '4000000000009995', // Insufficient funds failure
};

vi.mock('../../services/duffel/flight-client.js', () => {
  return {
    DuffelSDKClient: vi.fn().mockImplementation(() => ({
      searchFlights: vi.fn(),
      getFlightOffer: vi.fn(),
      holdFlight: vi.fn(),
      bookFlightInstant: vi.fn(),
      createPayment: vi.fn(),
      cancelOrder: vi.fn(),
      createThreeDSecureSession: vi.fn(),
      createPaymentWithCard: vi.fn(),
      bookFlightWithCard: vi.fn()
    }))
  };
});

describe('Complete Flight Booking Flow Tests', () => {
  let flightTools: FlightTools;
  let mockDuffelClient: any;

  beforeEach(() => {
    flightTools = new FlightTools();
    mockDuffelClient = (flightTools as any).duffelClient;
  });

  describe('Instant Booking with Payment', () => {
    it('should complete instant booking with successful payment (GB card)', async () => {
      const mockConfirmedOrder = {
        id: 'ord_confirmed_123',
        booking_reference: 'CONF123',
        total_amount: '299.00',
        total_currency: 'GBP',
        documents: [
          {
            type: 'eticket',
            url: 'https://example.com/eticket.pdf'
          }
        ],
        passengers: [mockPassenger],
        slices: [mockFlightOffer.slices[0]]
      };

      mockDuffelClient.bookFlightInstant.mockResolvedValue(mockConfirmedOrder);

      const result = await flightTools.bookFlight({
        offer_id: 'off_instant_123',
        passenger: mockPassenger,
        booking_type: 'instant',
        payment: {
          amount: '299.00',
          currency: 'GBP',
          payment_type: 'balance',
          card_number: TEST_PAYMENT_CARDS.SUCCESS_GB
        }
      });

      expect(mockDuffelClient.bookFlightInstant).toHaveBeenCalledWith(
        'off_instant_123',
        mockPassenger,
        {
          amount: '299.00',
          currency: 'GBP',
          payment_type: 'balance'
        }
      );

      expect(result.content[0].text).toContain('\"success\": true');
      expect(result.content[0].text).toContain('\"status\": \"confirmed\"');
      expect(result.content[0].text).toContain('CONF123');
      expect(result.content[0].text).toContain('eticket');
    });

    it('should complete instant booking with successful payment (US card)', async () => {
      const mockConfirmedOrder = {
        id: 'ord_confirmed_456',
        booking_reference: 'CONF456',
        total_amount: '399.00',
        total_currency: 'USD',
        documents: [
          {
            type: 'eticket',
            url: 'https://example.com/eticket.pdf'
          }
        ],
        passengers: [mockPassenger],
        slices: [mockFlightOffer.slices[0]]
      };

      mockDuffelClient.bookFlightInstant.mockResolvedValue(mockConfirmedOrder);

      const result = await flightTools.bookFlight({
        offer_id: 'off_instant_456',
        passenger: mockPassenger,
        booking_type: 'instant',
        payment: {
          amount: '399.00',
          currency: 'USD',
          payment_type: 'balance',
          card_number: TEST_PAYMENT_CARDS.SUCCESS_US
        }
      });

      expect(result.content[0].text).toContain('\"success\": true');
      expect(result.content[0].text).toContain('\"status\": \"confirmed\"');
      expect(result.content[0].text).toContain('CONF456');
      expect(result.content[0].text).toContain('USD');
    });

    it('should handle 3D Secure authentication successfully', async () => {
      const mockConfirmedOrder = {
        id: 'ord_3ds_123',
        booking_reference: '3DS123',
        total_amount: '599.00',
        total_currency: 'EUR',
        documents: [
          {
            type: 'eticket',
            url: 'https://example.com/eticket.pdf'
          }
        ],
        passengers: [mockPassenger],
        slices: [mockFlightOffer.slices[0]]
      };

      mockDuffelClient.bookFlightInstant.mockResolvedValue(mockConfirmedOrder);

      const result = await flightTools.bookFlight({
        offer_id: 'off_3ds_123',
        passenger: mockPassenger,
        booking_type: 'instant',
        payment: {
          amount: '599.00',
          currency: 'EUR',
          payment_type: 'balance',
          card_number: TEST_PAYMENT_CARDS.SUCCESS_3DS
        }
      });

      expect(result.content[0].text).toContain('\"success\": true');
      expect(result.content[0].text).toContain('\"status\": \"confirmed\"');
      expect(result.content[0].text).toContain('3DS123');
    });

    it('should handle payment failure due to insufficient funds', async () => {
      mockDuffelClient.bookFlightInstant.mockRejectedValue(
        new Error('Payment failed: Insufficient funds')
      );

      const result = await flightTools.bookFlight({
        offer_id: 'off_insufficient_123',
        passenger: mockPassenger,
        booking_type: 'instant',
        payment: {
          amount: '299.00',
          currency: 'USD',
          payment_type: 'balance',
          card_number: TEST_PAYMENT_CARDS.FAILURE_INSUFFICIENT
        }
      });

      expect(result.content[0].text).toContain('\"success\": false');
      expect(result.content[0].text).toContain('Insufficient funds');
    });

    it('should handle declined payment cards', async () => {
      mockDuffelClient.bookFlightInstant.mockRejectedValue(
        new Error('Payment declined by bank')
      );

      const result = await flightTools.bookFlight({
        offer_id: 'off_declined_123',
        passenger: mockPassenger,
        booking_type: 'instant',
        payment: {
          amount: '299.00',
          currency: 'USD',
          payment_type: 'balance',
          card_number: '4000000000000002' // Declined card
        }
      });

      expect(result.content[0].text).toContain('\"success\": false');
      expect(result.content[0].text).toContain('Payment declined');
    });
  });

  describe('Hold and Pay Later Flow', () => {
    it('should hold flight and then complete payment', async () => {
      // Step 1: Hold the flight
      const mockHeldOrder = {
        id: 'ord_held_123',
        booking_reference: 'HELD123',
        total_amount: '299.00',
        total_currency: 'USD',
        documents: [],
        passengers: [mockPassenger],
        slices: [mockFlightOffer.slices[0]]
      };

      mockDuffelClient.holdFlight.mockResolvedValue(mockHeldOrder);

      const holdResult = await flightTools.bookFlight({
        offer_id: 'off_hold_123',
        passenger: mockPassenger
      });

      expect(holdResult.content[0].text).toContain('\"success\": true');
      expect(holdResult.content[0].text).toContain('\"status\": \"held\"');
      expect(holdResult.content[0].text).toContain('HELD123');

      // Step 2: Pay for the held order
      const mockPaymentResult = {
        id: 'pay_123',
        amount: '299.00',
        currency: 'USD',
        status: 'succeeded'
      };

      mockDuffelClient.createPayment.mockResolvedValue(mockPaymentResult);

      const payResult = await flightTools.payForHeldOrder({
        order_id: 'ord_held_123',
        payment: {
          amount: '299.00',
          currency: 'USD',
          payment_type: 'balance',
          card_number: TEST_PAYMENT_CARDS.SUCCESS_US
        }
      });

      expect(mockDuffelClient.createPayment).toHaveBeenCalledWith(
        'ord_held_123',
        {
          amount: '299.00',
          currency: 'USD',
          payment_type: 'balance'
        }
      );

      expect(payResult.content[0].text).toContain('\"success\": true');
      expect(payResult.content[0].text).toContain('\"status\": \"paid\"');
      expect(payResult.content[0].text).toContain('pay_123');
    });

    it('should handle payment failure for held order', async () => {
      mockDuffelClient.createPayment.mockRejectedValue(
        new Error('Payment failed: Card expired')
      );

      const result = await flightTools.payForHeldOrder({
        order_id: 'ord_held_456',
        payment: {
          amount: '299.00',
          currency: 'USD',
          payment_type: 'balance',
          card_number: '4000000000000069' // Expired card
        }
      });

      expect(result.content[0].text).toContain('\"success\": false');
      expect(result.content[0].text).toContain('Card expired');
    });
  });

  describe('Order Management', () => {
    it('should cancel confirmed order successfully', async () => {
      const mockCancellation = {
        id: 'can_123',
        order_id: 'ord_confirmed_123',
        refund_amount: '299.00',
        refund_currency: 'USD',
        status: 'succeeded'
      };

      mockDuffelClient.cancelOrder.mockResolvedValue(mockCancellation);

      const result = await flightTools.cancelFlightOrder({
        order_id: 'ord_confirmed_123'
      });

      expect(mockDuffelClient.cancelOrder).toHaveBeenCalledWith('ord_confirmed_123');
      expect(result.content[0].text).toContain('\"success\": true');
      expect(result.content[0].text).toContain('\"status\": \"cancelled\"');
      expect(result.content[0].text).toContain('can_123');
      expect(result.content[0].text).toContain('299.00');
    });

    it('should handle cancellation failure', async () => {
      mockDuffelClient.cancelOrder.mockRejectedValue(
        new Error('Order cannot be cancelled - outside cancellation window')
      );

      const result = await flightTools.cancelFlightOrder({
        order_id: 'ord_non_cancellable_123'
      });

      expect(result.content[0].text).toContain('\"success\": false');
      expect(result.content[0].text).toContain('cancellation window');
    });

    it('should cancel held order before payment', async () => {
      const mockCancellation = {
        id: 'can_held_123',
        order_id: 'ord_held_123',
        refund_amount: '0.00',
        refund_currency: 'USD',
        status: 'succeeded'
      };

      mockDuffelClient.cancelOrder.mockResolvedValue(mockCancellation);

      const result = await flightTools.cancelFlightOrder({
        order_id: 'ord_held_123'
      });

      expect(result.content[0].text).toContain('\"success\": true');
      expect(result.content[0].text).toContain('\"status\": \"cancelled\"');
      expect(result.content[0].text).toContain('0.00'); // No refund for held order
    });
  });

  describe('Complete Booking Scenarios', () => {
    it('should handle business class instant booking', async () => {
      const mockBusinessOrder = {
        id: 'ord_business_123',
        booking_reference: 'BIZ123',
        total_amount: '1299.00',
        total_currency: 'USD',
        documents: [
          {
            type: 'eticket',
            url: 'https://example.com/business-eticket.pdf'
          }
        ],
        passengers: [mockPassenger],
        slices: [mockFlightOffer.slices[0]]
      };

      mockDuffelClient.bookFlightInstant.mockResolvedValue(mockBusinessOrder);

      const result = await flightTools.bookFlight({
        offer_id: 'off_business_123',
        passenger: mockPassenger,
        booking_type: 'instant',
        payment: {
          amount: '1299.00',
          currency: 'USD',
          payment_type: 'balance',
          card_number: TEST_PAYMENT_CARDS.SUCCESS_US
        }
      });

      expect(result.content[0].text).toContain('\"success\": true');
      expect(result.content[0].text).toContain('\"status\": \"confirmed\"');
      expect(result.content[0].text).toContain('BIZ123');
      expect(result.content[0].text).toContain('1299.00');
    });

    it('should handle international booking with multiple currencies', async () => {
      const mockInternationalOrder = {
        id: 'ord_intl_123',
        booking_reference: 'INTL123',
        total_amount: '899.00',
        total_currency: 'EUR',
        documents: [
          {
            type: 'eticket',
            url: 'https://example.com/intl-eticket.pdf'
          }
        ],
        passengers: [mockPassenger],
        slices: [mockFlightOffer.slices[0]]
      };

      mockDuffelClient.bookFlightInstant.mockResolvedValue(mockInternationalOrder);

      const result = await flightTools.bookFlight({
        offer_id: 'off_intl_123',
        passenger: mockPassenger,
        booking_type: 'instant',
        payment: {
          amount: '899.00',
          currency: 'EUR',
          payment_type: 'balance',
          card_number: TEST_PAYMENT_CARDS.SUCCESS_GB
        }
      });

      expect(result.content[0].text).toContain('\"success\": true');
      expect(result.content[0].text).toContain('\"status\": \"confirmed\"');
      expect(result.content[0].text).toContain('INTL123');
      expect(result.content[0].text).toContain('EUR');
    });

    it('should handle round-trip booking confirmation', async () => {
      const mockRoundTripOrder = {
        id: 'ord_roundtrip_123',
        booking_reference: 'RT123',
        total_amount: '599.00',
        total_currency: 'USD',
        documents: [
          {
            type: 'eticket',
            url: 'https://example.com/roundtrip-eticket.pdf'
          }
        ],
        passengers: [mockPassenger],
        slices: [
          mockFlightOffer.slices[0],
          {
            ...mockFlightOffer.slices[0],
            id: 'sli_return_123'
          }
        ]
      };

      mockDuffelClient.bookFlightInstant.mockResolvedValue(mockRoundTripOrder);

      const result = await flightTools.bookFlight({
        offer_id: 'off_roundtrip_123',
        passenger: mockPassenger,
        booking_type: 'instant',
        payment: {
          amount: '599.00',
          currency: 'USD',
          payment_type: 'balance',
          card_number: TEST_PAYMENT_CARDS.SUCCESS_US
        }
      });

      expect(result.content[0].text).toContain('\"success\": true');
      expect(result.content[0].text).toContain('\"status\": \"confirmed\"');
      expect(result.content[0].text).toContain('RT123');
      expect(result.content[0].text).toContain('sli_return_123');
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should handle network timeout during booking', async () => {
      mockDuffelClient.bookFlightInstant.mockRejectedValue(
        new Error('Request timeout - please try again')
      );

      const result = await flightTools.bookFlight({
        offer_id: 'off_timeout_123',
        passenger: mockPassenger,
        booking_type: 'instant',
        payment: {
          amount: '299.00',
          currency: 'USD',
          payment_type: 'balance',
          card_number: TEST_PAYMENT_CARDS.SUCCESS_US
        }
      });

      expect(result.content[0].text).toContain('\"success\": false');
      expect(result.content[0].text).toContain('timeout');
    });

    it('should handle API rate limiting', async () => {
      mockDuffelClient.bookFlightInstant.mockRejectedValue(
        new Error('Rate limit exceeded - too many requests')
      );

      const result = await flightTools.bookFlight({
        offer_id: 'off_rate_limit_123',
        passenger: mockPassenger,
        booking_type: 'instant',
        payment: {
          amount: '299.00',
          currency: 'USD',
          payment_type: 'balance',
          card_number: TEST_PAYMENT_CARDS.SUCCESS_US
        }
      });

      expect(result.content[0].text).toContain('\"success\": false');
      expect(result.content[0].text).toContain('Rate limit exceeded');
    });
  });
});