// ProductModal.jsx (SELLER SIDE) - FULLY FIXED with Secure Uploads & SweetAlert
import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
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
  const [loadingCategories, setLoadingCategories] = useState(false);
  
  const hasBundleVariations = variations?.bundles?.length > 0;

  // Fetch categories from API
  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const sessionData = sessionStorage.getItem('mc_session');
      let token = null;
      
      if (sessionData) {
        const session = JSON.parse(sessionData);
        token = session.user?.access_token;
      }
      
      const response = await fetch('http://localhost:5000/api/categories', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      const data = await response.json();
      
      if (data.success && data.data && data.data.length > 0) {
        const categoryNames = data.data.map(cat => cat.name || cat);
        setCategories(categoryNames);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  useEffect(() => {
    if (product && isEditing) {
      console.log('📦 Editing product:', product);
      let loadedAddOns = [];
      if (product.add_ons && Array.isArray(product.add_ons)) {
        loadedAddOns = product.add_ons;
      } else if (product.addOns && Array.isArray(product.addOns)) {
        loadedAddOns = product.addOns;
      }

      // Handle images - convert URLs to preview objects
      let loadedImages = [];
      if (product.images && Array.isArray(product.images)) {
        loadedImages = product.images.map((img, idx) => ({
          url: img,
          preview: img,
          isMain: idx === 0,
          file: null
        }));
      } else if (product.mainImage || product.image || product.main_image) {
        const imgUrl = product.mainImage || product.image || product.main_image;
        loadedImages = [{
          url: imgUrl,
          preview: imgUrl,
          isMain: true,
          file: null
        }];
      }

      setFormData({
        name: product.name || '',
        description: product.description || '',
        category: product.category || '',
        newCategory: '',
        addOns: loadedAddOns,
        price: product.price || '',
        stock: product.stock || '',
        images: loadedImages,
        mainImage: loadedImages.find(img => img.isMain) || null
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
    } else if (isOpen) {
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

  const handleAddCategory = async () => {
    const { value: categoryName } = await Swal.fire({
      title: '<span style="color: #E6BB71;">Add New Category</span>',
      html: `
        <div style="text-align: left;">
          <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; color: #334155; font-weight: 500; font-size: 14px;">
              <span style="color: #E6BB71;">*</span> Category Name
            </label>
            <input type="text" id="categoryName" class="swal2-input" placeholder="Enter category name" style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
          </div>
          <div style="margin-bottom: 10px;">
            <label style="display: block; margin-bottom: 8px; color: #334155; font-weight: 500; font-size: 14px;">
              Description (Optional)
            </label>
            <textarea id="categoryDesc" class="swal2-textarea" placeholder="Brief description of the category" rows="3" style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; resize: vertical;"></textarea>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: '#E6BB71',
      cancelButtonColor: '#d33',
      confirmButtonText: '<span style="display: flex; align-items: center; gap: 5px;">➕ Add Category</span>',
      cancelButtonText: 'Cancel',
      preConfirm: () => {
        const name = document.getElementById('categoryName').value;
        if (!name) {
          Swal.showValidationMessage('Please enter a category name');
          return false;
        }
        if (name.length < 2) {
          Swal.showValidationMessage('Category name must be at least 2 characters');
          return false;
        }
        if (name.length > 50) {
          Swal.showValidationMessage('Category name must be less than 50 characters');
          return false;
        }
        return name.trim();
      }
    });

    if (categoryName) {
      if (categories.includes(categoryName)) {
        Swal.fire({
          title: 'Category Exists',
          text: `Category "${categoryName}" already exists.`,
          icon: 'warning',
          confirmButtonColor: '#E6BB71'
        });
        setFormData({ ...formData, category: categoryName });
        return;
      }
      
      setCategories([...categories, categoryName]);
      setFormData({ ...formData, category: categoryName });
      
      Swal.fire({
        title: 'Success!',
        text: `Category "${categoryName}" added successfully!`,
        icon: 'success',
        confirmButtonColor: '#E6BB71',
        timer: 1500
      });
    }
  };

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    if (value === 'add-new') {
      handleAddCategory();
    } else {
      setFormData({ ...formData, category: value });
    }
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
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    const validFiles = files.filter(file => {
      if (!validTypes.includes(file.type)) {
        Swal.fire('Error', `${file.name} is not a valid image file`, 'error');
        return false;
      }
      if (file.size > maxSize) {
        Swal.fire('Error', `${file.name} should be less than 5MB`, 'error');
        return false;
      }
      return true;
    });

    const newImages = validFiles.map((file, idx) => ({
      file,
      preview: URL.createObjectURL(file),
      isMain: formData.images.length === 0 && idx === 0,
      url: null
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
    if (formData.images[index].preview && formData.images[index].preview.startsWith('blob:')) {
      URL.revokeObjectURL(formData.images[index].preview);
    }
    setFormData({ ...formData, images: newImages });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) { 
      Swal.fire('Error', 'Please enter product name', 'error');
      return; 
    }
    if (!formData.category) { 
      Swal.fire('Error', 'Please select a category', 'error');
      return; 
    }

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
      Swal.fire('Validation Error', bundleErrors.join('\n'), 'error');
      return;
    }

    // Validate price for non-bundle products
    if (!hasBundleVariations) {
      if (!formData.price || parseFloat(formData.price) <= 0) { 
        Swal.fire('Error', 'Please enter valid price', 'error');
        return; 
      }
    }

    // Validate stock for new products
    if (!isEditing) {
      const stockValue = parseInt(formData.stock);
      if (isNaN(stockValue) || stockValue < 0) {
        Swal.fire('Error', 'Please enter a valid stock quantity (0 or more)', 'error');
        return;
      }
    }

    setUploading(true);
    
    // Show processing indicator
    Swal.fire({
      title: 'Processing...',
      html: 'Please wait while we process your product:<br><small>• Validating data<br>• Scanning images for viruses<br>• Optimizing images</small>',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

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

      // Handle images - only append new files
      formData.images.forEach((image) => {
        if (image.file) {
          submitData.append('images', image.file);
        }
      });

      // Send main image index
      const mainImageIndex = formData.images.findIndex(img => img.isMain);
      submitData.append('mainImageIndex', mainImageIndex >= 0 ? mainImageIndex.toString() : '0');

      await onSubmit(submitData);
      
      Swal.close();
      Swal.fire({
        title: 'Success!',
        text: isEditing ? 'Product updated successfully!' : 'Product added successfully!',
        icon: 'success',
        confirmButtonColor: '#E6BB71',
        timer: 1500
      });
      
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error submitting product:', error);
      Swal.close();
      Swal.fire('Error', 'Error submitting product: ' + error.message, 'error');
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

            {/* Category with SweetAlert */}
            <div className="form-group">
              <label className="form-label">Category *</label>
              {loadingCategories ? (
                <div className="form-input" style={{ backgroundColor: '#f5f5f5' }}>Loading categories...</div>
              ) : (
                <select className="form-select" value={formData.category} onChange={handleCategoryChange}>
                  <option value="">Select Category</option>
                  {categories.map((cat, index) => (
                    <option key={index} value={cat}>{cat}</option>
                  ))}
                  <option value="add-new" style={{ color: '#E6BB71', fontWeight: 'bold', borderTop: '1px solid #e2e8f0' }}>
                    + Add New Category
                  </option>
                </select>
              )}
              <small className="field-hint">
                Select an existing category or click "+ Add New Category" to create one
              </small>
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

            {/* Price and Stock Row */}
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

            {/* Product Images - Secure Upload */}
            <div className="form-group">
              <label className="form-label">Product Images (Max 5MB each)</label>
              <div className="image-upload-area">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  multiple
                  onChange={handleImageUpload}
                  className="image-input"
                  id="imageUpload"
                />
                <label htmlFor="imageUpload" className="image-upload-label">
                  📸 Click to upload images (JPG, PNG, WEBP, GIF only)
                </label>
                <div className="image-preview-grid">
                  {formData.images.map((image, index) => (
                    <div key={index} className={`image-preview-item ${image.isMain ? 'main-image' : ''}`}>
                      <img src={image.preview || image.url} alt={`Preview ${index}`} className="preview-image" />
                      <div className="image-overlay">
                        {!image.isMain && formData.images.length > 1 && (
                          <button onClick={() => setMainImage(index)} className="set-main-btn">
                            Set as Main
                          </button>
                        )}
                        {image.isMain && <span className="main-badge">⭐ Main</span>}
                        <button onClick={() => removeImage(index)} className="remove-image-btn">
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {formData.images.length === 0 && (
                  <small className="field-hint">
                    Upload product images. First image will be the main product image.
                    Images will be scanned for viruses and optimized automatically.
                  </small>
                )}
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