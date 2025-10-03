import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as neonDrizzle, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import { drizzle as nodePgDrizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { setDefaultResultOrder } from 'dns';
import WebSocket, { ClientOptions } from 'ws';
import * as schema from '@shared/schema';

const { Pool: NodePgPool } = pg;
type PgPool = pg.Pool;

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL must be set. Did you forget to provision a database?',
  );
}

const connectionString = process.env.DATABASE_URL;

const connectionUrl = (() => {
  try {
    return new URL(connectionString);
  } catch {
    return undefined;
  }
})();

const databaseHost = connectionUrl?.hostname?.toLowerCase();
const isLocalHost = databaseHost === 'localhost' || databaseHost === '127.0.0.1';
const isNeonHost = Boolean(
  databaseHost &&
  [
    'neon.tech',
    'neon.build',
    'neonpostgres.app'
  ].some((suffix) => databaseHost.endsWith(suffix))
);

const forceNeon = process.env.DATABASE_USE_NEON === '1' || process.env.DATABASE_USE_NEON === 'true';

type Database = NeonDatabase<typeof schema> | NodePgDatabase<typeof schema>;
type DatabasePool = NeonPool | PgPool;

let pool: DatabasePool;
let db: Database;

if (!isLocalHost && (isNeonHost || forceNeon)) {
  setDefaultResultOrder('ipv4first');

  class IPv4WebSocket extends WebSocket {
    constructor(address: string, protocols?: string | string[], options: ClientOptions = {}) {
      super(address, protocols, { ...options, family: 4 });
    }
  }

  neonConfig.webSocketConstructor = IPv4WebSocket as unknown as typeof WebSocket;

  const neonPool = new NeonPool({ connectionString });
  pool = neonPool;
  db = neonDrizzle({ client: neonPool, schema });
} else {
  const sslMode = connectionUrl?.searchParams.get('sslmode');
  const shouldEnableSsl = !isLocalHost && sslMode !== null && sslMode !== 'disable';

  const pgPool = new NodePgPool({
    connectionString,
    ...(shouldEnableSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });

  pool = pgPool;
  db = nodePgDrizzle(pgPool, { schema });
}

export { pool, db };
