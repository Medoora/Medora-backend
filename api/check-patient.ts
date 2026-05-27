// api/check-patient.ts
import { getDB } from '../lib/config';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }
    
    const db = getDB();
    
    // Check patients collection
    const patientDoc = await db.collection('patients').doc(userId).get();
    
    // Check users collection
    const userDoc = await db.collection('users').doc(userId).get();
    
    return res.status(200).json({
      userId,
      patients_collection: {
        exists: patientDoc.exists,
        data: patientDoc.data() || null,
        fields: patientDoc.exists ? Object.keys(patientDoc.data() || {}) : []
      },
      users_collection: {
        exists: userDoc.exists,
        data: userDoc.data() || null,
        fields: userDoc.exists ? Object.keys(userDoc.data() || {}) : []
      }
    });
    
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}