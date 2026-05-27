// api/chat-working.ts
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  try {
    const { messages, userId } = req.body;
    
    console.log('Request received:', { userId, messageCount: messages?.length });
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages || [{ role: 'user', content: 'Say hello' }],
        temperature: 0.7,
      }),
    });
    
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || 'No response';
    
    return res.status(200).json({ text });
    
  } catch (error: any) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}