import { buildApp } from './app.js';
import { getServerConfig, loadServerEnv } from './shared/config/env.js';

loadServerEnv();
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
