// backend/server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import authRoutes from './routes/register.js';
import verifyEmailRouter from "./routes/verify.js";
import loginRoutes from './routes/login.js';
import superloginRoutes from './routes/superlogin.js';
import forgotPasswordRoutes from './routes/forgotpassword.js';
import userRoutes from './routes/userRoutes.js';
import addressRoutes from './routes/addressRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import ordersRoutes from './routes/ordersRoutes.js';
import contactAdminRoute from "./routes/contactAdmin.js";
import settingsRoutes from './routes/settings.js';
import settingsPassword from './routes/passwordSettings.js';
import auditLogsRoute from './routes/auditLogs.js';
import setPasswordRoute from "./routes/set-password.js";
import consentRoutes from './routes/consentRoutes.js';
import productRoutes from './routes/productRoutes.js';
import changePasswordRoutes from './routes/changepassword.js';

const app = express();

// CORS - Allow ALL localhost variations
const allowedOrigins = [
  'http://localhost:5173',
  'http://www.localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:5175',
  'http://localhost:5176'
];

// CORS Middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      res.header('Access-Control-Allow-Origin', origin);
    }
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Cookie Parser
app.use(cookieParser());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.path}`);
  next();
});

app.get('/api/csrf-token', (req, res) => {
  try {
    const token = crypto.randomBytes(32).toString('hex');
    
    res.cookie('csrf_token', token, {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/'
    });
    
    console.log('✅ CSRF token generated at /api/csrf-token');
    res.json({ success: true, csrf_token: token });
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/', (req, res) => {
  res.send('MAICRAFTS API is running');
});

app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working!', 
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ========== API ROUTES ==========
app.use('/api/consent', consentRoutes);
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});
app.use('/api/consent', consentRoutes);
app.use('/api', changePasswordRoutes);

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`\n🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}`);
  console.log(`\n✅ CSRF Endpoint: http://localhost:${PORT}/api/csrf-token`);
  console.log(`✅ Consent Test: http://localhost:${PORT}/api/consent/test`);
  console.log(`\n✨ Ready to accept requests!\n`);
});