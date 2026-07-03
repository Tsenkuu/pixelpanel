import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../repositories/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'pixelpanel-super-secret-key-change-in-prod';

// Helper to hash password
const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
};

// Helper to verify password
const verifyPassword = (password, storedHash) => {
    const [salt, key] = storedHash.split(':');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return key === hash;
};

export class AuthController {
    static async login(req, res) {
        const { username, password } = req.body;
        
        try {
            // Check if any users exist (First time setup check)
            const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
            if (userCount.count === 0) {
                // First time setup - register the first user as Admin
                const hashed = hashPassword(password);
                db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, hashed, 'Admin');
                
                const token = jwt.sign({ username, role: 'Admin' }, JWT_SECRET, { expiresIn: '7d' });
                return res.json({ token, user: { username, role: 'Admin' }, isSetup: true });
            }

            // Normal login
            const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            if (!verifyPassword(password, user.password)) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
            res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
        } catch (error) {
            console.error('[Auth] Error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
