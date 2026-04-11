# Stripe Payment Migration Plan

## Executive Summary

Following Duffel's discontinuation of their payments API, this document outlines the comprehensive migration plan to implement Stripe-based payment processing with a 5% service fee structure. The new architecture maintains a balance-based approach where user payments via Stripe fund a Duffel account balance for booking payments.

## Current Architecture Analysis

### Existing Payment Flow
```
User → DuffelCardForm → Duffel Payments API → Flight Booking Confirmation
```

### Current Components
- **Frontend**: `DuffelCardForm` component from `@duffel/components`
- **Backend**: Direct Duffel payment processing via SDK
- **Payment Types**:
  - Hold-then-pay (for flights that can be held)
  - Instant payment (for time-sensitive flights)

### Current Files Requiring Updates
- `src/mcp/tools/payments.ts` - Payment tool orchestration
- `frontend/src/components/PaymentForm.js` - Duffel payment UI
- `frontend/src/components/PaymentPage.js` - Standalone payment page
- `src/http-server.ts` - Payment API endpoints
- `src/services/duffel/flight-client.ts` - Duffel booking logic

## New Architecture Design

### Payment Flow Overview
```
User → Stripe Checkout → Payment Success → Duffel Balance Payment → Flight Booking
```

### Fee Structure
- **Base Flight Price**: As quoted by Duffel (e.g., $299)
- **Service Fee**: 5% of base price (e.g., $14.95)
- **Total Charged**: Base + Fee (e.g., $313.95)
- **Payment to Duffel**: Base price only ($299)
- **Net Revenue**: Service fee ($14.95)

### System Components

#### 1. Stripe Integration Layer
```typescript
// New service: src/services/stripe/stripe-client.ts
class StripePaymentService {
  - createPaymentIntent(amount, currency, orderId)
  - calculateServiceFee(baseAmount)
  - createCustomer(userInfo)
  - handleWebhook(payload, signature)
  - processRefund(paymentIntentId, amount)
}
```

#### 2. Payment Reconciliation System
```typescript
// New service: src/services/reconciliation/payment-reconciler.ts
class PaymentReconciler {
  - trackUserPayment(stripePaymentId, orderId, amount)
  - confirmDuffelPayment(orderId, duffelTransactionId)
  - handleFailedBooking(orderId, stripePaymentId)
  - generateReconciliationReport()
}
```

#### 3. Database Schema Updates

**New Supabase Tables:**

```sql
-- Payment transactions tracking
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  duffel_order_id TEXT,
  duffel_offer_id TEXT,
  user_device_id TEXT REFERENCES user_profiles(device_id),
  base_amount DECIMAL(10,2) NOT NULL,
  service_fee DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL, -- pending, confirmed, failed, refunded
  payment_type TEXT NOT NULL, -- hold_payment, instant_payment
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stripe customer management
CREATE TABLE stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_device_id TEXT REFERENCES user_profiles(device_id),
  stripe_customer_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment method storage (optional for future saved cards)
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_device_id TEXT REFERENCES user_profiles(device_id),
  stripe_payment_method_id TEXT UNIQUE NOT NULL,
  card_last4 TEXT,
  card_brand TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Booking reconciliation audit trail
CREATE TABLE booking_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_transaction_id UUID REFERENCES payment_transactions(id),
  duffel_order_id TEXT NOT NULL,
  duffel_payment_id TEXT,
  reconciliation_status TEXT NOT NULL, -- pending, matched, mismatched
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Duffel balance tracking (for monitoring)
CREATE TABLE duffel_balance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  balance_amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  last_checked TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  low_balance_alert_sent BOOLEAN DEFAULT FALSE
);
```

## Implementation Phases

### Phase 1: Core Stripe Integration (Week 1)

#### 1.1 Backend Dependencies
```bash
npm install stripe @types/stripe
```

#### 1.2 Environment Configuration
```bash
# New environment variables
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SERVICE_FEE_PERCENTAGE=0.05
MINIMUM_DUFFEL_BALANCE=1000.00
BALANCE_ALERT_EMAIL=admin@concier.com
```

