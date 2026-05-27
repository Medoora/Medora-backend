// api/get-user-data.ts
import { getDB } from '../lib/config';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    // Get userId from query parameter
    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'Missing userId',
        example: '/api/get-user-data?userId=YOUR_USER_ID'
      });
    }

    console.log(`Fetching data for user: ${userId}`);
    
    const db = getDB();
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ 
        exists: false,
        userId: userId,
        message: 'User not found'
      });
    }
    
    const userData = userDoc.data();
    
    return res.status(200).json({
      success: true,
      userId: userId,
      data: userData,
      fields: Object.keys(userData || {})
    });
    
  } catch (error: any) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
}