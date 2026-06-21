import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Initialize SQLite database with self-healing to handle corrupt or old formats
// Define safe db directory with EROFS / read-only filesystem fallbacks (e.g. for Google Cloud Run production containers)
let dbDir = path.join(process.cwd(), 'data');
let dbPath = path.join(dbDir, 'predictions.db');

try {
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  // Try writing a small test file to verify write access
  const testFile = path.join(dbDir, '.write_test');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
} catch (writeErr: any) {
  console.warn(`[database] Database directory ${dbDir} is not writable:`, writeErr.message, ". Falling back to /tmp/predictions.db for write support.");
  dbDir = '/tmp';
  dbPath = path.join(dbDir, 'predictions.db');
}

try {
  if (fs.existsSync(dbPath)) {
    // Attempt standard connection check to ensure format compliance
    const testDb = new Database(dbPath);
    testDb.pragma('journal_mode = WAL');
    testDb.close();
  }
} catch (e: any) {
  console.warn("[database] SQLite DB format mismatch or corruption detected. Clearing corrupt database and starting fresh...", e.message);
  try {
    fs.unlinkSync(dbPath);
  } catch (unlinkErr: any) {
    console.error("[database] Failed to unlink corrupt DB file:", unlinkErr.message);
  }
}

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
