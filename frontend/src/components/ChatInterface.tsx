import React, { useState, useEffect, useRef, FormEvent } from 'react';
import MessageList from './MessageList';
import './ChatInterface.css';
import { Message } from '../types';

const defaultMessages: string[] = [
  "Can I get a flight from Seattle to Alaska Sept 21 to 29?",
  // Add more default messages here as needed
];

function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>(() => {
    const savedMessages = localStorage.getItem('chatMessages');
    return savedMessages ? JSON.parse(savedMessages) : [];
  });
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string>(() => {
    return localStorage.getItem('sessionId') || '';
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId) {
      fetchNewSessionId();
    }
  }, [sessionId]);

  const fetchNewSessionId = async (): Promise<void> => {
    try {
      const response = await fetch('http://localhost:8080/new_session', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: { session_id: string } = await response.json();
      setSessionId(data.session_id);
      localStorage.setItem('sessionId', data.session_id);
    } catch (error) {
      console.error('Error fetching new session ID:', error);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { text: input, sender: 'user' };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8080/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input, session_id: sessionId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let intermediateMessage: Message = { text: '', sender: 'bot', isIntermediate: true };
        setMessages(prevMessages => [...prevMessages, intermediateMessage]);

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              if (data.content === '[DONE]') {
                setMessages(prevMessages => {
                  const newMessages = prevMessages.filter(msg => !msg.isIntermediate);
                  localStorage.setItem('chatMessages', JSON.stringify(newMessages));
                  return newMessages;
                });
              } else {
                intermediateMessage.text += data.content;
                setMessages(prevMessages => {
                  const newMessages = [...prevMessages.slice(0, -1), { ...intermediateMessage }];
                  return newMessages;
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prevMessages => [
        ...prevMessages,
        { text: 'Error: Unable to send message', sender: 'bot' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = async (): Promise<void> => {
    try {
      const response = await fetch('http://localhost:8080/clear_chat', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: { session_id: string } = await response.json();
      setSessionId(data.session_id);
      localStorage.setItem('sessionId', data.session_id);
      setMessages([]);
      localStorage.removeItem('chatMessages');
      setIsLoading(false);
    } catch (error) {
      console.error('Error clearing chat:', error);
    }
  };

  const handleDefaultMessage = (message: string): void => {
    setInput(message);
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