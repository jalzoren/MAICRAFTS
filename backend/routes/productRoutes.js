import express from 'express';
import multer from 'multer';
import supabase from '../supabaseClient.js';
import 'dotenv/config';

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

// Helper function to get product status
const getProductStatus = (stock) => {
  if (stock === 0) return 'OUT OF STOCK';
  if (stock <= 20) return 'LOW STOCK';
  return 'IN STOCK';
};

// Helper function to upload image to Supabase Storage
const uploadImageToSupabase = async (file, fileName) => {
  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(`product-images/${fileName}`, file.buffer, {
      contentType: file.mimetype,
      cacheControl: '3600'
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(`product-images/${fileName}`);

  return publicUrl;
};

// ==================== ROUTES ====================

// GET all products with filters
router.get('/products', async (req, res) => {
  try {
    const { category, status, search } = req.query;
    
    let query = supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (category && category !== 'Category') {
      query = query.eq('category', category);
    }
    if (status && status !== 'Status') {
      query = query.eq('status', status.toUpperCase());
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,id.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
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
      .select('status');

    if (error) throw error;

    const total = data.length;
    const inStock = data.filter(p => p.status === 'IN STOCK').length;
    const lowStock = data.filter(p => p.status === 'LOW STOCK').length;
    const outOfStock = data.filter(p => p.status === 'OUT OF STOCK').length;

    res.json({
      success: true,
      data: { total, inStock, lowStock, outOfStock }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET single product by ID
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

    res.json({ success: true, data: data });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST create new product
router.post('/products', upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, stock, category } = req.body;
    const imageFile = req.file;

    if (!name || !price || !category) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name, price, and category are required fields' 
      });
    }

    let imageUrl = 'https://via.placeholder.com/56x56/c8a97d/fff?text=🌸';
    
    if (imageFile) {
      const fileExt = imageFile.originalname.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      imageUrl = await uploadImageToSupabase(imageFile, fileName);
    }

    const productStock = parseInt(stock) || 0;
    const productStatus = getProductStatus(productStock);

    const { data, error } = await supabase
      .from('products')
      .insert([
        {
          name: name.trim(),
          description: description?.trim() || null,
          price: parseFloat(price),
          stock: productStock,
          category: category,
          image: imageUrl,
          status: productStatus,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) throw error;

    res.status(201).json({ 
      success: true, 
      data: data[0],
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH update product stock
router.patch('/products/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { change } = req.body;

    if (!change || typeof change !== 'number') {
      return res.status(400).json({ 
        success: false, 
        error: 'Change amount is required and must be a number' 
      });
    }

    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('stock')
      .eq('id', id)
      .single();

    if (fetchError || !product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const newStock = Math.max(0, product.stock + change);
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

    res.json({ 
      success: true, 
      data: data[0],
      message: 'Stock updated successfully'
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE product
router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('image')
      .eq('id', id)
      .single();

    if (fetchError || !product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    if (product.image && !product.image.includes('placeholder')) {
      const fileName = product.image.split('/').pop();
      await supabase.storage
        .from('product-images')
        .remove([`product-images/${fileName}`]);
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;

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
        status: 'ARCHIVED',
        updated_at: new Date().toISOString()
      })
      .in('id', productIds)
      .select();

    if (error) throw error;

    res.json({ 
      success: true, 
      data: data,
      message: `${data.length} product(s) archived successfully`
    });
  } catch (error) {
    console.error('Error archiving products:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;