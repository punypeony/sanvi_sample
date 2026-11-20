import { createApp } from './app.js';
import { config } from './config/index.js';
import { connectDb } from './db.js';

await connectDb();
const app = createApp();

app.listen(config.port, () => {
  console.log(`API listening on ${config.port}`);
});
