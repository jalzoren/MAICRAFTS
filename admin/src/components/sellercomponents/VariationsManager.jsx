// VariationsManager.jsx
// Manages two independent variation types for handcrafted products:
//   1. Bundle Variations → Quantity + Size + Price (linked together)
//   2. Color Variations  → Color Name + Hex (independent)
//
// Props:
//   variations: { bundles: [...], colors: [...] }
//   onChange:   (newVariations) => void

import React from 'react';
import { FiPlus, FiTrash2, FiPackage } from 'react-icons/fi';
import { IoColorPaletteOutline } from 'react-icons/io5';
import '../../css/VariationsManager.css';

// ─── Utility ────────────────────────────────────────────────────────────────

const generateId = () =>
  `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

const normalizeVariations = (raw) => {
  // Handles both the new structure { bundles, colors }
  // and legacy flat-array structure [{ name, value }]
  if (!raw) return { bundles: [], colors: [] };
  if (Array.isArray(raw)) return { bundles: [], colors: [] }; // legacy → reset
  return {
    bundles: Array.isArray(raw.bundles) ? raw.bundles : [],
    colors:  Array.isArray(raw.colors)  ? raw.colors  : [],
  };
};

// ─── Sub-components ─────────────────────────────────────────────────────────

const BundleRow = ({ bundle, onUpdate, onRemove }) => (
  <div className="vm-bundle-row">
    <div className="vm-bundle-field">
      <label className="vm-field-label">Qty of flowers</label>
      <input
        type="number"
        className="vm-input vm-input-sm"
        placeholder="e.g. 10"
        value={bundle.quantity}
        min={1}
        onChange={(e) => onUpdate('quantity', e.target.value)}
      />
    </div>

    <div className="vm-bundle-field vm-bundle-field--size">
      <label className="vm-field-label">Size</label>
      <input
        type="text"
        className="vm-input"
        placeholder="e.g. Small, Medium, Large or 10cm, 20cm..."
        value={bundle.size}
        onChange={(e) => onUpdate('size', e.target.value)}
        list="vm-size-suggestions"
      />
      {/* Datalist gives suggestions but still allows free-text */}
      <datalist id="vm-size-suggestions">
        <option value="XS" />
        <option value="Small" />
        <option value="Medium" />
        <option value="Large" />
        <option value="XL" />
        <option value="Mini" />
        <option value="Standard" />
        <option value="Custom" />
      </datalist>
    </div>

    <div className="vm-bundle-field">
      <label className="vm-field-label">Price (₱)</label>
      <input
        type="number"
        className="vm-input vm-input-sm"
        placeholder="e.g. 250"
        value={bundle.price}
        min={0}
        step={0.01}
        onChange={(e) => onUpdate('price', e.target.value)}
      />
    </div>

    <button
      type="button"
      className="vm-remove-btn"
      title="Remove bundle"
      onClick={onRemove}
    >
      <FiTrash2 size={15} />
    </button>
  </div>
);

const ColorRow = ({ color, onUpdate, onRemove }) => {
  const pickerRef = React.useRef(null);

  return (
    <div className="vm-color-row">
      {/* Clicking the swatch opens the native color picker */}
      <div
        className="vm-color-swatch-wrap"
        onClick={() => pickerRef.current?.click()}
        title="Click to pick a color"
      >
        <input
          ref={pickerRef}
          type="color"
          className="vm-color-picker"
          value={color.hex || '#000000'}
          onChange={(e) => onUpdate('hex', e.target.value)}
        />
        <span
          className="vm-color-preview"
          style={{ backgroundColor: color.hex || '#000000' }}
        />
      </div>

      <input
        type="text"
        className="vm-input vm-color-name-input"
        placeholder="Color name (e.g. Rose Pink, Ivory White)"
        value={color.name}
        onChange={(e) => onUpdate('name', e.target.value)}
      />

      <button
        type="button"
        className="vm-remove-btn"
        title="Remove color"
        onClick={onRemove}
      >
        <FiTrash2 size={15} />
      </button>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const VariationsManager = ({ variations, onChange }) => {
  const { bundles, colors } = normalizeVariations(variations);

  // ── Bundle handlers ──────────────────────────────────────────────────────

  const addBundle = () => {
    const newBundle = { id: generateId(), quantity: '', size: '', price: '' };
    onChange({ bundles: [...bundles, newBundle], colors });
  };

  const updateBundle = (id, field, value) => {
    const updated = bundles.map((b) =>
      b.id === id ? { ...b, [field]: value } : b
    );
    onChange({ bundles: updated, colors });
  };

  const removeBundle = (id) => {
    onChange({ bundles: bundles.filter((b) => b.id !== id), colors });
  };

  // ── Color handlers ───────────────────────────────────────────────────────

  const addColor = () => {
    const newColor = { id: generateId(), name: '', hex: '#E6BB71' };
    onChange({ bundles, colors: [...colors, newColor] });
  };

  const updateColor = (id, field, value) => {
    const updated = colors.map((c) =>
      c.id === id ? { ...c, [field]: value } : c
    );
    onChange({ bundles, colors: updated });
  };

  const removeColor = (id) => {
    onChange({ bundles, colors: colors.filter((c) => c.id !== id) });
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="vm-container">

      {/* ── Bundle Variations ──────────────────────────────────────────── */}
      <div className="vm-section">
        <div className="vm-section-header">
          <div className="vm-section-title">
            <FiPackage size={16} className="vm-section-icon" />
            <span>Bundle Variations</span>
            <span className="vm-section-subtitle">Quantity · Size · Price</span>
          </div>
          <button
            type="button"
            className="vm-add-btn"
            onClick={addBundle}
          >
            <FiPlus size={14} />
            Add Bundle
          </button>
        </div>

        {bundles.length === 0 ? (
          <div className="vm-empty">
            <p>No bundle variations yet. Add one if this product comes in different quantities or sizes.</p>
          </div>
        ) : (
          <div className="vm-bundle-list">
            <div className="vm-bundle-header">
              <span>Quantity</span>
              <span>Size</span>
              <span>Price (₱)</span>
              <span />
            </div>
            {bundles.map((bundle) => (
              <BundleRow
                key={bundle.id}
                bundle={bundle}
                onUpdate={(field, value) => updateBundle(bundle.id, field, value)}
                onRemove={() => removeBundle(bundle.id)}
              />
            ))}
          </div>
        )}

        {bundles.length > 0 && (
          <p className="vm-hint">
            💡 Each row is one purchasable bundle. Example: 10 flowers · Large · ₱350
          </p>
        )}
      </div>

      {/* ── Color Variations ───────────────────────────────────────────── */}
      <div className="vm-section">
        <div className="vm-section-header">
          <div className="vm-section-title">
            <IoColorPaletteOutline size={17} className="vm-section-icon" />
            <span>Color Variations</span>
            <span className="vm-section-subtitle">Independent of bundle</span>
          </div>
          <button
            type="button"
            className="vm-add-btn"
            onClick={addColor}
          >
            <FiPlus size={14} />
            Add Color
          </button>
        </div>

        {colors.length === 0 ? (
          <div className="vm-empty">
            <p>No color variations yet. Add colors if this product is available in multiple colors.</p>
          </div>
        ) : (
          <div className="vm-color-list">
            {colors.map((color) => (
              <ColorRow
                key={color.id}
                color={color}
                onUpdate={(field, value) => updateColor(color.id, field, value)}
                onRemove={() => removeColor(color.id)}
              />
            ))}
          </div>
        )}

        {colors.length > 0 && (
          <p className="vm-hint">
            💡 Colors are independent — customers can choose a color alongside any bundle.
          </p>
        )}
      </div>
    </div>
  );
};

export default VariationsManager;