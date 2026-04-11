import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketTravelServer } from './websocket-server.js';
import { logger } from './utils/logger.js';
import { validateConfig } from './utils/config.js';
import { DuffelSDKClient } from './services/duffel/flight-client.js';

export class HTTPTravelServer {
  private app: express.Application;
  private server: any;
  private webSocketServer: WebSocketTravelServer;
  private duffelClient: DuffelSDKClient;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.duffelClient = new DuffelSDKClient();
    this.setupMiddleware();
    this.setupRoutes();
    this.webSocketServer = new WebSocketTravelServer(this.server);
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static('frontend/build'));
  }

  private setupRoutes(): void {
    // Note: All chat functionality is handled by WebSocket server
    // This HTTP server only provides utility endpoints

    this.app.post('/clear_chat', (req, res) => {
      // Clear chat histories in WebSocket server
      this.webSocketServer.clearAllChatHistories();
      res.json({ success: true });
    });

    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // Let React Router handle /payment route

    // Component Client Key endpoint for Duffel UI components
    this.app.post('/api/component-client-key', async (req, res) => {
      try {
        const { orderId } = req.body;
        
        const clientKey = await this.createComponentClientKey(orderId);
        res.json({ clientKey });
      } catch (error) {
        logger.error('Component client key creation error:', error);
        res.status(500).json({ error: 'Failed to create component client key' });
      }
    });

    // Payment Intent endpoints (for future Duffel Forms integration)
    this.app.post('/api/payment-intents', async (req, res) => {
      try {
        const { orderId, amount, currency = 'USD' } = req.body;

        if (!orderId || !amount) {
          return res.status(400).json({ error: 'Order ID and amount are required' });
        }

        const paymentIntent = await this.createPaymentIntent(orderId, amount, currency);
        res.json(paymentIntent);
      } catch (error) {
        logger.error('Payment intent creation error:', error);
        res.status(500).json({ error: 'Failed to create payment intent' });
      }
    });

    // Process payment using Duffel SDK (3DS + payment creation)
    this.app.post('/api/process-payment', async (req, res) => {
      try {
        const { card_id, resource_id, payment_type } = req.body;

        if (!card_id || !resource_id) {
          return res.status(400).json({ error: 'Card ID and resource ID are required' });
        }

        logger.info('Processing payment via Duffel SDK', { card_id, resource_id, payment_type });

        // Process payment directly using card token (3D Secure handled by Duffel Components)
        const isOffer = resource_id.startsWith('off_');
        
        // Get actual amount/currency from API for security
        let actualAmount: string;
        let actualCurrency: string;
        
        if (isOffer) {
          const offer = await this.duffelClient.getFlightOffer(resource_id);
          actualAmount = offer.total_amount;
          actualCurrency = offer.total_currency;
        } else {
          const order = await this.duffelClient.getClient().orders.get(resource_id);
          if (!order.data) {
            throw new Error('Order not found');
          }
          actualAmount = order.data.total_amount;
          actualCurrency = order.data.total_currency;
        }
        
        // Validate against expected amount if provided
        const { expected_amount, expected_currency } = req.body;
        if (expected_amount && expected_amount !== actualAmount) {
          return res.status(400).json({
            error: 'Price mismatch - please refresh and try again',
            expected: { amount: expected_amount, currency: expected_currency },
            actual: { amount: actualAmount, currency: actualCurrency }
          });
        }
        let result;
        if (payment_type === 'instant_payment' || isOffer) {
          // Instant payment requires passenger info from profile
          const { passenger_info } = req.body;
          
          if (!passenger_info) {
            return res.status(400).json({ 
              error: 'Instant payment booking requires passenger information',
              requires_passenger_info: true
            });
          }
          
          // Convert profile format to Duffel passenger format
          const passengerInfo = {
            phone_number: passenger_info.phone,
            email: passenger_info.email,
            title: passenger_info.title,
            gender: passenger_info.gender,
            family_name: passenger_info.lastName,
            given_name: passenger_info.firstName,
            born_on: passenger_info.dateOfBirth
          };
          
          const payment = { 
            amount: actualAmount, 
            currency: actualCurrency, 
            payment_type: 'balance' 
          };
          result = await this.duffelClient.bookFlightInstant(resource_id, passengerInfo, payment);
        } else {
          // Hold order payment
          const payment = { 
            amount: actualAmount, 
            currency: actualCurrency, 
            payment_type: 'balance' 
          };
          result = await this.duffelClient.createPayment(resource_id, payment);
        }

        res.json({
          success: true,
          payment: result,
          message: 'Payment processed successfully'
        });
      } catch (error) {
        logger.error('Payment processing error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Payment processing failed' });
      }
    });

    this.app.post('/api/payment-intents/:id/confirm', async (req, res) => {
      try {
        const { id } = req.params;
        const confirmation = await this.confirmPaymentIntent(id);
        res.json(confirmation);
      } catch (error) {
        logger.error('Payment intent confirmation error:', error);
        res.status(500).json({ error: 'Failed to confirm payment intent' });
      }
    });

    // Catch-all handler: send back React's index.html file for any non-API routes
    // This allows React Router to handle client-side routing
    this.app.get('*', (req, res) => {
      // Don't handle API routes or WebSocket routes
      if (req.path.startsWith('/api/') || req.path.startsWith('/ws')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      
      res.sendFile('index.html', { root: 'frontend/build' });
    });
  }

  private async createPaymentIntent(orderId: string, amount: string, currency: string): Promise<any> {
    try {
      logger.info('Creating payment intent', { orderId, amount, currency });
      
      // Check if this is an offer ID (instant payment) or order ID (hold payment)
      const isOffer = orderId.startsWith('off_');
      
      if (isOffer) {
        // Instant payment flow - verify offer exists
        try {
          const offer = await this.duffelClient.getFlightOffer(orderId);
          
          return {
            id: `pi_${Date.now()}`,
            type: 'instant_payment',
            offer_id: orderId,
            amount: offer.total_amount,
            currency: offer.total_currency,
            status: 'requires_card_details',
            metadata: {
              resource_id: orderId,
              resource_type: 'offer',
              amount: offer.total_amount,
              currency: offer.total_currency,
              created_at: new Date().toISOString()
            }
          };
        } catch (error) {
          logger.error('Error getting offer for payment intent:', error);
          throw new Error('Failed to verify offer for payment');
        }
      } else {
        // Hold order payment - verify order exists
        try {
          const order = await this.duffelClient.getClient().orders.get(orderId);
          
          if (!order.data) {
            throw new Error('Order not found');
          }
          
          return {
            id: `pi_${Date.now()}`,
            type: 'hold_payment',
            order_id: orderId,
            amount: order.data.total_amount,
            currency: order.data.total_currency,
            status: 'requires_card_details',
            metadata: {
              resource_id: orderId,
              resource_type: 'order',
              amount: order.data.total_amount,
              currency: order.data.total_currency,
              created_at: new Date().toISOString()
            }
          };
        } catch (error) {
          logger.error('Error getting order for payment intent:', error);
          throw new Error('Failed to verify order for payment');
        }
      }
    } catch (error) {
      logger.error('Payment intent creation failed:', error);
      throw new Error('Failed to create payment intent');
    }
  }

  private async createComponentClientKey(orderId?: string): Promise<string> {
    try {
      logger.info('Creating component client key', { orderId });
      
      // Build request body based on whether we have an order ID
      const requestBody: any = {};
      
      if (orderId) {
        // For now, we'll create a key with just the order_id
        // In a full implementation, you might also want to include user_id
        requestBody.order_id = orderId;
      }
      
      const response = await fetch('https://api.duffel.com/identity/component_client_keys', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'Duffel-Version': 'v2',
          'Authorization': `Bearer ${process.env.DUFFEL_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Duffel API error creating component client key:', errorText);
        throw new Error(`Failed to create component client key: ${response.status}`);
      }

      const data = await response.json();
      return data.data.component_client_key;
      
    } catch (error) {
      logger.error('Component client key creation failed:', error);
      throw new Error('Failed to create component client key');
    }
  }

  private async confirmPaymentIntent(paymentIntentId: string): Promise<any> {
    // Mock implementation - in production this would confirm the payment
    return {
      id: paymentIntentId,
      status: 'succeeded'
    };
  }

  async start(port: number = 8080): Promise<void> {
    try {
      validateConfig('http');
      
      this.server.listen(port, () => {
        logger.info(`HTTP Travel Server started on port ${port}`);
        logger.info(`WebSocket server available at ws://localhost:${port}/ws`);
        logger.info(`Frontend will be available at http://localhost:${port}`);
      });
    } catch (error) {
      logger.error('Failed to start HTTP server:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((error: Error | undefined) => {
          if (error) {
            logger.error('Error stopping HTTP server:', error);
            reject(error);
          } else {
            logger.info('HTTP Travel Server stopped');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}