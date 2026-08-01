import express from 'express';
import Contestant from '../models/Contestant.js';
import Transaction from '../models/Transaction.js';

const router = express.Router();

router.post('/entry', async (req, res) => {
  const { contestantId, amount, method, reference } = req.body;

  if (!amount || !method) {
    return res.status(400).json({ message: 'amount and method are required' });
  }

  try {
    const transaction = await Transaction.create({
      type: 'entry',
      contestantId,
      amount,
      method,
      status: 'pending',
      metadata: { reference },
    });

    res.status(201).json({ message: 'Entry payment recorded', transaction });
  } catch (error) {
    res.status(500).json({ message: 'Failed to record entry payment', error: error.message });
  }
});

router.post('/vote', async (req, res) => {
  const { contestantId, amount, votes = 1, method, reference } = req.body;

  if (!contestantId || !amount || !method) {
    return res.status(400).json({ message: 'contestantId, amount and method are required' });
  }

  try {
    const contestant = await Contestant.findById(contestantId);
    if (!contestant) {
      return res.status(404).json({ message: 'Contestant not found' });
    }

    contestant.votes += Number(votes);
    await contestant.save();

    const transaction = await Transaction.create({
      type: 'vote',
      contestantId,
      amount,
      method,
      status: 'completed',
      metadata: { reference, votes: Number(votes) },
    });

    res.json({ message: 'Vote purchase recorded', contestant, transaction });
  } catch (error) {
    res.status(500).json({ message: 'Failed to record vote purchase', error: error.message });
  }
});

// Initialize a Flutterwave payment and return a payment link
router.post('/flutterwave/initialize', async (req, res) => {
  const { amount, currency = 'NGN', customer_email, tx_ref, redirect_url, meta = {} } = req.body;

  if (!process.env.FLW_SECRET_KEY) {
    return res.status(500).json({ message: 'FLW_SECRET_KEY is not configured on the server' });
  }

  if (!amount || !customer_email) {
    return res.status(400).json({ message: 'amount and customer_email are required' });
  }

  const reference = tx_ref || `mq_${Date.now()}`;

  try {
    const payload = {
      tx_ref: reference,
      amount: String(amount),
      currency,
      redirect_url: redirect_url || `${process.env.CLIENT_URL || 'http://localhost:3000'}/vote`,
      customer: { email: customer_email },
      meta,
    };

    const resp = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();
    if (!resp.ok) {
      return res.status(resp.status).json({ message: 'Flutterwave initialization failed', data });
    }

    // Record a pending transaction
    await Transaction.create({
      type: 'vote',
      contestantId: meta.contestantId || null,
      amount: Number(amount),
      method: 'flutterwave',
      status: 'pending',
      metadata: { tx_ref: reference, ...meta },
    });

    return res.json({ link: data.data?.link || data.data?.authorization?.url || null, raw: data });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to initialize payment', error: error.message });
  }
});

// Webhook endpoint for Flutterwave
router.post('/flutterwave/webhook', express.json({ type: '*/*' }), async (req, res) => {
  try {
    const payload = req.body;
    // Basic handling: check status in payload and update transaction if found
    const status = payload?.data?.status || payload?.event;
    const tx_ref = payload?.data?.tx_ref || payload?.data?.reference || payload?.tx_ref;

    if (status === 'successful' || status === 'charge.completed' || payload?.data?.status === 'successful') {
      // mark transaction completed by tx_ref
      const tx = await Transaction.findOne({ 'metadata.tx_ref': tx_ref });
      if (tx) {
        tx.status = 'completed';
        await tx.save();
      }
    }

    // Acknowledge receipt
    res.json({ received: true });
  } catch (error) {
    res.status(500).json({ message: 'Webhook handling failed', error: error.message });
  }
});

export default router;
