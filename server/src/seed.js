import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { connectDb, disconnectDb } from './db.js';
import { runSeed } from './seed/run.js';

function launchedDirectly() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(path.resolve(entry)).href;
}

if (launchedDirectly()) {
  try {
    await connectDb();
    await runSeed();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await disconnectDb().catch(() => {});
  }
}
