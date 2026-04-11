import { DuffelCardForm, useDuffelCardFormActions } from '@duffel/components';
import React, { useEffect, useState, useRef } from 'react';

function PaymentForm({ orderDetails, onSuccess, onError, isStandalonePage = false, passengerInfo = null }) {
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [clientKey, setClientKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [tempCard, setTempCard] = useState(null);
  const [showSaveCardOption, setShowSaveCardOption] = useState(false);
  
  // Duffel card form actions
  const { ref: cardFormRef, createCardForTemporaryUse, saveCard } = useDuffelCardFormActions();

  useEffect(() => {
    if (orderDetails) {
      // Check if this is an offer ID (flight not yet booked) or real order ID
      if (orderDetails.orderId?.startsWith('off_')) {
        // This is an offer ID - the flight booking failed and needs instant payment
        // Skip payment intent creation and show direct payment option
        setLoading(false);
      } else {
        // This is a real order ID - create payment intent normally
        createPaymentIntent();
      }
    }
  }, [orderDetails]);

  const createPaymentIntent = async () => {
    try {
      setLoading(true);
      setError(null);

      // Create both payment intent and component client key in parallel
      const [paymentIntentResponse, clientKeyResponse] = await Promise.all([
        fetch('/api/payment-intents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId: orderDetails.orderId,
            amount: orderDetails.amount,
            currency: orderDetails.currency
          }),
        }),
        fetch('/api/component-client-key', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId: orderDetails.orderId
          }),
        })
      ]);

      if (!paymentIntentResponse.ok) {
        throw new Error('Failed to create payment intent');
      }

      if (!clientKeyResponse.ok) {
        throw new Error('Failed to create component client key');
      }

      const paymentIntentData = await paymentIntentResponse.json();
      const clientKeyData = await clientKeyResponse.json();

      setPaymentIntent(paymentIntentData);
      setClientKey(clientKeyData.clientKey);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      onError?.(err.message);
    }
  };

  const handleCardSubmit = async (cardResult) => {
    try {
      setPaymentStatus('processing');
      console.log('Card submitted:', cardResult);

      // Send card ID to backend for complete payment processing via Duffel SDK
      const requestBody = {
        card_id: cardResult.data.id,
        resource_id: orderDetails.orderId,
        payment_type: paymentIntent?.type || (orderDetails.orderId.startsWith('off_') ? 'instant_payment' : 'hold_payment')
      };

      // Include passenger info for instant payments
      if (requestBody.payment_type === 'instant_payment' && passengerInfo) {
        requestBody.passenger_info = passengerInfo;
      }

      const response = await fetch('/api/process-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to process payment');
      }

      const result = await response.json();
      setPaymentStatus('success');
      onSuccess?.(result);
    } catch (err) {
      console.error('Payment processing error:', err);
      const errorMsg = err.message || 'Payment failed. Please try again.';
      setError(errorMsg);
      setPaymentStatus('error');
      onError?.(errorMsg);
    }
  };

  const handleCreateCardForTemporaryUseSuccess = async (cardData) => {
    try {
      console.log('Temporary card created:', cardData);
      setTempCard(cardData);
      setPaymentStatus('processing');

      // Process payment with the temporary card
      await processPaymentWithCard(cardData.id);
    } catch (err) {
      console.error('Payment processing error:', err);
      setError(err.message);
      setPaymentStatus('error');
      onError?.(err.message);
    }
  };

  const handleCreateCardForTemporaryUseFailure = (error) => {
    console.error('Card creation failed:', error);
    const errorMsg = 'Failed to process card details. Please try again.';
    setError(errorMsg);
    setPaymentStatus('error');
    onError?.(errorMsg);
  };

  const handleSaveCardSuccess = (savedCardData) => {
    console.log('Card saved successfully:', savedCardData);
    // Could update UI to show card was saved for future use
  };

  const handleSaveCardFailure = (error) => {
    console.error('Card save failed:', error);
    // Non-critical error - payment already succeeded
  };

  const processPaymentWithCard = async (cardId) => {
    const requestBody = {
      card_id: cardId,
      resource_id: orderDetails.orderId,
      payment_type: paymentIntent?.type || (orderDetails.orderId.startsWith('off_') ? 'instant_payment' : 'hold_payment')
    };

    // Include passenger info for instant payments
    if (requestBody.payment_type === 'instant_payment' && passengerInfo) {
      requestBody.passenger_info = passengerInfo;
    }

    const response = await fetch('/api/process-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error('Failed to process payment');
    }

    const result = await response.json();
    setPaymentStatus('success');
    setShowSaveCardOption(true);
    onSuccess?.(result);
  };

  const handlePayNow = async () => {
    try {
      setError(null);
      setPaymentStatus('creating_card');
      await createCardForTemporaryUse();
    } catch (err) {
      console.error('Payment initiation error:', err);
      setError('Failed to initiate payment. Please try again.');
      setPaymentStatus('pending');
    }
  };

  const handleSaveCardForFuture = async () => {
    try {
      await saveCard();
      setShowSaveCardOption(false);
    } catch (err) {
      console.error('Save card error:', err);
      // Non-critical - don't show error to user
    }
  };

  const handleCardErrors = (errors) => {
    console.error('Card form errors:', errors);
    const errorMsg = 'Please check your card details and try again.';
    setError(errorMsg);
    onError?.(errorMsg);
  };

  // Loading State
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-aman-gold-400 border-t-transparent mx-auto mb-4"></div>
        <p className="text-aman-stone-600">Setting up secure payment...</p>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-red-600 text-2xl">⚠️</span>
        </div>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={createPaymentIntent}
          className="px-4 py-2 bg-aman-stone-700 text-white rounded-lg hover:bg-aman-stone-800 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Success State
  if (paymentStatus === 'success') {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-green-600 text-2xl">✅</span>
        </div>
        <h3 className="text-lg font-semibold text-aman-stone-800 mb-2">
          Payment Successful!
        </h3>
        <p className="text-aman-stone-600 mb-4">
          Your booking is confirmed. You'll receive details via email.
        </p>
        
        {/* Save Card Option */}
        {showSaveCardOption && (
          <div className="mt-6 p-4 bg-aman-stone-50 rounded-lg">
            <p className="text-sm text-aman-stone-700 mb-3">
              Would you like to save this card for future bookings?
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleSaveCardForFuture}
                className="px-4 py-2 bg-aman-stone-700 text-white rounded-lg hover:bg-aman-stone-800 transition-colors text-sm"
              >
                Save Card
              </button>
              <button
                onClick={() => setShowSaveCardOption(false)}
                className="px-4 py-2 bg-aman-stone-200 text-aman-stone-700 rounded-lg hover:bg-aman-stone-300 transition-colors text-sm"
              >
                No Thanks
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Check if this is an offer ID (flight booking failed, needs instant payment)
  const isOfferPayment = orderDetails?.orderId?.startsWith('off_');

  // Payment Form
  return (
    <>
      {/* Order Summary */}
      <div className="bg-aman-stone-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-aman-stone-800 mb-2">Order Summary</h3>
        <div className="space-y-1 text-sm text-aman-stone-600">
          <div className="flex justify-between">
            <span>{isOfferPayment ? 'Flight Offer:' : 'Order ID:'}</span>
            <span className="font-mono text-xs">{orderDetails.orderId}</span>
          </div>
          <div className="flex justify-between">
            <span>Amount:</span>
            <span className="font-semibold text-aman-stone-800">
              {orderDetails.amount} {orderDetails.currency}
            </span>
          </div>
          {orderDetails.description && (
            <div className="flex justify-between">
              <span>Description:</span>
              <span>{orderDetails.description}</span>
            </div>
          )}
        </div>
      </div>

      {isOfferPayment ? (
        // Offer payment flow (flight requires instant payment)
        <>
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 mb-2">
              ⚠️ This flight requires immediate payment to secure your booking.
            </p>
            <p className="text-xs text-yellow-700">
              The flight cannot be held. Payment must be completed now to confirm your reservation.
            </p>
          </div>

          {isStandalonePage ? (
            // On the standalone payment page, show actual payment form
            <div className="mb-6">
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 text-center">
                  🔄 Setting up secure payment processing...
                </p>
                <p className="text-xs text-blue-700 text-center mt-2">
                  This integration will be enhanced with Duffel's payment components for secure card processing.
                </p>
              </div>

              <div className="text-center py-8">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-green-600 text-2xl">🛡️</span>
                </div>
                <h3 className="text-lg font-semibold text-aman-stone-800 mb-2">
                  Secure Payment Ready
                </h3>
                <p className="text-aman-stone-600 mb-4">
                  Your flight reservation is ready for payment processing.
                </p>
                <p className="text-sm text-aman-stone-500">
                  For demo purposes, payment processing will be completed here.<br />
                  In production, this integrates with Duffel's secure payment system.
                </p>
              </div>
            </div>
          ) : (
            // In the modal, show redirect button
            <div className="mb-6">
              <button
                onClick={() => {
                  // Generate payment URL and redirect
                  const baseUrl = window.location.origin;
                  const paymentUrl = `${baseUrl}/payment?order=${encodeURIComponent(orderDetails.orderId)}&amount=${encodeURIComponent(orderDetails.amount)}&currency=${encodeURIComponent(orderDetails.currency)}`;
                  window.open(paymentUrl, '_blank', 'width=600,height=700,scrollbars=yes,resizable=yes');
                }}
                className="w-full py-3 px-4 bg-aman-stone-700 hover:bg-aman-stone-800 text-white rounded-lg font-semibold transition-colors duration-200"
              >
                Continue to Secure Payment
              </button>
            </div>
          )}
        </>
      ) : (
        // Normal order payment flow (with DuffelPayments component)
        <>
          <div className="mb-4">
            <p className="text-sm text-aman-stone-600 text-center">
              Secure payment powered by Duffel
            </p>
          </div>

          {paymentIntent && clientKey && (
            <div className="duffel-card-form-compact">
              <DuffelCardForm
                ref={cardFormRef}
                clientKey={clientKey}
                intent="to-create-card-for-temporary-use"
                onCreateCardForTemporaryUseSuccess={handleCreateCardForTemporaryUseSuccess}
                onCreateCardForTemporaryUseFailure={handleCreateCardForTemporaryUseFailure}
                onSaveCardSuccess={handleSaveCardSuccess}
                onSaveCardFailure={handleSaveCardFailure}
                onCardErrors={handleCardErrors}
                styles={{
                  colors: {
                    primary: '#78716c', // aman-stone-700
                    background: '#fafaf9', // aman-stone-50
                  },
                  buttonCornerRadius: '6px',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}
              />
              <style jsx>{`
                .duffel-card-form-compact :global(.error) {
                  min-height: unset !important;
                }
              `}</style>
              
              {/* Pay Now Button */}
              <button
                onClick={handlePayNow}
                disabled={paymentStatus === 'creating_card' || paymentStatus === 'processing'}
                className="w-full mt-6 py-3 px-4 bg-aman-stone-700 hover:bg-aman-stone-800 disabled:bg-aman-stone-400 text-white rounded-lg font-semibold transition-colors duration-200 disabled:cursor-not-allowed"
              >
                {paymentStatus === 'creating_card' ? 'Processing Card...' : 
                 paymentStatus === 'processing' ? 'Processing Payment...' : 
                 `Pay ${orderDetails.amount} ${orderDetails.currency}`}
              </button>
            </div>
          )}

          {paymentStatus === 'processing' && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-aman-gold-400 border-t-transparent mx-auto mb-2"></div>
              <p className="text-aman-stone-600 text-sm">Processing payment...</p>
            </div>
          )}
        </>
      )}

      <div className="text-center mt-4">
        <p className="text-xs text-aman-stone-500">
          🔒 Secure payment processing
        </p>
      </div>
    </>
  );
}

export default PaymentForm;