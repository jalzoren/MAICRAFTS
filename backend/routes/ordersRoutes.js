// ordersRoutes.js
import express from 'express';
import axios from "axios";
import { supabase, supabaseAdmin } from '../supabaseClient.js';
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

// POST – Confirm order receipt (customer)
router.post('/orders/:orderId/confirm-receipt', async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    // Fetch the order to verify ownership and status
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('order_status, user_id')
      .eq('order_id', orderId)
      .single();

    if (fetchError || !order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.user_id !== userId) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    if (order.order_status !== 'completed') {
      return res.status(400).json({ success: false, error: 'Order is not yet delivered' });
    }

    // Update confirmation timestamp
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ customer_confirmed_at: new Date().toISOString() })
      .eq('order_id', orderId);

    if (updateError) throw updateError;

    // Optional: audit log
    if (req.user?.id) {
      createAuditLog({
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: 'CONFIRM',
        module: 'ORDER',
        description: `Customer confirmed receipt of order ${order.order_number}`,
      }).catch(() => {});
    }

    res.json({ success: true, message: 'Order receipt confirmed' });
  } catch (error) {
    console.error('Error confirming receipt:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Business location (from .env)
const BUSINESS_LAT = parseFloat(process.env.BUSINESS_LAT) || 14.5869;
const BUSINESS_LNG = parseFloat(process.env.BUSINESS_LNG) || 121.0618;

// Helper: Geocode an address string to lat/lng using Nominatim (OpenStreetMap)
const geocodeAddress = async (addressString) => {
  if (!addressString) return null;
  try {
    const encoded = encodeURIComponent(addressString);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`;
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'MAICRAFTS/1.0' }
    });
    if (response.data && response.data.length > 0) {
      const { lat, lon } = response.data[0];
      return { lat: parseFloat(lat), lng: parseFloat(lon) };
    }
  } catch (err) {
    console.error("Geocoding error:", err.message);
  }
  return null;
};

// Haversine distance (km)
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Calculate ETA based on distance (1 km = 15 minutes)
const calculateETA = (distanceKm, shippedAt) => {
  const travelMinutes = distanceKm * 15;
  const arrival = new Date(shippedAt);
  arrival.setMinutes(arrival.getMinutes() + travelMinutes);
  return arrival;
};

const getUserAddressCoords = async (userId) => {
  const { data, error } = await supabaseAdmin
    .from('address')
    .select('lat, lng')
    .eq('user', userId)
    .eq('is_default', true)
    .single();
  if (error || !data) return null;
  return data;
};

// Helper: Deduct stock for order items (only once)
const deductStockForOrder = async (orderId, orderItems) => {
  for (const item of orderItems) {
    const { data: product, error: fetchError } = await supabaseAdmin
      .from('products')
      .select('stock')
      .eq('id', item.product_id)
      .single();
    if (fetchError) continue;
    const newStock = Math.max(0, product.stock - item.quantity);
    await supabaseAdmin
      .from('products')
      .update({ stock: newStock, updated_at: new Date().toISOString() })
      .eq('id', item.product_id);
    await supabaseAdmin.from('stock_history').insert([{
      product_id: item.product_id,
      quantity_change: -item.quantity,
      reason: `Order #${orderId} processed (status changed to preparing)`,
      admin_name: 'System (Order)'
    }]);
  }
};

