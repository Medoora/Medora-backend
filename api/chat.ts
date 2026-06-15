// api/chat.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '../lib/firebase/firebase-admin';
import { createSystemPrompt, formatUserDataForPrompt } from "../lib/prompt/prompt";
import { getOpenAIModel, openAIConfig } from '../lib/ai/openai-config';
import { availableModels } from '../lib/ai/model-config';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set headers for plain text response (like App Router)
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');

  try {
    const { messages, userId, model } = req.body;

    console.log('📨 [CHAT API] Request received:', { userId, model, messageCount: messages?.length });

    // Validate required fields
    if (!userId) {
      return res.status(400).send('Error: Missing userId');
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).send('Error: Invalid messages format');
    }

    const selectedModel = model || openAIConfig.defaultModel;
    const modelExists = availableModels.some(m => m.id === selectedModel);
    
    if (!modelExists) {
      console.warn(`⚠️ Requested model ${selectedModel} not found, using default`);
    }

    if (!adminDb) {
      return res.status(500).send('Error: Service configuration error');
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).send('Error: AI service not configured');
    }

    // ========== FETCH USER DATA FROM FIRESTORE ==========
    console.log('📊 [CHAT API] Fetching patient data for user:', userId);
    
    let patientData = null;
    let userData = null;
    
    try {
      const patientDoc = await adminDb.collection('patients').doc(userId).get();
      
      if (patientDoc.exists) {
        patientData = patientDoc.data();
        console.log('✅ [CHAT API] Patient data found');
      } else {
        const userDoc = await adminDb.collection('users').doc(userId).get();
        if (userDoc.exists) {
          const userDocData = userDoc.data();
          if (userDocData?.medicalInfo) {
            patientData = userDocData.medicalInfo;
          } else if (userDocData?.medicalProfile) {
            patientData = userDocData.medicalProfile;
          } else {
            patientData = {
              medicalConditions: [],
              medications: [],
              allergies: [],
              bloodGroup: '',
              age: null,
              gender: '',
            };
          }
        } else {
          patientData = {
            medicalConditions: [],
            medications: [],
            allergies: [],
            bloodGroup: '',
            age: null,
            gender: '',
          };
        }
      }
      
      const userDoc = await adminDb.collection('users').doc(userId).get();
      if (userDoc.exists) {
        userData = userDoc.data();
      } else {
        userData = { displayName: 'User', email: null };
      }
      
    } catch (firebaseError) {
      console.error('❌ [CHAT API] Firebase fetch error:', firebaseError);
      return res.status(500).send('Error: Unable to fetch medical data. Please try again.');
    }

    if (!patientData) {
      return res.status(404).send('Error: Medical profile not found. Please complete your onboarding first.');
    }

    // Format data and create prompt
    const formattedData = formatUserDataForPrompt(patientData, userData);
    const systemPrompt = createSystemPrompt(formattedData);

    // Prepare messages for OpenAI
    const apiMessages = [
      {
        role: 'system' as const,
        content: systemPrompt
      },
      ...messages.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      }))
    ];

    console.log('📨 [CHAT API] Sending to OpenAI, messages count:', apiMessages.length);
    console.log('🚀 [CHAT API] Using model:', selectedModel);

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: apiMessages,
        temperature: openAIConfig.temperature,
        max_tokens: 1000,
      }),
    });

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.json();
      console.error('❌ [CHAT API] OpenAI error:', errorData);
      return res.status(openAIResponse.status).send(`Error: ${errorData.error?.message || 'AI service error'}`);
    }

    const data = await openAIResponse.json();
    const text = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';

    console.log('✅ [CHAT API] Response generated, length:', text.length);

    // Send raw formatted markdown (same as App Router)
    return res.status(200).send(text);

  } catch (error) {
    console.error('❌ [CHAT API] Fatal error:', error);
    return res.status(500).send('Error: Failed to process your request. Please try again.');
  }
}