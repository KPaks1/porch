import { config } from 'dotenv';
import { resolve } from 'node:path';

// Runs before each e2e test file (via "setupFiles" in jest-e2e.json), so it
// takes effect before AppModule and ConfigModule read the environment.
const { parsed: envFile = {} } = config({
  path: resolve(__dirname, '../.env'),
  quiet: true,
});

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL must be set to run e2e tests');
}

// E2E tests truncate tables, so never let them run against the dev database.
// Compare with the .env file's value: process.env.DATABASE_URL may already
// have been overridden in the shell (e.g. to migrate the test database).
if (envFile.DATABASE_URL && testDatabaseUrl === envFile.DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL must point at a different database than DATABASE_URL');
}

process.env.DATABASE_URL = testDatabaseUrl;
