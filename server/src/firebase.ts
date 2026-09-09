import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { InMemoryFirestore } from './inMemoryStore';

// We export `db` typed as `any` so both the real Firestore and the in-memory
// fallback can be used interchangeably throughout the app.
let db: any;
let usingInMemory = false;

try {
  // Strategy 1: Use a service account JSON file if it exists
  const saPath = path.resolve(__dirname, '..', 'serviceAccountKey.json');

  if (fs.existsSync(saPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf-8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    db = getFirestore();
    console.log('✅ Firestore initialized from serviceAccountKey.json for project:', serviceAccount.project_id);
  } else {
    // Strategy 2: Use env vars
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing Firebase credentials');
    }

    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
    db = getFirestore();
    console.log('✅ Firestore initialized from env vars for project:', projectId);
  }
} catch (err: any) {
  console.warn(
    '⚠️  Firestore not configured —', err.message ?? err,
    '\n   📦 Falling back to IN-MEMORY store (data resets on restart).'
  );
  db = new InMemoryFirestore();
  usingInMemory = true;
}

export { db, usingInMemory };
