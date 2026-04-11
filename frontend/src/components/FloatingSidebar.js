import React from 'react';
import { XMarkIcon, PaperAirplaneIcon, ClockIcon, CheckIcon, BookmarkIcon } from '@heroicons/react/24/outline';

function FloatingSidebar({ selectedFlight, bookedFlight, onClose }) {
  const flight = bookedFlight || selectedFlight;
  const isBooked = !!bookedFlight;
  
  if (!flight) return null;

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatLongDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
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
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-aman-stone-200 z-50 overflow-y-auto animate-slide-in-right">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-aman-stone-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isBooked ? (
              <CheckIcon className="h-5 w-5 text-green-600" />
            ) : (
              <BookmarkIcon className="h-5 w-5 text-aman-gold-500" />
            )}
            <h2 className="text-xl font-serif font-semibold text-aman-stone-800">
              {isBooked ? 
                (flight.status === 'held' ? 'Reserved Flight' : 'Booked Flight') : 
                'Selected Flight'
              }
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-aman-stone-100 rounded-full transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-aman-stone-500" />
          </button>
        </div>
      </div>

      {/* Flight Details */}
      <div className="p-6 space-y-6">
        {/* Airline & Price */}
        <div className="text-center">
          <h3 className="text-2xl font-semibold text-aman-stone-800 mb-2">
            {flight.airline}
          </h3>
          <p className="text-3xl font-bold text-aman-gold-600">
            {flight.price}
          </p>
          <p className="text-sm text-aman-stone-500 mt-1">
            Total for 1 passenger
          </p>
        </div>

        {/* Outbound Flight */}
        {flight.outbound && (
          <div className="bg-aman-stone-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <PaperAirplaneIcon className="h-4 w-4 text-aman-stone-600" />
              <span className="font-semibold text-aman-stone-800">Outbound Journey</span>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm font-medium text-aman-stone-700">
                {formatLongDate(flight.outbound.departure)}
              </p>
              
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-lg font-bold text-aman-stone-800">
                    {formatTime(flight.outbound.departure)}
                  </p>
                  <p className="text-sm text-aman-stone-500">SEA</p>
                  <p className="text-xs text-aman-stone-400">Seattle</p>
                </div>
                
                <div className="flex-1 mx-4 text-center">
                  <div className="flex items-center justify-center mb-1">
                    <div className="flex-1 h-px bg-aman-stone-300"></div>
                    <PaperAirplaneIcon className="h-4 w-4 mx-2 text-aman-stone-400" />
                    <div className="flex-1 h-px bg-aman-stone-300"></div>
                  </div>
                  <div className="flex items-center justify-center gap-1 text-xs text-aman-stone-500">
                    <ClockIcon className="h-3 w-3" />
                    {calculateDuration(flight.outbound.departure, flight.outbound.arrival)}
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-lg font-bold text-aman-stone-800">
                    {formatTime(flight.outbound.arrival)}
                  </p>
                  <p className="text-sm text-aman-stone-500">ANC</p>
                  <p className="text-xs text-aman-stone-400">Anchorage</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Return Flight */}
        {flight.return && (
          <div className="bg-aman-stone-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <PaperAirplaneIcon className="h-4 w-4 text-aman-stone-600 rotate-180" />
              <span className="font-semibold text-aman-stone-800">Return Journey</span>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm font-medium text-aman-stone-700">
                {formatLongDate(flight.return.departure)}
              </p>
              
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-lg font-bold text-aman-stone-800">
                    {formatTime(flight.return.departure)}
                  </p>
                  <p className="text-sm text-aman-stone-500">ANC</p>
                  <p className="text-xs text-aman-stone-400">Anchorage</p>
                </div>
                
                <div className="flex-1 mx-4 text-center">
                  <div className="flex items-center justify-center mb-1">
                    <div className="flex-1 h-px bg-aman-stone-300"></div>
                    <PaperAirplaneIcon className="h-4 w-4 mx-2 text-aman-stone-400 rotate-180" />
                    <div className="flex-1 h-px bg-aman-stone-300"></div>
                  </div>
                  <div className="flex items-center justify-center gap-1 text-xs text-aman-stone-500">
                    <ClockIcon className="h-3 w-3" />
                    {calculateDuration(flight.return.departure, flight.return.arrival)}
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-lg font-bold text-aman-stone-800">
                    {formatTime(flight.return.arrival)}
                  </p>
                  <p className="text-sm text-aman-stone-500">SEA</p>
                  <p className="text-xs text-aman-stone-400">Seattle</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Booking Details */}
        <div className="border-t border-aman-stone-200 pt-4">
          <h4 className="font-semibold text-aman-stone-800 mb-2">Booking Details</h4>
          <div className="text-sm text-aman-stone-600 space-y-1">
            <p>Offer ID: <span className="font-mono text-xs">{flight.offerId}</span></p>
            {isBooked && flight.bookingReference && (
              <p>Booking Ref: <span className="font-mono text-xs font-semibold">{flight.bookingReference}</span></p>
            )}
            <p>Passengers: 1 Adult</p>
            <p>Class: Economy</p>
          </div>
        </div>

        {/* Status Message */}
        <div className={`rounded-xl p-4 ${
          isBooked 
            ? (flight.status === 'held' 
                ? 'bg-yellow-50 border border-yellow-200' 
                : 'bg-green-50 border border-green-200'
              )
            : 'bg-aman-gold-50 border border-aman-gold-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <CheckIcon className={`h-4 w-4 ${
              isBooked 
                ? (flight.status === 'held' ? 'text-yellow-600' : 'text-green-600')
                : 'text-aman-gold-600'
            }`} />
            <span className={`font-semibold ${
              isBooked 
                ? (flight.status === 'held' ? 'text-yellow-800' : 'text-green-800')
                : 'text-aman-gold-800'
            }`}>
              {isBooked 
                ? (flight.status === 'held' ? 'Flight Reserved' : 'Flight Booked')
                : 'Flight Selected'
              }
            </span>
          </div>
          <p className={`text-sm ${
            isBooked 
              ? (flight.status === 'held' ? 'text-yellow-700' : 'text-green-700')
              : 'text-aman-gold-700'
          }`}>
            {isBooked 
              ? (flight.status === 'held' 
                  ? 'Your flight is held and reserved. Payment is required to confirm booking.'
                  : 'Your flight booking is confirmed! You should receive confirmation details soon.'
                )
              : 'Booking request has been sent to our travel assistant. Please wait for confirmation and next steps.'
            }
          </p>
        </div>
      </div>
    </div>
  );
}

export default FloatingSidebar;