#### 1.3 Stripe Service Implementation
Create `src/services/stripe/stripe-client.ts`:
```typescript
import Stripe from 'stripe';
import { CONFIG } from '../../utils/config.js';
import { logger } from '../../utils/logger.js';

export class StripePaymentService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(CONFIG.stripe.secretKey, {
      apiVersion: '2024-11-20.acacia',
    });
  }

  async createPaymentIntent(baseAmount: number, currency: string, metadata: any) {
    const serviceFee = Math.round(baseAmount * CONFIG.stripe.serviceFeePercentage);
    const totalAmount = baseAmount + serviceFee;

    return await this.stripe.paymentIntents.create({
      amount: totalAmount, // Stripe uses cents
      currency: currency.toLowerCase(),
      metadata: {
        ...metadata,
        baseAmount: baseAmount.toString(),
        serviceFee: serviceFee.toString(),
      },
      automatic_payment_methods: { enabled: true },
    });
  }

  async createCustomer(email: string, name?: string) {
    return await this.stripe.customers.create({
      email,
      name,
    });
  }

  async processRefund(paymentIntentId: string, amount?: number) {
    return await this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount, // If not specified, refunds full amount
    });
  }
}
```

#### 1.4 Database Migrations
Create Supabase migrations for new tables (as specified above).

### Phase 2: API Endpoint Updates (Week 1-2)

#### 2.1 New HTTP Endpoints
Update `src/http-server.ts`:

```typescript
// Replace existing payment endpoints with:

// Create Stripe payment intent
app.post('/api/stripe/payment-intent', async (req, res) => {
  try {
    const { orderId, amount, currency, description, userInfo } = req.body;

    // Calculate fee
    const baseAmount = Math.round(parseFloat(amount) * 100); // Convert to cents
    const serviceFee = Math.round(baseAmount * CONFIG.stripe.serviceFeePercentage);
    const totalAmount = baseAmount + serviceFee;

    // Create or get Stripe customer
    let stripeCustomer;
    if (userInfo?.email) {
      stripeCustomer = await stripeService.createCustomer(
        userInfo.email,
        `${userInfo.firstName} ${userInfo.lastName}`
      );
    }

    // Create payment intent
    const paymentIntent = await stripeService.createPaymentIntent(
      baseAmount,
      currency,
      {
        orderId,
        description,
        customerId: stripeCustomer?.id,
      }
    );

    // Store transaction record
    await supabase.from('payment_transactions').insert({
      stripe_payment_intent_id: paymentIntent.id,
      duffel_order_id: orderId.startsWith('ord_') ? orderId : null,
      duffel_offer_id: orderId.startsWith('off_') ? orderId : null,
      user_device_id: userInfo?.deviceId,
      base_amount: baseAmount / 100,
      service_fee: serviceFee / 100,
      total_amount: totalAmount / 100,
      currency,
      status: 'pending',
      payment_type: orderId.startsWith('off_') ? 'instant_payment' : 'hold_payment',
      stripe_customer_id: stripeCustomer?.id,
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      baseAmount: baseAmount / 100,
      serviceFee: serviceFee / 100,
      totalAmount: totalAmount / 100,
    });
  } catch (error) {
    logger.error('Stripe payment intent creation failed:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Stripe webhook handler
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, CONFIG.stripe.webhookSecret);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object);
        break;
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Stripe webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

// Confirm booking after successful payment
app.post('/api/bookings/confirm', async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    // Get payment transaction
    const { data: transaction } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();

    if (!transaction) {
      return res.status(404).json({ error: 'Payment transaction not found' });
    }

    // Process Duffel booking with balance payment
    let bookingResult;
    if (transaction.payment_type === 'instant_payment') {
      bookingResult = await duffelClient.bookFlightWithBalance(
        transaction.duffel_offer_id,
        transaction.user_device_id
      );
    } else {
      bookingResult = await duffelClient.confirmOrderWithBalance(
        transaction.duffel_order_id
      );
    }

    // Update transaction status
    await supabase
      .from('payment_transactions')
      .update({
        status: 'confirmed',
        duffel_order_id: bookingResult.id
      })
      .eq('stripe_payment_intent_id', paymentIntentId);

    res.json({ booking: bookingResult });
  } catch (error) {
    logger.error('Booking confirmation failed:', error);

    // Trigger refund for failed booking
    await stripeService.processRefund(paymentIntentId);

    res.status(500).json({ error: 'Booking failed, refund initiated' });
  }
});
```

### Phase 3: Frontend Migration (Week 2)

#### 3.1 Frontend Dependencies
```bash
cd frontend && npm install @stripe/stripe-js @stripe/react-stripe-js
```

#### 3.2 Stripe Provider Setup
Update `frontend/src/App.js`:
```javascript
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

function App() {
  return (
    <Elements stripe={stripePromise}>
      {/* Existing app content */}
    </Elements>
  );
}
```

