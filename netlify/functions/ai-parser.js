// Netlify Function: ai-parser.js
// Proxy seguro para a API do Anthropic — evita CORS no browser

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'ANTHROPIC_API_KEY não configurada no Netlify' })
    };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Body inválido' }) }; }

  const { prompt, sistemPrompt, maxTokens = 1000 } = body;
  if (!prompt) {
    return { statusCode: 400, body: JSON.stringify({ error: 'prompt obrigatório' }) };
  }

  const messages = [{ role: 'user', content: prompt }];
  const requestBody = {
    model:      'claude-sonnet-4-6',
    max_tokens: Math.min(maxTokens, 4000),
    messages,
  };

  // System prompt opcional
  if (sistemPrompt) requestBody.system = sistemPrompt;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody)
    });

    if (!resp.ok) {
      const err = await resp.text();
      return {
        statusCode: resp.status,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: `API Anthropic: ${err.slice(0, 300)}` })
      };
    }

    const data = await resp.json();
    return {
      statusCode: 200,
      headers: {
        'Content-Type':                'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(data)
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
