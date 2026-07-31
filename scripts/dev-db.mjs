// Local Postgres for development without Docker (uses embedded-postgres).
// Run: `node scripts/dev-db.mjs` — starts Postgres on :5432 with an
// `aftertaste` database and stays running. Data persists in ./.pgdata.
import fs from 'node:fs';
import EmbeddedPostgres from 'embedded-postgres';

const pg = new EmbeddedPostgres({
  databaseDir: './.pgdata',
  user: 'postgres',
  password: 'postgres',
  port: 5432,
  persistent: true,
});

if (!fs.existsSync('./.pgdata/PG_VERSION')) {
  await pg.initialise();
}
await pg.start();
try {
  await pg.createDatabase('aftertaste');
} catch {
  // already exists
}
console.log('✔ Postgres ready on localhost:5432 (database: aftertaste)');

const shutdown = async () => {
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
await new Promise(() => {}); // keep running
