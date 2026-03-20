import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import loginRoutes from './routes/login.js';

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('MAICRAFTS API is running');
});

// Use login routes
app.use('/login', loginRoutes);

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});