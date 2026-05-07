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

// GET orders for a specific user (customer orders tab)
router.get('/orders/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
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

    // Log the cancellation reason (optional – can store in a separate table)
    console.log(`Order ${orderId} cancelled. Reason: ${reason}`);

    res.json({ success: true, message: 'Order cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;