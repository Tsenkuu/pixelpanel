import { PM2Service } from '../services/pm2Service.js';
import db from '../repositories/db.js';
import httpProxy from 'http-proxy';

const proxy = httpProxy.createProxyServer({});

export class InternalController {
    /**
     * Nginx redirects here when hitting a 502 (App is offline/scaled to zero).
     * We wake the app up via PM2 and then proxy the request through transparently.
     */
    static async wakeupApp(req, res) {
        const { appName } = req.params;
        const originalUri = req.headers['x-original-uri'] || '/';

        try {
            const app = db.prepare('SELECT * FROM apps WHERE name = ?').get(appName);
            if (!app) {
                return res.status(404).send('Application not found');
            }

            // Wake up the PM2 process
            await PM2Service.start(appName);
            
            // Wait briefly for the process to bind to its port (approx 500ms max for Node.js)
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Re-write the URL and Proxy the request to the actual application port
            // Assuming we store/know the internal port. For this architecture, let's assume
            // apps bind to process.env.PORT, and we should know it.
            // If the port is dynamically assigned and stored in DB:
            const targetUrl = `http://127.0.0.1:${app.port || 3000}`;
            
            req.url = originalUri;
            
            proxy.web(req, res, { target: targetUrl }, (err) => {
                console.error(`[Proxy Error] Failed to proxy to woken app ${appName}:`, err);
                res.status(502).send('Application warming up, please refresh.');
            });

        } catch (error) {
            console.error(`[Wakeup Error] ${appName}:`, error);
            res.status(500).send('Failed to wake up application.');
        }
    }
}
