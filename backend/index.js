import { initDatabase } from './src/repositories/db.js';
import './src/server.js';

// Initialize the Database
initDatabase();

console.log('[App] PixelPanel backend started.');
