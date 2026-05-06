// productRoutes.js
import express from 'express';
import multer from 'multer';
import { supabaseAdmin } from '../supabaseClient.js';
import { createAuditLog } from '../services/auditService.js';
import { secureUpload } from '../middleware/uploadSecurity.js';
const router = express.Router();

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
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error) {
      console.error('Supabase auth error:', error.message);
      req.user = null;
      return next();
    }

    if (user) { 
      const { data: dbUser, error: dbError } = await supabaseAdmin
        .from('users')
        .select('role, first_name, last_name, seller_id')
        .eq('email', user.email)
        .single();
      
      if (dbError) {
        console.error('Error fetching user from database:', dbError);
      }
      
      // Use role from database (this is the source of truth)
      const userRole = dbUser?.role || 'CUSTOMER';
      
      req.user = {
        id: user.id,
        email: user.email,
        role: userRole,  // Now using database role (should be 'seller')
        seller_id: dbUser?.seller_id || null, // Add seller_id for sellers
        name: dbUser ? `${dbUser.first_name || ''} ${dbUser.last_name || ''}`.trim() : user.user_metadata?.name || user.email
      };
      
      console.log('Authenticated user:', {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        seller_id: req.user.seller_id
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

const isSeller = (user) => !!user && typeof user.role === 'string' && user.role.toLowerCase() === 'seller';
const getSellerIdFromUser = (user) => user?.seller_id || user?.id || null;

// Helper function to upload image to Supabase Storage
const uploadImageToSupabase = async (file, fileName) => {
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === 'product-images');
    
    if (!bucketExists) {
      await supabaseAdmin.storage.createBucket('product-images', {
        public: true
      });
    }

    const { error } = await supabaseAdmin.storage
      .from('product-images')
      .upload(`products/${fileName}`, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabaseAdmin.storage
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
    const { error } = await supabaseAdmin
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

// GET PRODUCTS - UPDATED with seller filtering
router.get('/products', async (req, res) => {
  try {
    const { category, status, search, seller_id } = req.query;

    let query = supabaseAdmin
      .from('products')
      .select('*, image, images, main_image')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // Apply seller filter if provided
    if (seller_id) {
      query = query.eq('seller_id', seller_id);
    } else if (isSeller(req.user) && getSellerIdFromUser(req.user)) {
      // Auto-filter for sellers if no seller_id in query
      query = query.eq('seller_id', getSellerIdFromUser(req.user));
    }

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

// GET PRODUCT STATS SUMMARY - UPDATED with seller filtering
router.get('/products/stats/summary', async (req, res) => {
  try {
    const { seller_id } = req.query;
    
    // Build base query with filters
    let baseQuery = supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: false })
      .eq('is_active', true);

    // Apply seller filter if provided
    if (seller_id) {
      baseQuery = baseQuery.eq('seller_id', seller_id);
    } else if (isSeller(req.user) && getSellerIdFromUser(req.user)) {
      baseQuery = baseQuery.eq('seller_id', getSellerIdFromUser(req.user));
    }

    // Get all products for this seller
    const { data: products, error: productsError } = await baseQuery;
    
    if (productsError) throw productsError;

    // Calculate stats from filtered products
    const totalProducts = products?.length || 0;
    const inStock = products?.filter(p => p.stock > 20).length || 0;
    const lowStock = products?.filter(p => p.stock <= 20 && p.stock > 0).length || 0;
    const outOfStock = products?.filter(p => p.stock === 0).length || 0;
    
    const totalValue = products?.reduce((sum, product) => {
      return sum + (product.price * product.stock);
    }, 0) || 0;

    res.json({
      success: true,
      data: {
        total: totalProducts,
        inStock: inStock,
        lowStock: lowStock,
        outOfStock: outOfStock,
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

    let query = supabaseAdmin
      .from('products')
      .select('*, image, images, main_image, add_ons, variations')
      .eq('id', id);

    // If seller, ensure they can only see their own products
    if (isSeller(req.user) && getSellerIdFromUser(req.user)) {
      query = query.eq('seller_id', getSellerIdFromUser(req.user));
    }

    const { data, error } = await query.single();

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
        description: `Viewed product: ${data.name} (ID: ${id})`,
      }).catch(err => console.error('Audit log failed:', err));
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

// GET CATEGORIES - UPDATED with seller filtering
router.get('/categories', async (req, res) => {
  try {
    const { seller_id } = req.query;
    
    let query = supabaseAdmin
      .from('products')
      .select('category')
      .eq('is_active', true)
      .not('category', 'is', null);

    // Apply seller filter if provided
    if (seller_id) {
      query = query.eq('seller_id', seller_id);
    } else if (isSeller(req.user) && getSellerIdFromUser(req.user)) {
      query = query.eq('seller_id', getSellerIdFromUser(req.user));
    }

    const { data, error } = await query;
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

// CREATE PRODUCT - Added seller_id support
router.post('/products', secureUpload, async (req, res) => {
  try {
    console.log('=== CREATE PRODUCT REQUEST ===');
    console.log('User from auth:', req.user);
    console.log('User ID:', req.user?.id);
    console.log('User Email:', req.user?.email);
    console.log('User Role:', req.user?.role);
    console.log('Request body:', req.body);
    console.log('Files:', req.files?.length || 0);

    const { name, description, price, stock, category, variations, addOns, mainImageIndex, seller_id } = req.body;

    // Validate required fields
    if (!name) {
      console.log('❌ Product creation failed: Name is required');
      return res.status(400).json({ success: false, error: 'Product name is required' });
    }

    // Determine seller_id (from request body or authenticated user)
    let finalSellerId = seller_id || getSellerIdFromUser(req.user);
    
    // For sellers, enforce that they can only create products for themselves
    if (isSeller(req.user)) {
      const expectedSellerId = getSellerIdFromUser(req.user);
      if (finalSellerId && expectedSellerId && finalSellerId !== expectedSellerId) {
        return res.status(403).json({ success: false, error: 'Sellers can only create products for themselves' });
      }
      finalSellerId = expectedSellerId;
    }

    // Convert and validate stock
    const numericStock = stock !== undefined && stock !== null && stock !== '' ? parseInt(stock, 10) : 0;
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
      if (price === undefined || price === null || price === '') {
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
      console.log('Images uploaded:', imageUrls.length);
    }

    // Prepare product data
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

    // Add seller_id if available
    if (finalSellerId) {
      productData.seller_id = finalSellerId;
    }

    // Add images
    if (imageUrls.length > 0) {
      productData.image = imageUrls[0];
      productData.images = imageUrls;
      productData.main_image = imageUrls[0];
    }

    console.log('Inserting product:', JSON.stringify(productData, null, 2));

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert([productData])
      .select();

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }

    console.log('✅ Product created successfully with ID:', data?.[0]?.id);
    console.log('📝 Attempting to create audit log...');
    console.log('req.user exists?', !!req.user);
    console.log('req.user.id?', req.user?.id);
    
    // CREATE AUDIT LOG
    if (req.user && req.user.id) {
      const auditPayload = {
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: "CREATE",
        module: "PRODUCT",
        description: `Created product: ${name} (ID: ${data?.[0]?.id})`,
      };
      console.log('Audit payload:', auditPayload);
      
      try {
        const auditResult = await createAuditLog(auditPayload);
        console.log('Audit log result:', auditResult);
        console.log('✅ CREATE audit log created successfully!');
      } catch (auditError) {
        console.error('❌ Audit log creation FAILED:', auditError);
        console.error('Error details:', auditError.message);
      }
    } else {
      console.log('⚠️ No user found in request, skipping audit log');
      console.log('req.user value:', req.user);
      console.log('Authorization header:', req.headers.authorization);
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

// UPDATE PRODUCT - Added seller verification
router.put('/products/:id', secureUpload, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock, category, is_active, variations, addOns } = req.body;

    console.log('========== UPDATE PRODUCT ==========');
    console.log('Product ID:', id);
    console.log('User from auth:', req.user);
    console.log('Is user present?', !!req.user);
    console.log('User ID:', req.user?.id);
    console.log('User role:', req.user?.role);

    // Get existing product
    let query = supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', id);

    // If seller, ensure they can only update their own products
    if (isSeller(req.user) && getSellerIdFromUser(req.user)) {
      query = query.eq('seller_id', getSellerIdFromUser(req.user));
    }

    const { data: existingProduct, error: fetchError } = await query.single();

    if (fetchError || !existingProduct) {
      return res.status(404).json({ success: false, error: 'Product not found or unauthorized' });
    }

    // Prepare update data
    const updateData = {
      updated_at: new Date().toISOString()
    };
    
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined && price !== null && price !== '') {
      const parsedPrice = parseFloat(price);
      if (!Number.isNaN(parsedPrice)) {
        updateData.price = parsedPrice;
      }
    }
    if (stock !== undefined && stock !== null && stock !== '') {
      const parsedStock = parseInt(stock, 10);
      if (!Number.isNaN(parsedStock)) {
        updateData.stock = parsedStock;
        updateData.status = getProductStatus(parsedStock);
      }
    }
    if (category) updateData.category = category;
    if (is_active !== undefined) {
      updateData.is_active = typeof is_active === 'string' ? is_active === 'true' : Boolean(is_active);
    }
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
        updateData.image = imageUrls[0];
        updateData.images = imageUrls;
        updateData.main_image = imageUrls[0];
      }
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;

    // ✅ ADD DETAILED AUDIT LOG DEBUGGING
    console.log('📝 Attempting to create UPDATE audit log...');
    console.log('req.user exists?', !!req.user);
    console.log('req.user.id?', req.user?.id);
    
    if (req.user && req.user.id) {
      console.log('✅ User found, creating audit log for:', req.user.email);
      
      const auditPayload = {
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: "UPDATE",
        module: "PRODUCT",
        description: `Updated product: ${name || existingProduct.name} (ID: ${id})`,
      };
      console.log('Audit payload:', auditPayload);
      
      try {
        await createAuditLog(auditPayload);
        console.log('✅ UPDATE audit log created successfully!');
      } catch (auditError) {
        console.error('❌ Audit log creation FAILED:', auditError);
        console.error('Error details:', auditError.message);
      }
    } else {
      console.log('⚠️ No user found, skipping audit log');
      console.log('req.user value:', req.user);
    }

    res.json({ success: true, data: data?.[0] });

  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE PRODUCT - Added seller verification
router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get product info before deletion for audit log
    let query = supabaseAdmin
      .from('products')
      .select('name')
      .eq('id', id);

    // If seller, ensure they can only delete their own products
    if (isSeller(req.user) && getSellerIdFromUser(req.user)) {
      query = query.eq('seller_id', getSellerIdFromUser(req.user));
    }

    const { data: product, error: fetchError } = await query.single();

    if (fetchError || !product) {
      return res.status(404).json({ success: false, error: 'Product not found or unauthorized' });
    }

    const { error } = await supabaseAdmin
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

// STOCK UPDATE - Added seller verification
router.post('/products/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { change, reason } = req.body;

    // Get existing product with seller verification
    let query = supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', id);

    // If seller, ensure they can only update stock for their own products
    if (isSeller(req.user) && getSellerIdFromUser(req.user)) {
      query = query.eq('seller_id', getSellerIdFromUser(req.user));
    }

    const { data: product, error: fetchError } = await query.single();

    if (fetchError || !product) {
      return res.status(404).json({ success: false, error: 'Product not found or unauthorized' });
    }

    const oldStock = product.stock;
    const newStock = Math.max(0, oldStock + change);
    const newStatus = getProductStatus(newStock);

    const { data, error } = await supabaseAdmin
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

// GET STOCK HISTORY - Added seller verification
router.get('/products/:id/stock-history', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify product ownership for sellers
    if (isSeller(req.user) && getSellerIdFromUser(req.user)) {
      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('seller_id')
        .eq('id', id)
        .single();

      if (productError || !product || product.seller_id !== getSellerIdFromUser(req.user)) {
        return res.status(403).json({ success: false, error: 'Unauthorized to view stock history for this product' });
      }
    }

    const { data, error } = await supabaseAdmin
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

// ARCHIVE PRODUCTS - Added seller verification
router.post('/products/archive', async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!productIds || productIds.length === 0) {
      return res.status(400).json({ success: false, error: 'No product IDs provided' });
    }

    let query = supabaseAdmin
      .from('products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .in('id', productIds);

    // If seller, ensure they can only archive their own products
    if (isSeller(req.user) && getSellerIdFromUser(req.user)) {
      query = query.eq('seller_id', getSellerIdFromUser(req.user));
    }

    const { data, error } = await query.select();

    if (error) throw error;

    // Create audit log with auth user
    if (req.user && req.user.id) {
      await createAuditLog({
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: "ARCHIVE",
        module: "PRODUCT",
        description: `Archived ${data?.length || 0} product(s)`,
      });
    }

    res.json({ success: true, data: data, message: `${data?.length || 0} product(s) archived` });

  } catch (error) {
    console.error('Error archiving products:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;