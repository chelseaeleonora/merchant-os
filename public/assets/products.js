const STORAGE_KEY = 'merchantos:products:v1';

const INITIAL_PRODUCTS = [
  { id: 'p1', name: 'Wireless Mouse', category: 'Accessories', price: 120000, original_price: 120000, stock: 82, sales_last_7_days: 3 },
  { id: 'p2', name: 'USB-C Cable', category: 'Accessories', price: 35000, original_price: 35000, stock: 67, sales_last_7_days: 4 },
  { id: 'p3', name: 'Mechanical Keyboard', category: 'Accessories', price: 650000, original_price: 650000, stock: 28, sales_last_7_days: 11 },
  { id: 'p4', name: 'Laptop Stand', category: 'Equipment', price: 275000, original_price: 275000, stock: 54, sales_last_7_days: 2 },
  { id: 'p5', name: 'Webcam 1080p', category: 'Equipment', price: 420000, original_price: 420000, stock: 12, sales_last_7_days: 8 },
  { id: 'p6', name: 'Desk Lamp', category: 'Home', price: 150000, original_price: 150000, stock: 61, sales_last_7_days: 5 }
];

let products = loadProducts();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadProducts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return clone(INITIAL_PRODUCTS);
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) return parsed;
    return clone(INITIAL_PRODUCTS);
  } catch {
    return clone(INITIAL_PRODUCTS);
  }
}

function saveProducts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch {}
}

export function getProducts() {
  return clone(products);
}

export function resetProducts() {
  products = clone(INITIAL_PRODUCTS);
  saveProducts();
  document.dispatchEvent(new CustomEvent('webmcp:products-changed'));
  return { ok: true, product_count: products.length };
}

export function searchInventory({ query = '', min_stock = 0 } = {}) {
  const q = String(query || '').toLowerCase().trim();
  const minStock = Number(min_stock) || 0;

  const results = products
    .filter((p) => {
      const matchQuery = !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
      const matchStock = p.stock >= minStock;
      return matchQuery && matchStock;
    })
    .map((p) => clone(p));

  return { query: q, min_stock: minStock, resultCount: results.length, results };
}

export function applyBulkDiscount({ percent = 0, product_ids } = {}) {
  const discount = Math.max(0, Math.min(70, Number(percent) || 0));
  const ids = Array.isArray(product_ids) && product_ids.length ? new Set(product_ids) : null;

  let updated_count = 0;

  products = products.map((p) => {
    const selected = !ids || ids.has(p.id);
    const eligible = selected && p.stock >= 50;
    if (!eligible) return p;

    updated_count += 1;
    return {
      ...p,
      price: Math.round(p.original_price * (100 - discount) / 100),
      discount_percent: discount
    };
  });

  saveProducts();
  document.dispatchEvent(new CustomEvent('webmcp:products-changed'));

  return { ok: true, updated_count, discount_percent: discount };
}
