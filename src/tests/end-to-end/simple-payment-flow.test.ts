import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HTTPTravelServer } from '../../http-server.js';

// Mock the Duffel SDK for predictable test behavior
vi.mock('../../services/duffel/flight-client.js', () => {
  return {
    DuffelSDKClient: vi.fn().mockImplementation(() => ({
      client: {
        orders: {
          get: vi.fn().mockResolvedValue({
            data: {
              id: 'ord_123',
              total_amount: '299.00',
              total_currency: 'USD',
              status: 'hold'
            }
          })
        }
      },
      getFlightOffer: vi.fn().mockResolvedValue({
        id: 'off_123',
        total_amount: '299.00',
        total_currency: 'USD',
        payment_requirements: {
          requires_instant_payment: false
        },
        passengers: [{ id: 'pas_123' }]
      }),
      createThreeDSecureSession: vi.fn().mockResolvedValue({
        id: 'tds_123',
        status: 'ready_for_payment',
        card_id: 'card_123'
      }),
      createPaymentWithCard: vi.fn().mockResolvedValue({
        id: 'pay_123',
        amount: '299.00',
        currency: 'USD',
        status: 'succeeded',
        order_id: 'ord_123'
      })
    }))
  };
});

describe('Simple Payment Flow Test', () => {
  let server: HTTPTravelServer;
  let serverUrl: string;
  const port = 8082; // Use different port to avoid conflicts

  beforeEach(async () => {
    server = new HTTPTravelServer();
    await new Promise<void>((resolve) => {
      server.start(port).then(() => {
        serverUrl = `http://localhost:${port}`;
        // Give server time to fully start
        setTimeout(resolve, 500);
      });
    });
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe('Payment Intent API', () => {
    it('should create payment intent for hold order', async () => {
      const response = await fetch(`${serverUrl}/api/payment-intents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: 'ord_123',
          amount: '299.00',
          currency: 'USD'
        })
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data.type).toBe('hold_payment');
      expect(data.order_id).toBe('ord_123');
      expect(data.amount).toBe('299.00');
      expect(data.currency).toBe('USD');
      expect(data.status).toBe('requires_card_details');
    });

    it('should create payment intent for instant payment offer', async () => {
      const response = await fetch(`${serverUrl}/api/payment-intents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: 'off_instant_123',
          amount: '450.00',
          currency: 'USD'
        })
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data.type).toBe('instant_payment');
      expect(data.offer_id).toBe('off_instant_123');
      expect(data.amount).toBe('299.00'); // Should use actual offer amount
      expect(data.currency).toBe('USD');
    });
  });

  describe('Payment Processing API', () => {
    it('should process payment for hold order', async () => {
      const response = await fetch(`${serverUrl}/api/process-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id: 'card_123',
          resource_id: 'ord_123',
          payment_type: 'hold_payment'
        })
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.payment.id).toBe('pay_123');
      expect(data.payment.status).toBe('succeeded');
      expect(data.message).toBe('Payment processed successfully');
    });

    it('should reject payment without required parameters', async () => {
      const response = await fetch(`${serverUrl}/api/process-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id: 'card_123'
          // Missing resource_id
        })
      });

      expect(response.ok).toBe(false);
      const data = await response.json();
      expect(data.error).toContain('Card ID and resource ID are required');
    });

    it('should handle 3DS challenge_required status', async () => {
      // Stop current server and restart with updated mock
      await server.stop();
      
      // Update the mock for 3DS challenge
      const { DuffelSDKClient } = await import('../../services/duffel/flight-client.js');
      vi.mocked(DuffelSDKClient).mockImplementation(() => ({
        client: {
          orders: {
            get: vi.fn().mockResolvedValue({
              data: {
                id: 'ord_123',
                total_amount: '299.00',
                total_currency: 'USD',
                status: 'hold'
              }
            })
          }
        },
        getFlightOffer: vi.fn().mockResolvedValue({
          id: 'off_123',
          total_amount: '299.00',
          total_currency: 'USD',
          payment_requirements: { requires_instant_payment: false },
          passengers: [{ id: 'pas_123' }]
        }),
        createThreeDSecureSession: vi.fn().mockResolvedValue({
          id: 'tds_challenge_123',
          status: 'challenge_required',
          card_id: 'card_3ds_123'
        }),
        createPaymentWithCard: vi.fn().mockResolvedValue({
          id: 'pay_123',
          amount: '299.00',
          currency: 'USD',
          status: 'succeeded',
          order_id: 'ord_123'
        })
      }));

      // Restart server
      server = new HTTPTravelServer();
      await new Promise<void>((resolve) => {
        server.start(port).then(() => {
          setTimeout(resolve, 200);
        });
      });

      const response = await fetch(`${serverUrl}/api/process-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id: 'card_3ds_123',
          resource_id: 'ord_123',
          payment_type: 'hold_payment'
        })
      });

      expect(response.ok).toBe(false);
      const data = await response.json();
      expect(data.error).toContain('Payment authentication required');
      expect(data.three_d_secure_status).toBe('challenge_required');
    });

    it('should require passenger info for instant payments', async () => {
      // Stop current server and restart with mock that passes 3DS but requires passenger info
      await server.stop();
      
      // Update the mock to pass 3DS but require passenger info
      const { DuffelSDKClient } = await import('../../services/duffel/flight-client.js');
      vi.mocked(DuffelSDKClient).mockImplementation(() => ({
        client: {
          orders: {
            get: vi.fn().mockResolvedValue({
              data: {
                id: 'ord_123',
                total_amount: '299.00',
                total_currency: 'USD',
                status: 'hold'
              }
            })
          }
        },
        getFlightOffer: vi.fn().mockResolvedValue({
          id: 'off_instant_123',
          total_amount: '450.00',
          total_currency: 'USD',
          payment_requirements: { requires_instant_payment: true },
          passengers: [{ id: 'pas_instant_123' }]
        }),
        createThreeDSecureSession: vi.fn().mockResolvedValue({
          id: 'tds_success_123',
          status: 'ready_for_payment',
          card_id: 'card_123'
        }),
        createPaymentWithCard: vi.fn().mockResolvedValue({
          id: 'pay_123',
          amount: '299.00',
          currency: 'USD',
          status: 'succeeded',
          order_id: 'ord_123'
        }),
        bookFlightWithCard: vi.fn().mockResolvedValue({
          id: 'ord_instant_123',
          booking_reference: 'XYZ789',
          total_amount: '450.00',
          total_currency: 'USD',
          status: 'confirmed'
        })
      }));

      // Restart server
      server = new HTTPTravelServer();
      await new Promise<void>((resolve) => {
        server.start(port).then(() => {
          setTimeout(resolve, 200);
        });
      });

      const response = await fetch(`${serverUrl}/api/process-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id: 'card_123',
          resource_id: 'off_instant_123',
          payment_type: 'instant_payment'
          // Missing passenger_info
        })
      });

      expect(response.ok).toBe(false);
      const data = await response.json();
      expect(data.error).toContain('passenger information');
      expect(data.requires_passenger_info).toBe(true);
    });
  });

  describe('Health Check', () => {
    it('should respond to health check', async () => {
      const response = await fetch(`${serverUrl}/health`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.status).toBe('healthy');
      expect(data.timestamp).toBeDefined();
    });
  });
});