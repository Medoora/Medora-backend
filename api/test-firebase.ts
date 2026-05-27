// api/test-firebase.ts
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    // Try to initialize Firebase dynamically
    console.log('Testing Firebase initialization...');
    
    const { initializeApp, cert, getApps } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    
    let result = {
      step: 'starting',
      error: null,
      hasApps: false
    };
    
    // Check if already initialized
    const existingApps = getApps();
    result.hasApps = existingApps.length > 0;
    
    if (existingApps.length === 0) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      
      if (!projectId || !clientEmail || !privateKey) {
        throw new Error(`Missing credentials: ${!projectId ? 'projectId ' : ''}${!clientEmail ? 'clientEmail ' : ''}${!privateKey ? 'privateKey' : ''}`);
      }
      
      // Clean the private key
      privateKey = privateKey.replace(/\\n/g, '\n');
      
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      
      result.step = 'firebase initialized';
    } else {
      result.step = 'firebase already initialized';
    }
    
    // Try to access Firestore
    const db = getFirestore();
    result.step = 'firestore accessed';
    
    // Try a simple operation (list users, limit 1)
    const usersRef = db.collection('users');
    const snapshot = await usersRef.limit(1).get();
    
    result.step = 'query completed';
    
    return res.status(200).json({
      success: true,
      result,
      userCount: snapshot.size,
      hasUsers: !snapshot.empty
    });
    
  } catch (error: any) {
    console.error('Firebase test failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      step: error.step || 'unknown'
    });
  }
}