'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Users, LogIn, Wifi, WifiOff } from 'lucide-react';
import { useDiscussion, DiscussionMessage, ConnectionStatus } from '@/hooks/useDiscussion';

const discussionRooms = ['general', 'technology'];

interface DiscussionBubbleProps {
  message: DiscussionMessage;
  isOwnMessage: boolean;
}

const DiscussionBubble: React.FC<DiscussionBubbleProps> = ({ message, isOwnMessage }) => {
  return (
    <div className={`flex items-start gap-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white ${
        isOwnMessage ? 'bg-blue-500' : 'bg-green-500'
      }`}>
        <Users size={16} />
      </div>
      <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
        isOwnMessage ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
      }`}>
        <p className="text-sm font-bold opacity-80">{isOwnMessage ? 'You' : message.senderId.substring(0, 12)}</p>
        <p>{message.text}</p>
        <span className={`text-xs opacity-70 mt-1 block ${
          isOwnMessage ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
        }`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};

export default function DiscussionsPage() {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const { messages, userId, connectionStatus, sendMessage } = useDiscussion(selectedRoom);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleJoinRoom = (room: string) => {
    setSelectedRoom(room);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendMessage(inputText);
    setInputText('');
  };

  if (!selectedRoom) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Join a Discussion</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">Select a room to start chatting with others.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md w-full">
          {discussionRooms.map(room => (
            <button
              key={room}
              onClick={() => handleJoinRoom(room)}
              className="flex items-center justify-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition-all duration-200"
            >
              <Users className="w-5 h-5 text-blue-500" />
              <span className="text-lg font-semibold text-gray-800 dark:text-gray-200 capitalize">{room}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-blue-500" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Discussion: <span className="text-blue-600 dark:text-blue-400 capitalize">{selectedRoom}</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {connectionStatus === ConnectionStatus.Connected && <Wifi className="w-4 h-4 text-green-500" />}
            {connectionStatus === ConnectionStatus.Disconnected && <WifiOff className="w-4 h-4 text-red-500" />}
            {connectionStatus === ConnectionStatus.Connecting && <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>}
            <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{connectionStatus}</span>
          </div>
          <button onClick={() => setSelectedRoom(null)} className="text-sm text-blue-600 hover:underline">
            Leave Room
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg, index) => (
          <DiscussionBubble key={index} message={msg} isOwnMessage={msg.senderId === userId} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message..."
            disabled={connectionStatus !== ConnectionStatus.Connected}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || connectionStatus !== ConnectionStatus.Connected}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
          >
            <Send size={16} />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
