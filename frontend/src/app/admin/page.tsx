'use client';

import { useState } from 'react';
import {
  Send,
  MessageSquare,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface SentMessage {
  id: string;
  message: string;
  timestamp: string;
  status: 'success' | 'error';
}

export default function AdminPage() {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);

  const handleBroadcast = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    setIsLoading(true);
    const tempId = Date.now().toString();

    try {
      const response = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmedMessage,
          adminId: 'admin-001',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Broadcast failed');
      }

      setSentMessages((prev) => [
        {
          id: result.messageId,
          message: trimmedMessage,
          timestamp: new Date().toISOString(),
          status: 'success',
        },
        ...prev,
      ]);

      setMessage('');
    } catch (error) {
      console.error('Broadcast error:', error);
      setSentMessages((prev) => [
        {
          id: tempId,
          message: trimmedMessage,
          timestamp: new Date().toISOString(),
          status: 'error',
        },
        ...prev,
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Broadcast Form */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <header className="flex items-center gap-3 mb-4">
            <MessageSquare className="w-6 h-6 text-blue-500" />
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Admin Broadcast Panel
            </h1>
          </header>

          <form onSubmit={handleBroadcast}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message to broadcast to all community members..."
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              required
            />

            <button
              type="submit"
              disabled={isLoading || !message.trim()}
              className="mt-4 flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isLoading ? 'Broadcasting...' : 'Broadcast to All'}
            </button>
          </form>
        </section>

        {/* Broadcast History */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Broadcast History
          </h2>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {sentMessages.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 italic text-center py-8">
                No messages sent yet.
              </p>
            ) : (
              sentMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-lg border ${
                    msg.status === 'success'
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div
                      className={`flex items-center gap-2 text-xs font-medium ${
                        msg.status === 'success'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {msg.status === 'success' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      <span>{msg.status === 'success' ? 'SENT' : 'FAILED'}</span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(msg.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-800 dark:text-gray-200">{msg.message}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
