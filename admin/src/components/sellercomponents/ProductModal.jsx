// ProductModal.jsx (SELLER SIDE) - FULLY FIXED
import React, { useState, useEffect } from 'react';
import '../../css/ProductModal.css';
import VariationsManager from './VariationsManager';

const ProductModal = ({ isOpen, onClose, onSubmit, product = null, isEditing = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    newCategory: '',
    addOns: [],
    price: '',
    stock: '',
    images: [],
    mainImage: null
  });

  // Variations state
  const [variations, setVariations] = useState({ bundles: [], colors: [] });
  const [newAddOn, setNewAddOn] = useState({ name: '', price: '' });
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState(['Satin Flowers', 'Dried Flowers', 'Fresh Flowers', 'Bouquets']);
  
  const hasBundleVariations = variations?.bundles?.length > 0;

  useEffect(() => {
    if (product && isEditing) {
      console.log('📦 Editing product:', product);
      console.log('🔹 add_ons from DB:', product.add_ons);
      console.log('🔹 addOns (camelCase):', product.addOns);
      let loadedAddOns = [];
      if (product.add_ons && Array.isArray(product.add_ons)) {
        loadedAddOns = product.add_ons;
      } else if (product.addOns && Array.isArray(product.addOns)) {
        loadedAddOns = product.addOns;
      }

      setFormData({
        name: product.name || '',
        description: product.description || '',
        category: product.category || '',
        newCategory: '',
        addOns: loadedAddOns,
        price: product.price || '',
        stock: product.stock || '',
        images: product.images || [],
        mainImage: product.mainImage || null
      });

      // Parse saved variations
      let parsedVariations = { bundles: [], colors: [] };
      try {
        const raw = typeof product.variations === 'string'
          ? JSON.parse(product.variations)
          : product.variations;

        if (raw && !Array.isArray(raw)) {
          parsedVariations = {
            bundles: Array.isArray(raw.bundles) ? raw.bundles : [],
            colors: Array.isArray(raw.colors) ? raw.colors : [],
          };
        }
      } catch (e) {
        console.warn('Could not parse variations, resetting:', e);
      }
      setVariations(parsedVariations);
    } else {
      resetForm();
    }
  }, [product, isEditing, isOpen]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      newCategory: '',
      addOns: [],
      price: '',
      stock: '',
      images: [],
      mainImage: null
    });
    setVariations({ bundles: [], colors: [] });
    setNewAddOn({ name: '', price: '' });
  };

  const handleAddAddOn = () => {
    if (newAddOn.name && newAddOn.price) {
      setFormData({
        ...formData,
        addOns: [...formData.addOns, { ...newAddOn, id: Date.now() }]
      });
      setNewAddOn({ name: '', price: '' });
    }
  };

  const removeAddOn = (id) => {
    setFormData({
      ...formData,
      addOns: formData.addOns.filter(addon => addon.id !== id)
    });
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const validFiles = files.filter(file => {
      if (!validTypes.includes(file.type)) {
        alert(`${file.name} is not a valid image file`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} should be less than 5MB`);
        return false;
      }
      return true;
    });

    const newImages = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      isMain: formData.images.length === 0
    }));

    setFormData({ ...formData, images: [...formData.images, ...newImages] });
  };

  const setMainImage = (index) => {
    const newImages = formData.images.map((img, i) => ({ ...img, isMain: i === index }));
    setFormData({ ...formData, images: newImages });
  };

  const removeImage = (index) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    if (formData.images[index].isMain && newImages.length > 0) {
      newImages[0].isMain = true;
    }
    setFormData({ ...formData, images: newImages });
  };

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    if (value === 'add-new') {
      const newCategory = prompt('Enter new category name:');
      if (newCategory && newCategory.trim()) {
        setCategories([...categories, newCategory.trim()]);
        setFormData({ ...formData, category: newCategory.trim() });
      }
    } else {
      setFormData({ ...formData, category: value });
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) { alert('Please enter product name'); return; }
    if (!formData.category) { alert('Please select a category'); return; }

    // Validate bundles if they exist
    const bundleErrors = [];
    if (hasBundleVariations) {
      variations.bundles.forEach((bundle, index) => {
        if (!bundle.quantity || Number(bundle.quantity) <= 0) {
          bundleErrors.push(`Bundle #${index + 1}: quantity must be greater than 0.`);
        }
        if (!bundle.size?.trim()) {
          bundleErrors.push(`Bundle #${index + 1}: size is required.`);
        }
        if (bundle.price === '' || bundle.price === null || isNaN(parseFloat(bundle.price)) || parseFloat(bundle.price) < 0) {
          bundleErrors.push(`Bundle #${index + 1}: price must be a valid non-negative number.`);
        }
      });
    }
    
    if (bundleErrors.length > 0) {
      alert(bundleErrors.join('\n'));
      return;
    }

    // Validate price for non-bundle products
    if (!hasBundleVariations) {
      if (!formData.price || parseFloat(formData.price) <= 0) { 
        alert('Please enter valid price'); 
        return; 
      }
    }

    // Validate stock for new products
    if (!isEditing) {
      const stockValue = parseInt(formData.stock);
      if (isNaN(stockValue) || stockValue < 0) {
        alert('Please enter a valid stock quantity (0 or more)');
        return;
      }
    }

    setUploading(true);
    try {
      const submitData = new FormData();
      submitData.append('name', formData.name.trim());
      submitData.append('description', formData.description.trim());

      // Calculate price
      const bundlePrices = variations.bundles
        .map(bundle => parseFloat(bundle.price))
        .filter((price) => !isNaN(price));
      
      const fixedPrice = !hasBundleVariations
        ? parseFloat(formData.price)
        : bundlePrices.length > 0
          ? Math.min(...bundlePrices)
          : 0;

      submitData.append('price', fixedPrice.toString());

      // For new products, send the stock value
      if (!isEditing) {
        const stockValue = parseInt(formData.stock) || 0;
        submitData.append('stock', stockValue.toString());
      }

      submitData.append('category', formData.category);
      submitData.append('variations', JSON.stringify(variations));
      submitData.append('addOns', JSON.stringify(formData.addOns));

      // Handle images
      const mainImageIndex = formData.images.findIndex(img => img.isMain);
      submitData.append('mainImageIndex', mainImageIndex >= 0 ? mainImageIndex : 0);

      // Collect existing image URLs
      const existingImageUrls = formData.images
        .filter(img => !img.file && (img.url || img.preview))
        .map(img => img.url || img.preview);

      if (existingImageUrls.length > 0) {
        submitData.append('existingImages', JSON.stringify(existingImageUrls));
      }

      // Append new image files
      formData.images.forEach((image) => {
        if (image.file) {
          submitData.append('images', image.file);
        }
      });

      await onSubmit(submitData);
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error submitting product:', error);
      alert('Error submitting product: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="product-modal-overlay" onClick={onClose}>
      <div className="product-modal" onClick={(e) => e.stopPropagation()}>
        <div className="product-modal-header">
          <h2 className="product-modal-title">{isEditing ? 'EDIT PRODUCT' : 'ADD NEW PRODUCT'}</h2>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="product-modal-body">
          <div className="form-section">

            {/* Product Name */}
            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter product name"
              />
            </div>

            {/* Product Description */}
            <div className="form-group">
              <label className="form-label">Product Description</label>
              <textarea
                className="form-textarea"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter product description"
                rows="4"
              />
            </div>

            {/* Category */}
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select className="form-select" value={formData.category} onChange={handleCategoryChange}>
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="add-new">+ Add New Category</option>
              </select>
            </div>

            {/* Variations Manager */}
            <div className="form-group">
              <label className="form-label">
                Variations <span className="form-label-optional">(optional)</span>
              </label>
              <VariationsManager
                variations={variations}
                onChange={setVariations}
              />
            </div>

            {/* Add-Ons */}
            <div className="form-group">
              <label className="form-label">Add-Ons</label>
              <div className="addons-list">
                {formData.addOns.map((addon) => (
                  <div key={addon.id} className="addon-item">
                    <span className="addon-name">{addon.name}</span>
                    <span className="addon-price">₱{addon.price}</span>
                    <button type="button" onClick={() => removeAddOn(addon.id)} className="remove-addon-btn">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className="add-addon-row">
                <input
                  type="text"
                  className="addon-name-input"
                  placeholder="Add-on name"
                  value={newAddOn.name}
                  onChange={(e) => setNewAddOn({ ...newAddOn, name: e.target.value })}
                />
                <input
                  type="number"
                  className="addon-price-input"
                  placeholder="Price"
                  value={newAddOn.price}
                  onChange={(e) => setNewAddOn({ ...newAddOn, price: e.target.value })}
                />
                <button type="button" onClick={handleAddAddOn} className="add-addon-btn">
                  Add
                </button>
              </div>
            </div>

            {/* Price and Stock Row - FIXED */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Price (₱) {hasBundleVariations ? '(auto from bundle prices)' : '*'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder={hasBundleVariations ? 'Derived from bundle prices' : '0.00'}
                  disabled={hasBundleVariations}
                  readOnly={hasBundleVariations}
                  style={hasBundleVariations ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                />
                {hasBundleVariations && (
                  <small className="field-hint">
                    Price is automatically calculated from bundles
                  </small>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  {isEditing ? 'Current Stock' : 'Initial Stock *'}
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  className="form-input"
                  value={formData.stock}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    setFormData({ ...formData, stock: value >= 0 ? value : 0 });
                  }}
                  placeholder="Enter stock quantity"
                  disabled={isEditing}
                  style={isEditing ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                />
                {!isEditing && (
                  <small className="field-hint">
                    Initial stock quantity for this product
                  </small>
                )}
                {isEditing && (
                  <small className="stock-warning">
                    ⚠️ Stock can only be adjusted using the Add Stock button on the main page
                  </small>
                )}
              </div>
            </div>

            {/* Product Images */}
            <div className="form-group">
              <label className="form-label">Product Images</label>
              <div className="image-upload-area">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="image-input"
                  id="imageUpload"
                />
                <label htmlFor="imageUpload" className="image-upload-label">
                  📸 Click to upload images
                </label>
                <div className="image-preview-grid">
                  {formData.images.map((image, index) => (
                    <div key={index} className={`image-preview-item ${image.isMain ? 'main-image' : ''}`}>
                      <img src={image.preview || image.url || image} alt={`Preview ${index}`} className="preview-image" />
                      <div className="image-overlay">
                        {!image.isMain && (
                          <button onClick={() => setMainImage(index)} className="set-main-btn">
                            Set as Main
                          </button>
                        )}
                        {image.isMain && <span className="main-badge">Main</span>}
                        <button onClick={() => removeImage(index)} className="remove-image-btn">
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="product-modal-footer">
          <button className="modal-cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="modal-submit-btn" onClick={handleSubmit} disabled={uploading}>
            {uploading ? 'Processing...' : (isEditing ? 'Update Product' : 'Add Product')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;