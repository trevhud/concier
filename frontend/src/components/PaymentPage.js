import React, { useState, useEffect } from 'react';
import PaymentForm from './PaymentForm';
import { useUserProfile } from '../hooks/useUserProfile';

function PaymentPage() {
  const [orderDetails, setOrderDetails] = useState(null);
  const [error, setError] = useState(null);
  const { profile, isAuthenticated } = useUserProfile();

  useEffect(() => {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order');
    const amount = urlParams.get('amount');
    const currency = urlParams.get('currency');
    const description = urlParams.get('description') || `Payment for order ${orderId}`;

    if (!orderId || !amount || !currency) {
      setError('Missing payment parameters');
      return;
    }

    setOrderDetails({ orderId, amount, currency, description });
  }, []);

  const handleSuccess = (orderData) => {
    // Success is handled by PaymentForm component
  };

  const handleError = (errorMsg) => {
    setError(errorMsg);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-aman-stone-50 to-aman-stone-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-serif font-semibold text-aman-stone-800 mb-2">
              Payment Error
            </h2>
            <p className="text-aman-stone-600 mb-4">{error}</p>
            <a
              href="/"
              className="inline-block px-6 py-2 bg-aman-stone-700 text-white rounded-lg hover:bg-aman-stone-800 transition-colors"
            >
              Return to Concier
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-aman-stone-50 to-aman-stone-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-serif font-semibold text-aman-stone-800 mb-2">
            Complete Your Booking
          </h1>
          <p className="text-aman-stone-600">Secure payment powered by Duffel</p>
        </div>

        {orderDetails && (
          <PaymentForm 
            orderDetails={orderDetails}
            onSuccess={handleSuccess}
            onError={handleError}
            isStandalonePage={true}
            passengerInfo={isAuthenticated ? profile : null}
          />
        )}

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-aman-stone-600 hover:text-aman-stone-800 text-sm underline"
          >
            ← Return to Concier
          </a>
        </div>
      </div>
    </div>
  );
}

export default PaymentPage;