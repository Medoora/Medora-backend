// lib/firebase.ts
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let dbInstance: any = null;
let initError: any = null;

export function getDB() {
  // Return existing instance if already initialized
  if (dbInstance) return dbInstance;
  
  // If we tried and failed before, don't try again
  if (initError) throw initError;
  
  try {
    // Check if Firebase is already initialized
    if (getApps().length > 0) {
      dbInstance = getFirestore();
      console.log('✅ Using existing Firebase instance');
      return dbInstance;
    }
    
    // Get environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    // Validate all required fields
    const missing: string[] = [];
    if (!projectId) missing.push('FIREBASE_PROJECT_ID');
    if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
    if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY');
    
    if (missing.length > 0) {
      throw new Error(`Missing Firebase credentials: ${missing.join(', ')}`);
    }
    
    // Clean the private key - THIS IS THE CRITICAL PART
    // Vercel often adds quotes and escape characters
    privateKey = privateKey!
      .replace(/\\n/g, '\n')    // Replace literal \n with actual newlines
      .replace(/^"|"$/g, '')     // Remove surrounding quotes if any
      .replace(/\\/g, '')        // Remove any stray backslashes
      .trim();                   // Trim whitespace
    
    // Validate key format
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      console.error('Private key validation failed: Missing BEGIN marker');
      console.error('First 100 chars:', privateKey.substring(0, 100));
      throw new Error('Invalid private key format - missing BEGIN marker');
    }
    
    if (!privateKey.includes('-----END PRIVATE KEY-----')) {
      throw new Error('Invalid private key format - missing END marker');
    }
    
    console.log('✅ Private key format validated');
    
    // Initialize Firebase
    initializeApp({
      credential: cert({
        projectId: projectId!,
        clientEmail: clientEmail!,
        privateKey: privateKey,
      }),
    });
    
    dbInstance = getFirestore();
    console.log('✅ Firebase initialized successfully');
    return dbInstance;
    
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    initError = error;
    throw error;
  }
}

// For backward compatibility - but now it's lazy-loaded
export const db = getDB();