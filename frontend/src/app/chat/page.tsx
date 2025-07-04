'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

interface ChatBubbleProps {
  message: Message;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.sender === 'user';
  
  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser 
          ? 'bg-blue-500 text-white' 
          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
      }`}>
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>
      
      {/* Message bubble */}
      <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
        isUser 
          ? 'bg-blue-500 text-white' 
          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
      }`}>
        {message.sender === 'bot' ? (
          <ReactMarkdown>{message.text}</ReactMarkdown>
        ) : (
          <p>{message.text}</p>
        )}
        <span className={`text-xs opacity-70 mt-1 block ${
          isUser ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
        }`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const ws = useRef<WebSocket | null>(null);

  // Generate a unique user ID on the client-side.
  useEffect(() => {
    setUserId(`user_${Math.random().toString(36).substr(2, 9)}`);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!userId) return;

    setConnectionStatus('connecting');
    ws.current = new WebSocket(`ws://localhost:3001?userId=${userId}`);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      setConnectionStatus('online');
    };

    ws.current.onmessage = (event) => {
      const botReply = JSON.parse(event.data);
      const botMessage: Message = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        text: botReply.payload,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
      setIsLoading(false);
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      setConnectionStatus('offline');
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('offline');
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        sender: 'bot',
        text: 'Sorry, there was a connection issue. Please refresh the page.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
    };

    return () => {
      ws.current?.close();
    };
  }, [userId]);


  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputText.trim() || isLoading || !userId || connectionStatus !== 'online') return;

    const question = inputText.trim();
    setInputText('');
    setIsLoading(true);

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: question,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);

    try {
      // Use the Next.js API route instead of calling the backend directly.
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          question
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Question sent successfully:', data);

    } catch (error) {
      console.error('Error sending question:', error);
      
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        sender: 'bot',
        text: 'Sorry, there was an error sending your question. Please try again.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center gap-3">
          <Bot className="w-6 h-6 text-blue-500" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            AI Chat Assistant
          </h1>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="w-12 h-12 text-gray-400 mb-4" />
            <h2 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
              Welcome to AI Chat
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              Ask me anything!
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <Bot size={16} className="text-gray-600 dark:text-gray-300" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              connectionStatus === 'online' 
                ? 'Type your question here...' 
                : 'Waiting for server connection...'
            }
            disabled={isLoading || connectionStatus !== 'online'}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 
                     placeholder-gray-500 dark:placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading || connectionStatus !== 'online'}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                     disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500
                     transition-colors duration-200 flex items-center gap-2"
          >
            <Send size={16} />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
        
        {/* Status indicator */}
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {connectionStatus === 'connecting' && (
            <span className="flex items-center gap-1 text-yellow-500">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              Connecting to server...
            </span>
          )}
          {connectionStatus === 'online' && (
            <span className="flex items-center gap-1 text-green-500">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Connected
            </span>
          )}
          {connectionStatus === 'offline' && (
            <span className="flex items-center gap-1 text-red-500">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              Connection failed. Please ensure the backend server is running.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}