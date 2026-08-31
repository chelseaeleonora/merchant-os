import { searchInventory, applyBulkDiscount } from './products.js';
import { generatePromo } from './promo.js';

const searchInventoryTool = {
  name: 'search_inventory',
  description:
    'Search product inventory by keyword and minimum stock. Use this to find products that match a promo or clearance strategy.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Optional keyword, for example "mouse" or "accessories".'
      },
      min_stock: {
        type: 'number',
        description: 'Minimum stock filter, for example 50.'
      }
    }
  },
  execute: async (input) => searchInventory(input),
  annotations: { readOnlyHint: true }
};

const applyBulkDiscountTool = {
  name: 'apply_bulk_discount',
  description:
    'Apply a discount to eligible high-stock products. Updates the product table immediately.',
  inputSchema: {
    type: 'object',
    properties: {
      percent: {
        type: 'number',
        description: 'Discount percentage, for example 10, 15, or 20.'
      },
      product_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional product IDs. If omitted, applies to eligible high-stock products.'
      }
    },
    required: ['percent']
  },
  execute: async (input) => applyBulkDiscount(input)
};

const generatePromoCopyTool = {
  name: 'generate_promo_copy',
  description:
    'Generate short promotional copy for selected products. Returns headline, subheadline, and call-to-action.',
  inputSchema: {
    type: 'object',
    properties: {
      product_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional product IDs. Maximum 3 products are used.'
      },
      discount_percent: {
        type: 'number',
        description: 'Discount percentage, for example 15.'
      }
    },
    required: ['discount_percent']
  },
  execute: async (input) => generatePromo(input)
};

export const TOOLS = [searchInventoryTool, applyBulkDiscountTool, generatePromoCopyTool];

let registrationPromise = null;

export function registerToolsOnce() {
  if (!registrationPromise) registrationPromise = registerTools();
  return registrationPromise;
}

async function registerTools() {
  const modelContext = document.modelContext ?? navigator.modelContext;

  if (!modelContext || !('registerTool' in modelContext)) {
    return { supported: false, registered: [], error: null };
  }

  const controller = new AbortController();

  try {
    for (const tool of TOOLS) {
      await modelContext.registerTool(tool, { signal: controller.signal });
    }

    window.__MERCHANT_OS_TOOLS__ = TOOLS;

    return { supported: true, registered: TOOLS.map((t) => t.name), error: null };
  } catch (error) {
    return { supported: true, registered: [], error: error.message };
  }
}
