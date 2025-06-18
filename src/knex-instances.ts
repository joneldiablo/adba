import fs from 'fs';
import path from 'path';
import os from 'os';
import knex, { Knex } from 'knex';
import { createTunnel as tunnel } from 'tunnel-ssh';

/**
 * Interface for SSH Tunnel options
 */
export interface TunnelSSHOptions {
  privateKey: string;
  passphrase?: string;
  username: string;
  host: string;
  port: number;
  localhost?: string;
}

/**
 * Interface for additional knex connection config
 */
export interface KnexInstanceOptions {
  host?: string;
  user?: string;
  password?: string;
  database?: string;
  tunnel?: boolean | TunnelSSHOptions;
  knexConfig?: Partial<Knex.Config>;
  knexConnection?: Partial<Knex.MySqlConnectionConfig>;
}

/**
 * Interface for extends knex object
 */
export interface RefDblDB {
  current: Knex<any, any[]>;
}

function wrapKnexInstance(knexInstance: Knex<any, any[]>, conn: any, server: any) {
  const originalDestroy = knexInstance.destroy.bind(knexInstance);

  return new Proxy(knexInstance, {
    get(target, prop) {
      if (prop === 'destroy') {
        return async () => {
          const result = await originalDestroy();
          conn.destroy();
          await new Promise((resolve) => server.close(() => {
            console.log('tunnel & mysql conn CLOSE');
            resolve(null);
          }));
          return result;
        };
      }

      return Reflect.get(target, prop);
    }
  });
}


/**
 * Helper to create and validate Knex instance
 * @param config Knex configuration
 * @returns Object with `.current` knex instance or false if connection fails
 */
async function createKnex(config: Knex.Config): Promise<RefDblDB | false> {

  const db = knex(config);

  db.on('query', (queryData) => {
    if (process.env.NODE_ENV !== 'PRODUCTION') {
      console.log('==========SQL Query======');
      console.log(queryData.sql);
      console.log('==========\n');
    }
  });

  try {
    const response = await db.raw('SELECT 2 + 2 AS result');
    const client = (db.client.config.client || '').toLowerCase();

    let result: number | undefined;
    switch (client) {
      case 'mysql':
      case 'mysql2':
        // MySQL returns [ [ { result: 4 } ], fields ]
        if (Array.isArray(response) && Array.isArray(response[0])) {
          result = response[0][0]?.result;
        }
        break;

      case 'pg':
      case 'postgres':
      case 'postgresql':
        // PostgreSQL returns { rows: [ { result: 4 } ] }
        result = response?.rows?.[0]?.result;
        break;

      case 'sqlite3':
        // SQLite returns { rows: [ { result: 4 } ] }
        result = response?.rows?.[0]?.result;
        break;

      default:
        throw new Error(`Unsupported DB client: ${client}`);
    }

    console.log('Database connection verification: 2+2=', result);
    if (result !== 4) throw new Error('2+2!=' + result);
    return { current: db } as RefDblDB;
  } catch (error: any) {
    console.error('Database connection failed: ', error.message);
    return false;
  }
}

/**
 * Create SSH tunnel and attach Knex instance
 * @param tunnelConfig Configuration for the SSH tunnel
 * @param knexConfig Knex configuration object
 * @returns Object with `.current` knex instance or false if fails
 */
async function createTunnel(tunnelConfig: any, knexConfig: Knex.Config): Promise<RefDblDB | false> {
  const { tunnelOptions, serverOptions, sshOptions, forwardOptions } = tunnelConfig;

  const [server, conn] = await tunnel(tunnelOptions, serverOptions, sshOptions, forwardOptions);
  const port = (server.address() as any).port;

  knexConfig.connection = {
    ...(knexConfig.connection as Knex.MySqlConnectionConfig),
    port
  };

  console.log('TUNNEL on port:', port);

  const db = await createKnex(knexConfig);
  if (!db) {
    conn.destroy();
    await new Promise((resolve) => server.close(() => {
      console.log('tunnel & mysql conn CLOSE');
      resolve(null);
    }));
    return false;
  }

  db.current = wrapKnexInstance(db.current, conn, server);
  return db;
}

/**
 * Generate knex instance with optional SSH tunneling
 * @param host DB Host
 * @param user DB User
 * @param password DB Password
 * @param database DB Name
 * @param conf Additional config including tunnel, knexConfig and connection
 * @returns Object with `.current` knex instance or false
 */
async function knexInstances({
  host,
  user,
  password,
  database,
  ...conf
}: KnexInstanceOptions = {}): Promise<RefDblDB | false> {
  const { tunnel = false, knexConfig = {}, knexConnection = {} } = conf;

  const kconf: Knex.Config = {
    client: knexConfig.client || 'mysql2',
    ...knexConfig
  };

  const kconn: Knex.MySqlConnectionConfig = {
    host,
    user,
    password,
    database,
    ...knexConnection
  };

  kconf.connection = kconn;

  if (tunnel) {
    const sshConfig = tunnel as TunnelSSHOptions;
    const privateKeyPath = path.resolve(sshConfig.privateKey.replace('~', os.homedir()));

    const sshOptions: any = {
      privateKey: fs.readFileSync(privateKeyPath),
      username: sshConfig.username,
      host: sshConfig.host,
      port: sshConfig.port,
      keepaliveCountMax: 720,
      keepaliveInterval: 120_000,
    };

    if (sshConfig.passphrase) sshOptions.passphrase = sshConfig.passphrase;

    const tunnelConfig = {
      tunnelOptions: {
        autoClose: false,
      },
      serverOptions: {},
      sshOptions,
      forwardOptions: {
        srcAddr: sshConfig.localhost || host,
        dstAddr: host,
        dstPort: kconn.port || 3306,
      }
    };

    return await createTunnel(tunnelConfig, kconf);
  } else {
    return await createKnex(kconf);
  }
}

export default knexInstances;
