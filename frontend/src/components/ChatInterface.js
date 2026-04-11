import { ExclamationTriangleIcon, PaperAirplaneIcon, SparklesIcon, TrashIcon, UserIcon, XMarkIcon } from '@heroicons/react/24/outline';
import React, { useEffect, useRef, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useUserProfile } from '../hooks/useUserProfile';
import { useAuth } from '../contexts/AuthContext';
import FloatingSidebar from './FloatingSidebar';
import MessageList from './MessageList';
import UserProfile from './UserProfile';
import Auth from './Auth';
import PaymentModal from './PaymentModal';

function ChatInterface() {
  const {
    messages,
    isConnected,
    isConnecting,
    connectionError,
    isLoading,
    statusMessage,
    sendMessage,
    clearChat: clearChatWS,
    reconnect
  } = useWebSocket();

  const { user, signOut } = useAuth();

  const {
    profile,
    loading: profileLoading,
    saveProfile,
    isAuthenticated
  } = useUserProfile();

  const [input, setInput] = useState('');
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [bookedFlight, setBookedFlight] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading || !isConnected) return;

    const success = sendMessage(input);
    if (success) {
      setInput('');
    }
  };

  const clearChat = async () => {
    setInput('');
    setSelectedFlight(null);
    setBookedFlight(null);
    clearChatWS();
  };

  const handleFlightSelect = async (flight) => {
    console.debug('ChatInterface handleFlightSelect called with:', flight);
    // Show the flight in sidebar for transparency
    setSelectedFlight(flight);

    // Send booking request via WebSocket - authentication context will be handled by the server
    const bookingMessage = `I would like to book the flight with offer ID: ${flight.offerId}`;
    
    sendMessage(bookingMessage, {
      isAuthenticated,
      profile: isAuthenticated ? profile : null
    });
  };

  const handleCloseSidebar = () => {
    setSelectedFlight(null);
    setBookedFlight(null);
  };

  // Listen for booking confirmations and payment modals from WebSocket
  React.useEffect(() => {
    const latestMessage = messages[messages.length - 1];
    
    // Handle booking confirmations
    if (latestMessage?.type === 'booking_confirmation' && latestMessage.bookingDetails) {
      const bookingData = latestMessage.bookingDetails;
      if (bookingData.slices && bookingData.slices.length > 0) {
        const slice = bookingData.slices[0];
        const bookedFlightData = {
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
        };
        setBookedFlight(bookedFlightData);
        setSelectedFlight(null); // Clear selected flight when booking is confirmed
      }
    }
    
    // Handle payment modal triggers
    if (latestMessage?.type === 'payment_modal' && latestMessage.paymentDetails) {
      setPaymentDetails(latestMessage.paymentDetails);
      setShowPaymentModal(true);
    }
  }, [messages]);


  const defaultMessages = [
    "Find me a flight from Seattle to Alaska, September 21-29",
    "Show me luxury hotels in Tokyo for next weekend",
    "Plan a business trip to London for 3 days"
  ];

  const handleDefaultMessage = async (message) => {
    if (isLoading || !isConnected) return;
    sendMessage(message);
  };

  return (
    <>
      <div className={`max-w-4xl mx-auto animate-slide-up transition-all duration-300 ${(selectedFlight || bookedFlight) ? 'mr-96' : ''}`}>
        {/* Connection Status */}
        {connectionError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            <span className="text-red-700 text-sm">{connectionError}</span>
            <button
              onClick={reconnect}
              className="ml-auto px-3 py-1 bg-red-500 text-white rounded-md text-sm hover:bg-red-600"
            >
              Retry
            </button>
          </div>
        )}

        {isConnecting && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
            <span className="text-blue-700 text-sm">Connecting...</span>
          </div>
        )}

        {/* Profile Status */}
        {!profileLoading && isAuthenticated && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-green-600" />
              <span className="text-green-700 text-sm">
                Welcome back, {profile.firstName || user?.user_metadata?.full_name || user?.email || 'user'}! Ready for booking.
              </span>
            </div>
            <button
              onClick={() => signOut()}
              className="text-xs text-green-600 hover:text-green-800 underline"
            >
              Sign out
            </button>
          </div>
        )}

        {/* Chat Container */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-aman-stone-200 overflow-hidden">
          {/* Messages Area */}
          <div className="overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <SparklesIcon className="h-12 w-12 text-aman-gold-400 mx-auto mb-4" />
                <h3 className="text-xl font-serif text-aman-stone-700 mb-2">Welcome to Concier</h3>
                <p className="text-aman-stone-500">Ask me anything about your travel plans</p>
              </div>
            )}
            <MessageList messages={messages} onFlightSelect={handleFlightSelect} />
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion Pills */}
          {messages.length === 0 && (
            <div className="px-6 pb-4">
              <div className="flex flex-wrap gap-2 justify-center">
                {defaultMessages.map((message, index) => (
                  <button
                    key={index}
                    onClick={() => handleDefaultMessage(message)}
                    disabled={isLoading || !isConnected}
                    className="px-4 py-2 bg-aman-stone-100 hover:bg-aman-stone-200 text-aman-stone-700 rounded-full text-sm transition-all duration-200 hover:scale-105 border border-aman-stone-200 hover:border-aman-stone-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {message}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t border-aman-stone-200 p-6">
            <div className="flex items-center gap-3">
              <form onSubmit={handleSubmit} className="flex-1">
                <div className="relative">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                    placeholder={isConnected ? "Describe your perfect journey... (Shift+Enter for new line)" : "Connecting..."}
                    disabled={isLoading || !isConnected}
                    rows={1}
                    className="w-full px-6 py-4 bg-aman-stone-50 border border-aman-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-aman-gold-400 focus:border-transparent placeholder-aman-stone-400 text-aman-stone-800 pr-12 disabled:opacity-50 disabled:cursor-not-allowed resize-none overflow-hidden"
                    style={{
                      minHeight: '56px',
                      maxHeight: '120px',
                      height: 'auto'
                    }}
                    onInput={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim() || !isConnected}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-aman-stone-700 hover:bg-aman-stone-800 text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                  >
                    <PaperAirplaneIcon className="h-5 w-5" />
                  </button>
                </div>
              </form>

              <div className="flex gap-2">
                <button
                  onClick={() => isAuthenticated ? setShowProfileModal(true) : setShowAuthModal(true)}
                  disabled={isLoading}
                  className="p-4 bg-aman-stone-100 hover:bg-aman-stone-200 text-aman-stone-600 rounded-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                  title={isAuthenticated ? "Manage Profile" : "Sign in to save profile"}
                >
                  <UserIcon className="h-5 w-5" />
                </button>
                
                {messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    disabled={isLoading}
                    className="p-4 bg-aman-stone-100 hover:bg-aman-stone-200 text-aman-stone-600 rounded-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            {(isLoading || statusMessage) && (
              <div className="mt-4 flex items-center justify-center text-aman-stone-500">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-aman-gold-400 border-t-transparent mr-2"></div>
                {statusMessage || 'Crafting your perfect response...'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Sidebar */}
      <FloatingSidebar
        selectedFlight={selectedFlight}
        bookedFlight={bookedFlight}
        onClose={handleCloseSidebar}
      />

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <Auth 
                onClose={() => setShowAuthModal(false)}
                title="Sign in to save your profile"
              />
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && isAuthenticated && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-serif font-semibold text-aman-stone-800">
                  Manage Profile
                </h2>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="p-2 hover:bg-aman-stone-100 rounded-full transition-colors"
                >
                  <XMarkIcon className="h-5 w-5 text-aman-stone-500" />
                </button>
              </div>
              
              <UserProfile 
                onProfileSaved={() => {
                  setShowProfileModal(false);
                  // Show a success message or update the UI
                }}
                autoFill={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setPaymentDetails(null);
        }}
        orderDetails={paymentDetails}
        passengerInfo={isAuthenticated ? profile : null}
      />
    </>
  );
}

export default ChatInterface;