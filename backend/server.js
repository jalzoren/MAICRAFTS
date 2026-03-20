import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/register.js';
import verifyEmailRouter from "./routes/verify.js";
import loginRoutes from './routes/login.js';

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('MAICRAFTS API is running');
});

app.use('/api', authRoutes);
app.use("/api", verifyEmailRouter);

// Use login routes
app.use('/login', loginRoutes);

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});