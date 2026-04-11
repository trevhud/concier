import { CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../../utils/logger.js';

export class PaymentTools {
  constructor() {}

  async generatePaymentLink(args: any, context?: { isWebSocket?: boolean }): Promise<CallToolResult> {
    try {
      logger.info('Generating payment link', args);

      const { orderId, amount, currency, description } = args;

      if (!orderId || !amount || !currency) {
        throw new Error('Missing required payment parameters: orderId, amount, currency');
      }

      // Generate secure payment link that directs to our payment page
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      const paymentUrl = `${baseUrl}/payment?order=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(amount)}&currency=${encodeURIComponent(currency)}`;
      
      if (description) {
        const encodedDescription = encodeURIComponent(description);
        paymentUrl.concat(`&description=${encodedDescription}`);
      }

      // For WebSocket users, trigger payment modal instead of link
      if (context?.isWebSocket) {
        const content: TextContent = {
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: {
              type: 'payment_modal',
              orderId,
              amount,
              currency,
              description: description || `Payment for order ${orderId}`,
              message: 'Opening secure payment form...'
            },
            message: `Perfect! Opening the secure payment form for you now. You can complete your booking right here without leaving the chat.

Order Details:
- Order ID: ${orderId}
- Amount: ${amount} ${currency}

The payment form uses Duffel's secure processing to protect your information.`,
          }, null, 2),
        };
        return { content: [content] };
      }

      // For MCP/external users, provide payment link
      const content: TextContent = {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            paymentUrl,
            orderId,
            amount,
            currency,
            description: description || `Payment for order ${orderId}`,
            message: 'Payment link generated successfully'
          },
          message: `To complete your booking and secure your reservation, please use this payment link: ${paymentUrl}

This will take you to a secure payment page where you can enter your card details safely. The page uses Duffel's secure payment processing to protect your information.

Order Details:
- Order ID: ${orderId}
- Amount: ${amount} ${currency}
${description ? `- Description: ${description}` : ''}

The payment link is valid and ready to use. Simply click the link and follow the payment instructions.`,
        }, null, 2),
      };

      return {
        content: [content],
      };
    } catch (error) {
      logger.error('Payment link generation error:', error);
      
      const content: TextContent = {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Failed to generate payment link',
        }, null, 2),
      };

      return {
        content: [content],
      };
    }
  }

  async getPaymentStatus(args: any): Promise<CallToolResult> {
    try {
      logger.info('Getting payment status', args);

      const { orderId } = args;

      if (!orderId) {
        throw new Error('Missing required parameter: orderId');
      }

      // In a real implementation, this would check the payment status from Duffel
      // For now, we'll return a mock status
      const content: TextContent = {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: {
            orderId,
            status: 'pending',
            message: 'Payment is pending completion'
          },
          message: `Payment status for order ${orderId}: pending completion`,
        }, null, 2),
      };

      return {
        content: [content],
      };
    } catch (error) {
      logger.error('Payment status check error:', error);
      
      const content: TextContent = {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Failed to check payment status',
        }, null, 2),
      };

      return {
        content: [content],
      };
    }
  }
}

export function setupPaymentTools(): PaymentTools {
  return new PaymentTools();
}