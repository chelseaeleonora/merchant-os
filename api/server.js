import http from 'node:http';

const PORT = process.env.PORT || 8080;

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    return json(res, { ok: true, service: 'merchant-os-api' });
  }

  if (req.method === 'POST' && req.url === '/promo') {
    let body = '';
    for await (const chunk of req) body += chunk;

    let payload = {};
    try { payload = JSON.parse(body); } catch {}

    const products = Array.isArray(payload.products) ? payload.products.slice(0, 3) : [];
    const percent = Number(payload.discount_percent) || 15;

    const apiKey = process.env.FIREWORKS_API_KEY || '';
    const model = process.env.FIREWORKS_MODEL || '';

    // Safe and cheap: no key or no model -> deterministic mock
    if (!apiKey || !model) {
      return json(res, mockPromo(products, percent));
    }

    try {
      const ai = await callFireworks(apiKey, model, products, percent);
      return json(res, { ...ai, source: 'ai' });
    } catch (error) {
      return json(res, { ...mockPromo(products, percent), source: 'fallback', error: error.message });
    }
  }

  return json(res, { error: 'Not found' }, 404);
});

server.listen(PORT, () => {
  console.log(`merchant-os-api listening on ${PORT}`);
});

async function callFireworks(apiKey, model, products, percent) {
  const response = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a promo copywriter. Reply with exactly 3 lines: headline:, subheadline:, cta:'
        },
        {
          role: 'user',
          content: `Products: ${JSON.stringify(products)}. Discount: ${percent}%. English. Max 25 words.`
        }
      ],
      max_tokens: 70,
      temperature: 0.3,
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`Fireworks HTTP ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content ?? '';
  const parsed = parsePromo(text);

  if (!parsed) {
    throw new Error('AI output could not be parsed');
  }

  return parsed;
}

function parsePromo(text) {
  const lines = String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const getValue = (prefix) => {
    const line = lines.find((item) => item.toLowerCase().startsWith(prefix));
    if (!line) return '';
    return line.slice(prefix.length).replace(/^:\s*/, '').trim();
  };

  const headline = getValue('headline');
  const subheadline = getValue('subheadline');
  const cta = getValue('cta');

  if (!headline && !subheadline && !cta) return null;

  return { headline, subheadline, cta };
}

function mockPromo(products, percent) {
  const safePercent = Number(percent) || 15;
  const names = products.slice(0, 2).map((p) => p.name).join(' & ') || 'selected products';

  return {
    headline: `Save ${safePercent}% Today`,
    subheadline: `${safePercent}% off ${names}. Limited stock.`,
    cta: 'Shop Now',
    source: 'mock'
  };
}

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}
