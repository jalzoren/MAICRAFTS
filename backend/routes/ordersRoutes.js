// ordersRoutes.js
import express from 'express';
import { supabaseAdmin } from '../supabaseClient.js';
import { createAuditLog } from '../services/auditService.js';

const router = express.Router();

// ========== AUTH MIDDLEWARE (for audit to know who is making requests) ==========
router.use(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('🔐 [ordersRoutes] Auth Header:', authHeader ? 'Present' : 'Missing');

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
        .from("users")
        .select("role, first_name, last_name")
        .eq("email", user.email)
        .single();
      
      const userRole = dbUser?.role || 'CUSTOMER';
      
      req.user = {
        id: user.id,
        email: user.email,
        role: userRole,
        name: dbUser ? `${dbUser.first_name || ''} ${dbUser.last_name || ''}`.trim() : user.user_metadata?.name || user.email
      };
      
      console.log('✅ [ordersRoutes] Authenticated user:', req.user.email);
    } else {
      req.user = null;
    }
  } catch (error) {
    console.error('Token verification error:', error);
    req.user = null;
  }

  next();
});
// ========== END AUTH MIDDLEWARE ==========

// GET all orders (seller dashboard) - WITH order_items
router.get('/orders', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    // Step 1: Fetch orders
    let query = supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    
    if (status) query = query.eq('order_status', status.toLowerCase());
    
    const { data: orders, error, count } = await query;
    if (error) throw error;

    console.log(`✅ Found ${orders?.length || 0} orders`);

    // Step 2: Fetch order_items for all orders
    if (orders && orders.length > 0) {
      const orderIds = orders.map(order => order.order_id);
      
      const { data: items, error: itemsError } = await supabaseAdmin
        .from('order_items')
        .select('*')
        .in('order_id', orderIds);
      
      console.log(`📦 Found ${items?.length || 0} total items`);
      
      if (!itemsError && items && items.length > 0) {
        const itemsByOrder = {};
        items.forEach(item => {
          if (!itemsByOrder[item.order_id]) {
            itemsByOrder[item.order_id] = [];
          }
          itemsByOrder[item.order_id].push(item);
        });
        
        orders.forEach(order => {
          // Parse shipping_address if it's a string
          if (order.shipping_address && typeof order.shipping_address === 'string') {
            try {
              order.shipping_address = JSON.parse(order.shipping_address);
            } catch (e) {
              console.error('Error parsing shipping_address for order:', order.order_number);
            }
          }
          order.order_items = itemsByOrder[order.order_id] || [];
        });
      } else {
        orders.forEach(order => {
          if (order.shipping_address && typeof order.shipping_address === 'string') {
            try {
              order.shipping_address = JSON.parse(order.shipping_address);
            } catch (e) {}
          }
          order.order_items = [];
        });
      }
    }

    if (req.user?.id) {
      createAuditLog({
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: 'VIEW',
        module: 'ORDER',
        description: `Viewed orders list (${orders?.length || 0} orders)`,
      }).catch(err => console.error('Audit log error:', err));
    }

    res.json({ success: true, data: orders || [], total: count || 0, limit, offset });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET order stats
router.get('/orders/stats/summary', async (req, res) => {
  try {
    const statuses = ['pending', 'confirmed', 'preparing', 'shipped', 'completed', 'cancelled'];
    const stats = { totalOrders: 0 };
    for (const status of statuses) {
      const { count, error } = await supabaseAdmin
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('order_status', status);
      if (error) throw error;
      stats[status] = count || 0;
      stats.totalOrders += count || 0;
    }


      // ✅ AUDIT LOG ONLY (fire and forget)
      if (req.user?.id) {
        createAuditLog({
          user_id: req.user.id,
          user_email: req.user.email,
          user_role: req.user.role,
          action: 'VIEW',
          module: 'ORDER',
          description: `Viewed order stats summary`,
        }).catch(err => console.error('Audit log error:', err));
      }


    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET single order with its items
router.get('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    // Fetch order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .single();
    if (orderError || !order) return res.status(404).json({ success: false, error: 'Order not found' });
    // Fetch its items
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);
    if (itemsError) throw itemsError;

      // ✅ AUDIT LOG ONLY (fire and forget)
      if (req.user?.id) {
        createAuditLog({
          user_id: req.user.id,
          user_email: req.user.email,
          user_role: req.user.role,
          action: 'VIEW',
          module: 'ORDER',
          description: `Viewed order details: ${order.order_number}`,
        }).catch(err => console.error('Audit log error:', err));
      }


    res.json({ success: true, data: { ...order, items: items || [] } });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST – Create new order (using normalized order_items)
router.post('/orders', async (req, res) => {
  try {
    const {
      user_id,
      user_email,
      shipping_option,
      address_id,
      address,
      special_instructions,
      items,        // array of items
      subtotal,
      shipping_fee,
      total_amount,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'No items in order' });
    }
    if (shipping_option === 'delivery' && !address) {
      return res.status(400).json({ success: false, error: 'Delivery address required' });
    }

    // Get customer details from users table (snapshot)
    let customerName = null;
    let phoneNumber = null;
    let email = user_email || null;
    if (user_id) {
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('first_name, last_name, contact_number, email')
        .eq('id', user_id)
        .single();
      if (!userError && userData) {
        customerName = [userData.first_name, userData.last_name].filter(Boolean).join(' ');
        phoneNumber = userData.contact_number;
        if (!email) email = userData.email;
      }
    }
    if (!customerName) customerName = 'Guest Customer';

    const orderNumber = `ORD-${Date.now()}`;
    const shippingAddressJSON = address ? JSON.stringify(address) : null;

    // 1. Insert into orders table (snapshots)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert([{
        order_number: orderNumber,
        user_id: user_id || null,
        customer_name: customerName,
        customer_email: email,
        phone_number: phoneNumber,
        shipping_address: shippingAddressJSON,
        shipping_option: shipping_option,
        order_status: 'pending',
        payment_status: 'unpaid',
        subtotal: parseFloat(subtotal) || 0,
        shipping_fee: parseFloat(shipping_fee) || 0,
        total_amount: parseFloat(total_amount) || 0,
        special_instructions: special_instructions || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Insert each item into order_items table
    const orderItems = items.map(item => ({
      order_id: order.order_id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

        // ✅ AUDIT LOG ONLY (await - important for order creation)
    if (req.user?.id) {
      await createAuditLog({
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: 'CREATE',
        module: 'ORDER',
        description: `Created order ${orderNumber} with ${items.length} items, total ₱${total_amount}`,
      });
    } else if (user_id) {
      // Guest order but with user_id - still log
      await createAuditLog({
        user_id: user_id,
        user_email: email,
        user_role: 'CUSTOMER',
        action: 'CREATE',
        module: 'ORDER',
        description: `Created order ${orderNumber} with ${items.length} items, total ₱${total_amount}`,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order_id: order.order_id,
      order_number: order.order_number,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT – Update order status (seller)
router.put('/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { order_status, payment_status } = req.body;
    if (!order_status && !payment_status) {
      return res.status(400).json({ success: false, error: 'At least one status field required' });
    }
    const updateData = { updated_at: new Date().toISOString() };
    if (order_status) updateData.order_status = order_status.toLowerCase();
    if (payment_status) updateData.payment_status = payment_status.toLowerCase();
    const { data, error } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('order_id', orderId)
      .select();
    if (error) throw error;


      // ✅ AUDIT LOG ONLY (await - important for status change)
      if (req.user?.id) {
        await createAuditLog({
          user_id: req.user.id,
          user_email: req.user.email,
          user_role: req.user.role,
          action: 'UPDATE',
          module: 'ORDER',
          description: `Updated order ${oldOrder?.order_number || orderId}: ${statusChanges.join(', ')}`,
        });
      }

      
    res.json({ success: true, message: 'Order updated successfully', data: data?.[0] });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET orders for a specific user (customer orders tab)
router.get('/orders/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

     // Verify user can only access their own orders
     if (req.user && req.user.id !== userId && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      await createAuditLog({
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: 'FAILED',
        module: 'ORDER',
        description: `Unauthorized attempt to view orders for user ${userId}`,
      });
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_items (
          quantity,
          price,
          product:products (id, name, image, main_image)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform to match frontend expectations
    const formattedOrders = orders.map(order => ({
      id: order.order_number,
      order_id: order.order_id,
      date: new Date(order.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }),
      status: order.order_status === 'pending' ? 'Processing' :
              order.order_status === 'confirmed' ? 'Processing' :
              order.order_status === 'preparing' ? 'Processing' :
              order.order_status === 'shipped' ? 'Shipped' :
              order.order_status === 'completed' ? 'Delivered' : 'Cancelled',
      total: order.total_amount,
      items: order.order_items.map(item => item.product?.name).join(', '),
      qty: order.order_items.reduce((sum, item) => sum + item.quantity, 0),
      price: order.order_items[0]?.price || 0,
      image: order.order_items[0]?.product?.main_image || order.order_items[0]?.product?.image || null,
      customerName: order.customer_name,
      contactNumber: order.phone_number,
      address: order.shipping_address ? `${order.shipping_address.street}, ${order.shipping_address.barangay}, ${order.shipping_address.city}, ${order.shipping_address.province}` : '',
      orderPlaced: new Date(order.created_at).toLocaleString(),
      preparingToShip: order.order_status === 'preparing' || order.order_status === 'shipped' || order.order_status === 'completed' ? new Date(order.updated_at).toLocaleString() : null,
      orderShipped: order.order_status === 'shipped' || order.order_status === 'completed' ? new Date(order.updated_at).toLocaleString() : null,
      outForDelivery: order.order_status === 'completed' ? new Date(order.updated_at).toLocaleString() : null,
      delivered: order.order_status === 'completed' ? new Date(order.updated_at).toLocaleString() : null,
      paymentMethod: 'PayMongo', // or from order.payment_method if stored
      deliveryMode: order.shipping_option === 'delivery' ? 'Delivery' : 'Pickup',
      shippingFee: order.shipping_fee,
    }));


     // ✅ AUDIT LOG ONLY (fire and forget)
     if (req.user?.id && req.user.id === userId) {
      createAuditLog({
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: 'VIEW',
        module: 'ORDER',
        description: `Viewed personal orders (${formattedOrders.length} orders)`,
      }).catch(err => console.error('Audit log error:', err));
    }


    res.json({ success: true, data: formattedOrders });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST – Cancel order (customer request)
router.post('/orders/:orderId/cancel', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    // First check if order exists and is cancellable (status pending or confirmed)
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('order_status')
      .eq('order_id', orderId)
      .single();

    if (fetchError || !order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (!['pending', 'confirmed'].includes(order.order_status)) {
      return res.status(400).json({ success: false, error: 'Order cannot be cancelled at this stage' });
    }

    const { error } = await supabaseAdmin
      .from('orders')
      .update({ 
        order_status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('order_id', orderId);

    if (error) throw error;

    if (req.user?.id) {
      await createAuditLog({
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: 'CANCEL',
        module: 'ORDER',
        description: `Cancelled order ${order.order_number}. Reason: ${reason || 'No reason provided'}`,
      });
    }

    // Log the cancellation reason (optional – can store in a separate table)
    console.log(`Order ${orderId} cancelled. Reason: ${reason}`);

    res.json({ success: true, message: 'Order cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// GET single order with its items
router.get('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Fetch order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .single();
    
    if (orderError || !order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    // Parse shipping_address if it's a string
    if (order.shipping_address && typeof order.shipping_address === 'string') {
      try {
        order.shipping_address = JSON.parse(order.shipping_address);
      } catch (e) {
        console.error('Error parsing address:', e);
      }
    }
    
    // Fetch items
    const { data: order_items, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);
    
    if (itemsError) throw itemsError;
    
    res.json({ 
      success: true, 
      data: { 
        ...order, 
        order_items: order_items || [] 
      } 
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Fetch order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .single();
    
    if (orderError || !order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    // Parse shipping_address
    if (order.shipping_address && typeof order.shipping_address === 'string') {
      try {
        let addressStr = order.shipping_address;
        if (addressStr.startsWith('"') && addressStr.endsWith('"')) {
          addressStr = JSON.parse(addressStr);
        }
        order.shipping_address = JSON.parse(addressStr);
      } catch (e) {}
    }
    
    // Fetch order_items
    const { data: order_items, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);
    
    if (itemsError) throw itemsError;
    
    // Return with order_items (THIS IS KEY)
    res.json({ 
      success: true, 
      data: { 
        ...order, 
        order_items: order_items || []  // Must be "order_items"
      } 
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;