// GET all orders (seller dashboard)
router.get('/orders', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    let query = supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_items (
          order_item_id,
          product_id,
          quantity,
          price,
          product:products (id, name, image, main_image)
        )
      `)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    if (status) query = query.eq('order_status', status.toLowerCase());
    const { data, error, count } = await query;
    if (error) throw error;

    // Audit Log
    if (req.user?.id) {
      createAuditLog({
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: 'VIEW',
        module: 'ORDER',
        description: `Viewed orders list (${data?.length || 0} orders)`,
      }).catch(() => {});
    }
    res.json({ success: true, data: data || [], total: count || 0, limit, offset });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET order stats
router.get('/orders/stats/summary', async (req, res) => {
  try {
    const statuses = ['pending', 'preparing', 'shipped', 'completed'];
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

    // Audit Log
    if (req.user?.id) {
      createAuditLog({
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: 'VIEW',
        module: 'ORDER',
        description: `Viewed order stats summary`,
      }).catch(() => {});
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
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .single();
    if (orderError || !order) return res.status(404).json({ success: false, error: 'Order not found' });
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .select('*, product:products (id, name, image, main_image)')
      .eq('order_id', orderId);
    if (itemsError) throw itemsError;

    // Audit Log
    if (req.user?.id) {
      createAuditLog({
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: 'VIEW',
        module: 'ORDER',
        description: `Viewed order details: ${order.order_number}`,
      }).catch(() => {});
    }
    res.json({ success: true, data: { ...order, items: items || [] } });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST – Create new order
router.post('/orders', async (req, res) => {
  try {
    const {
      user_id,
      user_email,
      shipping_option,
      address_id,
      address,
      special_instructions,
      items,   
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
    const shippingAddressObject = address ? address : null;

    // 1. Insert into orders table (snapshots)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert([{
        order_number: orderNumber,
        user_id: user_id || null,
        customer_name: customerName,
        customer_email: email,
        phone_number: phoneNumber,
        shipping_address: shippingAddressObject,
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

// PUT – Update order status (seller) – with stock deduction
router.put('/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { order_status, payment_status } = req.body;
    if (!order_status && !payment_status) {
      return res.status(400).json({ success: false, error: 'At least one status field required' });
    }

    if (order_status && !['pending', 'preparing', 'shipped', 'completed'].includes(order_status.toLowerCase())) {
      return res.status(400).json({ success: false, error: 'Invalid order status' });
    }

    const { data: currentOrder, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .single();
    if (fetchError || !currentOrder) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    let stockDeducted = currentOrder.stock_deducted || false;
    if (order_status === 'preparing' && !stockDeducted) {
      const { data: orderItems, error: itemsError } = await supabaseAdmin
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);
      if (itemsError) throw itemsError;
      if (orderItems && orderItems.length) {
        await deductStockForOrder(orderId, orderItems);
        stockDeducted = true;
      }
    }

    // ✅ Compute and store ETA when status becomes 'shipped'
    let deliveryEta = null;
    if (order_status === 'shipped' && currentOrder.shipping_option === 'delivery') {
      const coords = await getUserAddressCoords(currentOrder.user_id);
      if (coords && coords.lat && coords.lng) {
        const distance = getDistance(BUSINESS_LAT, BUSINESS_LNG, coords.lat, coords.lng);
        const travelMinutes = distance * 15;
        const arrival = new Date();
        arrival.setMinutes(arrival.getMinutes() + travelMinutes);
        deliveryEta = arrival.toISOString();
      }
    }

    const updateData = {
      updated_at: new Date().toISOString(),
      stock_deducted: stockDeducted,
      ...(deliveryEta && { delivery_eta: deliveryEta }),   // ✅ store ETA
    };
    if (order_status) updateData.order_status = order_status.toLowerCase();
    if (payment_status) updateData.payment_status = payment_status.toLowerCase();

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('order_id', orderId)
      .select();

    if (error) throw error;

    if (req.user?.id) {
      await createAuditLog({
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: 'UPDATE',
        module: 'ORDER',
        description: `Updated order ${currentOrder.order_number} status to ${order_status || 'unchanged'}`,
      });
    }

    res.json({ success: true, message: 'Order updated successfully', data: data?.[0] });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST – Bulk update order status (seller)
router.post('/orders/bulk-status', async (req, res) => {
  try {
    const { order_ids, order_status } = req.body;
    if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'No order IDs provided' });
    }
    if (!order_status || !['pending', 'preparing', 'shipped', 'completed'].includes(order_status.toLowerCase())) {
      return res.status(400).json({ success: false, error: 'Invalid order status' });
    }

    let updatedCount = 0;
    const errors = [];

    for (const orderId of order_ids) {
      // Get current order
      const { data: currentOrder, error: fetchError } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('order_id', orderId)
        .single();
      if (fetchError || !currentOrder) {
        errors.push(`Order ${orderId} not found`);
        continue;
      }

      let stockDeducted = currentOrder.stock_deducted || false;
      // If status is changing to 'preparing' and stock not deducted yet, deduct stock
      if (order_status === 'preparing' && !stockDeducted) {
        const { data: orderItems, error: itemsError } = await supabaseAdmin
          .from('order_items')
          .select('*')
          .eq('order_id', orderId);
        if (itemsError) {
          errors.push(`Failed to fetch items for order ${orderId}`);
          continue;
        }
        if (orderItems && orderItems.length) {
          await deductStockForOrder(orderId, orderItems);
          stockDeducted = true;
        }
      }

      const updateData = {
        updated_at: new Date().toISOString(),
        stock_deducted: stockDeducted,
        order_status: order_status.toLowerCase()
      };

      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update(updateData)
        .eq('order_id', orderId);

      if (updateError) {
        errors.push(`Failed to update order ${orderId}: ${updateError.message}`);
      } else {
        updatedCount++;
        // Audit log for each order (optional, could be batched)
        if (req.user?.id) {
          createAuditLog({
            user_id: req.user.id,
            user_email: req.user.email,
            user_role: req.user.role,
            action: 'BULK_UPDATE',
            module: 'ORDER',
            description: `Bulk updated order ${currentOrder.order_number} status to ${order_status}`,
          }).catch(() => {});
        }
      }
    }

    res.json({
      success: true,
      message: `Updated ${updatedCount} order(s)`,
      updated: updatedCount,
      errors: errors.length ? errors : undefined
    });
  } catch (error) {
    console.error('Error in bulk status update:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/orders/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
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

    // ✅ Correct select syntax – customer_confirmed_at is a top‑level column
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        customer_confirmed_at,
        order_items (
          quantity,
          price,
          product:products (id, name, image, main_image)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedOrders = orders.map(order => {
      let addressString = 'Pickup (no address)';
      if (order.shipping_address) {
        let addr = order.shipping_address;
        if (typeof addr === 'string') {
          try { addr = JSON.parse(addr); } catch(e) { addr = {}; }
        }
        const parts = [addr.street, addr.barangay, addr.city, addr.province].filter(p => p && p.trim());
        addressString = parts.length ? parts.join(', ') : 'Address not provided';
      }

      let customerStatus = '';
      switch (order.order_status) {
        case 'pending': customerStatus = 'Order Placed'; break;
        case 'preparing': customerStatus = 'Preparing'; break;
        case 'shipped': customerStatus = 'Shipped'; break;
        case 'completed': customerStatus = 'Delivered'; break;
        case 'cancelled': customerStatus = 'Cancelled'; break;
        default: customerStatus = 'Order Placed';
      }

      return {
        id: order.order_number,
        order_id: order.order_id,
        date: new Date(order.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }),
        status: customerStatus,
        total: order.total_amount,
        items: order.order_items.map(item => item.product?.name).join(', '),
        qty: order.order_items.reduce((sum, item) => sum + item.quantity, 0),
        price: order.order_items[0]?.price || 0,
        image: order.order_items[0]?.product?.main_image || order.order_items[0]?.product?.image || null,
        customerName: order.customer_name,
        contactNumber: order.phone_number,
        address: addressString,
        specialInstructions: order.special_instructions || null,
        orderPlaced: new Date(order.created_at).toLocaleString(),
        preparingToShip: order.order_status !== 'pending' && order.order_status !== 'cancelled'
          ? new Date(order.updated_at).toLocaleString()
          : null,
        orderShipped: (order.order_status === 'shipped' || order.order_status === 'completed')
          ? new Date(order.updated_at).toLocaleString()
          : null,
        delivered: order.order_status === 'completed'
          ? new Date(order.updated_at).toLocaleString()
          : null,
        eta: order.delivery_eta
          ? new Date(order.delivery_eta).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
          : null,
        paymentMethod: 'PayMongo',
        deliveryMode: order.shipping_option === 'delivery' ? 'Delivery' : 'Pickup',
        shippingFee: order.shipping_fee,
        customerConfirmedAt: order.customer_confirmed_at,   // ✅ included for frontend
      };
    });

    if (req.user?.id && req.user.id === userId) {
      createAuditLog({
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: 'VIEW',
        module: 'ORDER',
        description: `Viewed personal orders (${formattedOrders.length} orders)`,
      }).catch(() => {});
    }

    res.json({ success: true, data: formattedOrders });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


export default router;