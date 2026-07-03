import db from '../repositories/db.js';
import crypto from 'crypto';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export class DatabaseService {
    static generatePassword(length = 16) {
        return crypto.randomBytes(length).toString('hex').slice(0, length);
    }

    static async checkDependencies() {
        // In a real implementation, this would check if mysql/psql/redis-cli are installed
        // For this MVP, we assume they are installed or mock the behavior
    }

    static async provisionMariaDB(name) {
        const username = `u_${crypto.randomBytes(4).toString('hex')}`;
        const password = this.generatePassword();
        
        try {
            // Mock native provisioning for MVP
            // Real implementation would use: mysql -u root -e "CREATE DATABASE ${name}; CREATE USER '${username}'@'localhost' IDENTIFIED BY '${password}'; GRANT ALL PRIVILEGES ON ${name}.* TO '${username}'@'localhost'; FLUSH PRIVILEGES;"
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate work
            
            return {
                port: 3306,
                username,
                password
            };
        } catch (error) {
            throw new Error(`Failed to provision MariaDB: ${error.message}`);
        }
    }

    static async provisionPostgres(name) {
        const username = `u_${crypto.randomBytes(4).toString('hex')}`;
        const password = this.generatePassword();
        
        try {
            // Mock native provisioning for MVP
            // Real implementation: sudo -u postgres psql -c "CREATE DATABASE ${name}; CREATE USER ${username} WITH ENCRYPTED PASSWORD '${password}'; GRANT ALL PRIVILEGES ON DATABASE ${name} TO ${username};"
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate work
            
            return {
                port: 5432,
                username,
                password
            };
        } catch (error) {
            throw new Error(`Failed to provision Postgres: ${error.message}`);
        }
    }

    static async provisionRedis(name) {
        const password = this.generatePassword();
        
        try {
            // Mock native provisioning for MVP
            // Real implementation: Set up ACL for Redis 6+ or spawn a new redis-server instance with custom config/port
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate work
            
            return {
                port: 6379,
                username: 'default', // Redis ACL default user or custom user
                password
            };
        } catch (error) {
            throw new Error(`Failed to provision Redis: ${error.message}`);
        }
    }

    static async createDatabase(name, type) {
        // Validate type
        if (!['mariadb', 'postgres', 'redis'].includes(type)) {
            throw new Error('Unsupported database type');
        }

        // Insert pending record
        const stmt = db.prepare(`
            INSERT INTO databases (name, type, status)
            VALUES (?, ?, 'provisioning')
        `);
        const info = stmt.run(name, type);
        const id = info.lastInsertRowid;

        try {
            let config;
            if (type === 'mariadb') config = await this.provisionMariaDB(name);
            else if (type === 'postgres') config = await this.provisionPostgres(name);
            else if (type === 'redis') config = await this.provisionRedis(name);

            // Update record with credentials
            db.prepare(`
                UPDATE databases 
                SET port = ?, username = ?, password = ?, status = 'active'
                WHERE id = ?
            `).run(config.port, config.username, config.password, id);

            return this.getDatabase(id);
        } catch (error) {
            db.prepare(`UPDATE databases SET status = 'failed' WHERE id = ?`).run(id);
            throw error;
        }
    }

    static getDatabases() {
        return db.prepare(`SELECT * FROM databases ORDER BY created_at DESC`).all();
    }

    static getDatabase(id) {
        return db.prepare(`SELECT * FROM databases WHERE id = ?`).get(id);
    }

    static deleteDatabase(id) {
        const dbInfo = this.getDatabase(id);
        if (!dbInfo) throw new Error('Database not found');

        // Note: Real implementation would drop the DB natively here
        db.prepare(`DELETE FROM databases WHERE id = ?`).run(id);
        return { success: true };
    }

    static async linkDatabaseToApp(dbId, appId) {
        const dbInfo = this.getDatabase(dbId);
        if (!dbInfo) throw new Error('Database not found');

        const app = db.prepare(`SELECT * FROM apps WHERE id = ?`).get(appId);
        if (!app) throw new Error('App not found');

        // Generate Connection String
        let url = '';
        if (dbInfo.type === 'mariadb') url = `mysql://${dbInfo.username}:${dbInfo.password}@${dbInfo.host}:${dbInfo.port}/${dbInfo.name}`;
        else if (dbInfo.type === 'postgres') url = `postgresql://${dbInfo.username}:${dbInfo.password}@${dbInfo.host}:${dbInfo.port}/${dbInfo.name}`;
        else if (dbInfo.type === 'redis') url = `redis://${dbInfo.username}:${dbInfo.password}@${dbInfo.host}:${dbInfo.port}`;

        // In a real implementation, we would write this to the app's .env file and restart it
        // For MVP we just update the linked_apps array in DB
        
        let linkedApps = JSON.parse(dbInfo.linked_apps || '[]');
        if (!linkedApps.includes(appId)) {
            linkedApps.push(appId);
            db.prepare(`UPDATE databases SET linked_apps = ? WHERE id = ?`).run(JSON.stringify(linkedApps), dbId);
        }

        return { success: true, url, linkedApps };
    }
}
