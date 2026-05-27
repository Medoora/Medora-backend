// lib/user-data.ts
import { db, getDB } from './config';

export interface UserMedicalData {
  personalInfo: any;
  medicalInfo: any;
  insuranceInfo: any;
  identification: any;
  documents: any[];
  hasCompletedOnboarding: boolean;
  onboardingCompletedAt: string | null;
}

export async function fetchUserMedicalData(userId: string): Promise<UserMedicalData> {
  try {
    // Get user document from Firestore
    const db = getDB()
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.log(`User ${userId} not found, returning empty data`);
      return {
        personalInfo: null,
        medicalInfo: null,
        insuranceInfo: null,
        identification: null,
        documents: [],
        hasCompletedOnboarding: false,
        onboardingCompletedAt: null
      };
    }

    const userData = userDoc.data() || {};
    
    // Get patient data (adjust this based on your Firestore structure)
    // Based on your chat service, patient data might be stored directly in user document
    const patientData = userData.patientData || userData || {};
    
    return {
      personalInfo: patientData.personalInfo || null,
      medicalInfo: patientData.medicalInfo || null,
      insuranceInfo: patientData.insuranceInfo || null,
      identification: patientData.identification || null,
      documents: patientData.documents || [],
      hasCompletedOnboarding: patientData.hasCompletedOnboarding || false,
      onboardingCompletedAt: patientData.onboardingCompletedAt || null
    };
  } catch (error) {
    console.error('Error fetching user medical data:', error);
    return {
      personalInfo: null,
      medicalInfo: null,
      insuranceInfo: null,
      identification: null,
      documents: [],
      hasCompletedOnboarding: false,
      onboardingCompletedAt: null
    };
  }
}

export async function fetchUserAccountData(userId: string): Promise<{
  email: string;
  username: string;
}> {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return { email: 'Not available', username: 'Not available' };
    }
    
    const userData = userDoc.data() || {};
    return {
      email: userData.email || 'Not available',
      username: userData.username || 'Not available'
    };
  } catch (error) {
    console.error('Error fetching user account data:', error);
    return { email: 'Not available', username: 'Not available' };
  }
}