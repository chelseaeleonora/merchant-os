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
        { role: 'system', content: 'You are a promo copywriter. Reply with exactly 3 lines, no markdown. HEADLINE: max 6 words. SUBHEADLINE: max 12 words. CTA: max 3 words.' },
        { role: 'user', content: `Products: ${JSON.stringify(products)}. Discount: ${percent}%. English. Max 25 words.` }
      ],
      max_tokens: 200,
      temperature: 0.3,
      stream: false
    })
  });

  if (!response.ok) throw new Error(`Fireworks HTTP ${response.status}`);

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content ?? '';
  const parsed = parsePromo(text);

  if (!parsed) throw new Error(`Unparsed AI output: ${JSON.stringify(text).slice(0, 300)}`);

  if (!parsed.headline) parsed.headline = `Save ${percent}% Today`;
  if (!parsed.subheadline) parsed.subheadline = `${percent}% off selected products. Limited stock.`;
  if (!parsed.cta) parsed.cta = 'Shop Now';

  return parsed;
}

function parsePromo(text) {
  const lines = String(text || '')
    .split('\n')
    .map((l) => l.replace(/[*#_`>-]/g, '').trim())
    .filter(Boolean);

  const getValue = (prefix) => {
    const line = lines.find((item) => item.toLowerCase().startsWith(prefix));
    if (!line) return '';
    return line.slice(prefix.length).replace(/^[:\-]\s*/, '').trim();
  };

  let headline = getValue('headline');
  let subheadline = getValue('subheadline');
  let cta = getValue('cta');

  if (!headline && lines[0]) headline = lines[0];
  if (!subheadline && lines[1]) subheadline = lines[1];
  if (!cta && lines[2]) cta = lines[2];

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
