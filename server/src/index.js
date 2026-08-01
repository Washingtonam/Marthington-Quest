import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import mongoose from 'mongoose';
import contestantsRouter from './routes/contestants.js';
import adminRouter from './routes/admin.js';
import paymentsRouter from './routes/payments.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'https://marthington-quest.vercel.app',
  'https://marthington-quest.onrender.com',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Marthington Quest API is running' });
});

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Marthington Quest API' });
});

app.use('/api/contestants', contestantsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/admin', adminRouter);

async function startServer() {
  try {
    if (process.env.MONGODB_URI) {
      try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected');
      } catch (dbError) {
        console.warn('MongoDB connection failed, continuing without DB:', dbError.message);
      }
    } else {
      console.log('MONGODB_URI not set, continuing without DB connection');
    }

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
