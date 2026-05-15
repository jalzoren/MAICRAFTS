// routes/paymentRoutes.js
import express from 'express';
import axios from 'axios';
import supabase from '../supabaseClient.js';
import { createAuditLog } from '../services/auditService.js';

const router = express.Router();

// ========== AUTH MIDDLEWARE (for audit to know who is making requests) ==========
router.use(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('🔐 [paymentRoutes] Auth Header:', authHeader ? 'Present' : 'Missing');

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
      
      console.log('✅ [paymentRoutes] Authenticated user:', req.user.email);
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

const PAYMONGO_SECRET = process.env.PAYMONGO_SECRET_KEY; 
const PAYMONGO_API = 'https://api.paymongo.com/v1';

// Create a checkout session
const createCheckoutSession = async (amount, description, successUrl, failedUrl) => {
  const auth = Buffer.from(`${PAYMONGO_SECRET}:`).toString('base64');
  
  const payload = {
    data: {
      attributes: {
        send_email_receipt: false,
        show_description: true,
        show_line_items: true,
        line_items: [
          {
            currency: 'PHP',
            amount: Math.round(amount * 100), 
            description: description,
            name: 'MAICRAFTS Order',
            quantity: 1,
          },
        ],
        payment_method_types: ['gcash', 'paymaya', 'billease', 'card', 'grab_pay', 'shopee_pay'], 
        success_url: successUrl,
        failed_url: failedUrl,
      },
    },
  };

  const response = await axios.post(`${PAYMONGO_API}/checkout_sessions`, payload, {
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
  });
  return response.data.data;
};

// Endpoint to create a checkout session
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { amount, order_id, success_url, failed_url } = req.body;
    if (!amount || !order_id) {
      return res.status(400).json({ error: 'Missing amount or order_id' });
    }

    const description = `Order #${order_id}`;
    const session = await createCheckoutSession(amount, description, success_url, failed_url);

    // Store the payment_session_id with the order
    const { error: updateError } = await supabase
      .from('orders')
      .update({ payment_session_id: session.id })
      .eq('order_id', order_id);

    if (updateError) {
      console.error('Failed to update order with session ID:', updateError);
    }

     //  AUDIT LOG ONLY (await - important for payment creation)
     if (req.user?.id) {
      await createAuditLog({
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: 'CREATE',
        module: 'PAYMENT',
        description: `Initiated payment checkout for order ${order_id}, amount ₱${amount}`,
      });
    }  else {

      await createAuditLog({
        user_id: null,
        user_email: req.body.email || 'guest@checkout',
        user_role: 'GUEST',
        action: 'CREATE',
        module: 'PAYMENT',
        description: `Guest initiated payment checkout for order ${order_id}, amount ₱${amount}`,
      });
    }

    // checkout url
    res.json({
      success: true,
      checkout_url: session.attributes.checkout_url,
      session_id: session.id,
    });
  } catch (error) {
    console.error('PayMongo error:', error.response?.data || error.message);

    //  ERROR AUDIT LOG
    if (req.user?.id) {
      await createAuditLog({
        user_id: req.user.id,
        user_email: req.user.email,
        user_role: req.user.role,
        action: 'ERROR',
        module: 'PAYMENT',
        description: `Failed to create checkout session for order ${req.body?.order_id}: ${error.message}`,
      });
    }

    
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});



export default router;