'use client';

import { useState, useEffect, useRef } from 'react';
import { Users, Wifi, WifiOff } from 'lucide-react';

interface BroadcastMessage {
  id: string;
  message: string;
  adminId: string;
  timestamp: string;
  type: string;
}

export default function Communities() {
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [userId, setUserId] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Generate userId only on the client-side after mount
  useEffect(() => {
    setUserId(`user-${Date.now()}`);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!userId) return; // Don't connect until userId is generated

    setConnectionStatus('connecting');
    
    // Connect to WebSocket with community type
    ws.current = new WebSocket(`ws://localhost:3001?userId=${userId}&type=community`);

    ws.current.onopen = () => {
      console.log('Community WebSocket connected');
      setConnectionStatus('connected');
    };

    ws.current.onmessage = (event) => {
      const broadcastMessage: BroadcastMessage = JSON.parse(event.data);
      setMessages(prev => [...prev, broadcastMessage]);
    };

    ws.current.onclose = () => {
      console.log('Community WebSocket disconnected');
      setConnectionStatus('disconnected');
    };

    ws.current.onerror = (error) => {
      console.error('Community WebSocket error:', error);
      setConnectionStatus('disconnected');
    };

    return () => {
      ws.current?.close();
    };
  }, [userId]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-500" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Community Broadcasts
            </h1>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            {connectionStatus === 'connected' && (
              <>
                <Wifi className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600 dark:text-green-400">Connected</span>
              </>
            )}
            {connectionStatus === 'connecting' && (
              <>
                <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-yellow-600 dark:text-yellow-400">Connecting...</span>
              </>
            )}
            {connectionStatus === 'disconnected' && (
              <>
                <WifiOff className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-600 dark:text-red-400">Disconnected</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <Users className="w-16 h-16 text-gray-400 mb-4" />
              <h2 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
                Welcome to Communities
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-md">
                You'll receive broadcast messages from administrators here. Stay tuned for updates!
              </p>
              {connectionStatus === 'connected' && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                  ✓ Connected and listening for broadcasts
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">A</span>
                      </div>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        Admin ({msg.adminId})
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(msg.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                    {msg.message}
                  </p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>Connected as: <span className="font-medium">{userId || '...'}</span></p>
            <p>Total messages received: <span className="font-medium">{messages.length}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
