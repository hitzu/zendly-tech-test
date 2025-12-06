import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

export { AppDataSource } from './data-source';

export const getTypeOrmConfig = (): TypeOrmModuleOptions => {
  const nodeEnv = process.env.NODE_ENV || 'local';
  const isProd = nodeEnv === 'prod';

  dotenv.config({
    path: path.join(__dirname, '../../../', `.env.${nodeEnv}`),
  });

  const url = process.env.SUPABASE_DB_URL;
  const schema = process.env.DB_SCHEMA || 'public';

  const defaults = {
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    database: 'bookandsign_dev',
  };

  return {
    type: 'postgres',
    url,
    host: process.env.DB_HOST || defaults.host,
    port: parseInt(process.env.DB_PORT || String(defaults.port), 10),
    username: process.env.DB_USERNAME || defaults.username,
    password: process.env.DB_PASSWORD || defaults.password,
    database: process.env.DB_NAME || defaults.database,
    schema,

    entities: [path.join(__dirname, '../../**/entities/*.entity{.ts,.js}')],
    migrations: [
      path.join(__dirname, '../../database/migrations/**/*{.ts,.js}'),
    ],
    synchronize: false,
    logging: false,
    dropSchema: false,

    // Set PostgreSQL search_path to use the specified schema
    extra: {
      options: `-c search_path=${schema}`,
      ...(isProd && {
        max: 20,
        connectionTimeoutMillis: 2000,
      }),
    },

    ...(isProd && {
      ssl: { rejectUnauthorized: false },
      poolSize: 20,
    }),
  };
};
