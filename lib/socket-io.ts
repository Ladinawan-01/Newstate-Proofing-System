import { io, Socket } from 'socket.io-client'

class SocketManager {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  connect(projectId: string): Socket {
    if (this.socket?.connected) {
      return this.socket
    }

    this.socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      path: '/api/socketio',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
    })

    // Join project room
    this.socket.emit('join-project', projectId)

    // Connection event handlers
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id)
      this.reconnectAttempts = 0
    })

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
    })

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      this.reconnectAttempts++
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.emit('leave-project')
      this.socket.disconnect()
      this.socket = null
    }
  }

  // Annotation events
  addAnnotation(data: {
    projectId: string
    fileId: string
    annotation: string
    coordinates: { x: number; y: number }
    addedBy: string
    addedByName: string
  }) {
    if (this.socket?.connected) {
      this.socket.emit('addAnnotation', data)
    }
  }

  resolveAnnotation(data: {
    projectId: string
    annotationId: string
    resolvedBy: string
  }) {
    if (this.socket?.connected) {
      this.socket.emit('resolveAnnotation', data)
    }
  }

  // Status update events
  updateElementStatus(data: {
    projectId: string
    elementId: string
    status: string
    updatedBy: string
    comment?: string
  }) {
    if (this.socket?.connected) {
      this.socket.emit('updateElementStatus', data)
    }
  }

  // Comment events
  addComment(data: {
    projectId: string
    elementId: string
    comment: string
    addedBy: string
    addedByName: string
  }) {
    if (this.socket?.connected) {
      this.socket.emit('addComment', data)
    }
  }

  // Event listeners
  onAnnotationAdded(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('annotationAdded', callback)
    }
  }

  onAnnotationResolved(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('annotationResolved', callback)
    }
  }

  onStatusChanged(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('statusChanged', callback)
    }
  }

  onCommentAdded(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('commentAdded', callback)
    }
  }

  // Remove listeners
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners()
    }
  }

  getSocket(): Socket | null {
    return this.socket
  }

  isConnected(): boolean {
    return this.socket?.connected || false
  }
}

// Singleton instance
export const socketManager = new SocketManager()

// Hook for React components
export function useSocket(projectId: string) {
  const socket = socketManager.connect(projectId)
  
  return {
    socket,
    addAnnotation: socketManager.addAnnotation.bind(socketManager),
    resolveAnnotation: socketManager.resolveAnnotation.bind(socketManager),
    updateElementStatus: socketManager.updateElementStatus.bind(socketManager),
    addComment: socketManager.addComment.bind(socketManager),
    onAnnotationAdded: socketManager.onAnnotationAdded.bind(socketManager),
    onAnnotationResolved: socketManager.onAnnotationResolved.bind(socketManager),
    onStatusChanged: socketManager.onStatusChanged.bind(socketManager),
    onCommentAdded: socketManager.onCommentAdded.bind(socketManager),
    removeAllListeners: socketManager.removeAllListeners.bind(socketManager),
    isConnected: socketManager.isConnected.bind(socketManager),
    disconnect: socketManager.disconnect.bind(socketManager)
  }
}
