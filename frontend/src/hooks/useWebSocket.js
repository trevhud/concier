import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = window.location.protocol === 'https:' 
  ? `wss://${window.location.host}/ws`
  : `ws://${window.location.host}/ws`;

export const useWebSocket = () => {
  const [messages, setMessages] = useState(() => {
    // Load messages from localStorage on initial render
    const savedMessages = localStorage.getItem('chatMessages');
    return savedMessages ? JSON.parse(savedMessages) : [];
  });
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  
  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }, [messages]);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        console.debug('WebSocket connected');
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionError(null);
        reconnectAttempts.current = 0;
      };

      ws.current.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data);
          console.debug('WebSocket message received:', response);
          
          switch (response.type) {
            case 'message':
              if (response.payload.text && response.payload.sender) {
                setMessages(prev => [
                  ...prev.filter(msg => !msg.isLoading),
                  { 
                    text: response.payload.text, 
                    sender: response.payload.sender,
                    timestamp: Date.now()
                  }
                ]);
                setStatusMessage('');
              }
              break;
              
            case 'flight_results':
              if (response.payload.flights) {
                setMessages(prev => [
                  ...prev.filter(msg => !msg.isLoading),
                  { 
                    text: response.payload.text || 'Found flight options',
                    sender: 'bot',
                    timestamp: Date.now(),
                    type: 'flight_results',
                    flights: response.payload.flights
                  }
                ]);
                setStatusMessage(''); // Clear status when flight results arrive
              }
              break;
              
            case 'hotel_results':
              if (response.payload.hotels) {
                setMessages(prev => [
                  ...prev.filter(msg => !msg.isLoading),
                  { 
                    text: response.payload.text || 'Found hotel options',
                    sender: 'bot',
                    timestamp: Date.now(),
                    type: 'hotel_results',
                    hotels: response.payload.hotels
                  }
                ]);
                setStatusMessage(''); // Clear status when hotel results arrive
              }
              break;
              
            case 'booking_confirmation':
              if (response.payload.bookingDetails) {
                setMessages(prev => [
                  ...prev.filter(msg => !msg.isLoading),
                  { 
                    text: response.payload.text || 'Booking confirmed',
                    sender: 'bot',
                    timestamp: Date.now(),
                    type: 'booking_confirmation',
                    bookingDetails: response.payload.bookingDetails
                  }
                ]);
                setStatusMessage(''); // Clear status when booking confirmation arrives
              }
              break;
              
            case 'payment_modal':
              if (response.payload.paymentDetails) {
                setMessages(prev => [
                  ...prev.filter(msg => !msg.isLoading),
                  { 
                    text: response.payload.text || 'Opening payment form...',
                    sender: 'bot',
                    timestamp: Date.now(),
                    type: 'payment_modal',
                    paymentDetails: response.payload.paymentDetails
                  }
                ]);
                setStatusMessage(''); // Clear status when payment modal triggers
              }
              break;
              
            case 'status':
              if (response.payload.status === 'chat_cleared') {
                setMessages([]);
                setStatusMessage('');
              } else if (response.payload.status && response.payload.status !== 'connected') {
                setStatusMessage(response.payload.status);
              }
              break;
              
            case 'error':
              console.error('WebSocket error:', response.payload.error);
              setMessages(prev => [
                ...prev.filter(msg => !msg.isLoading),
                { 
                  text: `Sorry, there was an error: ${response.payload.error}`, 
                  sender: 'bot',
                  timestamp: Date.now()
                }
              ]);
              setStatusMessage('');
              break;
              
            default:
              console.debug('Unknown message type:', response.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        console.debug('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        setStatusMessage('');
        
        // Remove any loading messages when disconnected
        setMessages(prev => prev.filter(msg => !msg.isLoading));

        // Attempt to reconnect if it wasn't a clean close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          console.debug(`Attempting to reconnect... (${reconnectAttempts.current}/${maxReconnectAttempts})`);
          
          reconnectTimer.current = setTimeout(() => {
            connect();
          }, reconnectDelay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setConnectionError('Failed to connect after multiple attempts. Please refresh the page.');
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('Connection error occurred');
        setIsConnecting(false);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionError('Failed to establish connection');
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    
    if (ws.current) {
      ws.current.close(1000, 'Disconnecting');
      ws.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    setStatusMessage('');
  }, []);

  const sendMessage = useCallback((input, context = null) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return false;
    }

    if (!input.trim()) {
      return false;
    }

    try {
      // Add user message to chat immediately (optimistic update)
      setMessages(prev => [
        ...prev,
        {
          text: input.trim(),
          sender: 'user',
          timestamp: Date.now()
        }
      ]);

      ws.current.send(JSON.stringify({
        type: 'chat',
        payload: { 
          input: input.trim(),
          context: context // Include authentication/profile context
        }
      }));
      
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }, []);

  const clearChat = useCallback(() => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return false;
    }

    try {
      ws.current.send(JSON.stringify({
        type: 'clear_chat'
      }));
      return true;
    } catch (error) {
      console.error('Failed to clear chat:', error);
      return false;
    }
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    messages,
    isConnected,
    isConnecting,
    connectionError,
    isLoading: !!statusMessage, // Derived from statusMessage
    statusMessage,
    sendMessage,
    clearChat,
    reconnect: connect
  };
};