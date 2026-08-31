import { getProducts } from './products.js';

export function generatePromoMock({ items, percent }) {
  const safePercent = Number(percent) || 15;
  const names = items.slice(0, 2).map((p) => p.name).join(' & ') || 'selected products';

  return {
    headline: `Save ${safePercent}% Today`,
    subheadline: `${safePercent}% off ${names}. Limited stock.`,
    cta: 'Shop Now',
    source: 'mock'
  };
}

export async function generatePromo({ product_ids, discount_percent } = {}) {
  const percent = Number(discount_percent) || 15;

  let items = getProducts();

  if (Array.isArray(product_ids) && product_ids.length) {
    items = items.filter((p) => product_ids.includes(p.id));
  } else {
    items = items.filter((p) => p.stock >= 50 && p.sales_last_7_days <= 5);
  }

  if (!items.length) items = getProducts();
  items = items.slice(0, 3);

  const payload = {
    products: items.map(({ id, name, category, price }) => ({ id, name, category, price })),
    discount_percent: percent
  };

  // Will point to the Render API later
  const RENDER_API_URL = '';

  if (!RENDER_API_URL) {
    const mock = generatePromoMock({ items, percent });
    document.dispatchEvent(new CustomEvent('webmcp:promo-changed', { detail: mock }));
    return mock;
  }

  try {
    const response = await fetch(RENDER_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    document.dispatchEvent(new CustomEvent('webmcp:promo-changed', { detail: data }));
    return data;
  } catch (error) {
    const fallback = { ...generatePromoMock({ items, percent }), source: 'fallback', error: error.message };
    document.dispatchEvent(new CustomEvent('webmcp:promo-changed', { detail: fallback }));
    return fallback;
  }
}
