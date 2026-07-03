import webpush from 'web-push';
import EventBus from './eventBus.js';
import db from '../repositories/db.js';
import crypto from 'crypto';

export class PushNotificationService {
    static vapidKeys = {
        publicKey: process.env.VAPID_PUBLIC_KEY,
        privateKey: process.env.VAPID_PRIVATE_KEY
    };

    static init() {
        // Generate VAPID keys if they don't exist
        if (!this.vapidKeys.publicKey || !this.vapidKeys.privateKey) {
            console.log('[WebPush] No VAPID keys found in ENV. Generating fresh keys...');
            const keys = webpush.generateVAPIDKeys();
            this.vapidKeys = keys;
            // In a real scenario, we should save these to DB or .env so they persist
            console.log('[WebPush] Generated Public Key:', this.vapidKeys.publicKey);
        }

        webpush.setVapidDetails(
            'mailto:admin@pixelpanel.local',
            this.vapidKeys.publicKey,
            this.vapidKeys.privateKey
        );

        // Ensure subscriptions table exists
        db.exec(`
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                endpoint TEXT UNIQUE NOT NULL,
                p256dh TEXT NOT NULL,
                auth TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Hook into core events
        this.registerEventHooks();
    }

    static registerEventHooks() {
        EventBus.subscribe('app.deployed', (data) => {
            this.broadcast('Deployment Successful', `App ${data.appName} was deployed successfully.`);
        });

        EventBus.subscribe('app.failed', (data) => {
            this.broadcast('Deployment Failed', `App ${data.appName} failed to deploy.`);
        });

        EventBus.subscribe('ai.rca.completed', (data) => {
            this.broadcast('AI Diagnostic Alert', `Root Cause Analysis completed for ${data.appName}.`);
        });
    }

    static subscribe(subscriptionParams) {
        const stmt = db.prepare('INSERT OR REPLACE INTO push_subscriptions (endpoint, p256dh, auth) VALUES (?, ?, ?)');
        stmt.run(subscriptionParams.endpoint, subscriptionParams.keys.p256dh, subscriptionParams.keys.auth);
    }

    static unsubscribe(endpoint) {
        const stmt = db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?');
        stmt.run(endpoint);
    }

    static async broadcast(title, body) {
        const subscriptions = db.prepare('SELECT * FROM push_subscriptions').all();
        
        const payload = JSON.stringify({
            title: title,
            body: body,
            icon: '/pwa-192x192.png'
        });

        console.log(`[WebPush] Broadcasting to ${subscriptions.length} devices: ${title}`);

        for (const sub of subscriptions) {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            };

            try {
                await webpush.sendNotification(pushSubscription, payload);
            } catch (error) {
                if (error.statusCode === 410 || error.statusCode === 404) {
                    console.log('[WebPush] Subscription expired or invalid. Removing from DB.');
                    this.unsubscribe(sub.endpoint);
                } else {
                    console.error('[WebPush] Send error:', error);
                }
            }
        }
    }
}
