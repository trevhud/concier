# Payment Processing Documentation

This document outlines the two distinct payment flows supported by the Concier travel booking system, based on flight booking requirements and user interface context.

## Overview

Concier supports two payment workflows depending on whether flights can be held before payment:

1. **Hold-then-Pay Flow**: For flights that can be held without immediate payment
2. **Instant Payment Flow**: For flights requiring immediate payment to secure booking

Each flow adapts based on the user interface:
- **WebSocket/Frontend Users**: Payment modals and forms within the chat interface
- **MCP/External Users**: Payment links to secure payment pages

## Flow 1: Hold-then-Pay Workflow

### When Used
- Flight offers that support holding without immediate payment
- `offer.payment_requirements.requires_instant_payment === false`
- Most flexible booking option for users

### Process Steps

#### 1. Flight Booking (Hold)
```
User Request → AI calls book_flight tool → Duffel API hold order
```

**API Call**: `POST /air/orders`
```json
{
  "type": "hold",
  "selected_offers": ["off_123"],
  "passengers": [{ passenger_details }]
  // No payments field for hold orders
}
```

**Success Response**: Order created with status "hold"
```json
{
  "id": "ord_123",
  "booking_reference": "ABC123", 
  "status": "hold",
  "payment_deadline": "2024-01-15T14:30:00Z",
  "total_amount": "299.00",
  "total_currency": "USD"
}
```

#### 2. Payment Link Generation
```
AI automatically calls generate_payment_link tool → Creates secure payment URL/modal
```

**For WebSocket Users**: Payment modal opens in chat interface
```json
{
  "type": "payment_modal",
  "orderId": "ord_123",
  "amount": "299.00",
  "currency": "USD",
  "message": "Opening secure payment form..."
}
```

**For MCP Users**: Payment link provided
```
https://concier.io/payment?order=ord_123&amount=299.00&currency=USD
```

#### 3. Payment Processing
- **Frontend**: DuffelPayments component handles secure card collection
- **Payment Page**: Dedicated payment form with Duffel integration
- **Backend**: Processes payment via Duffel Payments API

#### 4. Order Confirmation
- Payment confirmation updates order status to "confirmed"
- Booking confirmation sent to user
- Email confirmation with ticket details

### Technical Implementation

**Tools Used**:
- `book_flight`: Creates hold order
- `generate_payment_link`: Creates payment modal/link

**Duffel APIs**:
- Orders API (hold creation)
- Payments API (payment processing)
- Cards API (secure card handling)

## Flow 2: Instant Payment Workflow

### When Used
- Flight offers requiring immediate payment
- `offer.payment_requirements.requires_instant_payment === true`
- Time-sensitive or limited inventory flights

### Process Steps

#### 1. Payment Requirements Check
```
AI calls check_payment_requirements tool → Determines instant payment needed
```

**API Call**: `GET /air/offers/{offer_id}`
```json
{
  "payment_requirements": {
    "requires_instant_payment": true,
    "payment_deadline": "immediate"
  }
}
```

#### 2. Direct Payment Flow
Since booking attempt would fail, skip to payment:

**For WebSocket Users**: Immediate payment modal
```json
{
  "type": "payment_modal",
  "orderId": "off_123", // Offer ID, not order ID
  "amount": "450.00",
  "currency": "USD",
  "description": "Instant payment required for flight booking",
  "requires_instant_payment": true
}
```

**For MCP Users**: Payment link with instant payment flag
```
https://concier.io/payment?order=off_123&amount=450.00&currency=USD&instant=true
```

#### 3. Payment and Booking Combined
- Payment processed first via Duffel Components
- On successful payment, order created with payment attached
- Single atomic transaction: payment + booking

**API Call**: `POST /air/orders`
```json
{
  "type": "instant",
  "selected_offers": ["off_123"],
  "passengers": [{ passenger_details }],
  "payments": [{
    "type": "card",
    "amount": "450.00",
    "currency": "USD",
    "three_d_secure_session_id": "tds_456"
  }]
}
```

