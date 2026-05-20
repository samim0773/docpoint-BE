const { Server } = require('socket.io');
const logger = require('../config/logger');

let _io = null;

/**
 * Initialise Socket.IO on the HTTP server.
 * Call once at startup before startServer() begins listening.
 */
const initSocket = (httpServer) => {
  const origins = (process.env.ALLOWED_ORIGINS || 'http://localhost:4200')
    .split(',')
    .map((o) => o.trim());

  _io = new Server(httpServer, {
    cors: {
      origin: origins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Prefer WebSocket; fall back to polling for clients behind restrictive proxies
    transports: ['websocket', 'polling'],
  });

  const queueNs = _io.of('/queue');

  queueNs.on('connection', (socket) => {
    logger.info(`[Socket] Client connected: ${socket.id}`);

    // Client sends { scheduleId } to subscribe to a specific queue room
    socket.on('join-queue', ({ scheduleId } = {}) => {
      if (!scheduleId) return;
      socket.join(scheduleId);
      logger.info(`[Socket] ${socket.id} joined queue room: ${scheduleId}`);
    });

    socket.on('leave-queue', ({ scheduleId } = {}) => {
      if (!scheduleId) return;
      socket.leave(scheduleId);
    });

    socket.on('disconnect', (reason) => {
      logger.info(`[Socket] Client disconnected: ${socket.id} — ${reason}`);
    });
  });

  logger.info('[Socket] Socket.IO initialised — namespace: /queue');
  return _io;
};

/**
 * Returns the singleton io instance.
 * Safe to call from controllers / watchers after initSocket() has run.
 */
const getIO = () => {
  if (!_io) throw new Error('Socket.IO not initialised. Call initSocket(server) first.');
  return _io;
};

module.exports = { initSocket, getIO };
