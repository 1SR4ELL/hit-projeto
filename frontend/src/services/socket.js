import { io } from 'socket.io-client'

let socket = null

export function connectSocket(tenantId) {
  if (socket?.connected) return socket

  const serverUrl = import.meta.env.VITE_SOCKET_URL || '/'
  socket = io(serverUrl, {
    path: '/socket.io',
    transports: ['websocket'],
    reconnectionDelay: 2000,
    reconnectionAttempts: 5,
  })

  socket.on('connect', () => {
    console.log('[Socket] Conectado:', socket.id)
    socket.emit('join_tenant', tenantId)
  })

  socket.on('disconnect', () => {
    console.log('[Socket] Desconectado')
  })

  return socket
}

export function getSocket() {
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
