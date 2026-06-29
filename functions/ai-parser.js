// Netlify Function — Proxy para API Anthropic
// Suporta texto puro e imagens (para leitura de comprovantes)

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if(event.httpMethod === 'OPTIONS'){
    return { statusCode: 204, headers, body: '' };
  }

  if(event.httpMethod !== 'POST'){
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { prompt, sistemPrompt, maxTokens, image } = JSON.parse(event.body || '{}');

    if(!prompt){
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'prompt é obrigatório' }) };
    }

    // Montar conteúdo da mensagem — texto ou imagem + texto
    let messageContent;
    if(image && image.data && image.mediaType){
      // Modo visão — comprovante como imagem
      messageContent = [
        { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } },
        { type: 'text', text: prompt }
      ];
    } else {
      // Modo texto puro
      messageContent = prompt;
    }

    const body = {
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens || 1000,
      system: sistemPrompt || 'Você é um assistente financeiro brasileiro.',
      messages: [{ role: 'user', content: messageContent }]
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    if(!response.ok){
      const err = await response.text();
      return { statusCode: response.status, headers, body: JSON.stringify({ error: err }) };
    }

    const data = await response.json();
    return { statusCode: 200, headers, body: JSON.stringify(data) };

  } catch(err){
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
