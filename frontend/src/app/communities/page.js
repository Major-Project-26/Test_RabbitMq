'use client';

import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

export default function Communities() {
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [userId] = useState(() => `user-${Date.now()}`);

  useEffect(() => {
    const newSocket = io('http://localhost:8000');
    setSocket(newSocket);

    // Register user for communities
    newSocket.emit('register-user', userId);

    // Listen for community broadcast messages
    newSocket.on('community-message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [userId]);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Communities</h1>
          
          <div className="border rounded-lg p-4 h-96 overflow-y-auto bg-gray-50">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-20">
                <p>No messages yet. Wait for admin broadcasts...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className="bg-blue-100 p-3 rounded-lg border-l-4 border-blue-500">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-blue-800">Admin</span>
                      <span className="text-xs text-gray-500">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-gray-800">{msg.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            <p>Connected as: {userId}</p>
            <p>Status: {socket?.connected ? '🟢 Connected' : '🔴 Disconnected'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
