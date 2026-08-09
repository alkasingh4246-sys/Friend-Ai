const OpenAI = require('openai');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages)) return res.status(400).json({ error: 'messages must be an array' });
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY is not configured' });

    const safe = messages.filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string').slice(-30);
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5-mini',
      instructions: 'You are Friend-Ai, a warm, casual, helpful AI friend. Speak naturally, be respectful, and match the user’s tone without pretending to be a human. Never claim to have real-world experiences you do not have.',
      input: safe.map(m => ({ role: m.role, content: m.content }))
    });
    return res.status(200).json({ reply: response.output_text || 'I’m here — what’s up?' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error?.message || 'OpenAI request failed' });
  }
};
