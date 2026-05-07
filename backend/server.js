// backend/server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
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
import changePasswordRoutes from './routes/changepassword.js';

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
app.use('/api', changePasswordRoutes);

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`✅ CORS enabled for:`);
  allowedOrigins.forEach(origin => console.log(`   - ${origin}`));
});