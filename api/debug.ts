// api/debug.ts
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const checks = {
    hasOpenAIKey:        !!process.env.OPENAI_API_KEY,
    hasFirebaseProject:  !!process.env.FIREBASE_PROJECT_ID,
    hasFirebaseEmail:    !!process.env.FIREBASE_CLIENT_EMAIL,
    hasFirebaseKey:      !!process.env.FIREBASE_PRIVATE_KEY,
    nodeVersion:         process.version,
  };

  // Try importing Firebase
  let firebaseStatus = 'not tested';
  try {
    const { getDB } = await import('../lib/config');
    const db = getDB();
    firebaseStatus = db ? '✅ connected' : '❌ null db';
  } catch (err: any) {
    firebaseStatus = `❌ ${err.message}`;
  }

  return res.status(200).json({ checks, firebaseStatus });
}