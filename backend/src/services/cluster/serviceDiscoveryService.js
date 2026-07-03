import db from '../../repositories/db.js';
import { AgentGatewayService } from './agentGatewayService.js';
import EventBus from '../eventBus.js';

export class ServiceDiscoveryService {
    /**
     * Register a new service instance.
     */
    static registerService(appName, nodeId, host, port) {
        const stmt = db.prepare(`
            INSERT INTO service_registry (app_name, node_id, host, port, health_status, last_check)
            VALUES (?, ?, ?, ?, 'unknown', CURRENT_TIMESTAMP)
        `);
        try {
            stmt.run(appName, nodeId, host, port);
            EventBus.emit('cluster.service.registered', { appName, nodeId });
            return true;
        } catch (error) {
            console.error('[ServiceDiscovery] Error registering service:', error);
            return false;
        }
    }

    /**
     * Unregister a service instance.
     */
    static unregisterService(appName, nodeId) {
        db.prepare(`DELETE FROM service_registry WHERE app_name = ? AND node_id = ?`).run(appName, nodeId);
        EventBus.emit('cluster.service.unregistered', { appName, nodeId });
    }

    /**
     * Discover all instances of a service.
     */
    static discoverService(appName) {
        return db.prepare(`SELECT * FROM service_registry WHERE app_name = ?`).all(appName);
    }

    /**
     * Get all services.
     */
    static getAllServices() {
        return db.prepare(`SELECT * FROM service_registry`).all();
    }

    /**
     * Perform health checks on all registered services via the Agent Gateway.
     */
    static async healthCheck() {
        const services = this.getAllServices();
        
        for (const service of services) {
            try {
                // We ask the agent running this service to ping the port locally
                const result = await AgentGatewayService.sendCommand(service.node_id, 'system:tcp_ping', {
                    host: '127.0.0.1',
                    port: service.port
                });

                const status = result.success ? 'healthy' : 'unhealthy';
                
                db.prepare(`
                    UPDATE service_registry 
                    SET health_status = ?, last_check = CURRENT_TIMESTAMP 
                    WHERE id = ?
                `).run(status, service.id);

            } catch (error) {
                // Agent unreachable or ping failed
                db.prepare(`
                    UPDATE service_registry 
                    SET health_status = 'unhealthy', last_check = CURRENT_TIMESTAMP 
                    WHERE id = ?
                `).run(service.id);
            }
        }
    }

    /**
     * Generates internal DNS mapping (appName -> [IPs]).
     */
    static generateDnsRecords() {
        const services = this.getAllServices();
        const records = {};
        
        services.forEach(s => {
            if (s.health_status === 'healthy') {
                const domain = `${s.app_name}.internal.pixelpanel`;
                if (!records[domain]) records[domain] = [];
                records[domain].push(s.host);
            }
        });
        
        return records;
    }
}
