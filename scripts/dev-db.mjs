// Local Postgres for development without Docker (uses embedded-postgres).
// Run: `node scripts/dev-db.mjs` — starts Postgres on :5432 with an
// `aftertaste` database and stays running.
//
// The data lives in ~/.aftertaste/pgdata (OUTSIDE the project) on purpose:
// Postgres writes to its data dir constantly, and if it lived in the repo the
// Next dev file-watcher would rebuild in a loop.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

const dataDir = path.join(os.homedir(), '.aftertaste', 'pgdata');
fs.mkdirSync(path.dirname(dataDir), { recursive: true });

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'postgres',
  password: 'postgres',
  port: 5432,
  persistent: true,
});

if (!fs.existsSync(path.join(dataDir, 'PG_VERSION'))) {
  await pg.initialise();
}
await pg.start();
try {
  await pg.createDatabase('aftertaste');
} catch {
  // already exists
}
console.log(`✔ Postgres ready on localhost:5432 (database: aftertaste, data: ${dataDir})`);

const shutdown = async () => {
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
await new Promise(() => {}); // keep running
