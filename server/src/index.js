import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import mongoose from 'mongoose';
import contestantsRouter from './routes/contestants.js';
import adminRouter from './routes/admin.js';
import paymentsRouter from './routes/payments.js';
import settingsRouter from './routes/settings.js';
import competitionsRouter from './routes/competitions.js';
import migrateCompetitionData from './utils/migrateCompetitionData.js';
import Competition from './models/Competition.js';
import Contestant from './models/Contestant.js';
import Transaction from './models/Transaction.js';
import Settings from './models/Settings.js';

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
app.use(
  express.json({
    verify: (req, res, buffer) => {
      if (req.path === '/api/payments/webhook' || req.path === '/api/payments/flutterwave/webhook') {
        req.rawBody = Buffer.from(buffer);
      }
    },
  })
);
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Marthington Quest API is running' });
});

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Marthington Quest API' });
});

// deliberately block public /admin client route to avoid exposing dashboard
app.all('/admin', (req, res) => {
  res.status(404).send('Not found');
});

// secret redirect endpoint: visit /admin-enter with token and email to access hidden admin UI
app.all('/admin-enter', (req, res) => {
  if (req.method !== 'POST') {
    return res.status(404).send('Not found');
  }

  const { token, email } = req.body || {};
  if (!token || !email) {
    return res.status(404).json({ message: 'Not found' });
  }

  if (!process.env.ADMIN_TOKEN) {
    return res.status(500).json({ message: 'Admin token not configured' });
  }

  const allowedEmails = process.env.ADMIN_EMAILS
    ? process.env.ADMIN_EMAILS.split(',').map((address) => address.trim().toLowerCase()).filter(Boolean)
    : [];

  if (token !== process.env.ADMIN_TOKEN || !allowedEmails.includes(String(email).toLowerCase())) {
    return res.status(404).json({ message: 'Not found' });
  }

  const client = process.env.CLIENT_URL || 'http://localhost:3000';
  return res.json({ redirect: `${client.replace(/\/$/, '')}/admin/competitions` });
});

app.use('/api/contestants', contestantsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/admin/competitions/:competitionId', adminRouter);
app.use('/api/admin', adminRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/competitions', competitionsRouter);

async function startServer() {
  try {
    if (process.env.MONGODB_URI) {
      try {
        mongoose.set('autoIndex', false);
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected');
      } catch (dbError) {
        console.warn('MongoDB connection failed, continuing without DB:', dbError.message);
      }
      if (mongoose.connection.readyState === 1) {
        await migrateCompetitionData();
        await Promise.all([
          Competition.createIndexes(),
          Contestant.createIndexes(),
          Transaction.createIndexes(),
          Settings.createIndexes(),
        ]);
        console.log('Competition data migration complete');
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