#### 4. Immediate Confirmation
- Order confirmed instantly upon successful payment
- No hold period or payment deadline
- Immediate booking confirmation and tickets

### Technical Implementation

**Tools Used**:
- `check_payment_requirements`: Proactive payment requirement detection
- `generate_payment_link`: Creates instant payment modal/link
- `book_flight_instant`: Creates order with immediate payment

**Duffel APIs**:
- Offers API (payment requirements check)
- Cards API (secure payment processing)
- ThreeDSecureSession API (payment authentication)
- Orders API (instant order creation)

## Payment Component Integration

### DuffelPayments Component

**Purpose**: Secure card collection and payment processing
**Props Required**:
```typescript
{
  paymentIntentClientToken: string,  // Authentication token
  onSuccessfulPayment: () => void,   // Success callback
  onFailedPayment: (error) => void,  // Error callback
  styles?: CustomStyles             // UI customization
}
```

### Client Token Generation

**Hold Orders**: Token references existing order
```javascript
const clientToken = await createPaymentIntent(orderId, amount, currency);
```

**Instant Payment**: Token references offer for immediate booking
```javascript
const clientToken = await createOfferPaymentIntent(offerId, amount, currency);
```

### Security Considerations

1. **PCI Compliance**: All card data handled by Duffel Components
2. **Token Security**: Client tokens expire after 25 minutes
3. **3D Secure**: Automatic authentication for card payments
4. **SSL/TLS**: All payment communications encrypted

## Error Handling

### Common Payment Errors

1. **Payment Deadline Expired**
   - Hold orders must be paid before deadline
   - Automatic order cancellation after expiry
   - User notification and rebooking option

2. **Card Authentication Failed**
   - 3D Secure authentication failure
   - Invalid card details or CVC
   - Retry with new payment method

3. **Insufficient Funds**
   - Card declined by bank
   - Alternative payment method requested
   - Order remains on hold if applicable

4. **Airline Price Changes**
   - Fare increase after hold creation
   - User notification and confirmation required
   - Option to cancel or pay difference

### Recovery Strategies

1. **Hold Order Expiry**: Automatic search for new flights
2. **Payment Failure**: Multiple retry attempts with different cards
3. **Price Changes**: Clear communication and user choice
4. **Technical Errors**: Graceful fallback to payment links

## Testing Strategy

### Test Scenarios

1. **Hold-then-Pay Flow**
   - Successful hold and payment
   - Payment deadline expiry
   - Card authentication failure
   - Price change scenarios

2. **Instant Payment Flow**
   - Successful instant booking
   - Payment failure and retry
   - Offer expiry during payment
   - Multiple concurrent bookings

3. **Component Integration**
   - DuffelPayments component lifecycle
   - Modal vs page payment experiences
   - WebSocket vs MCP user flows
   - Error state handling

### Mock Data

**Test Environment**: Duffel Airways and Duffel Hotel Group
**Test Cards**: Provided by Duffel for payment testing
**Test Scenarios**: Various success/failure payment outcomes

## Future Enhancements

1. **Saved Payment Methods**: Multi-use card storage for repeat customers
2. **Corporate Billing**: Integration with corporate payment workflows
3. **Alternative Payments**: Support for digital wallets and bank transfers
4. **Subscription Billing**: Recurring payment handling for subscriptions
5. **Currency Conversion**: Multi-currency payment processing

## API Reference

### Internal Payment API Endpoints

```
POST /api/payment-intents
POST /api/payment-intents/{id}/confirm
GET  /api/payment-status/{order_id}
```

### Duffel API Integration

```
POST /air/orders           # Order creation
POST /air/payments         # Payment processing
POST /cards                # Card creation
POST /threedsecuresession  # Payment authentication
```

---

*This document serves as the complete specification for payment processing in the Concier travel booking system. All implementation should follow these documented flows to ensure consistent user experience and proper integration with Duffel's payment infrastructure.*