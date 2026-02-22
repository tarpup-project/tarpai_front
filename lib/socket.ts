import { io, Socket } from 'socket.io-client';
import { WS_URL } from '@/config/api.config';

let socket: Socket | null = null;

export const initSocket = (token: string) => {
  if (socket) {
    return socket;
  }

  socket = io(WS_URL, {
    auth: {
      token,
    },
  });

  socket.on('connect', () => {
    console.log('WebSocket connected');
  });

  socket.on('disconnect', () => {
    console.log('WebSocket disconnected');
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default { initSocket, getSocket, disconnectSocket };