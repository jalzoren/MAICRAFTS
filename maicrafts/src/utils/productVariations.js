// src/utils/productVariations.js
// Handles the new VariationsManager structure: { bundles: [...], colors: [...] }
// Maintains backward compatibility with legacy flat-array format

// ─── Parsers ──────────────────────────────────────────────────────────────────

/**
 * Parses raw variations (string or object) into { bundles, colors }.
 * Legacy flat arrays are gracefully ignored (returns empty).
 */
export const parseVariations = (raw) => {
  if (!raw) return { bundles: [], colors: [] };

  let parsed = raw;
  if (typeof raw === 'string') {
    try { parsed = JSON.parse(raw); } catch { return { bundles: [], colors: [] }; }
  }

  // Legacy flat array (old format like [{ quantity, color, size }]) → skip
  if (Array.isArray(parsed)) return { bundles: [], colors: [] };

  return {
    bundles: Array.isArray(parsed.bundles) ? parsed.bundles : [],
    colors:  Array.isArray(parsed.colors)  ? parsed.colors  : [],
  };
};

/**
 * Parses raw add-ons into a normalized [{ id, name, price }] array.
 */
export const parseAddOns = (raw) => {
  if (!raw) return [];
  let parsed = raw;
  if (typeof raw === 'string') {
    try { parsed = JSON.parse(raw); } catch { return []; }
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.map(a => ({
    id: String(a.id),
    name: a.name || '',
    price: parseFloat(a.price) || 0,
  }));
};

// ─── Price Calculations ───────────────────────────────────────────────────────

/**
 * Calculates the unit price:
 *   - If a bundle is selected → use the bundle's own price
 *   - Otherwise              → use the product's base price
 *   - Always adds any selected add-on prices on top
 *
 * @param {number}   basePrice         - Product's base price from DB
 * @param {object}   selectedVariations - { bundle: bundleObj|null, color: colorObj|null }
 * @param {string[]} selectedAddOns    - Array of selected add-on IDs
 * @param {object[]} parsedAddOns      - Result of parseAddOns()
 */
export const calculateUnitPrice = (basePrice, selectedVariations, selectedAddOns, parsedAddOns) => {
  // Start with the bundle price if one is selected, otherwise fall back to base price
  let price = parseFloat(basePrice) || 0;

  if (selectedVariations?.bundle?.price) {
    const bundlePrice = parseFloat(selectedVariations.bundle.price);
    if (!isNaN(bundlePrice)) price = bundlePrice;
  }

  // Add selected add-on costs
  if (selectedAddOns?.length && parsedAddOns?.length) {
    selectedAddOns.forEach(id => {
      const addon = parsedAddOns.find(a => a.id === id);
      if (addon) price += addon.price;
    });
  }

  return price;
};

export const calculateTotalPrice = (unitPrice, quantity) => unitPrice * quantity;

// ─── Guard Checks ─────────────────────────────────────────────────────────────

/** Returns true if the product has at least one bundle OR one color variation */
export const hasVariations = (product) => {
  const { bundles, colors } = parseVariations(product?.variations);
  return bundles.length > 0 || colors.length > 0;
};

/** Returns true if the product has at least one add-on */
export const hasAddOns = (product) => parseAddOns(product?.addOns).length > 0;

// ─── Display Helpers ──────────────────────────────────────────────────────────

/**
 * Formats a bundle into a readable option label.
 * Example: "25 flowers · Small — ₱220"
 */
export const formatBundleLabel = (bundle) => {
  const parts = [];
  if (bundle.quantity) parts.push(`${bundle.quantity} flowers`);
  if (bundle.size)     parts.push(bundle.size);
  const label = parts.join(' · ');
  return bundle.price ? `${label} — ₱${bundle.price}` : label;
};