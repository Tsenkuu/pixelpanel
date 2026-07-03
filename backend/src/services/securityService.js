import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import db from '../repositories/db.js';

const SECURITY_DIR = path.resolve(process.cwd(), '../storage/security');
const KEY_PATH = path.join(SECURITY_DIR, 'master.key');

export class SecurityService {
    static masterKey = null;

    /**
     * Initializes the AES-256 master key.
     * Generates a secure random key if it doesn't exist.
     */
    static init() {
        try {
            if (!fs.existsSync(SECURITY_DIR)) {
                fs.mkdirSync(SECURITY_DIR, { recursive: true });
                // Make the directory highly secure
                try { fs.chmodSync(SECURITY_DIR, 0o700); } catch(e){}
            }

            if (!fs.existsSync(KEY_PATH)) {
                console.log('[Security] Generating new AES-256 Master Key...');
                const key = crypto.randomBytes(32);
                fs.writeFileSync(KEY_PATH, key);
                try { fs.chmodSync(KEY_PATH, 0o600); } catch(e){}
            }

            this.masterKey = fs.readFileSync(KEY_PATH);
            console.log('[Security] Master Key loaded. Encryption active.');
        } catch (error) {
            console.error('[Security] Failed to init Master Key. Secrets will not be encrypted properly.', error);
        }
    }

    /**
     * Encrypts a string (e.g. environment variables) using AES-256-GCM.
     */
    static encrypt(text) {
        if (!this.masterKey || !text) return text;
        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            const authTag = cipher.getAuthTag().toString('hex');
            // Format: iv:authTag:encryptedText
            return `${iv.toString('hex')}:${authTag}:${encrypted}`;
        } catch (e) {
            console.error('[Security] Encryption failed', e);
            return text;
        }
    }

    /**
     * Decrypts AES-256-GCM ciphertext.
     */
    static decrypt(encryptedData) {
        if (!this.masterKey || !encryptedData || !encryptedData.includes(':')) return encryptedData;
        try {
            const parts = encryptedData.split(':');
            if (parts.length !== 3) return encryptedData; // Not encrypted by us
            const iv = Buffer.from(parts[0], 'hex');
            const authTag = Buffer.from(parts[1], 'hex');
            const encryptedText = parts[2];
            
            const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
            decipher.setAuthTag(authTag);
            let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (e) {
            console.error('[Security] Decryption failed, possibly bad key', e);
            return '{}'; // Return safe empty JSON
        }
    }

    /**
     * Records an action to the Audit Log.
     */
    static logAction(action, user, ipAddress, details) {
        try {
            const stmt = db.prepare(`INSERT INTO audit_logs (action, user, ip_address, details) VALUES (?, ?, ?, ?)`);
            stmt.run(action, user, ipAddress, typeof details === 'string' ? details : JSON.stringify(details));
        } catch (e) {
            console.error('[Security] Audit log failed', e);
        }
    }
}
