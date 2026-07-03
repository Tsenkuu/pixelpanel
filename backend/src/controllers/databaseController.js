import { DatabaseService } from '../services/databaseService.js';

export class DatabaseController {
    /** GET /api/databases */
    static async getDatabases(req, res) {
        try {
            const dbs = DatabaseService.getDatabases();
            res.json(dbs);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /** GET /api/databases/:id */
    static async getDatabase(req, res) {
        try {
            const db = DatabaseService.getDatabase(req.params.id);
            if (!db) return res.status(404).json({ error: 'Database not found' });
            res.json(db);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /** POST /api/databases/provision */
    static async provisionDatabase(req, res) {
        try {
            const { name, type } = req.body;
            if (!name || !type) return res.status(400).json({ error: 'Name and type are required' });
            
            // Name validation (alphanumeric and underscores)
            if (!/^[a-zA-Z0-9_]+$/.test(name)) {
                return res.status(400).json({ error: 'Name can only contain alphanumeric characters and underscores' });
            }

            const db = await DatabaseService.createDatabase(name, type);
            res.status(201).json(db);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /** POST /api/databases/:id/link */
    static async linkDatabase(req, res) {
        try {
            const { appId } = req.body;
            if (!appId) return res.status(400).json({ error: 'appId is required' });

            const result = await DatabaseService.linkDatabaseToApp(req.params.id, appId);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /** DELETE /api/databases/:id */
    static async deleteDatabase(req, res) {
        try {
            const result = DatabaseService.deleteDatabase(req.params.id);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}
