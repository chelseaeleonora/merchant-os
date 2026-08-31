import { getProducts, resetProducts } from './products.js';
import { registerToolsOnce, TOOLS } from './webmcp.js';

const $ = (selector) => document.querySelector(selector);

const productBody = $('#product-body');
const promoOutput = $('#promo-output');
const testResult = $('#test-result');
const webmcpStatus = $('#webmcp-status');

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2
});

renderProducts();
bindButtons();
initWebMCP();

document.addEventListener('webmcp:products-changed', () => renderProducts());
document.addEventListener('webmcp:promo-changed', (event) => renderPromo(event.detail));

function renderProducts(list = getProducts()) {
  productBody.textContent = '';

  for (const p of list) {
    const row = document.createElement('tr');
    row.append(
      cell(p.name),
      cell(p.category),
      cell(currency.format(p.price / 1500)),
      cell(String(p.stock)),
      cell(String(p.sales_last_7_days))
    );
    productBody.appendChild(row);
  }
}

function cell(text) {
  const td = document.createElement('td');
  td.textContent = text;
  return td;
}

function renderPromo(promo) {
  if (!promo) {
    promoOutput.textContent = 'No promo yet.';
    return;
  }

  promoOutput.textContent = [
    promo.headline || '-',
    promo.subheadline || '-',
    promo.cta || '-',
    `Source: ${promo.source || '-'}`
  ].join('\n');
}

async function initWebMCP() {
  try {
    const result = await registerToolsOnce();

    if (!result.supported) {
      webmcpStatus.textContent = 'WebMCP not available';
      return;
    }

    if (result.registered.length) {
      webmcpStatus.textContent = `WebMCP ready: ${result.registered.length} tools`;
      return;
    }

    webmcpStatus.textContent = `WebMCP error: ${result.error || 'unknown'}`;
  } catch (error) {
    webmcpStatus.textContent = `WebMCP error: ${error.message}`;
  }
}

function bindButtons() {
  $('#btn-low-stock').addEventListener('click', async () => {
    const result = await runTool('search_inventory', { min_stock: 50 });
    if (result && Array.isArray(result.results)) renderProducts(result.results);
  });

  $('#btn-discount').addEventListener('click', async () => {
    await runTool('apply_bulk_discount', { percent: 15 });
  });

  $('#btn-promo').addEventListener('click', async () => {
    await runTool('generate_promo_copy', { discount_percent: 15 });
  });

  $('#btn-reset').addEventListener('click', () => {
    resetProducts();
    renderPromo(null);
    showTest({ ok: true, message: 'Product data reset.' });
  });

  $('#btn-test-search').addEventListener('click', async () => {
    await runTool('search_inventory', { query: '', min_stock: 50 });
  });

  $('#btn-test-discount').addEventListener('click', async () => {
    await runTool('apply_bulk_discount', { percent: 15 });
  });

  $('#btn-test-promo').addEventListener('click', async () => {
    await runTool('generate_promo_copy', { discount_percent: 15 });
  });
}

async function runTool(name, input) {
  const tool = TOOLS.find((t) => t.name === name);

  if (!tool) {
    const error = { ok: false, error: `Tool ${name} not found.` };
    showTest(error);
    return error;
  }

  try {
    const result = await tool.execute(input);
    showTest({ ok: true, tool: name, input, result });
    return result;
  } catch (error) {
    const payload = { ok: false, tool: name, input, error: error.message };
    showTest(payload);
    return payload;
  }
}

function showTest(value) {
  testResult.textContent = JSON.stringify(value, null, 2);
}
