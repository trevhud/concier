import React from 'react';
import ReactMarkdown from 'react-markdown';
import './ChatInterface.css';

function MessageList({ messages }) {
  return (
    <div className="message-list">
      {messages.map((message, index) => (
        <div key={index} className={`message ${message.sender}`}>
          {message.isLoading ? (
            <div className="loading-spinner"></div>
          ) : (
            <ReactMarkdown>{message.text}</ReactMarkdown>
          )}
        </div>
      ))}
    </div>
  );
}

export default MessageList;