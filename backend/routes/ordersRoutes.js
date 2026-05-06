// ordersRoutes.js
import express from 'express';
import supabase, { supabaseAdmin } from '../supabaseClient.js';

const router = express.Router();

// ==================== ROUTES ====================

// GET all orders for seller dashboard
router.get('/orders', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let query = supabaseAdmin
      .from('orders')
      .select(
        `
        id,
        order_number,
        user_id,
        customer_name,
        customer_email,
        phone_number,
        shipping_address,
        payment_method,
        shipping_option,
        order_status,
        payment_status,
        items,
        subtotal,
        shipping_fee,
        total_amount,
        special_instructions,
        created_at,
        updated_at
        `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (status) {
      query = query.eq('order_status', status.toUpperCase());
    }

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      total: count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET orders stats for dashboard
router.get('/orders/stats/summary', async (req, res) => {
  try {
    const statuses = ['PENDING', 'PREPARING', 'SHIPPED', 'COMPLETED', 'CANCELLED'];
    const stats = {};
    let totalOrders = 0;

    for (const status of statuses) {
      const { count, error } = await supabaseAdmin
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('order_status', status);

      if (error) throw error;
      stats[status.toLowerCase()] = count || 0;
      totalOrders += count || 0;
    }

    res.json({
      success: true,
      data: {
        totalOrders,
        pending: stats.pending || 0,
        preparing: stats.preparing || 0,
        shipped: stats.shipped || 0,
        completed: stats.completed || 0,
        cancelled: stats.cancelled || 0
      }
    });
  } catch (error) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET single order details
router.get('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Create new order
router.post('/orders', async (req, res) => {
  try {
    const {
      user_id,
      user_email,
      customer_name,
      phone_number,
      shipping_address,
      payment_method,
      shipping_option,
      items,
      subtotal,
      shipping_fee,
      total_amount,
      special_instructions
    } = req.body;

    // Validate required fields
    if (!customer_name || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Customer name and items are required'
      });
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now()}`;

    // Insert order
    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert([
        {
          order_number: orderNumber,
          user_id: user_id || null,
          customer_name,
          customer_email: user_email || null,
          phone_number: phone_number || null,
          shipping_address: shipping_address || null,
          payment_method: payment_method || null,
          shipping_option: shipping_option || null,
          order_status: 'PENDING',
          payment_status: 'PAID',
          items: items,
          subtotal: parseFloat(subtotal) || 0,
          shipping_fee: parseFloat(shipping_fee) || 0,
          total_amount: parseFloat(total_amount) || 0,
          special_instructions: special_instructions || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: data?.[0]
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT - Update order status
router.put('/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { order_status, payment_status } = req.body;

    if (!order_status && !payment_status) {
      return res.status(400).json({
        success: false,
        error: 'At least one status field is required'
      });
    }

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (order_status) updateData.order_status = order_status.toUpperCase();
    if (payment_status) updateData.payment_status = payment_status.toUpperCase();

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Order updated successfully',
      data: data?.[0]
    });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
