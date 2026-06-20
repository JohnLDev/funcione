import 'dotenv/config';
import { buildApp } from './app.js';
import { getServerConfig } from './shared/config/env.js';

const config = getServerConfig();
const app = await buildApp({ logger: true });

try {
  await app.listen({
    host: config.host,
    port: config.port,
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
