import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/register.js';
import verifyEmailRouter from "./routes/verify.js";
import loginRoutes from './routes/login.js';
import forgotPasswordRoutes from './routes/forgotpassword.js';

const app = express();
app.use(cors());
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST'],
}));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('MAICRAFTS API is running');
});

app.use('/api', authRoutes);
app.use("/api", verifyEmailRouter);
app.use('/api', forgotPasswordRoutes);

// Use login routes
app.use('/login', loginRoutes);

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});