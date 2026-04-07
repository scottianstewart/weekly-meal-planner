export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured in environment variables.' });
  }

  try {
    const { model, max_tokens, messages, system } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Missing or invalid "messages" in request body.' });
    }

    const body = {
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: Math.min(max_tokens || 4096, 16384),
      messages,
    };

    if (system) {
      body.system = system;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || `Anthropic API error: ${response.status}`,
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('Claude API proxy error:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
}