#### 3.3 New Payment Component
Create `frontend/src/components/StripePaymentForm.js`:
```javascript
import React, { useState, useEffect } from 'react';
import {
  useStripe,
  useElements,
  PaymentElement,
  AddressElement,
} from '@stripe/react-stripe-js';

function StripePaymentForm({ orderDetails, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    createPaymentIntent();
  }, [orderDetails]);

  const createPaymentIntent = async () => {
    try {
      const response = await fetch('/api/stripe/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderDetails.orderId,
          amount: orderDetails.amount,
          currency: orderDetails.currency,
          description: orderDetails.description,
          userInfo: orderDetails.userInfo,
        }),
      });

      const data = await response.json();
      setPaymentIntent(data);
    } catch (error) {
      onError('Failed to initialize payment');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);

    const { error, paymentIntent: confirmedPayment } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success`,
      },
      redirect: 'if_required',
    });

    if (error) {
      onError(error.message);
    } else if (confirmedPayment.status === 'succeeded') {
      // Confirm booking with backend
      const bookingResponse = await fetch('/api/bookings/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId: confirmedPayment.id }),
      });

      if (bookingResponse.ok) {
        const booking = await bookingResponse.json();
        onSuccess(booking);
      } else {
        onError('Booking confirmation failed');
      }
    }

    setLoading(false);
  };

  if (!paymentIntent) {
    return <div>Loading payment form...</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Order Summary with Fee Breakdown */}
      <div className="payment-summary">
        <h3>Payment Summary</h3>
        <div className="line-item">
          <span>Flight Price:</span>
          <span>${paymentIntent.baseAmount}</span>
        </div>
        <div className="line-item">
          <span>Service Fee (5%):</span>
          <span>${paymentIntent.serviceFee}</span>
        </div>
        <div className="line-item total">
          <span>Total:</span>
          <span>${paymentIntent.totalAmount}</span>
        </div>
      </div>

      <PaymentElement />
      <AddressElement options={{ mode: 'billing' }} />

      <button
        type="submit"
        disabled={!stripe || loading}
        className="pay-button"
      >
        {loading ? 'Processing...' : `Pay $${paymentIntent.totalAmount}`}
      </button>
    </form>
  );
}

export default StripePaymentForm;
```

#### 3.4 Update Existing Payment Components
Replace DuffelCardForm usage in:
- `frontend/src/components/PaymentForm.js`
- `frontend/src/components/PaymentPage.js`

### Phase 4: Duffel Integration Updates (Week 2-3)

#### 4.1 Balance Payment Implementation
Update `src/services/duffel/flight-client.ts`:

```typescript
// New method for balance-based payments
async bookFlightWithBalance(offerId: string, userDeviceId: string): Promise<any> {
  try {
    // Get user profile for passenger info
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('device_id', userDeviceId)
      .single();

    if (!profile) {
      throw new Error('User profile not found');
    }

    const offer = await this.getFlightOffer(offerId);

    // Check Duffel balance before booking
    await this.checkSufficientBalance(offer.total_amount, offer.total_currency);

    const order = await this.client.orders.create({
      type: 'instant',
      selected_offers: [offerId],
      passengers: [{
        id: offer.passengers[0].id,
        phone_number: profile.phone,
        email: profile.email,
        family_name: profile.last_name,
        given_name: profile.first_name,
        born_on: profile.date_of_birth,
      }],
      payments: [{
        type: 'balance',
        amount: offer.total_amount,
        currency: offer.total_currency,
      }],
    });

    // Log balance usage
    await this.logBalanceUsage(offer.total_amount, offer.total_currency);

    return order.data;
  } catch (error) {
    logger.error('Balance-based booking failed:', error);
    throw error;
  }
}

async confirmOrderWithBalance(orderId: string): Promise<any> {
  try {
    const order = await this.client.orders.get(orderId);

    if (!order.data) {
      throw new Error('Order not found');
    }

    // Check balance before confirming
    await this.checkSufficientBalance(
      order.data.total_amount,
      order.data.total_currency
    );

    const payment = await this.client.payments.create({
      order_id: orderId,
      payment: {
        type: 'balance',
        amount: order.data.total_amount,
        currency: order.data.total_currency,
      },
    });

    // Log balance usage
    await this.logBalanceUsage(
      order.data.total_amount,
      order.data.total_currency
    );

    return payment.data;
  } catch (error) {
    logger.error('Order confirmation with balance failed:', error);
    throw error;
  }
}

