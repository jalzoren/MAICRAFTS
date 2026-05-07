// backend/server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';                
import { supabaseAdmin } from './supabaseClient.js';
import authRoutes from './routes/register.js';
import verifyEmailRouter from "./routes/verify.js";
import loginRoutes from './routes/login.js';
import superloginRoutes from './routes/superlogin.js';
import forgotPasswordRoutes from './routes/forgotpassword.js';
import userRoutes from './routes/userRoutes.js';
import addressRoutes from './routes/addressRoutes.js';
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import ordersRoutes from './routes/ordersRoutes.js';
import contactAdminRoute from "./routes/contactAdmin.js";
import settingsRoutes from './routes/settings.js';
import settingsPassword from './routes/passwordSettings.js';
import auditLogsRoute from './routes/auditLogs.js';
import setPasswordRoute from "./routes/set-password.js";
import consentRoutes from './routes/consentRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';

const app = express();

// CORS - Allow ALL localhost variations
const allowedOrigins = [
  'http://localhost:5173',
  'http://www.localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://localhost:3000'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    // For development, allow any localhost
    if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      res.header('Access-Control-Allow-Origin', origin);
    }
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Use express.raw to get the raw body for signature verification
app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const signatureHeader = req.headers['paymongo-signature'];
  if (!signatureHeader) {
    console.error('Missing paymongo-signature header');
    return res.status(401).send('Unauthorized');
  }

  // Parse the signature header: format "t=timestamp, te=signature"
  const parts = signatureHeader.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.slice(2);
  const receivedSignature = parts.find(p => p.startsWith('te='))?.slice(3);

  if (!timestamp || !receivedSignature) {
    console.error('Invalid signature format');
    return res.status(400).send('Bad Request');
  }

  // Re-create the signature using your webhook secret
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
  const payload = req.body.toString(); // raw body string
  const signedPayload = `${timestamp}.${payload}`;
  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  // Use constant-time comparison to avoid timing attacks
  if (!crypto.timingSafeEqual(Buffer.from(generatedSignature), Buffer.from(receivedSignature))) {
    console.error('Invalid signature');
    return res.status(401).send('Unauthorized');
  }

  // Signature is valid – now parse the JSON body
  const event = JSON.parse(payload);
  console.log('Verified webhook event:', event);

  // Process the event (same as before)
  if (event.data?.attributes?.type === 'checkout_session.payment_paid') {
    const sessionId = event.data.id;
    console.log(`✅ Payment succeeded for session ${sessionId}`);

    // Update order status
    const { error } = await supabaseAdmin
      .from('orders')
      .update({ payment_status: 'paid', order_status: 'confirmed' })
      .eq('payment_session_id', sessionId);

    if (error) {
      console.error('Failed to update order:', error);
      return res.status(500).send('Webhook handling failed');
    }
  }

  res.sendStatus(200);
});

app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('MAICRAFTS API is running');
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
});

app.use('/api', authRoutes);
app.use("/api", verifyEmailRouter);
app.use('/api', forgotPasswordRoutes);
app.use('/login', loginRoutes); 
app.use('/api', superloginRoutes);    
app.use('/api', userRoutes);
app.use('/api/address', addressRoutes);
app.use('/api', productRoutes); 
app.use('/api', cartRoutes);
app.use('/api', ordersRoutes);
app.use("/api", contactAdminRoute);
app.use("/api", auditLogsRoute);
app.use('/api/settings', settingsRoutes);              
app.use('/api/password-settings', settingsPassword);  
app.use("/api", setPasswordRoute);
app.use('/api/consent', consentRoutes);
app.use('/api/payment', paymentRoutes);

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`✅ CORS enabled for:`);
  allowedOrigins.forEach(origin => console.log(`   - ${origin}`));
});