import React, { useState, useEffect } from 'react';
import '../../css/ProductModal.css';

const ProductModal = ({ isOpen, onClose, onSubmit, product = null, isEditing = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    newCategory: '',
    variations: [{ quantity: '', color: '', size: '' }],
    addOns: [],
    price: '',
    stock: 0,
    images: [],
    mainImage: null
  });
  
  const [newAddOn, setNewAddOn] = useState({ name: '', price: '' });
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState(['Satin Flowers', 'Dried Flowers', 'Fresh Flowers', 'Bouquets']);

  useEffect(() => {
    if (product && isEditing) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        category: product.category || '',
        newCategory: '',
        variations: product.variations || [{ quantity: '', color: '', size: '' }],
        addOns: product.addOns || [],
        price: product.price || '',
        stock: product.stock || 0,
        images: product.images || [],
        mainImage: product.mainImage || null
      });
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
      variations: [{ quantity: '', color: '', size: '' }],
      addOns: [],
      price: '',
      stock: 0,
      images: [],
      mainImage: null
    });
    setNewAddOn({ name: '', price: '' });
  };

  const handleVariationChange = (index, field, value) => {
    const newVariations = [...formData.variations];
    newVariations[index][field] = value;
    setFormData({ ...formData, variations: newVariations });
  };

  const addVariation = () => {
    setFormData({
      ...formData,
      variations: [...formData.variations, { quantity: '', color: '', size: '' }]
    });
  };

  const removeVariation = (index) => {
    const newVariations = formData.variations.filter((_, i) => i !== index);
    setFormData({ ...formData, variations: newVariations });
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
      isMain: formData.images.length === 0 // First image becomes main by default
    }));

    setFormData({
      ...formData,
      images: [...formData.images, ...newImages]
    });
  };

  const setMainImage = (index) => {
    const newImages = formData.images.map((img, i) => ({
      ...img,
      isMain: i === index
    }));
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
    if (!formData.name.trim()) {
      alert('Please enter product name');
      return;
    }
    if (!formData.price || formData.price <= 0) {
      alert('Please enter valid price');
      return;
    }
    if (!formData.category) {
      alert('Please select a category');
      return;
    }

    setUploading(true);
    try {
      const submitData = new FormData();
      submitData.append('name', formData.name.trim());
      submitData.append('description', formData.description.trim());
      submitData.append('price', formData.price);
      
      // Only include stock if NOT editing (when adding new product)
      if (!isEditing) {
        submitData.append('stock', formData.stock);
      }
      
      submitData.append('category', formData.category);
      submitData.append('variations', JSON.stringify(formData.variations));
      submitData.append('addOns', JSON.stringify(formData.addOns));
      
      // Find main image index
      const mainImageIndex = formData.images.findIndex(img => img.isMain);
      submitData.append('mainImageIndex', mainImageIndex >= 0 ? mainImageIndex : 0);
      
      formData.images.forEach((image) => {
        if (image.file) {
          submitData.append('images', image.file);
        } else if (image.url) {
          // For existing images that are already uploaded
          submitData.append('existingImages', JSON.stringify(formData.images.map(img => img.url || img.preview)));
        }
      });

      await onSubmit(submitData);
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error submitting product:', error);
      alert('Error submitting product');
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

            {/* Variations */}
            <div className="form-group">
              <label className="form-label">Variations</label>
              {formData.variations.map((variation, index) => (
                <div key={index} className="variation-row">
                  <input
                    type="text"
                    className="variation-input"
                    placeholder="Quantity (e.g., 1 dozen)"
                    value={variation.quantity}
                    onChange={(e) => handleVariationChange(index, 'quantity', e.target.value)}
                  />
                  <input
                    type="text"
                    className="variation-input"
                    placeholder="Color"
                    value={variation.color}
                    onChange={(e) => handleVariationChange(index, 'color', e.target.value)}
                  />
                  <input
                    type="text"
                    className="variation-input"
                    placeholder="Size"
                    value={variation.size}
                    onChange={(e) => handleVariationChange(index, 'size', e.target.value)}
                  />
                  {formData.variations.length > 1 && (
                    <button type="button" onClick={() => removeVariation(index)} className="remove-variation-btn">
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addVariation} className="add-variation-btn">
                + Add Variation
              </button>
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

            {/* Price and Stock Row */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Price (₱) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  {isEditing ? 'Current Stock (Read Only)' : 'Initial Stock'}
                </label>
                <input
                  type="number"
                  className={`form-input ${isEditing ? 'readonly-field' : ''}`}
                  value={formData.stock}
                  onChange={(e) => !isEditing && setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  readOnly={isEditing}
                  disabled={isEditing}
                  style={isEditing ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                />
                {isEditing && (
                  <small className="stock-warning">
                    * Stock can only be adjusted using the Add Stock button
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