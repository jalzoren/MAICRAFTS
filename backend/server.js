import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/register.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('MAICRAFTS API is running');
});

app.use('/api', authRoutes);

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});