// api/chat.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages = [], provider = 'groq' } = req.body;
    const selectedProvider = String(provider || 'groq').toLowerCase();

    const providers = {
      groq: {
        apiKey: process.env.GROQ_API_KEY,
        url: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'llama-3.3-70b-versatile',
        name: 'GROQ'
      },
      cloude: {
        apiKey: process.env.CLOUDE_API_KEY,
        url: 'https://api.cloude.ai/v1/chat/completions',
        model: 'cloude-2.1',
        name: 'Cloude'
      },
      gemini: {
        apiKey: process.env.GEMINI_API_KEY,
        url: 'https://gemini.googleapis.com/v1/chat/completions',
        model: 'gemini-pro',
        name: 'Gemini'
      }
    };

    const config = providers[selectedProvider] || providers.groq;

    if (config.apiKey) {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature: 0.3,
          max_tokens: 2048
        })
      });

      const data = await response.json();
      res.status(response.status).json(data);
      return;
    }

    const relevantContext = `Não é possível usar ${config.name} sem a chave de API configurada. Configure ${config.name.toUpperCase()}_API_KEY no servidor.`;

    res.status(200).json({
      id: 'mock-chat-1',
      object: 'chat.completion',
      model: 'mock-local-rag',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: relevantContext
          }
        }
      ]
    });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
}