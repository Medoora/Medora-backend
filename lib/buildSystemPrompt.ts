// lib/buildSystemPrompt.ts
type UserData = Record<string, any>;

function sanitizeUser(userData: UserData) {
  // Only pick what the AI actually needs
  return {
    name: userData.name || userData.displayName || 'User',
    age: userData.age || null,
    gender: userData.gender || null,
    bloodGroup: userData.bloodGroup || null,
    conditions: userData.conditions || [],      // e.g. ["diabetes", "hypertension"]
    medications: userData.medications || [],    // e.g. ["metformin"]
    allergies: userData.allergies || [],
    lastVisit: userData.lastVisit || null,
  };
}

export function buildSystemPrompt(userData: UserData | null): string {
  const base = `You are MedoraAI, a compassionate and accurate medical assistant. 
Always recommend consulting a doctor for serious concerns.`;

  if (!userData) return base;

  const u = sanitizeUser(userData);

  return `${base}

Patient Profile:
- Name: ${u.name}
- Age: ${u.age ?? 'Not provided'}
- Gender: ${u.gender ?? 'Not provided'}
- Blood Group: ${u.bloodGroup ?? 'Not provided'}
- Known Conditions: ${u.conditions.length ? u.conditions.join(', ') : 'None on record'}
- Current Medications: ${u.medications.length ? u.medications.join(', ') : 'None on record'}
- Allergies: ${u.allergies.length ? u.allergies.join(', ') : 'None on record'}

Personalize your responses based on this profile. If the user asks something 
unrelated to their profile, answer generally but keep their conditions in mind.`;
}