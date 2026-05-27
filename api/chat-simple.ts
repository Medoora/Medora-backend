// api/chat-simple.ts
import { getDB } from '../lib/config';

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    console.log(`📡 Fetching data for user: ${userId}`);

    // Fetch user data from Firebase
    const db = getDB();
    const userDoc = await db.collection('users').doc(userId).get();
    
    let userContext = '';
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      console.log('✅ User data found');
      
      // Build a simple context string from user data
      if (userData?.personalInfo) {
        userContext += `\nPatient Name: ${userData.personalInfo.firstName || ''} ${userData.personalInfo.lastName || ''}`;
        userContext += `\nDate of Birth: ${userData.personalInfo.dateOfBirth || 'Not provided'}`;
        userContext += `\nGender: ${userData.personalInfo.gender || 'Not provided'}`;
      }
      
      if (userData?.medicalInfo) {
        userContext += `\n\nMedical Information:`;
        userContext += `\n- Blood Type: ${userData.medicalInfo.bloodType || 'Not provided'}`;
        userContext += `\n- Allergies: ${userData.medicalInfo.allergies?.join(', ') || 'None reported'}`;
        
        if (userData.medicalInfo.currentMedications?.length > 0) {
          userContext += `\n- Current Medications: ${userData.medicalInfo.currentMedications.map((m: any) => `${m.name} ${m.dosage}`).join(', ')}`;
        }
        
        if (userData.medicalInfo.chronicConditions?.length > 0) {
          userContext += `\n- Chronic Conditions: ${userData.medicalInfo.chronicConditions.join(', ')}`;
        }
      }
      
      if (userData?.email) {
        userContext += `\n\nEmail: ${userData.email}`;
      }
    } else {
      console.log('⚠️ User not found, using generic response');
      userContext = '\nNo medical records found for this user.';
    }

    // Create a personalized system prompt
    const systemPrompt = `You are MedoraAI, a helpful medical assistant. Here is the patient's information:

${userContext}

Please answer questions based ONLY on the information provided above. If asked for information not in their profile, say "I don't have that information in your medical record." Be helpful, concise, and caring.`;

    // Get the last user message
    const lastUserMessage = messages[messages.length - 1]?.content || 'Hello';
    
    // Call OpenAI
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: lastUserMessage }
        ],
        temperature: 0.7,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI error:', errorText);
      return res.status(500).json({ error: 'OpenAI API error' });
    }

    const data = await openAIResponse.json();
    const text = data.choices?.[0]?.message?.content || 'No response';

    return res.status(200).json({ text });
    
  } catch (error: any) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}