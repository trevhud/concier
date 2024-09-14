import React, { useState, useEffect, useRef } from 'react';
import MessageList from './MessageList';
import './ChatInterface.css';
import io from 'socket.io-client';

const defaultMessages = [
  "Can I get a flight from Seattle to Alaska Sept 21 to 29?",
  // Add more default messages here as needed
];

function ChatInterface() {
  const [messages, setMessages] = useState(() => {
    const savedMessages = localStorage.getItem('chatMessages');
    return savedMessages ? JSON.parse(savedMessages) : [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => {
    return localStorage.getItem('sessionId') || '';
  });
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io('http://localhost:8080', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    if (!sessionId) {
      fetchNewSessionId();
    }

    socketRef.current.on('connect_error', (error) => {
      console.error('Connection Error:', error);
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to server');
    });

    socketRef.current.on('chat_update', (data) => {
      if (data.session_id === sessionId) {
        setMessages(prevMessages => {
          const newMessages = [...prevMessages, { text: data.response, sender: 'bot', isIntermediate: true }];
          localStorage.setItem('chatMessages', JSON.stringify(newMessages));
          return newMessages;
        });
      }
    });

    socketRef.current.on('chat_response', (data) => {
      if (data.session_id === sessionId) {
        setMessages(prevMessages => {
          const newMessages = [
            ...prevMessages.filter(msg => !msg.isIntermediate),
            { text: data.response, sender: 'bot' }
          ];
          localStorage.setItem('chatMessages', JSON.stringify(newMessages));
          return newMessages;
        });
        setIsLoading(false);
      }
    });

    socketRef.current.on('chat_error', (data) => {
      if (data.session_id === sessionId) {
        setMessages(prevMessages => {
          const newMessages = [
            ...prevMessages.filter(msg => !msg.isIntermediate),
            { text: `Error: ${data.error}`, sender: 'bot' }
          ];
          localStorage.setItem('chatMessages', JSON.stringify(newMessages));
          return newMessages;
        });
        setIsLoading(false);
      }
    });

    socketRef.current.on('chat_cleared', (data) => {
      setSessionId(data.session_id);
      localStorage.setItem('sessionId', data.session_id);
      setMessages([]);
      localStorage.removeItem('chatMessages');
      setIsLoading(false);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [sessionId]);

  const fetchNewSessionId = async () => {
    try {
      const response = await fetch('http://localhost:8080/new_session', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setSessionId(data.session_id);
      localStorage.setItem('sessionId', data.session_id);
    } catch (error) {
      console.error('Error fetching new session ID:', error);
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { text: input, sender: 'user' };
    setMessages(prevMessages => {
      const newMessages = [...prevMessages, userMessage];
      localStorage.setItem('chatMessages', JSON.stringify(newMessages));
      return newMessages;
    });
    setInput('');
    setIsLoading(true);

    socketRef.current.emit('chat', {
      input: input,
      session_id: sessionId
    });
  };

  const clearChat = async () => {
    try {
      const response = await fetch('http://localhost:8080/clear_chat', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setSessionId(data.session_id);
      localStorage.setItem('sessionId', data.session_id);
      setMessages([]);
      localStorage.removeItem('chatMessages');
      setIsLoading(false);
    } catch (error) {
      console.error('Error clearing chat:', error);
    }
  };

  const handleDefaultMessage = (message) => {
    setInput(message);
    handleSubmit();
  };

  return (
    <div className="chat-interface">
      <MessageList messages={messages} />
      <div ref={messagesEndRef} />
      <div className="default-messages">
        {defaultMessages.map((message, index) => (
          <button
            key={index}
            className="default-message-chip"
            onClick={() => handleDefaultMessage(message)}
          >
            {message}
          </button>
        ))}
      </div>
      <div className="chat-controls">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </form>
        <button onClick={clearChat} className="clear-chat-button" disabled={isLoading}>
          Clear Chat
        </button>
      </div>
    </div>
  );
}

export default ChatInterface;