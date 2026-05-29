# Medora Backend - Serverless API

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-success?style=flat&logo=vercel)](https://medora-backend.vercel.app)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green?style=flat&logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Admin-orange?style=flat&logo=firebase)](https://firebase.google.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-API-412991?style=flat&logo=openai)](https://openai.com/)

## 📋 Overview

Medora Backend is a serverless API built for the Medora medical assistant app. It provides intelligent chat responses personalized with user medical data from Firebase Firestore, powered by OpenAI's GPT models.

### Key Features

- 🚀 **Serverless Architecture** - Deployed on Vercel for automatic scaling
- 🔐 **Secure Authentication** - Firebase integration for user data
- 💬 **AI-Powered Chat** - OpenAI GPT models with medical context
- 📊 **Personalized Responses** - Uses patient medical records from Firestore
- 🔄 **CORS Enabled** - Ready for cross-origin requests from Expo apps
- ⚡ **Fast Responses** - Optimized with gpt-4o-mini for quick replies

# 📡 API Endpoints
## 1. Main Endpoints

### 1.1 POST /api/chat-working
Request Body:
```bash
{
  "userId": "firebase-user-id",
  "messages": [
    { "role": "user", "content": "What is my blood type?" }
  ],
  "model": "gpt-4o-mini"  // optional, defaults to gpt-4o-mini
}
```
Response:
```bash
{
  "text": "Based on your medical records, your blood type is O+."
}
```

## 2.Test Endpoints
### 2.2 GET /api/test-simple
Basic connectivity test.
Response:
```bash
{
  "status": "ok",
  "message": "Simple test endpoint works!",
  "timestamp": "2026-05-29T10:00:00.000Z",
  "environment": {
    "hasFirebaseProject": true,
    "hasFirebaseEmail": true,
    "hasFirebaseKey": true,
    "hasOpenAIKey": true,
    "nodeVersion": "v20.10.0"
  }
}
```

