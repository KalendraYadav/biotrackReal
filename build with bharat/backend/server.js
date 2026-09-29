import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { testDbConnection, isDbConnected } from './db.js';
import { getJwtSecret } from './services/authService.js';
import { globalApiLimiter } from './middleware/rateLimiter.js';
import authRouter from './routes/auth.js';
import wasteBatchesRouter from './routes/wasteBatches.js';
import vehiclesRouter from './routes/vehicles.js';
import hospitalsRouter from './routes/hospitals.js';
import riskCasesRouter from './routes/riskCases.js';
import facilitiesRouter from './routes/facilities.js';
import personnelRouter from './routes/personnel.js';
import { eventBus } from './services/eventBus.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Resolve allowed CORS origins
function getAllowedOrigins() {
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
  }
  return [
    'http://localhost:5173',
    'http://localhost:5000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5000'
  ];
}

const allowedOrigins = getAllowedOrigins();

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (process.env.NODE_ENV !== 'production' && !process.env.CORS_ORIGIN) {
    return true;
  }
  return false;
}

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Socket.IO Server Setup with CORS & Handshake JWT Authentication
export const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Socket.IO CORS blocked for origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }
});

// Socket.IO Authentication Middleware (JWT Handshake Verification)
io.use((socket, next) => {
  const token = socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.replace(/^Bearer\s+/, '');

  if (!token) {
    return next(new Error('Authentication error: Token required for WebSocket gateway'));
  }

  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret);
    socket.user = decoded;
    return next();
  } catch (err) {
    return next(new Error(`Authentication error: ${err.message}`));
  }
});

io.on('connection', (socket) => {
  const userName = socket.user?.name || socket.user?.email || 'Authenticated client';
  console.log(`[Socket.IO] Real-time client connected: ${socket.id} (${userName})`);
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

// Security Headers (Helmet)
app.use(helmet({
  contentSecurityPolicy: false, // Prevents breaking Leaflet map tiles, inline SVGs, PWA workers
  crossOriginEmbedderPolicy: false
}));

// Cross-Origin Resource Sharing
app.use(cors(corsOptions));

// Global API Rate Limiting
app.use('/api', globalApiLimiter);

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
  const statusCode = dbConnected ? 200 : 503;

  res.status(statusCode).json({
    status: dbConnected ? 'healthy' : 'unhealthy',
    database: dbConnected ? 'connected' : 'disconnected',
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

// Start HTTP + Socket.IO server and verify external PostgreSQL
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    try {
      getJwtSecret();
    } catch (err) {
      console.error('[BioTrace Fatal Config Error]:', err.message);
      process.exit(1);
    }
  }

  try {
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
