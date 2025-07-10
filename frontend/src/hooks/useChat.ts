import { useState, useEffect, useRef } from 'react';

export enum ConnectionStatus {
  Connecting = 'connecting',
  Online = 'online',
  Offline = 'offline',
}

export interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.Connecting);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    setUserId(`user_${Math.random().toString(36).substr(2, 9)}`);
  }, []);

  useEffect(() => {
    if (!userId) return;

    const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || `ws://localhost:3001`;
    setConnectionStatus(ConnectionStatus.Connecting);
    ws.current = new WebSocket(`${wsUrl}?userId=${userId}`);

    ws.current.onopen = () => setConnectionStatus(ConnectionStatus.Online);
    ws.current.onclose = () => setConnectionStatus(ConnectionStatus.Offline);
    ws.current.onerror = () => setConnectionStatus(ConnectionStatus.Offline);

    ws.current.onmessage = (event) => {
      const botReply = JSON.parse(event.data);
      const botMessage: Message = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        text: botReply.payload,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
      setIsLoading(false);
    };

    return () => {
      ws.current?.close();
    };
  }, [userId]);

  const sendMessage = async (question: string) => {
    if (!question.trim() || !userId || connectionStatus !== ConnectionStatus.Online) return;

    setIsLoading(true);
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: question,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, question }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
    } catch (error) {
      console.error('Error sending question:', error);
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        sender: 'bot',
        text: 'Sorry, there was an error sending your question. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  return { messages, connectionStatus, isLoading, sendMessage };
};
