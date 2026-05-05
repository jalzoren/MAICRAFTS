import express from 'express';
import multer from 'multer';
import supabase from '../supabaseClient.js';
import { createAuditLog } from '../services/auditService.js';


const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, GIF are allowed.'));
    }
  }
});

// Helper function to get product status based on stock
const getProductStatus = (stock) => {
  if (stock === 0) return 'OUT OF STOCK';
  if (stock <= 20) return 'LOW STOCK';
  return 'IN STOCK';
};

// Helper function to upload image to Supabase Storage
const uploadImageToSupabase = async (file, fileName) => {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === 'product-images');
    
    if (!bucketExists) {
      await supabase.storage.createBucket('product-images', {
        public: true
      });
    }

    const { error } = await supabase.storage
      .from('product-images')
      .upload(`products/${fileName}`, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(`products/${fileName}`);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
};

// Helper function to upload multiple images
const uploadMultipleImages = async (files) => {
  const uploadedImages = [];
  if (!files || files.length === 0) return uploadedImages;
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${Date.now()}_${i}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const imageUrl = await uploadImageToSupabase(file, fileName);
    if (imageUrl) {
      uploadedImages.push(imageUrl);
    }
  }
  return uploadedImages;
};

// Helper function to add stock history record
const addStockHistory = async (productId, quantityChange, reason, adminId = null) => {
  try {
    const { error } = await supabase
      .from('stock_history')
      .insert([{
        product_id: productId,
        quantity_change: quantityChange,
        reason: reason || (quantityChange > 0 ? 'Stock added' : 'Stock removed'),
        admin_id: adminId,
        created_at: new Date().toISOString()
      }]);

    if (error) {
      console.error('Error adding stock history:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error in addStockHistory:', error);
    return false;
  }
};

// ==================== ROUTES (IN CORRECT ORDER) ====================

// Test routes
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'API is working' });
});

