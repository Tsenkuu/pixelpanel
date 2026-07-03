import { NodeRegistryService } from './nodeRegistryService.js';
import { AgentGatewayService } from './agentGatewayService.js';

export class ClusterBackupService {
    /**
     * Triggers a backup on a specific node.
     * @param {string} nodeId
     */
    static async backupNode(nodeId) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const outputPath = `/tmp/pixelpanel_backup_${nodeId}_${timestamp}.zip`;
            
            // Backup the entire apps directory on the remote node
            const result = await AgentGatewayService.sendCommand(nodeId, 'fs:zip', {
                sourcePath: '/home/pxl_apps',
                outputPath: outputPath
            });

            if (result.success) {
                // Return a URL where the master can download this backup
                return { success: true, backupPath: outputPath, downloadUrl: `/api/remote/${nodeId}/files/download?path=${outputPath}` };
            } else {
                throw new Error(result.error || 'Backup compression failed on agent.');
            }
        } catch (error) {
            console.error(`[Backup] Node ${nodeId} backup failed:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Triggers a parallel backup across all online nodes in the cluster.
     */
    static async backupCluster() {
        const nodes = NodeRegistryService.getOnlineNodes();
        if (nodes.length === 0) return { success: false, error: 'No online nodes to backup.' };

        console.log(`[Backup] Starting cluster-wide backup for ${nodes.length} nodes...`);
        
        const promises = nodes.map(node => 
            this.backupNode(node.id)
                .then(res => ({ nodeId: node.id, ...res }))
                .catch(err => ({ nodeId: node.id, success: false, error: err.message }))
        );

        const results = await Promise.all(promises);
        
        const successful = results.filter(r => r.success).length;
        console.log(`[Backup] Cluster backup complete. Success: ${successful}/${nodes.length}`);
        
        return {
            timestamp: new Date().toISOString(),
            totalNodes: nodes.length,
            successful,
            failed: nodes.length - successful,
            details: results
        };
    }

    /**
     * Restore a node from a backup file path.
     */
    static async restoreNode(nodeId, backupPath) {
        try {
            // Unzip the backup to a temp location, then sync to /home/pxl_apps
            const result = await AgentGatewayService.sendCommand(nodeId, 'fs:extract', {
                archivePath: backupPath,
                targetPath: '/home/pxl_apps_restore'
            });

            if (result.success) {
                // Issue command to swap directories and restart apps
                await AgentGatewayService.sendCommand(nodeId, 'system:restore_apps', { tempDir: '/home/pxl_apps_restore' });
                return { success: true, message: 'Restore complete.' };
            } else {
                throw new Error(result.error || 'Extraction failed on agent.');
            }
        } catch (error) {
            console.error(`[Backup] Node ${nodeId} restore failed:`, error);
            return { success: false, error: error.message };
        }
    }
}
