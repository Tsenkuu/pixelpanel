import db from '../repositories/db.js';
import { JobQueueService } from '../services/jobQueueService.js';

export class WebhookController {
    /**
     * Handles incoming webhooks from GitHub, GitLab, and Bitbucket.
     */
    static async handleGitPush(req, res) {
        const appId = req.params.appId;
        const payload = req.body;

        const app = db.prepare(`SELECT * FROM apps WHERE id = ?`).get(appId);
        if (!app) return res.status(404).json({ error: 'App not found' });

        // Basic verification (in a real app, verify HMAC signatures)
        // Detect branch pushed to
        let branchPushed = '';
        if (payload.ref) {
            branchPushed = payload.ref.split('/').pop(); // GitHub/GitLab
        } else if (payload.push && payload.push.changes) {
            branchPushed = payload.push.changes[0]?.new?.name; // Bitbucket
        }

        // Only deploy if the pushed branch matches the app's tracked branch
        if (branchPushed === app.branch) {
            console.log(`[Webhook] Push detected on branch ${branchPushed} for ${app.name}. Initiating Auto-Deploy...`);
            
            JobQueueService.enqueueDeploy(app.id);

            return res.status(202).json({ message: 'Auto-deploy queued via webhook.' });
        } else {
            console.log(`[Webhook] Ignored push to branch ${branchPushed}. App tracks ${app.branch}.`);
            return res.status(200).json({ message: 'Push ignored. Branch mismatch.' });
        }
    }

    /**
     * Generates an SVG Status Badge for GitHub READMEs.
     */
    static getStatusBadge(req, res) {
        const appId = req.params.appId;
        
        // Find latest deployment status
        const latestDeploy = db.prepare(`SELECT status FROM deployments WHERE app_id = ? ORDER BY id DESC LIMIT 1`).get(appId);
        
        let color = '#94a3b8'; // slate (pending/unknown)
        let statusText = 'unknown';

        if (latestDeploy) {
            if (latestDeploy.status === 'success') { color = '#10b981'; statusText = 'passing'; }
            if (latestDeploy.status === 'failed') { color = '#ef4444'; statusText = 'failing'; }
            if (latestDeploy.status === 'building') { color = '#f59e0b'; statusText = 'building'; }
        }

        // Generate simple SVG
        const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="120" height="20">
            <linearGradient id="b" x2="0" y2="100%">
                <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
                <stop offset="1" stop-opacity=".1"/>
            </linearGradient>
            <mask id="a">
                <rect width="120" height="20" rx="3" fill="#fff"/>
            </mask>
            <g mask="url(#a)">
                <path fill="#555" d="M0 0h65v20H0z"/>
                <path fill="${color}" d="M65 0h55v20H65z"/>
                <path fill="url(#b)" d="M0 0h120v20H0z"/>
            </g>
            <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
                <text x="32.5" y="15" fill="#010101" fill-opacity=".3">deploy</text>
                <text x="32.5" y="14">deploy</text>
                <text x="91.5" y="15" fill="#010101" fill-opacity=".3">${statusText}</text>
                <text x="91.5" y="14">${statusText}</text>
            </g>
        </svg>
        `;

        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'no-cache');
        res.send(svg.trim());
    }
}
