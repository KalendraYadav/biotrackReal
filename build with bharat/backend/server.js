import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testDbConnection, isDbConnected } from './db.js';
import authRouter from './routes/auth.js';
import wasteBatchesRouter from './routes/wasteBatches.js';
import vehiclesRouter from './routes/vehicles.js';
import hospitalsRouter from './routes/hospitals.js';
import riskCasesRouter from './routes/riskCases.js';
import facilitiesRouter from './routes/facilities.js';
import personnelRouter from './routes/personnel.js';
import { ensurePostgresRunning } from './services/pgService.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

import { eventBus } from './services/eventBus.js';

// Socket.IO Server Setup
export const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
});

io.on('connection', (socket) => {
  console.log('[Socket.IO] Real-time client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('[Socket.IO] Client disconnected:', socket.id);
  });
});

// Forward eventBus events to Socket.IO room/clients
eventBus.on('telemetry:ping', (data) => {
  io.emit('telemetry:ping', data);
});

eventBus.on('risk:alert', (data) => {
  io.emit('risk:alert', data);
});

eventBus.on('custody:event', (data) => {
  io.emit('custody:event', data);
});

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/waste-batches', wasteBatchesRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/hospitals', hospitalsRouter);
app.use('/api/risk-cases', riskCasesRouter);
app.use('/api/facilities', facilitiesRouter);
app.use('/api/personnel', personnelRouter);

// Root & Health check routes
app.get('/', (req, res) => {
  res.json({
    message: 'NidusClean (BioTrace) REST API & Socket.IO Gateway is running',
    version: '1.0.0',
    status: 'online',
    sockets_active: true,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  const dbConnected = isDbConnected();
  res.json({
    status: 'healthy',
    database: dbConnected ? 'connected' : 'in-memory-datastore',
    uptime: process.uptime(),
    sockets_connected: io.engine?.clientsCount || 0,
    timestamp: new Date().toISOString(),
    service: 'biotrace-backend'
  });
});

process.on('uncaughtException', (err) => {
  console.warn('[BioTrace Process Safety] Uncaught exception captured:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.warn('[BioTrace Process Safety] Unhandled rejection captured:', reason);
});

// Start PostgreSQL then HTTP + Socket.IO server
async function startServer() {
  try {
    await ensurePostgresRunning();
    await testDbConnection();
  } catch (err) {
    console.error('[BioTrace] PostgreSQL startup error:', err.message);
  }

  server.listen(PORT, () => {
    console.log(`[BioTrace API] Server listening on http://localhost:${PORT}`);
    console.log(`[BioTrace API] WebSocket gateway active via Socket.IO`);
    console.log(`[BioTrace API] Health check at http://localhost:${PORT}/api/health`);
    console.log(`[BioTrace API] Auth endpoints at http://localhost:${PORT}/api/auth/login`);
  });
}

startServer();

export default app;
