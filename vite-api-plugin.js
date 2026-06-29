import { loadEnv } from 'vite';
import { handleApiRequest } from './server/api-handlers.js';

export function cosmicApiPlugin() {
    return {
        name: 'cosmic-api',
        configureServer(server) {
            const env = loadEnv(server.config.mode, process.cwd(), '');

            server.middlewares.use(async (req, res, next) => {
                if (!req.url?.startsWith('/api/')) {
                    next();
                    return;
                }

                await handleApiRequest(req, res, env);
            });
        }
    };
}
