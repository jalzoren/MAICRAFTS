// routes/paymentRoutes.js
import express from 'express';
import axios from 'axios';
import supabase from '../supabaseClient.js';

const router = express.Router();

const PAYMONGO_SECRET = process.env.PAYMONGO_SECRET_KEY; 
const PAYMONGO_API = 'https://api.paymongo.com/v1';

// Helper: Create a checkout session
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
            amount: Math.round(amount * 100), // PayMongo uses centavos
            description: description,
            name: 'MAICRAFTS Order',
            quantity: 1,
          },
        ],
        payment_method_types: ['gcash', 'paymaya'], // GCash and Maya
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

    // Store the payment_session_id with the order (so webhook can update it later)
    const { error: updateError } = await supabase
      .from('orders')
      .update({ payment_session_id: session.id })
      .eq('order_id', order_id);

    if (updateError) {
      console.error('Failed to update order with session ID:', updateError);
      // Continue anyway; webhook may still work if we use order_id mapping (but safer to store)
    }

    res.json({
      success: true,
      checkout_url: session.attributes.checkout_url,
      session_id: session.id,
    });
  } catch (error) {
    console.error('PayMongo error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});



export default router;