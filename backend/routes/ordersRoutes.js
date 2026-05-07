// ordersRoutes.js
import express from 'express';
import { supabaseAdmin } from '../supabaseClient.js';

const router = express.Router();

// GET all orders (seller dashboard)
router.get('/orders', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    let query = supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    if (status) query = query.eq('order_status', status.toLowerCase());
    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ success: true, data: data || [], total: count || 0, limit, offset });
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
    res.json({ success: true, message: 'Order updated successfully', data: data?.[0] });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;