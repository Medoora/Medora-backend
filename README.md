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
## Project Structure:
```bash
medora-backend/
├── api/                                           
│   ├── chat.ts              # working api route access firebase-admin db(main route)
│   ├── chat-simple.ts      # Simplified version for testing
│   ├── test-simple.ts      # Basic connectivity test
│
├── lib/                         
│   ├── config.ts               # Firebase Admin initialization
│   └── user-data.ts              # User data fetching utilities
│
├── .env.example                  # Environment variables template
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── vercel.json                   # Vercel deployment config
└── README.md                     # Project documentation
```




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
### 2.2 POST /api/chat
Basic connectivity test.
Request body:
```bash
{
  "userId": "use_id",
  "messages": [
    {
      "role": "user",
      "content": "Hello, tell me about my medical data"
    }
  ]
}
```