// IMPORTANT: Stock update route MUST come BEFORE the generic /products/:id route
router.post('/products/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { change, reason } = req.body;

    console.log('📦 Stock update request received:', { id, change, reason });

    if (change === undefined || change === null || typeof change !== 'number') {
      return res.status(400).json({ 
        success: false, 
        error: 'Change amount is required and must be a number' 
      });
    }

    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !product) {
      console.error('❌ Product not found:', fetchError);
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const oldStock = product.stock;
    const newStock = Math.max(0, oldStock + change);
    const newStatus = getProductStatus(newStock);

    console.log('📊 Stock calculation:', { oldStock, change, newStock, newStatus });

    const { data, error } = await supabase
      .from('products')
      .update({
        stock: newStock,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) throw error;

    await createAuditLog({
      user_id: req.user?.id || null,
      user_email: req.user?.email || "unknown@email.com",
      user_role: req.user?.role || "SELLER",
      action: "UPDATE",
      module: "STOCK",
      description: `Changed stock by ${change} for product ID: ${id}`,
    });

    await addStockHistory(id, change, reason || (change > 0 ? 'Stock added' : 'Stock removed'));

    console.log('✅ Stock updated successfully:', data?.[0]);

    res.json({ 
      success: true, 
      data: data?.[0],
      message: `Stock ${change > 0 ? 'added' : 'updated'} successfully`
    });
  } catch (error) {
    console.error('❌ Error updating stock:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET all products with filters
router.get('/products', async (req, res) => {
  try {
    const { category, status, search } = req.query;
    
    let query = supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (category && category !== '' && category !== 'All Categories') {
      query = query.eq('category', category);
    }
    if (status && status !== '' && status !== 'All Status') {
      query = query.eq('status', status.toUpperCase());
    }
    if (search && search.trim()) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,id::text.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    const productsWithParsedData = (data || []).map(product => {
      let parsedImages = [];
      let parsedVariations = [];
      let parsedAddOns = [];
      
      try {
        parsedImages = product.images ? (typeof product.images === 'string' ? JSON.parse(product.images) : product.images) : [];
      } catch (e) { parsedImages = []; }
      
      try {
        parsedVariations = product.variations ? (typeof product.variations === 'string' ? JSON.parse(product.variations) : product.variations) : [];
      } catch (e) { parsedVariations = []; }
      
      try {
        parsedAddOns = product.add_ons ? (typeof product.add_ons === 'string' ? JSON.parse(product.add_ons) : product.add_ons) : [];
      } catch (e) { parsedAddOns = []; }
      
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        category: product.category,
        status: product.status,
        image: product.image,
        mainImage: product.main_image || parsedImages[0] || product.image,
        images: parsedImages,
        variations: parsedVariations,
        addOns: parsedAddOns,
        created_at: product.created_at,
        updated_at: product.updated_at
      };
    });

    res.json({
      success: true,
      data: productsWithParsedData,
      count: productsWithParsedData.length
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET product statistics
router.get('/products/stats/summary', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('status, stock')
      .eq('is_active', true);

    if (error) throw error;

    const total = data?.length || 0;
    const inStock = data?.filter(p => p.status === 'IN STOCK').length || 0;
    const lowStock = data?.filter(p => p.status === 'LOW STOCK').length || 0;
    const outOfStock = data?.filter(p => p.status === 'OUT OF STOCK').length || 0;
    const totalStockValue = data?.reduce((sum, p) => sum + (p.stock || 0), 0) || 0;

    res.json({
      success: true,
      data: { total, inStock, lowStock, outOfStock, totalStockValue }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET stock history for a product
router.get('/products/:id/stock-history', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('stock_history')
      .select('*')
      .eq('product_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    let runningTotal = 0;
    const history = (data || []).map(record => {
      runningTotal += record.quantity_change;
      return {
        id: record.id,
        date: record.created_at,
        quantityChange: record.quantity_change,
        runningTotal: runningTotal,
        reason: record.reason,
        admin: record.admin_id || 'System'
      };
    });
    
    res.json({ 
      success: true, 
      data: history,
      count: history.length
    });
  } catch (error) {
    console.error('Error fetching stock history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET single product by ID (must come AFTER specific routes)
router.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    let parsedImages = [];
    let parsedVariations = [];
    let parsedAddOns = [];
    
    try {
      parsedImages = data.images ? (typeof data.images === 'string' ? JSON.parse(data.images) : data.images) : [];
    } catch (e) { parsedImages = []; }
    
    try {
      parsedVariations = data.variations ? (typeof data.variations === 'string' ? JSON.parse(data.variations) : data.variations) : [];
    } catch (e) { parsedVariations = []; }
    
    try {
      parsedAddOns = data.add_ons ? (typeof data.add_ons === 'string' ? JSON.parse(data.add_ons) : data.add_ons) : [];
    } catch (e) { parsedAddOns = []; }
    
    const product = {
      id: data.id,
      name: data.name,
      description: data.description,
      price: data.price,
      stock: data.stock,
      category: data.category,
      status: data.status,
      image: data.image,
      mainImage: data.main_image || parsedImages[0] || data.image,
      images: parsedImages,
      variations: parsedVariations,
      addOns: parsedAddOns,
      created_at: data.created_at,
      updated_at: data.updated_at
    };

    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET all categories
router.get('/categories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('category')
      .not('category', 'is', null)
      .eq('is_active', true);

    if (error) throw error;

    let categories = [...new Set(data.map(p => p.category).filter(Boolean))];
    
    if (categories.length === 0) {
      categories = ['Satin Flowers', 'Dried Flowers', 'Fresh Flowers', 'Bouquets'];
    }
    
    res.json({ 
      success: true, 
      data: categories 
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.json({ 
      success: true, 
      data: ['Satin Flowers', 'Dried Flowers', 'Fresh Flowers', 'Bouquets']
    });
  }
});

// POST create new product
router.post('/products', upload.array('images', 10), async (req, res) => {
  try {
    const { 
      name, 
      description, 
      price, 
      stock, 
      category, 
      variations, 
      addOns 
    } = req.body;
    
    const imageFiles = req.files;

    if (!name || !price || !category) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name, price, and category are required fields' 
      });
    }

    let imageUrls = [];
    let mainImageUrl = null;
    
    if (imageFiles && imageFiles.length > 0) {
      imageUrls = await uploadMultipleImages(imageFiles);
      mainImageUrl = imageUrls[0];
    } else {
      const defaultImage = 'https://via.placeholder.com/120x120/c8a97d/fff?text=🌸';
      imageUrls = [defaultImage];
      mainImageUrl = defaultImage;
    }

    const productStock = parseInt(stock) || 0;
    const productStatus = getProductStatus(productStock);

    let parsedVariations = [];
    let parsedAddOns = [];
    
    try {
      parsedVariations = variations ? (typeof variations === 'string' ? JSON.parse(variations) : variations) : [];
    } catch (e) { parsedVariations = []; }
    
    try {
      parsedAddOns = addOns ? (typeof addOns === 'string' ? JSON.parse(addOns) : addOns) : [];
    } catch (e) { parsedAddOns = []; }

    const { data, error } = await supabase
      .from('products')
      .insert([{
        name: name.trim(),
        description: description?.trim() || null,
        price: parseFloat(price),
        stock: productStock,
        category: category,
        image: mainImageUrl,
        variations: JSON.stringify(parsedVariations),
        add_ons: JSON.stringify(parsedAddOns),
        images: JSON.stringify(imageUrls),
        main_image: mainImageUrl,
        status: productStatus,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select();

    if (error) throw error;

    await createAuditLog({
      user_id: req.body.user_id,
      user_email: req.body.user_email || "unknown@email.com",
      user_role: req.body.user_role || "SELLER",
      action: "CREATE",
      module: "PRODUCT",
      description: `Created product: ${name}`,
    });

    if (productStock > 0 && data && data[0]) {
      await addStockHistory(data[0].id, productStock, 'Initial stock added');
    }

    res.status(201).json({ 
      success: true, 
      data: data?.[0],
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT update product
router.put('/products/:id', upload.array('images', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      price, 
      stock, 
      category, 
      variations, 
      addOns,
      existingImages,
      mainImageUrl 
    } = req.body;
    
    const newImageFiles = req.files;

    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingProduct) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    let imageUrls = [];
    let mainImage = mainImageUrl;

    if (existingImages && existingImages !== 'undefined' && existingImages !== 'null') {
      try {
        imageUrls = typeof existingImages === 'string' ? JSON.parse(existingImages) : existingImages;
      } catch (e) { imageUrls = []; }
    } else if (existingProduct.images) {
      try {
        imageUrls = typeof existingProduct.images === 'string' ? JSON.parse(existingProduct.images) : existingProduct.images;
      } catch (e) { imageUrls = []; }
    }

    if (newImageFiles && newImageFiles.length > 0) {
      const newImageUrls = await uploadMultipleImages(newImageFiles);
      imageUrls = [...imageUrls, ...newImageUrls];
      
      if (!mainImage && newImageUrls.length > 0) {
        mainImage = newImageUrls[0];
      }
    }

    if (!mainImage && imageUrls.length > 0) {
      mainImage = imageUrls[0];
    }

    const productStock = parseInt(stock) || 0;
    const productStatus = getProductStatus(productStock);
    const oldStock = existingProduct.stock || 0;

    let parsedVariations = [];
    let parsedAddOns = [];
    
    try {
      parsedVariations = variations ? (typeof variations === 'string' ? JSON.parse(variations) : variations) : [];
    } catch (e) { parsedVariations = []; }
    
    try {
      parsedAddOns = addOns ? (typeof addOns === 'string' ? JSON.parse(addOns) : addOns) : [];
    } catch (e) { parsedAddOns = []; }

    const { data, error } = await supabase
      .from('products')
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        price: parseFloat(price),
        stock: productStock,
        category: category,
        image: mainImage,
        variations: JSON.stringify(parsedVariations),
        add_ons: JSON.stringify(parsedAddOns),
        images: JSON.stringify(imageUrls),
        main_image: mainImage,
        status: productStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) throw error;

    await createAuditLog({
      user_id: req.body.user_id,
      user_email: req.body.user_email || "unknown@email.com",
      user_role: req.body.user_role || "SELLER",
      action: "UPDATE",
      module: "PRODUCT",
      description: `Updated product ID: ${id}`,
    });

    const stockDifference = productStock - oldStock;
    if (stockDifference !== 0) {
      await addStockHistory(id, stockDifference, 'Product updated');
    }

    res.json({ 
      success: true, 
      data: data?.[0],
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE product
router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await supabase
      .from('stock_history')
      .delete()
      .eq('product_id', id);

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await createAuditLog({
      user_id: req.body.user_id,
      user_email: req.body.user_email || "unknown@email.com",
      user_role: req.body.user_role || "ADMIN",
      action: "DELETE",
      module: "PRODUCT",
      description: `Deleted product ID: ${id}`,
    });

    res.json({ 
      success: true, 
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST archive multiple products
router.post('/products/archive', async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Product IDs array is required' 
      });
    }

    const { data, error } = await supabase
      .from('products')
      .update({ 
        is_active: false,
        status: 'ARCHIVED',
        updated_at: new Date().toISOString()
      })
      .in('id', productIds)
      .select();

    if (error) throw error;

    // ✅ ADD AUDIT LOG HERE
    await createAuditLog({
      user_id: req.body.user_id,
      user_email: req.body.user_email || "unknown@email.com",
      user_role: req.body.user_role || "ADMIN",
      action: "UPDATE",
      module: "PRODUCT",
      description: `Archived ${productIds.length} product(s)`
    });

    res.json({ 
      success: true, 
      data: data,
      count: data?.length || 0,
      message: `${data?.length || 0} product(s) archived successfully`
    });

  } catch (error) {
    console.error('Error archiving products:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;