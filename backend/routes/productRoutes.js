// productRoutes.js
import express from 'express';
import multer from 'multer';
import supabase from '../supabaseClient.js';
import { createAuditLog } from '../services/auditService.js';

const router = express.Router();

/**
 * Authentication middleware - extracts user from JWT token
 */
// Authentication middleware - IMPROVED VERSION
router.use(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('Auth Header:', authHeader ? 'Present' : 'Missing');

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log('No valid auth header found');
    req.user = null;
    return next();
  }

  const token = authHeader.split(" ")[1];
  console.log('Token extracted, length:', token?.length);

  try {
    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      console.error('Supabase auth error:', error.message);
      req.user = null;
      return next();
    }

    if (user) {
      // Get user role from user_metadata or from a roles table
      const userRole = user.user_metadata?.role || 
                      user.app_metadata?.role || 
                      'CUSTOMER';
      
      req.user = {
        id: user.id,
        email: user.email,
        role: userRole,
        name: user.user_metadata?.name || user.email
      };
      
      console.log('Authenticated user:', {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
      });
    } else {
      console.log('No user found from token');
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

// ==================== ROUTES ====================

router.get('/test', (req, res) => {
  res.json({ success: true, message: 'API is working' });
});

// GET PRODUCTS
// GET PRODUCTS - Make sure to select the right fields
router.get('/products', async (req, res) => {
  try {
    const { category, status, search } = req.query;

    let query = supabase
      .from('products')
      .select('*, image, images, main_image')  // Select image fields
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (category) query = query.eq('category', category);
    if (status) query = query.eq('status', status.toUpperCase());
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Transform data to include mainImage for frontend compatibility
    const transformedData = data.map(product => ({
      ...product,
      mainImage: product.image || product.main_image || (product.images?.[0]),
      image: product.image || product.main_image || (product.images?.[0])
    }));

    res.json({ success: true, data: transformedData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET PRODUCT STATS SUMMARY
router.get('/products/stats/summary', async (req, res) => {
  try {
    const { count: totalProducts, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (countError) throw countError;

    const { count: lowStockCount, error: lowStockError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .lte('stock', 20)
      .gt('stock', 0);

    if (lowStockError) throw lowStockError;

    const { count: outOfStockCount, error: outOfStockError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('stock', 0);

    if (outOfStockError) throw outOfStockError;

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('price, stock')
      .eq('is_active', true);

    if (productsError) throw productsError;

    const totalValue = products.reduce((sum, product) => {
      return sum + (product.price * product.stock);
    }, 0);

    res.json({
      success: true,
      data: {
        totalProducts: totalProducts || 0,
        lowStock: lowStockCount || 0,
        outOfStock: outOfStockCount || 0,
        totalValue: totalValue
      }
    });
  } catch (error) {
    console.error('Error fetching product stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET SINGLE PRODUCT — add after stats/summary to prevent "stats" being treated as :id
router.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('products')
      .select('*, image, images, main_image, add_ons, variations')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const transformedData = {
      ...data,
      mainImage: data.image || data.main_image || data.images?.[0],
      image:     data.image || data.main_image || data.images?.[0],
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

    res.json({
      success: true,
      data: categoriesWithCount
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// CREATE PRODUCT - Fixed with better error handling
// CREATE PRODUCT - Fixed to match your database schema
router.post('/products', upload.array('images', 10), async (req, res) => {
  try {
    console.log('=== CREATE PRODUCT REQUEST ===');
    console.log('User from auth:', req.user);
    console.log('Request body:', req.body);
    console.log('Files:', req.files?.length || 0);

    const { name, description, price, stock, category, variations, addOns, mainImageIndex } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ success: false, error: 'Product name is required' });
    }

    // Convert and validate stock
    const numericStock = parseInt(stock) || 0;
    const productStatus = getProductStatus(numericStock);

    // Parse variations and addOns if they exist
    let parsedVariations = { bundles: [], colors: [] };
    let parsedAddOns = [];
    
    if (variations) {
      try {
        parsedVariations = typeof variations === 'string' ? JSON.parse(variations) : variations;
      } catch (e) {
        console.error('Error parsing variations:', e);
      }
    }
    if (!parsedVariations || Array.isArray(parsedVariations)) {
      parsedVariations = { bundles: [], colors: [] };
    }
    parsedVariations.bundles = Array.isArray(parsedVariations.bundles) ? parsedVariations.bundles : [];
    parsedVariations.colors  = Array.isArray(parsedVariations.colors)  ? parsedVariations.colors  : [];

    if (addOns) {
      try {
        parsedAddOns = typeof addOns === 'string' ? JSON.parse(addOns) : addOns;
      } catch (e) {
        console.error('Error parsing addOns:', e);
      }
    }
    if (!Array.isArray(parsedAddOns)) parsedAddOns = [];

    const hasBundleVariations = parsedVariations.bundles.length > 0;
    const bundlePrices = parsedVariations.bundles
      .map(b => parseFloat(b.price))
      .filter((price) => !isNaN(price));

    // Convert and validate price
    let numericPrice = parseFloat(price);
    if (hasBundleVariations && (!price || isNaN(numericPrice))) {
      if (bundlePrices.length === 0) {
        return res.status(400).json({ success: false, error: 'Bundle variations must include prices when product price is not provided.' });
      }
      numericPrice = Math.min(...bundlePrices);
    }

    if (!hasBundleVariations) {
      if (!price) {
        return res.status(400).json({ success: false, error: 'Product price is required' });
      }
      if (isNaN(numericPrice) || numericPrice < 0) {
        return res.status(400).json({ success: false, error: 'Invalid price value' });
      }
    }

    // Handle image uploads
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      imageUrls = await uploadMultipleImages(req.files);
    }

    // Prepare product data - MATCHING YOUR DATABASE SCHEMA
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

    // Add images based on your schema
    if (imageUrls.length > 0) {
      productData.image = imageUrls[0];      // Main image (singular 'image' column)
      productData.images = imageUrls;        // All images array
      productData.main_image = imageUrls[0]; // Also set main_image if needed
    }

    // If no variation or add-on values were provided, keep the defaults stored in productData above.
    console.log('Inserting product:', productData);

    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select();

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }

    // Create audit log
    if (req.user && req.user.id) {
      try {
        await createAuditLog({
          user_id: req.user.id,
          user_email: req.user.email,
          user_role: req.user.role,
          action: "CREATE",
          module: "PRODUCT",
          description: `Created product: ${name} (ID: ${data?.[0]?.id})`,
        });
        console.log('Audit log created successfully');
      } catch (auditError) {
        console.error('Audit log error (non-critical):', auditError);
      }
    }

    res.status(201).json({ 
      success: true, 
      data: data?.[0],
      message: 'Product created successfully'
    });

  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.details || null
    });
  }
});
// UPDATE PRODUCT
// UPDATE PRODUCT - Fixed for your schema
router.put('/products/:id', upload.array('images', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock, category, is_active, variations, addOns } = req.body;

    // Get existing product
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingProduct) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Prepare update data
    const updateData = {
      updated_at: new Date().toISOString()
    };
    
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price) updateData.price = parseFloat(price);
    if (stock !== undefined) {
      updateData.stock = parseInt(stock);
      updateData.status = getProductStatus(updateData.stock);
    }
    if (category) updateData.category = category;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (variations) {
      updateData.variations = typeof variations === 'string' ? JSON.parse(variations) : variations;
    }
    if (addOns) {
      updateData.add_ons = typeof addOns === 'string' ? JSON.parse(addOns) : addOns;
    }

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      const imageUrls = await uploadMultipleImages(req.files);
      if (imageUrls.length > 0) {
        updateData.image = imageUrls[0];      // Update main image
        updateData.images = imageUrls;        // Update images array
        updateData.main_image = imageUrls[0]; // Update main_image
      }
    }

    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;

    // Create audit log
    if (req.user && req.user.id) {
      await createAuditLog({
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: "UPDATE",
        module: "PRODUCT",
        description: `Updated product: ${name || existingProduct.name} (ID: ${id})`,
      });
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

    // Get product info before deletion for audit log
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

    // Create audit log with auth user
    if (req.user && req.user.id) {
      await createAuditLog({
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: "DELETE",
        module: "PRODUCT",
        description: `Deleted product: ${product.name} (ID: ${id})`,
      });
    }

    res.json({ success: true, message: 'Product deleted successfully' });

  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// STOCK UPDATE
router.post('/products/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { change, reason } = req.body;

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

    // Create audit log with auth user
    if (req.user && req.user.id) {
      await createAuditLog({
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: "UPDATE",
        module: "STOCK",
        description: `Changed stock by ${change} for product: ${product.name} (ID: ${id}). Old: ${oldStock}, New: ${newStock}`,
      });
    }

    await addStockHistory(id, change, reason, req.user?.id);

    res.json({ success: true, data: data?.[0] });

  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET STOCK HISTORY
router.get('/products/:id/stock-history', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('stock_history')
      .select('*')
      .eq('product_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data: data || [] });

  } catch (error) {
    console.error('Error fetching stock history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ARCHIVE PRODUCTS
router.post('/products/archive', async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!productIds || productIds.length === 0) {
      return res.status(400).json({ success: false, error: 'No product IDs provided' });
    }

    const { data, error } = await supabase
      .from('products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .in('id', productIds)
      .select();

    if (error) throw error;

    // Create audit log with auth user
    if (req.user && req.user.id) {
      await createAuditLog({
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: "ARCHIVE",
        module: "PRODUCT",
        description: `Archived ${productIds.length} product(s): ${productIds.join(', ')}`,
      });
    }

    res.json({ success: true, data: data, message: `${productIds.length} product(s) archived` });

  } catch (error) {
    console.error('Error archiving products:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;