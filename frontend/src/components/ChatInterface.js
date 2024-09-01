import React, { useState, useEffect, useRef } from 'react';
import MessageList from './MessageList';
import './ChatInterface.css';

function ChatInterface() {
  const [messages, setMessages] = useState(() => {
    // Load messages from localStorage on initial render
    const savedMessages = localStorage.getItem('chatMessages');
    return savedMessages ? JSON.parse(savedMessages) : [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }, [messages]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { text: input, sender: 'user' };
    const currentInput = input;
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      setMessages(prevMessages => [...prevMessages, { text: 'Loading...', sender: 'bot', isLoading: true }]);

      const response = await fetch('http://localhost:8080/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: currentInput }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setMessages(prevMessages => [
        ...prevMessages.filter(msg => !msg.isLoading),
        { text: data.response, sender: 'bot' }
      ]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prevMessages => [
        ...prevMessages.filter(msg => !msg.isLoading),
        { text: 'Sorry, there was an error processing your request.', sender: 'bot' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = async () => {
    setInput('');
    setMessages([]);
    localStorage.removeItem('chatMessages');
    
    try {
      const response = await fetch('http://localhost:8080/clear_chat', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('Chat history cleared on server');
    } catch (error) {
      console.error('Error clearing chat history on server:', error);
    }
  };

  const defaultMessages = [
    "Can I get a flight from Seattle to Alaska Sept 21 to 29?"
  ];

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