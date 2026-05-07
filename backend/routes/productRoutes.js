// productRoutes.js - COMPLETE FIXED VERSION
import express from 'express';
import multer from 'multer';
import supabase from '../supabaseClient.js';
import { createAuditLog } from '../services/auditService.js';

const router = express.Router();

router.use(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(" ")[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      console.error('Supabase auth error:', error.message);
      req.user = null;
      return next();
    }

    if (user) { 
      const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('role, first_name, last_name')
        .eq('email', user.email)
        .single();
      
      if (dbError) {
        console.error('Error fetching user from database:', dbError);
      }
      
      const userRole = dbUser?.role || 'CUSTOMER';
      
      req.user = {
        id: user.id,
        email: user.email,
        role: userRole,
        name: dbUser ? `${dbUser.first_name || ''} ${dbUser.last_name || ''}`.trim() : user.user_metadata?.name || user.email
      };
      
      console.log('Authenticated user:', {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
      });
    } else {
      req.user = null;
    }
  } catch (error) {
    console.error('Token verification error:', error);
    req.user = null;
  }

  next();
});

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
const addStockHistory = async (productId, quantityChange, reason, adminId = null, adminName = null) => {
  try {
    const { error } = await supabase
      .from('stock_history')
      .insert([{
        product_id: productId,
        quantity_change: quantityChange,
        reason: reason || (quantityChange > 0 ? 'Stock added' : 'Stock removed'),
        admin_id: adminId,
        admin_name: adminName,
        created_at: new Date().toISOString()
      }]);

    if (error) {
      console.error('Error adding stock history:', error);
      return false;
    }
    console.log(`✅ Stock history added: ${quantityChange} for product ${productId}`);
    return true;
  } catch (error) {
    console.error('Error in addStockHistory:', error);
    return false;
  }
};

// ==================== ROUTES ====================

router.get('/test', (req, res) => {
  res.json({ success: true, message: 'API is working' });
});

