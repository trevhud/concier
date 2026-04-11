import React from 'react';
import ReactMarkdown from 'react-markdown';
import { UserIcon, SparklesIcon } from '@heroicons/react/24/solid';
import FlightCard from './FlightCard';

function MessageList({ messages, onFlightSelect }) {
  const handleFlightBook = (flight) => {
    console.debug('handleFlightBook called with:', flight);
    if (onFlightSelect) {
      console.debug('Calling onFlightSelect');
      onFlightSelect(flight);
    } else {
      console.debug('onFlightSelect is not defined!');
    }
  };

  const parseMessageContent = (text) => {
    // Check for flight cards separator
    const flightCardsSeparator = '__FLIGHT_CARDS__';
    if (text.includes(flightCardsSeparator)) {
      const [textPart, jsonPart] = text.split(flightCardsSeparator);
      try {
        const parsed = JSON.parse(jsonPart.trim());
        if (parsed.type === 'flight_results' && parsed.data) {
          return {
            text: textPart.trim(),
            flightData: parsed.data
          };
        }
      } catch {
        // JSON parsing failed, return just text
      }
    }
    
    // Try to parse the entire message as JSON (fallback)
    try {
      const parsed = JSON.parse(text);
      if (parsed.type === 'flight_results' && parsed.data) {
        return {
          text: '',
          flightData: parsed.data
        };
      }
    } catch {
      // Not JSON, return as regular text
    }
    
    return {
      text: text,
      flightData: null
    };
  };

  return (
    <div className="space-y-4">
      {messages.map((message, index) => {
        // Always render user messages in the regular chat flow first
        if (message.sender === 'user') {
          return (
            <div 
              key={index} 
              className="flex justify-end animate-fade-in"
            >
              <div className="flex items-start gap-3 max-w-2xl flex-row-reverse">
                {/* Avatar */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-aman-stone-700 text-white">
                  <UserIcon className="h-5 w-5" />
                </div>
                
                {/* Message bubble */}
                <div className="px-4 py-3 rounded-2xl bg-aman-stone-700 text-white rounded-br-md">
                  <div className="prose prose-sm max-w-none prose-invert">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      }}
                    >
                      {message.text}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        // Handle bot messages with potential flight data
        let content;
        if (message.type === 'flight_results' && message.flights) {
          content = { text: message.text, flightData: message.flights };
        } else if (message.type === 'booking_confirmation' && message.bookingDetails) {
          // Convert booking details to flight card format
          const bookingData = message.bookingDetails;
          const flightData = bookingData.slices ? bookingData.slices.map((slice, idx) => ({
            option: idx + 1,
            airline: slice.segments?.[0]?.marketing_carrier?.name || 'Airline',
            price: `${bookingData.total_amount} ${bookingData.total_currency}`,
            offerId: bookingData.order_id,
            bookingReference: bookingData.booking_reference,
            status: bookingData.status,
            isBooked: true,
            outbound: slice.segments?.[0] ? {
              departure: slice.segments[0].departing_at,
              arrival: slice.segments[slice.segments.length - 1].arriving_at
            } : null
          })) : [];
          content = { text: message.text, flightData: flightData, isBookingConfirmation: true };
        } else {
          content = parseMessageContent(message.text);
        }
        
        if (content.flightData) {
          // Render text response + flight cards
          return (
            <div key={index} className="animate-fade-in space-y-4">
              {/* Text Response (if any) */}
              {content.text && (
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-aman-stone-200 text-aman-stone-600 flex items-center justify-center">
                    <SparklesIcon className="h-5 w-5" />
                  </div>
                  <div className="bg-aman-stone-100 text-aman-stone-800 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="prose prose-sm max-w-none prose-stone">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        }}
                      >
                        {content.text}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Flight Cards */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-aman-stone-200 text-aman-stone-600 flex items-center justify-center">
                  <SparklesIcon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="bg-aman-stone-100 text-aman-stone-800 rounded-2xl rounded-bl-md px-4 py-3 mb-4">
                    {content.isBookingConfirmation ? (
                      <p className="text-sm">✅ Flight {content.flightData[0]?.status === 'held' ? 'Held' : content.flightData[0]?.status === 'confirmed' ? 'Booked' : 'Reserved'}:</p>
                    ) : (
                      <p className="text-sm">🛩️ Found {content.flightData.length} flight options:</p>
                    )}
                  </div>
                  
                  {/* Flight Cards Grid */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                    {content.flightData.slice(0, 3).map((flight, flightIndex) => (
                      <FlightCard
                        key={flightIndex}
                        flight={flight}
                        onBook={content.isBookingConfirmation ? null : handleFlightBook}
                        isBooked={content.isBookingConfirmation}
                      />
                    ))}
                  </div>
                  
                  {content.flightData.length > 3 && (
                    <div className="mt-4">
                      <p className="text-sm text-aman-stone-500 bg-aman-stone-50 rounded-lg p-3">
                        ...and {content.flightData.length - 3} more options available.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }

        // Regular message rendering
        return (
          <div 
            key={index} 
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div className={`flex items-start gap-3 max-w-2xl ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                message.sender === 'user' 
                  ? 'bg-aman-stone-700 text-white' 
                  : 'bg-aman-stone-200 text-aman-stone-600'
              }`}>
                {message.sender === 'user' ? (
                  <UserIcon className="h-5 w-5" />
                ) : (
                  <SparklesIcon className="h-5 w-5" />
                )}
              </div>
              
              {/* Message bubble */}
              <div className={`px-4 py-3 rounded-2xl ${
                message.sender === 'user'
                  ? 'bg-aman-stone-700 text-white rounded-br-md'
                  : 'bg-aman-stone-100 text-aman-stone-800 rounded-bl-md'
              }`}>
                {message.isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-aman-stone-400 border-t-transparent"></div>
                    <span className="text-sm">Thinking...</span>
                  </div>
                ) : (
                  <div className={`prose prose-sm max-w-none ${
                    message.sender === 'user' ? 'prose-invert' : 'prose-stone'
                  }`}>
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        ul: ({ children }) => <ul className="list-disc pl-4 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1">{children}</ol>,
                        li: ({ children }) => <li>{children}</li>,
                        code: ({ children }) => (
                          <code className="bg-aman-stone-200 text-aman-stone-800 px-1 py-0.5 rounded text-xs">
                            {children}
                          </code>
                        ),
                        pre: ({ children }) => (
                          <pre className="bg-aman-stone-200 text-aman-stone-800 p-3 rounded-lg overflow-x-auto">
                            {children}
                          </pre>
                        ),
                      }}
                    >
                      {message.text}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default MessageList;