// app/api/chat/route.ts
import { streamText } from 'ai';
import { NextRequest } from 'next/server';
import { adminDb } from '../lib/firebase/firebase-admin'
import { createSystemPrompt, formatUserDataForPrompt } from "../lib/prompt/prompt"
import { getOpenAIModel, openAIConfig } from '../lib/ai/openai-config';
import { availableModels } from '../lib/ai/model-config';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    // Extract model from request body
    const { messages, userId, model } = await req.json();

    console.log('📨 [CHAT API] Request received:', { userId, model, messageCount: messages?.length });

    // Validate required fields
    if (!userId) {
      console.error('❌ Missing userId');
      return new Response(
        JSON.stringify({ error: 'Missing userId' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      console.error('❌ Invalid messages format');
      return new Response(
        JSON.stringify({ error: 'Invalid messages format' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate model
    const selectedModel = model || openAIConfig.defaultModel;
    const modelExists = availableModels.some(m => m.id === selectedModel);
    
    if (!modelExists) {
      console.warn(`⚠️ Requested model ${selectedModel} not found, using default`);
    }

    // Check Firebase Admin
    if (!adminDb) {
      console.error('❌ Firebase Admin not initialized');
      return new Response(
        JSON.stringify({ error: 'Service configuration error' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ========== FETCH USER DATA FROM FIRESTORE ==========
    console.log('📊 [CHAT API] Fetching patient data for user:', userId);
    
    let patientData = null;
    let userData = null;
    
    try {
      // Get patient profile from Firestore
      const patientDoc = await adminDb.collection('patients').doc(userId).get();
      
      if (patientDoc.exists) {
        patientData = patientDoc.data();
        console.log('✅ [CHAT API] Patient data found:', {
          hasMedicalConditions: !!patientData?.medicalConditions,
          hasMedications: !!patientData?.medications,
          hasAllergies: !!patientData?.allergies,
        });
      } else {
        console.log('⚠️ [CHAT API] No patient profile found for user:', userId);
        
        // Try to get from users collection as fallback
        const userDoc = await adminDb.collection('users').doc(userId).get();
        if (userDoc.exists) {
          const userDocData = userDoc.data();
          // Check if medical info is nested
          if (userDocData?.medicalInfo) {
            patientData = userDocData.medicalInfo;
            console.log('✅ [CHAT API] Patient data found in users/medicalInfo');
          } else if (userDocData?.medicalProfile) {
            patientData = userDocData.medicalProfile;
            console.log('✅ [CHAT API] Patient data found in users/medicalProfile');
          } else {
            // Create default empty patient data
            patientData = {
              medicalConditions: [],
              medications: [],
              allergies: [],
              bloodGroup: '',
              age: null,
              gender: '',
            };
            console.log('📝 [CHAT API] Using default empty patient data');
          }
        } else {
          // Create default empty patient data
          patientData = {
            medicalConditions: [],
            medications: [],
            allergies: [],
            bloodGroup: '',
            age: null,
            gender: '',
          };
          console.log('📝 [CHAT API] No user document found, using defaults');
        }
      }
      
      // Get user data for additional context
      const userDoc = await adminDb.collection('users').doc(userId).get();
      if (userDoc.exists) {
        userData = userDoc.data();
        console.log('✅ [CHAT API] User data found:', {
          hasDisplayName: !!userData?.displayName,
          hasEmail: !!userData?.email,
        });
      } else {
        userData = {
          displayName: 'User',
          email: null,
        };
      }
      
    } catch (firebaseError) {
      console.error('❌ [CHAT API] Firebase fetch error:', firebaseError);
      
      // Return error response instead of crashing
      return new Response(
        JSON.stringify({ 
          error: 'Unable to fetch medical data. Please try again.',
          details: firebaseError instanceof Error ? firebaseError.message : 'Unknown error'
        }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // If no patient data found at all, return a clear error
    if (!patientData) {
      console.error('❌ [CHAT API] No patient data available');
      return new Response(
        JSON.stringify({ 
          error: 'Medical profile not found. Please complete your onboarding first.',
          redirectTo: '/onboarding'
        }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. FORMAT DATA FOR THE PROMPT
    const formattedData = formatUserDataForPrompt(patientData, userData);
    console.log('✅ [CHAT API] Data formatted for prompt');

    // 3. CREATE THE SYSTEM PROMPT
    const systemPrompt = createSystemPrompt(formattedData);
    console.log('✅ [CHAT API] System prompt created, length:', systemPrompt.length);

    // 4. PREPARE MESSAGES FOR AI SDK
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

    // 5. CALL THE AI SDK TO STREAM THE RESPONSE
    try {
      const result = streamText({
        model: getOpenAIModel(selectedModel),
        messages: apiMessages,
        temperature: openAIConfig.temperature,
        onError: ({ error }) => {
          console.error('❌ [CHAT API] OpenAI Stream Error:', error);
        },
      });

      console.log('✅ [CHAT API] Stream started successfully');
      return result.toTextStreamResponse();

    } catch (aiError: any) {
      console.error('❌ [CHAT API] OpenAI API Error:', aiError);
      
      // Handle specific OpenAI errors
      if (aiError.message?.includes('API key')) {
        return new Response(
          JSON.stringify({ error: 'AI service authentication failed' }), 
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiError.message?.includes('rate limit') || aiError.statusCode === 429) {
        return new Response(
          JSON.stringify({ error: 'Too many requests. Please try again in a moment.' }), 
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }

      throw aiError;
    }

  } catch (error) {
    console.error('❌ [CHAT API] Fatal error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process your request. Please try again.',
        message: error instanceof Error ? error.message : 'Unknown error'
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}