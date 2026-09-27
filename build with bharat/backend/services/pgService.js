import path from 'path';
import fs from 'fs';
import net from 'net';
import { fileURLToPath } from 'url';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let embeddedPg = null;
let isStarting = false;

function checkPortListening(port = 5432, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

export async function ensurePostgresRunning() {
  if (isStarting) {
    while (isStarting) {
      await new Promise(r => setTimeout(r, 200));
    }
    return true;
  }

  const isAlreadyListening = await checkPortListening(5432);
  if (isAlreadyListening) {
    console.log('[PostgreSQL Service] Port 5432 is already active and listening.');
    await ensureDatabaseExists();
    return true;
  }

  isStarting = true;
  try {
    const dbDir = path.resolve(__dirname, '../data/pg_data');
    console.log(`[PostgreSQL Service] Launching persistent PostgreSQL cluster at: ${dbDir}`);

    embeddedPg = new EmbeddedPostgres({
      databaseDir: dbDir,
      user: 'postgres',
      password: 'password',
      port: 5432,
      persistent: true
    });

    const isInitialized = fs.existsSync(path.join(dbDir, 'PG_VERSION'));
    if (!isInitialized) {
      console.log('[PostgreSQL Service] Initializing new database cluster files...');
      await embeddedPg.initialise();
    }

    console.log('[PostgreSQL Service] Starting PostgreSQL server engine...');
    await embeddedPg.start();
    console.log('[PostgreSQL Service] PostgreSQL engine started successfully on port 5432.');

    await ensureDatabaseExists();

    return true;
  } catch (err) {
    console.error('[PostgreSQL Service] Failed to start PostgreSQL:', err.message);
    throw err;
  } finally {
    isStarting = false;
  }
}

async function ensureDatabaseExists() {
  const client = new pg.Client({
    connectionString: 'postgresql://postgres:password@localhost:5432/postgres'
  });

  try {
    await client.connect();
    const checkDb = await client.query("SELECT 1 FROM pg_database WHERE datname = 'nidusclean'");
    if (checkDb.rowCount === 0) {
      console.log("[PostgreSQL Service] Creating application database 'nidusclean'...");
      await client.query('CREATE DATABASE nidusclean');
      console.log("[PostgreSQL Service] Database 'nidusclean' created successfully.");
    }
  } catch (err) {
    console.warn('[PostgreSQL Service] Check/create database notice:', err.message);
  } finally {
    try {
      await client.end();
    } catch {}
  }
}

export async function stopPostgres() {
  if (embeddedPg) {
    try {
      console.log('[PostgreSQL Service] Gracefully stopping embedded PostgreSQL server...');
      await embeddedPg.stop();
      console.log('[PostgreSQL Service] PostgreSQL stopped.');
    } catch (err) {
      console.warn('[PostgreSQL Service] Error during stop:', err.message);
    }
    embeddedPg = null;
  }
}

// Graceful cleanup on process termination
process.on('SIGINT', async () => {
  await stopPostgres();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await stopPostgres();
  process.exit(0);
});

export default {
  ensurePostgresRunning,
  stopPostgres
};
