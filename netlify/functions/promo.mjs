export const config = {
  path: '/api/promo'
};

export default async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Use POST' }, 405);
  }

  let body = {};
  try { body = await request.json(); } catch {}

  const products = Array.isArray(body.products) ? body.products.slice(0, 3) : [];
  const percent = Number(body.discount_percent) || 15;

  const apiKey = process.env.FIREWORKS_API_KEY || '';
  const model = process.env.FIREWORKS_MODEL || '';

  if (!apiKey || !model) {
    return json(mockPromo(products, percent));
  }

  try {
    const ai = await callFireworks(apiKey, model, products, percent);
    return json({ ...ai, source: 'ai' });
  } catch (error) {
    return json({ ...mockPromo(products, percent), source: 'fallback', error: error.message });
  }
};

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
        { role: 'system', content: 'You are a promo copywriter. Reply with exactly 3 lines: headline:, subheadline:, cta:' },
        { role: 'user', content: `Products: ${JSON.stringify(products)}. Discount: ${percent}%. English. Max 25 words.` }
      ],
      max_tokens: 70,
      temperature: 0.3,
      stream: false
    })
  });

  if (!response.ok) throw new Error(`Fireworks HTTP ${response.status}`);

  const data = await response.json();
  const parsed = parsePromo(data.choices?.[0]?.message?.content ?? '');

  if (!parsed) throw new Error('AI output could not be parsed');
  return parsed;
}

function parsePromo(text) {
  const lines = String(text || '').split('\n').map((l) => l.trim()).filter(Boolean);

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
  const names = products.slice(0, 2).map((p) => p.name).join(' & ') || 'selected products';
  return {
    headline: `Save ${percent}% Today`,
    subheadline: `${percent}% off ${names}. Limited stock.`,
    cta: 'Shop Now',
    source: 'mock'
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
