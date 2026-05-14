import { io, Socket } from 'socket.io-client'
import { getToken, resolveApiBaseUrl } from './api'

let _socket: Socket | null = null
let _refCount = 0

export function acquireSocket(): Socket {
  if (!_socket) {
    // Resolve the socket URL the same way REST fetches do, so VITE_SOCKET_URL /
    // VITE_API_URL / same-origin fallback all work automatically.
    const socketUrl =
      import.meta.env.VITE_SOCKET_URL ??
      (typeof window !== 'undefined' ? resolveApiBaseUrl() : '')
    _socket = io(socketUrl, {
      auth: { token: getToken() },
      // Start with polling so the connection works behind Cloudflare (which
      // sometimes drops the WS upgrade), then upgrade to WebSocket when able.
      transports: ['polling', 'websocket'],
    })
    // Refresh the token on every reconnect attempt so expiry doesn't block re-auth.
    _socket.on('reconnect_attempt', () => {
      if (_socket) _socket.auth = { token: getToken() }
    })
  }
  _refCount++
  return _socket
}

export function releaseSocket(): void {
  _refCount = Math.max(0, _refCount - 1)
  if (_refCount === 0) {
    _socket?.disconnect()
    _socket = null
  }
}
