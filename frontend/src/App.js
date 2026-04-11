import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ChatInterface from './components/ChatInterface';
import PaymentPage from './components/PaymentPage';
import { AuthProvider } from './contexts/AuthContext';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Main chat interface */}
          <Route path="/" element={
            <div className="min-h-screen bg-gradient-to-br from-aman-stone-50 to-aman-stone-100">
              <div className="container mx-auto px-4 py-8">
                <header className="text-center mb-12 animate-fade-in">
                  <h1 className="text-5xl font-serif font-light text-aman-stone-800 mb-4">
                    Concier
                  </h1>
                  <p className="text-lg text-aman-stone-600 max-w-2xl mx-auto">
                    Your personal travel assistant, crafted with elegance and precision
                  </p>
                </header>
                <ChatInterface />
              </div>
            </div>
          } />
          
          {/* Payment page */}
          <Route path="/payment" element={<PaymentPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;