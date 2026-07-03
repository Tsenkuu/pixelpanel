import db from '../repositories/db.js';
import { DeploymentService } from './deploymentService.js';
import EventBus from './eventBus.js';

export class JobQueueService {
    static isProcessing = false;

    /**
     * Start the queue daemon. Should be called on server boot.
     */
    static start() {
        console.log('[JobQueueService] Daemon started. Polling for jobs...');
        setInterval(() => this.processNextJob(), 5000);
        // Also trigger immediately just in case
        this.processNextJob();
    }

    /**
     * Enqueue a new deployment job.
     */
    static enqueueDeploy(appId) {
        // Prevent enqueueing if already pending
        const pending = db.prepare(`SELECT id FROM jobs WHERE app_id = ? AND status = 'pending'`).get(appId);
        if (pending) return { success: true, message: 'Deployment already queued.' };

        const stmt = db.prepare(`INSERT INTO jobs (app_id, status, type) VALUES (?, 'pending', 'deploy')`);
        stmt.run(appId);
        
        console.log(`[JobQueueService] Enqueued deploy job for app ${appId}`);
        
        // Kick off processor
        this.processNextJob();
        return { success: true, message: 'Deployment queued.' };
    }

    /**
     * Process the next job in the queue safely.
     */
    static async processNextJob() {
        if (this.isProcessing) return; // Prevent concurrent builds to save memory
        
        // Find next pending job
        const job = db.prepare(`SELECT * FROM jobs WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1`).get();
        if (!job) return; // Queue empty

        this.isProcessing = true;
        console.log(`[JobQueueService] Picked up job ${job.id} for app ${job.app_id}`);

        // Mark as processing
        db.prepare(`UPDATE jobs SET status = 'processing' WHERE id = ?`).run(job.id);

        try {
            if (job.type === 'deploy') {
                await DeploymentService.executeDeployment(job.app_id);
            }
            // Mark completed
            db.prepare(`UPDATE jobs SET status = 'completed' WHERE id = ?`).run(job.id);
            console.log(`[JobQueueService] Job ${job.id} completed successfully.`);
        } catch (error) {
            console.error(`[JobQueueService] Job ${job.id} failed:`, error.message);
            // Mark failed
            db.prepare(`UPDATE jobs SET status = 'failed' WHERE id = ?`).run(job.id);
        } finally {
            this.isProcessing = false;
            // Recursively process next if there are more
            setTimeout(() => this.processNextJob(), 1000);
        }
    }
}