private async checkSufficientBalance(amount: string, currency: string) {
  // This would check your Duffel account balance via API
  // For now, implement a simple threshold check
  const requiredAmount = parseFloat(amount);
  const minimumBalance = parseFloat(CONFIG.duffel.minimumBalance);

  if (requiredAmount > minimumBalance) {
    // Send alert to admin
    await this.sendLowBalanceAlert(requiredAmount, currency);
    throw new Error('Insufficient Duffel account balance for booking');
  }
}

private async logBalanceUsage(amount: string, currency: string) {
  await supabase.from('duffel_balance_log').insert({
    balance_amount: parseFloat(amount),
    currency,
  });
}
```

### Phase 5: Testing & Monitoring (Week 3-4)

#### 5.1 Test Suite Updates
Update existing tests to work with new payment flow:

```typescript
// src/tests/payments/stripe-integration.test.ts
describe('Stripe Payment Integration', () => {
  test('creates payment intent with service fee', async () => {
    const result = await stripeService.createPaymentIntent(
      10000, // $100.00 in cents
      'USD',
      { orderId: 'ord_test_123' }
    );

    expect(result.amount).toBe(10500); // $105.00 with 5% fee
    expect(result.metadata.baseAmount).toBe('10000');
    expect(result.metadata.serviceFee).toBe('500');
  });

  test('processes successful payment and confirms booking', async () => {
    // Mock Stripe webhook event
    const webhookEvent = {
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test_123' } }
    };

    await handlePaymentSuccess(webhookEvent.data.object);

    // Verify transaction status updated
    const transaction = await getPaymentTransaction('pi_test_123');
    expect(transaction.status).toBe('confirmed');
  });
});
```

#### 5.2 Monitoring & Alerts
Implement monitoring for:
- Duffel account balance
- Failed bookings after successful payments
- Payment reconciliation discrepancies
- Stripe webhook failures

```typescript
// src/services/monitoring/balance-monitor.ts
export class BalanceMonitor {
  async checkDuffelBalance() {
    const balance = await this.getDuffelBalance();
    const threshold = CONFIG.duffel.minimumBalance;

    if (balance < threshold) {
      await this.sendAlert('Low Duffel balance', {
        currentBalance: balance,
        threshold,
      });
    }
  }

  async sendAlert(message: string, data: any) {
    // Send email/Slack notification
    logger.warn(`ALERT: ${message}`, data);
  }
}
```

## Risk Mitigation

### 1. Payment Failures
- **Stripe payment succeeds, Duffel booking fails**: Automatic refund triggered
- **Insufficient Duffel balance**: Alert admin, hold user booking, offer rebooking
- **Network failures**: Retry logic with exponential backoff

### 2. Data Consistency
- **Payment reconciliation**: Daily automated reports
- **Transaction auditing**: Complete audit trail in database
- **Refund tracking**: Automated refund processing and logging

### 3. User Experience
- **Clear fee disclosure**: Show breakdown before payment
- **Payment status tracking**: Real-time updates via WebSocket
- **Error handling**: User-friendly error messages with recovery options

## Deployment Strategy

### 1. Environment Setup
- **Staging**: Test with Stripe test mode and Duffel test environment
- **Production**: Gradual rollout with feature flags

### 2. Migration Timeline
- **Week 1**: Backend Stripe integration, database setup
- **Week 2**: Frontend migration, API endpoint updates
- **Week 3**: Duffel integration updates, testing
- **Week 4**: Monitoring setup, staging deployment
- **Week 5**: Production deployment with feature flag

### 3. Rollback Plan
- Keep existing Duffel payment code as fallback
- Feature flag to switch between payment methods
- Database migration rollback scripts

## Success Metrics

### 1. Technical Metrics
- Payment success rate > 95%
- Booking confirmation time < 30 seconds
- Reconciliation accuracy > 99.9%

### 2. Business Metrics
- Service fee collection rate
- Customer payment completion rate
- Duffel balance utilization efficiency

### 3. Operational Metrics
- Alert response time
- Balance monitoring accuracy
- Failed booking recovery rate

## Conclusion

This migration plan provides a comprehensive pathway from Duffel's discontinued payment API to a robust Stripe-based payment system. The new architecture maintains the existing user experience while adding transparent fee collection and improved payment reliability.

The phased approach ensures minimal disruption to current operations while building a more sustainable and scalable payment infrastructure for the Concier travel booking platform.