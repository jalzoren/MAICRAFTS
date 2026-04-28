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
//import cartRoutes from './routes/cartRoutes.js';  ==== wala muna cart routes pero meron ng CART CONTEXT sa frontend, so pwede na mag integrate naka ready na yan sya ====
import addressRoutes from './routes/addressRoutes.js';
import productRoutes from './routes/productRoutes.js';
import contactAdminRoute from "./routes/contactAdmin.js";

const app = express();

// Update CORS to allow multiple origins
const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS policy violation'), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('MAICRAFTS API is running');
});

app.use('/api', authRoutes);
app.use("/api", verifyEmailRouter);
app.use('/api', forgotPasswordRoutes);
app.use('/login', loginRoutes); 
app.use('/api', superloginRoutes);    
app.use('/api', userRoutes);
//app.use('/api/cart', cartRoutes);
app.use('/api/address', addressRoutes);
app.use('/api', productRoutes); 
app.use("/api", contactAdminRoute);

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});