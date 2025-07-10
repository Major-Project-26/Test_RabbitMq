'use client';

import { useState } from 'react';

export default function Admin() {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sentMessages, setSentMessages] = useState([]);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    
    if (!message.trim()) return;

    setIsLoading(true);
    
    try {
      const response = await fetch('http://localhost:8000/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          adminId: 'admin-001'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSentMessages(prev => [...prev, {
          id: result.messageId,
          message: message.trim(),
          timestamp: new Date().toISOString()
        }]);
        setMessage('');
      } else {
        alert('Failed to send broadcast message');
      }
    } catch (error) {
      console.error('Error sending broadcast:', error);
      alert('Error sending message');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Admin Panel - Community Broadcasts</h1>
          
          {/* Broadcast Form */}
          <form onSubmit={handleBroadcast} className="mb-6">
            <div className="mb-4">
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Broadcast Message
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message to broadcast to all community members..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !message.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Broadcasting...' : 'Broadcast to All'}
            </button>
          </form>

          {/* Sent Messages History */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Sent Broadcasts</h2>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {sentMessages.length === 0 ? (
                <p className="text-gray-500 italic">No messages sent yet.</p>
              ) : (
                sentMessages.map((msg) => (
                  <div key={msg.id} className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs text-green-600 font-medium">SENT</span>
                      <span className="text-xs text-gray-500">
                        {new Date(msg.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-800">{msg.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
