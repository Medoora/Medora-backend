import { getDB } from '../lib/config';

const TEMPERATURE = 0.7;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

// ─── Format Firestore data for prompt ──────────────────────────────────────
function formatUserDataForPrompt(patientData: any, userData: any) {
  const personalInfo = patientData?.personalInfo
    ? {
        name: `${patientData.personalInfo.firstName || ''} ${patientData.personalInfo.lastName || ''}`.trim(),
        dateOfBirth: patientData.personalInfo.dateOfBirth || null,
        gender: patientData.personalInfo.gender || null,
        phone: patientData.personalInfo.phoneNumber || null,
        emergencyContact: patientData.personalInfo.emergencyContact
          ? {
              name: patientData.personalInfo.emergencyContact.name,
              relationship: patientData.personalInfo.emergencyContact.relationship,
              phone: patientData.personalInfo.emergencyContact.phoneNumber,
            }
          : null,
      }
    : null;

  const medicalInfo = patientData?.medicalInfo
    ? {
        bloodType: patientData.medicalInfo.bloodType || null,
        height: patientData.medicalInfo.height || null,
        weight: patientData.medicalInfo.weight || null,
        allergies:
          Array.isArray(patientData.medicalInfo.allergies) &&
          patientData.medicalInfo.allergies.length > 0
            ? patientData.medicalInfo.allergies
            : ['None reported'],
        currentMedications: Array.isArray(patientData.medicalInfo.currentMedications)
          ? patientData.medicalInfo.currentMedications
          : [],
        chronicConditions: Array.isArray(patientData.medicalInfo.chronicConditions)
          ? patientData.medicalInfo.chronicConditions
          : [],
        pastSurgeries: Array.isArray(patientData.medicalInfo.pastSurgeries)
          ? patientData.medicalInfo.pastSurgeries
          : [],
      }
    : null;

  return {
    personalInfo,
    medicalInfo,
    accountInfo: {
      email: userData?.email || null,
      username: userData?.username || null,
    },
  };
}

// ─── Build system prompt ───────────────────────────────────────────────────
function createSystemPrompt(formattedData: any): string {
  const { personalInfo, medicalInfo, accountInfo } = formattedData;

  const personalSection = personalInfo
    ? `PERSONAL INFORMATION:
- Name:           ${personalInfo.name || 'Not provided'}
- Date of Birth:  ${personalInfo.dateOfBirth || 'Not provided'}
- Gender:         ${personalInfo.gender || 'Not provided'}
- Phone:          ${personalInfo.phone || 'Not provided'}
- Email:          ${accountInfo.email || 'Not provided'}
- Username:       ${accountInfo.username || 'Not provided'}
${
  personalInfo.emergencyContact
    ? `- Emergency Contact: ${personalInfo.emergencyContact.name} (${personalInfo.emergencyContact.relationship}) — ${personalInfo.emergencyContact.phone}`
    : '- Emergency Contact: Not provided'
}`
    : 'No personal information available.';

  const medicalSection = medicalInfo
    ? `MEDICAL INFORMATION:
- Blood Type:          ${medicalInfo.bloodType || 'Not provided'}
- Height:              ${medicalInfo.height ? `${medicalInfo.height} cm` : 'Not provided'}
- Weight:              ${medicalInfo.weight ? `${medicalInfo.weight} kg` : 'Not provided'}
- Allergies:           ${medicalInfo.allergies.join(', ')}
- Chronic Conditions:  ${medicalInfo.chronicConditions.length > 0 ? medicalInfo.chronicConditions.join(', ') : 'None reported'}
- Current Medications: ${
        medicalInfo.currentMedications.length > 0
          ? medicalInfo.currentMedications
              .map((m: any) =>
                typeof m === 'string' ? m : `${m.name || ''}${m.dosage ? ` (${m.dosage})` : ''}`
              )
              .join(', ')
          : 'None reported'
      }
- Past Surgeries:      ${medicalInfo.pastSurgeries.length > 0 ? medicalInfo.pastSurgeries.join(', ') : 'None reported'}`
    : 'No medical information available.';

  return `You are MedoraAI, a compassionate and knowledgeable medical assistant.

Here is the patient's complete profile:

${personalSection}

${medicalSection}

RULES:
1. Answer questions using ONLY the information above.
2. If something isn't in their profile say: "I don't have that in your medical record yet. Please update your profile in the app."
3. Be concise, professional, and empathetic.
4. For serious health concerns always recommend consulting a doctor.
5. Never suggest stopping prescribed medications without medical supervision.`;
}

// ─── Main handler ──────────────────────────────────────────────────────────
export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Body parsing guard ──
  if (typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  if (!req.body) {
    return res.status(400).json({ error: 'Missing request body' });
  }

  // ── Env guard ──
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Missing OPENAI_API_KEY');
    return res.status(500).json({ error: 'AI service not configured' });
  }

  const { messages, userId } = req.body;

  // ── Input validation ──
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid userId' });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing or invalid messages array' });
  }

  const validRoles = ['user', 'assistant'];
  if (!messages.every((m: any) => validRoles.includes(m.role) && typeof m.content === 'string')) {
    return res.status(400).json({ error: 'Each message must have a valid role and content string' });
  }

  try {
    // ── Fetch from Firestore ──
    let db: any;
    try {
      db = getDB();
    } catch (dbErr: any) {
      console.error('❌ DB init failed:', dbErr.message);
      return res.status(500).json({ error: 'Database init failed', message: dbErr.message });
    }

    console.log(`📡 Fetching Firestore data for userId: ${userId}`);

    const [patientDoc, userDoc] = await Promise.all([
      db.collection('patients').doc(userId).get(),
      db.collection('users').doc(userId).get(),
    ]);

    if (!patientDoc.exists) {
      console.warn(`⚠️ No patient doc found for: ${userId}`);
      return res.status(200).json({
        text: "I don't have any medical information for you yet. Please complete your medical profile in the app to get personalized assistance.",
      });
    }

    const patientData = patientDoc.data();
    const userData = userDoc.exists ? userDoc.data() : null;

    console.log('✅ Firestore fetch complete:', {
      hasPersonalInfo: !!patientData?.personalInfo,
      hasMedicalInfo:  !!patientData?.medicalInfo,
      hasUserDoc:      !!userData,
    });

    // ── Build prompt ──
    const formattedData = formatUserDataForPrompt(patientData, userData);
    const systemPrompt  = createSystemPrompt(formattedData);

    // ── Call OpenAI ──
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-6), // last 6 messages for context window
    ];

    console.log(`📨 Calling OpenAI | messages: ${apiMessages.length}`);

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model:       'gpt-4o-mini',
        messages:    apiMessages,
        temperature: TEMPERATURE,
      }),
    });

    if (!openAIResponse.ok) {
      const errText = await openAIResponse.text();
      console.error(`❌ OpenAI error ${openAIResponse.status}:`, errText);
      return res.status(openAIResponse.status).json({
        error:   'OpenAI API error',
        details: errText,
      });
    }

    const data = await openAIResponse.json();
    const text = data.choices?.[0]?.message?.content ?? 'No response generated.';

    console.log('✅ Response sent successfully');
    return res.status(200).json({ text });

  } catch (error: any) {
    console.error('❌ Unhandled error:', error.message, error.stack);
    return res.status(500).json({
      error:   'Internal server error',
      message: error.message,
    });
  }
}