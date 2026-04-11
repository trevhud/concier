import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import PaymentForm from './PaymentForm';

function PaymentModal({ isOpen, onClose, orderDetails, passengerInfo = null }) {
  const handleSuccess = (orderData) => {
    // Auto-close after success
    setTimeout(() => {
      onClose();
    }, 3000);
  };

  const handleError = (error) => {
    console.error('Payment modal error:', error);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-serif font-semibold text-aman-stone-800">
              Complete Payment
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-aman-stone-100 rounded-full transition-colors"
            >
              <XMarkIcon className="h-5 w-5 text-aman-stone-500" />
            </button>
          </div>

          {/* Payment Form */}
          <PaymentForm 
            orderDetails={orderDetails}
            onSuccess={handleSuccess}
            onError={handleError}
            passengerInfo={passengerInfo}
          />
        </div>
      </div>
    </div>
  );
}

export default PaymentModal;