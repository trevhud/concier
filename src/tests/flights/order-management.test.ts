import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FlightTools } from '../../mcp/tools/flights.js';
import { mockFlightOffer, mockPassenger } from '../setup.js';

vi.mock('../../services/duffel/flight-client.js', () => {
  return {
    DuffelSDKClient: vi.fn().mockImplementation(() => ({
      searchFlights: vi.fn(),
      getFlightOffer: vi.fn(),
      holdFlight: vi.fn(),
      bookFlightInstant: vi.fn(),
      createPayment: vi.fn(),
      cancelOrder: vi.fn()
    }))
  };
});

describe('Flight Order Management Tests', () => {
  let flightTools: FlightTools;
  let mockDuffelClient: any;

  beforeEach(() => {
    flightTools = new FlightTools();
    mockDuffelClient = (flightTools as any).duffelClient;
  });

  describe('Payment Processing for Held Orders', () => {
    it('should process payment for held order successfully', async () => {
      const mockPaymentResult = {
        id: 'pay_successful_123',
        amount: '299.00',
        currency: 'USD',
        status: 'succeeded',
        created_at: '2024-01-15T10:30:00Z'
      };

      mockDuffelClient.createPayment.mockResolvedValue(mockPaymentResult);

      const result = await flightTools.payForHeldOrder({
        order_id: 'ord_held_123',
        payment: {
          amount: '299.00',
          currency: 'USD',
          payment_type: 'balance'
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

      expect(result.content[0].text).toContain('\"success\": true');
      expect(result.content[0].text).toContain('\"status\": \"paid\"');
      expect(result.content[0].text).toContain('pay_successful_123');
      expect(result.content[0].text).toContain('299.00');
    });

    it('should handle payment failure for held order', async () => {
      mockDuffelClient.createPayment.mockRejectedValue(
        new Error('Payment failed: Card declined')
      );

      const result = await flightTools.payForHeldOrder({
        order_id: 'ord_held_456',
        payment: {
          amount: '299.00',
          currency: 'USD',
          payment_type: 'balance'
        }
      });

      expect(result.content[0].text).toContain('\"success\": false');
      expect(result.content[0].text).toContain('Card declined');
    });

    it('should handle payment with different currencies', async () => {
      const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD'];
      
      for (const currency of currencies) {
        const mockPaymentResult = {
          id: `pay_${currency.toLowerCase()}_123`,
          amount: '299.00',
          currency: currency,
          status: 'succeeded'
        };

        mockDuffelClient.createPayment.mockResolvedValue(mockPaymentResult);

        const result = await flightTools.payForHeldOrder({
          order_id: `ord_${currency.toLowerCase()}_123`,
          payment: {
            amount: '299.00',
            currency: currency,
            payment_type: 'balance'
          }
        });

        expect(result.content[0].text).toContain('\"success\": true');
        expect(result.content[0].text).toContain(`\"currency\": \"${currency}\"`);
      }
    });

    it('should handle payment with invalid order ID', async () => {
      mockDuffelClient.createPayment.mockRejectedValue(
        new Error('Order not found or expired')
      );

      const result = await flightTools.payForHeldOrder({
        order_id: 'ord_invalid_123',
        payment: {
          amount: '299.00',
          currency: 'USD',
          payment_type: 'balance'
        }
      });

      expect(result.content[0].text).toContain('\"success\": false');
      expect(result.content[0].text).toContain('Order not found');
    });
  });

  describe('Order Cancellation', () => {
    it('should cancel confirmed order with full refund', async () => {
      const mockCancellation = {
        id: 'can_full_refund_123',
        order_id: 'ord_confirmed_123',
        refund_amount: '299.00',
        refund_currency: 'USD',
        status: 'succeeded',
        created_at: '2024-01-15T11:00:00Z'
      };

      mockDuffelClient.cancelOrder.mockResolvedValue(mockCancellation);

      const result = await flightTools.cancelFlightOrder({
        order_id: 'ord_confirmed_123'
      });

      expect(mockDuffelClient.cancelOrder).toHaveBeenCalledWith('ord_confirmed_123');
      expect(result.content[0].text).toContain('\"success\": true');
      expect(result.content[0].text).toContain('\"status\": \"cancelled\"');
      expect(result.content[0].text).toContain('can_full_refund_123');
      expect(result.content[0].text).toContain('299.00');
    });

    it('should cancel order with partial refund', async () => {
      const mockCancellation = {
        id: 'can_partial_refund_123',
        order_id: 'ord_confirmed_456',
        refund_amount: '199.00',
        refund_currency: 'USD',
        status: 'succeeded',
        cancellation_fee: '100.00'
      };

      mockDuffelClient.cancelOrder.mockResolvedValue(mockCancellation);

      const result = await flightTools.cancelFlightOrder({
        order_id: 'ord_confirmed_456'
      });

      expect(result.content[0].text).toContain('\"success\": true');
      expect(result.content[0].text).toContain('\"status\": \"cancelled\"');
      expect(result.content[0].text).toContain('199.00');
    });

    it('should cancel held order (no refund)', async () => {
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
      expect(result.content[0].text).toContain('0.00');
    });

    it('should handle cancellation failure - outside window', async () => {
      mockDuffelClient.cancelOrder.mockRejectedValue(
        new Error('Order cannot be cancelled - outside cancellation window')
      );

      const result = await flightTools.cancelFlightOrder({
        order_id: 'ord_non_cancellable_123'
      });

      expect(result.content[0].text).toContain('\"success\": false');
      expect(result.content[0].text).toContain('cancellation window');
    });

    it('should handle cancellation failure - already departed', async () => {
      mockDuffelClient.cancelOrder.mockRejectedValue(
        new Error('Cannot cancel order - flight has already departed')
      );

      const result = await flightTools.cancelFlightOrder({
        order_id: 'ord_departed_123'
      });

      expect(result.content[0].text).toContain('\"success\": false');
      expect(result.content[0].text).toContain('already departed');
    });

    it('should handle cancellation of non-existent order', async () => {
      mockDuffelClient.cancelOrder.mockRejectedValue(
        new Error('Order not found')
      );

      const result = await flightTools.cancelFlightOrder({
        order_id: 'ord_nonexistent_123'
      });

      expect(result.content[0].text).toContain('\"success\": false');
      expect(result.content[0].text).toContain('Order not found');
    });
  });

  describe('Order State Management', () => {
    it('should handle cancellation of orders in different states', async () => {
      const orderStates = [
        { state: 'held', refund: '0.00' },
        { state: 'confirmed', refund: '299.00' },
        { state: 'paid', refund: '199.00' } // Partial refund due to fees
      ];

      for (const orderState of orderStates) {
        const mockCancellation = {
          id: `can_${orderState.state}_123`,
          order_id: `ord_${orderState.state}_123`,
          refund_amount: orderState.refund,
          refund_currency: 'USD',
          status: 'succeeded'
        };

        mockDuffelClient.cancelOrder.mockResolvedValue(mockCancellation);

        const result = await flightTools.cancelFlightOrder({
          order_id: `ord_${orderState.state}_123`
        });

        expect(result.content[0].text).toContain('\"success\": true');
        expect(result.content[0].text).toContain('\"status\": \"cancelled\"');
        expect(result.content[0].text).toContain(orderState.refund);
      }
    });

    it('should handle payment processing for various order amounts', async () => {
      const paymentAmounts = [
        { amount: '99.00', currency: 'USD' },
        { amount: '299.00', currency: 'EUR' },
        { amount: '599.00', currency: 'GBP' },
        { amount: '1299.00', currency: 'USD' },
        { amount: '2999.00', currency: 'EUR' }
      ];

      for (const payment of paymentAmounts) {
        const mockPaymentResult = {
          id: `pay_${payment.amount}_123`,
          amount: payment.amount,
          currency: payment.currency,
          status: 'succeeded'
        };

        mockDuffelClient.createPayment.mockResolvedValue(mockPaymentResult);

        const result = await flightTools.payForHeldOrder({
          order_id: `ord_${payment.amount}_123`,
          payment: {
            amount: payment.amount,
            currency: payment.currency,
            payment_type: 'balance'
          }
        });

        expect(result.content[0].text).toContain('\"success\": true');
        expect(result.content[0].text).toContain(`\"amount\": \"${payment.amount}\"`);
        expect(result.content[0].text).toContain(`\"currency\": \"${payment.currency}\"`);
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network timeout during payment', async () => {
      mockDuffelClient.createPayment.mockRejectedValue(
        new Error('Request timeout - payment processing')
      );

      const result = await flightTools.payForHeldOrder({
        order_id: 'ord_timeout_123',
        payment: {
          amount: '299.00',
          currency: 'USD',
          payment_type: 'balance'
        }
      });

      expect(result.content[0].text).toContain('\"success\": false');
      expect(result.content[0].text).toContain('timeout');
    });

    it('should handle network timeout during cancellation', async () => {
      mockDuffelClient.cancelOrder.mockRejectedValue(
        new Error('Request timeout - cancellation processing')
      );

      const result = await flightTools.cancelFlightOrder({
        order_id: 'ord_timeout_cancel_123'
      });

      expect(result.content[0].text).toContain('\"success\": false');
      expect(result.content[0].text).toContain('timeout');
    });

    it('should handle API rate limiting during payment', async () => {
      mockDuffelClient.createPayment.mockRejectedValue(
        new Error('Rate limit exceeded - too many payment requests')
      );

      const result = await flightTools.payForHeldOrder({
        order_id: 'ord_rate_limit_123',
        payment: {
          amount: '299.00',
          currency: 'USD',
          payment_type: 'balance'
        }
      });

      expect(result.content[0].text).toContain('\"success\": false');
      expect(result.content[0].text).toContain('Rate limit exceeded');
    });

    it('should handle API rate limiting during cancellation', async () => {
      mockDuffelClient.cancelOrder.mockRejectedValue(
        new Error('Rate limit exceeded - too many cancellation requests')
      );

      const result = await flightTools.cancelFlightOrder({
        order_id: 'ord_rate_limit_cancel_123'
      });

      expect(result.content[0].text).toContain('\"success\": false');
      expect(result.content[0].text).toContain('Rate limit exceeded');
    });

    it('should handle invalid payment amount', async () => {
      mockDuffelClient.createPayment.mockRejectedValue(
        new Error('Invalid payment amount - amount must be positive')
      );

      const result = await flightTools.payForHeldOrder({
        order_id: 'ord_invalid_amount_123',
        payment: {
          amount: '0.00',
          currency: 'USD',
          payment_type: 'balance'
        }
      });

      expect(result.content[0].text).toContain('\"success\": false');
      expect(result.content[0].text).toContain('Invalid payment amount');
    });

    it('should handle currency mismatch', async () => {
      mockDuffelClient.createPayment.mockRejectedValue(
        new Error('Currency mismatch - order currency is USD but payment currency is EUR')
      );

      const result = await flightTools.payForHeldOrder({
        order_id: 'ord_currency_mismatch_123',
        payment: {
          amount: '299.00',
          currency: 'EUR',
          payment_type: 'balance'
        }
      });

      expect(result.content[0].text).toContain('\"success\": false');
      expect(result.content[0].text).toContain('Currency mismatch');
    });
  });
});