// GET PRODUCTS
router.get('/products', async (req, res) => {
  try {
    const { category, status, search } = req.query;

    let query = supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (category) query = query.eq('category', category);
    if (status) query = query.eq('status', status.toUpperCase());
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (req.user && req.user.id) {
      createAuditLog({
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: "VIEW",
        module: "PRODUCT",
        description: `Viewed products page (${data?.length || 0} products)`,
      }).catch(err => console.error('Audit log error:', err));
    }

    const transformedData = data.map(product => ({
      ...product,
      mainImage: product.image || product.main_image || (product.images?.[0]),
      image: product.image || product.main_image || (product.images?.[0])
    }));

    res.json({ success: true, data: transformedData });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET PRODUCT STATS SUMMARY
router.get('/products/stats/summary', async (req, res) => {
  try {
    console.log('📊 Fetching product stats...');
    
    const { count: total, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (countError) throw countError;

    const { count: inStock, error: inStockError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .gt('stock', 20);

    if (inStockError) throw inStockError;

    const { count: lowStock, error: lowStockError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .lte('stock', 20)
      .gt('stock', 0);

    if (lowStockError) throw lowStockError;

    const { count: outOfStock, error: outOfStockError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('stock', 0);

    if (outOfStockError) throw outOfStockError;

    const stats = {
      total: total || 0,
      inStock: inStock || 0,
      lowStock: lowStock || 0,
      outOfStock: outOfStock || 0
    };
    
    console.log('📊 Stats calculated:', stats);
    
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching product stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET LOW STOCK PRODUCTS LIST
router.get('/products/low-stock/list', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;

    const { data, error } = await supabase
      .from('products')
      .select('id, name, stock')
      .eq('is_active', true)
      .lte('stock', 20)
      .gt('stock', 0)
      .order('stock', { ascending: true })
      .limit(limit);

    if (error) throw error;

    const chartData = (data || []).map(product => ({
      id: product.id,
      name: product.name.substring(0, 20),
      value: Math.min(Math.round((product.stock / 100) * 100), 100)
    }));

    res.json({ success: true, data: chartData });
  } catch (error) {
    console.error('Error fetching low stock products:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET SINGLE PRODUCT
router.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (id === 'stats' || id === 'stats/summary' || id === 'low-stock' || id === 'low-stock/list') {
      return res.status(404).json({ success: false, error: 'Invalid product ID' });
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    if (req.user && req.user.id) {
      createAuditLog({
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: "VIEW",
        module: "PRODUCT",
        description: `Viewed product details: ${data.name} (ID: ${id})`,
      }).catch(err => console.error('Audit log error:', err));
    }

    const transformedData = {
      ...data,
      mainImage: data.image || data.main_image || (data.images?.[0]),
      image: data.image || data.main_image || (data.images?.[0]),
    };

    res.json({ success: true, data: transformedData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET CATEGORIES
router.get('/categories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('category')
      .eq('is_active', true)
      .not('category', 'is', null);

    if (error) throw error;

    const uniqueCategories = [...new Set(data.map(item => item.category).filter(Boolean))];
    
    const categoriesWithCount = uniqueCategories.map(category => ({
      name: category,
      count: data.filter(item => item.category === category).length
    }));

    // ✅ Add audit log for viewing categories
    if (req.user && req.user.id) {
      createAuditLog({
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: "VIEW",
        module: "CATEGORY",
        description: `Viewed categories (${uniqueCategories.length} categories)`,
      }).catch(err => console.error('Audit log error:', err));
    }

    res.json({ success: true, data: categoriesWithCount });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// CREATE PRODUCT
router.post('/products', upload.array('images', 10), async (req, res) => {
  try {
    console.log('=== CREATE PRODUCT REQUEST ===');
    const { name, description, price, stock, category, variations, addOns } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Product name is required' });
    }

    const numericStock = parseInt(stock) || 0;
    const productStatus = getProductStatus(numericStock);

    let parsedVariations = { bundles: [], colors: [] };
    let parsedAddOns = [];
    
    if (variations) {
      try {
        parsedVariations = typeof variations === 'string' ? JSON.parse(variations) : variations;
      } catch (e) {
        console.error('Error parsing variations:', e);
      }
    }
    
    if (addOns) {
      try {
        parsedAddOns = typeof addOns === 'string' ? JSON.parse(addOns) : addOns;
      } catch (e) {
        console.error('Error parsing addOns:', e);
      }
    }

    let numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ success: false, error: 'Invalid price value' });
    }

    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      imageUrls = await uploadMultipleImages(req.files);
      console.log('Images uploaded:', imageUrls.length);
    }

    const productData = {
      name: name.trim(),
      description: description || '',
      price: numericPrice,
      stock: numericStock,
      category: category || 'Uncategorized',
      status: productStatus,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      variations: parsedVariations,
      add_ons: parsedAddOns,
    };

    if (imageUrls.length > 0) {
      productData.image = imageUrls[0];
      productData.images = imageUrls;
      productData.main_image = imageUrls[0];
    }

    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select();

    if (error) throw error;

    const newProduct = data?.[0];
    
    if (newProduct && numericStock > 0) {
      const adminName = req.user?.name || req.user?.email || 'System';
      await addStockHistory(
        newProduct.id, 
        numericStock, 
        'Initial stock added during product creation', 
        req.user?.id,
        adminName
      );
      console.log(`✅ Stock history added: +${numericStock} for ${newProduct.name}`);
    }

     // ✅ CREATE AUDIT LOG (await - must complete)
     if (req.user && req.user.id) {
      try {
        await createAuditLog({
          user_id: req.user.id,
          user_email: req.user.email,
          user_role: req.user.role,
          action: "CREATE",
          module: "PRODUCT",
          description: `Created product: ${name} (ID: ${newProduct?.id})`,
        });
        console.log('✅ CREATE audit log created');
      } catch (auditError) {
        console.error('Audit log error:', auditError);
      }
    }


    res.status(201).json({ 
      success: true, 
      data: newProduct,
      message: 'Product created successfully'
    });

  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// UPDATE PRODUCT
router.put('/products/:id', upload.array('images', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category, is_active, variations, addOns } = req.body;

    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingProduct) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const updateData = {
      updated_at: new Date().toISOString()
    };
    
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price) updateData.price = parseFloat(price);
    if (category) updateData.category = category;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (variations) {
      updateData.variations = typeof variations === 'string' ? JSON.parse(variations) : variations;
    }
    if (addOns) {
      updateData.add_ons = typeof addOns === 'string' ? JSON.parse(addOns) : addOns;
    }

    if (req.files && req.files.length > 0) {
      const imageUrls = await uploadMultipleImages(req.files);
      if (imageUrls.length > 0) {
        updateData.image = imageUrls[0];
        updateData.images = imageUrls;
        updateData.main_image = imageUrls[0];
      }
    }

    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;

     // ✅ UPDATE AUDIT LOG (await - must complete)
     if (req.user && req.user.id) {
      await createAuditLog({
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: "UPDATE",
        module: "PRODUCT",
        description: `Updated product: ${name || existingProduct.name} (ID: ${id})`,
      });
      console.log('✅ UPDATE audit log created');
    }

    res.json({ success: true, data: data?.[0] });

  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE PRODUCT
router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('name')
      .eq('id', id)
      .single();

    if (fetchError) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;

     // ✅ DELETE AUDIT LOG (await - must complete)
     if (req.user && req.user.id) {
      await createAuditLog({
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: "DELETE",
        module: "PRODUCT",
        description: `Deleted product: ${product.name} (ID: ${id})`,
      });
      console.log('✅ DELETE audit log created');
    }


    res.json({ success: true, message: 'Product deleted successfully' });

  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// STOCK UPDATE with history
router.post('/products/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { change, reason } = req.body;

    console.log(`📦 Stock update request for product ${id}: change=${change}`);

    if (typeof change !== 'number' || isNaN(change)) {
      return res.status(400).json({ success: false, error: 'Invalid stock change amount' });
    }

    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const oldStock = product.stock;
    const newStock = Math.max(0, oldStock + change);
    const newStatus = getProductStatus(newStock);

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

    const adminName = req.user?.name || req.user?.email || 'System';
    const changeReason = reason || (change > 0 ? 'Stock added' : 'Stock removed');
    await addStockHistory(id, change, changeReason, req.user?.id, adminName);

     // ✅ STOCK UPDATE AUDIT LOG (await - must complete)
     if (req.user && req.user.id) {
      await createAuditLog({
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: "UPDATE",
        module: "STOCK",
        description: `Changed stock by ${change} for product: ${product.name} (ID: ${id}). Old: ${oldStock}, New: ${newStock}`,
      });
      console.log('✅ STOCK audit log created');
    }

    console.log(`✅ Stock updated: ${oldStock} → ${newStock}`);

    res.json({ success: true, data: data?.[0] });

  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET STOCK HISTORY - FIXED to return correct format for frontend
router.get('/products/:id/stock-history', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`📜 Fetching stock history for product ${id}`);

    // Get product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name')
      .eq('id', id)
      .single();

    if (productError) {
      console.log('Product not found:', id);
      return res.json({ 
        success: true, 
        data: {
          product: { id, name: 'Unknown Product' },
          history: [],
          totalRecords: 0
        }
      });
    }

    // Get stock history - ORDER BY CREATED_AT ASCENDING to calculate running total correctly
    const { data: historyData, error: historyError } = await supabase
      .from('stock_history')
      .select('*')
      .eq('product_id', id)
      .order('created_at', { ascending: true });

    if (historyError) {
      console.error('Error fetching stock history from DB:', historyError);
      throw historyError;
    }

     // ✅ VIEW STOCK HISTORY AUDIT (fire and forget - no await)
     if (req.user && req.user.id) {
      createAuditLog({
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: "VIEW",
        module: "STOCK",
        description: `Viewed stock history for product: ${product.name} (ID: ${id})`,
      }).catch(err => console.error('Audit log error:', err));
    }

    console.log(`Found ${historyData?.length || 0} stock history records for ${product.name}`);

    // Calculate running total and format for frontend
    let runningTotal = 0;
    const historyWithRunningTotal = (historyData || []).map(record => {
      runningTotal += record.quantity_change;
      const formatted = {
        id: record.id,
        date: record.created_at,
        quantityChange: record.quantity_change,
        runningTotal: runningTotal,
        reason: record.reason || (record.quantity_change > 0 ? 'Stock added' : 'Stock removed'),
        admin: record.admin_name || 'System'
      };
      console.log(`  Record: Change=${record.quantity_change}, Running Total=${runningTotal}, Reason=${formatted.reason}`);
      return formatted;
    }).reverse(); // Most recent first

    console.log(`✅ Returning ${historyWithRunningTotal.length} records with running totals`);

    // Return in the format expected by the frontend
    res.json({ 
      success: true, 
      data: {
        product: {
          id: product.id,
          name: product.name
        },
        history: historyWithRunningTotal,
        totalRecords: historyWithRunningTotal.length
      }
    });

  } catch (error) {
    console.error('Error fetching stock history:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ARCHIVE PRODUCTS
// ARCHIVE PRODUCTS - FIXED VERSION
router.post('/products/archive', async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!productIds || productIds.length === 0) {
      return res.status(400).json({ success: false, error: 'No product IDs provided' });
    }

    // ✅ FIRST: Get product names for audit (BEFORE archiving)
    const { data: productsToArchive, error: fetchError } = await supabase
      .from('products')
      .select('name, id')
      .in('id', productIds);

    if (fetchError) {
      console.error('Error fetching products to archive:', fetchError);
    }

    // THEN: Archive the products
    const { data, error } = await supabase
      .from('products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .in('id', productIds)
      .select();

    if (error) throw error;

    // ✅ ARCHIVE AUDIT LOG (use productsToArchive that we fetched)
    if (req.user && req.user.id) {
      const productNames = productsToArchive?.map(p => p.name).join(', ') || `${productIds.length} products`;
      await createAuditLog({
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: "ARCHIVE",
        module: "PRODUCT",
        description: `Archived ${productIds.length} product(s): ${productNames}`,
      });
      console.log('✅ ARCHIVE audit log created');
    }

    res.json({ success: true, data: data, message: `${productIds.length} product(s) archived` });

  } catch (error) {
    console.error('Error archiving products:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;