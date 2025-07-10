import { useState, useEffect, useRef } from 'react';

export enum ConnectionStatus {
  Connecting = 'connecting',
  Connected = 'connected',
  Disconnected = 'disconnected',
}

export interface DiscussionMessage {
  text: string;
  senderId: string;
  timestamp: string;
}

export const useDiscussion = (roomId: string | null) => {
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.Disconnected);
  const [userId, setUserId] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    setUserId(`user_${Math.random().toString(36).substr(2, 9)}`);
  }, []);

  useEffect(() => {
    if (!roomId || !userId) {
      setConnectionStatus(ConnectionStatus.Disconnected);
      return;
    }

    setMessages([]); // Reset messages when room changes

    const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || `ws://localhost:3001`;
    setConnectionStatus(ConnectionStatus.Connecting);
    ws.current = new WebSocket(`${wsUrl}?userId=${userId}&type=discussion&roomId=${roomId}`);

    ws.current.onopen = () => setConnectionStatus(ConnectionStatus.Connected);
    ws.current.onclose = () => setConnectionStatus(ConnectionStatus.Disconnected);
    ws.current.onerror = () => setConnectionStatus(ConnectionStatus.Disconnected);

    ws.current.onmessage = (event) => {
      const message: DiscussionMessage = JSON.parse(event.data);
      setMessages((prev) => [...prev, message]);
    };

    return () => {
      ws.current?.close();
    };
  }, [roomId, userId]);

  const sendMessage = (text: string) => {
    if (!text.trim() || !ws.current || ws.current.readyState !== WebSocket.OPEN) return;
    
    const message = { text };
    ws.current.send(JSON.stringify(message));
  };

  return { messages, userId, connectionStatus, sendMessage };
};
