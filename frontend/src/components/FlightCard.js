import React from 'react';
import { ClockIcon, CurrencyDollarIcon, PaperAirplaneIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

function FlightCard({ flight, onBook, isBooked = false }) {
  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateDuration = (departure, arrival) => {
    const depTime = new Date(departure);
    const arrTime = new Date(arrival);
    const diffMs = arrTime.getTime() - depTime.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div 
      onClick={isBooked ? undefined : () => {
        console.debug('Flight card clicked!', flight);
        onBook(flight);
      }}
      className={`bg-white rounded-xl shadow-md border p-4 transition-all duration-200 ${
        isBooked 
          ? 'border-green-200 bg-green-50/50' 
          : 'border-aman-stone-200 hover:shadow-lg hover:scale-[1.01] cursor-pointer hover:border-aman-gold-300'
      }`}
    >
      {/* Compact Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-aman-stone-800">{flight.airline}</h3>
          {isBooked ? (
            <div className="flex items-center gap-1">
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
              <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full font-medium">
                {flight.status === 'held' ? 'Held' : flight.status === 'confirmed' ? 'Booked' : flight.status}
              </span>
            </div>
          ) : (
            <span className="text-xs text-aman-stone-500 bg-aman-stone-100 px-2 py-1 rounded-full">
              Option {flight.option}
            </span>
          )}
        </div>
        <p className="text-xl font-bold text-aman-gold-600">{flight.price}</p>
      </div>

      {/* Compact Flight Info */}
      <div className="space-y-2">
        {/* Outbound */}
        {flight.outbound && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <PaperAirplaneIcon className="h-3 w-3 text-aman-stone-500" />
              <span className="font-medium text-aman-stone-700">
                {formatTime(flight.outbound.departure)}
              </span>
              <span className="text-aman-stone-500">→</span>
              <span className="font-medium text-aman-stone-700">
                {formatTime(flight.outbound.arrival)}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-aman-stone-500">
              <ClockIcon className="h-3 w-3" />
              {calculateDuration(flight.outbound.departure, flight.outbound.arrival)}
            </div>
          </div>
        )}

        {/* Return */}
        {flight.return && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <PaperAirplaneIcon className="h-3 w-3 text-aman-stone-500 rotate-180" />
              <span className="font-medium text-aman-stone-700">
                {formatTime(flight.return.departure)}
              </span>
              <span className="text-aman-stone-500">→</span>
              <span className="font-medium text-aman-stone-700">
                {formatTime(flight.return.arrival)}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-aman-stone-500">
              <ClockIcon className="h-3 w-3" />
              {calculateDuration(flight.return.departure, flight.return.arrival)}
            </div>
          </div>
        )}
      </div>

      {/* Subtle footer */}
      <div className="mt-3 pt-2 border-t border-aman-stone-100">
        <div className="flex justify-between items-center">
          <p className="text-xs text-aman-stone-400">
            {formatDate(flight.outbound.departure)} - {formatDate(flight.return?.arrival || flight.outbound.arrival)}
          </p>
          <div className="text-xs text-aman-stone-500 bg-aman-stone-50 px-2 py-1 rounded">
            {isBooked ? (
              flight.bookingReference ? `Ref: ${flight.bookingReference}` : 'Processing...'
            ) : (
              'Click to select'
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlightCard;