import express from 'express';
import crypto from 'crypto';
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
  const { amount, currency = 'NGN', customer_email, tx_ref, redirect_url, meta = {}, payment_type = 'vote' } = req.body;

  if (!process.env.FLW_SECRET_KEY) {
    return res.status(500).json({ message: 'FLW_SECRET_KEY is not configured on the server' });
  }

  if (!amount || !customer_email) {
    return res.status(400).json({ message: 'amount and customer_email are required' });
  }

  const reference = tx_ref || `mq_${Date.now()}`;
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  let entryRedirectUrl = `${clientUrl}/register?status=success&tx_ref=${encodeURIComponent(reference)}`;

  if (payment_type === 'entry' && meta.contestantId) {
    const contestant = await Contestant.findById(meta.contestantId);
    if (contestant?.shareUrl) {
      entryRedirectUrl = `${contestant.shareUrl}?status=paid&tx_ref=${encodeURIComponent(reference)}`;
    }
  }

  try {
    const payload = {
      tx_ref: reference,
      amount: String(amount),
      currency,
      redirect_url: redirect_url || entryRedirectUrl,
      customer: { email: customer_email },
      customizations: {
        title: 'Marthington Quest Voting',
        description: payment_type === 'entry' ? 'Entry fee payment' : 'Vote pack purchase',
      },
      meta,
      payment_options: 'card,ussd,banktransfer',
    };

    if (process.env.FLW_SUBACCOUNT_ID) {
      payload.subaccounts = [
        {
          id: process.env.FLW_SUBACCOUNT_ID,
          transaction_charge_type: 'flat_subaccount',
          transaction_charge: process.env.FLW_SUBACCOUNT_CHARGE || '0',
        },
      ];
    }

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
      type: payment_type,
      contestantId: meta.contestantId || null,
      amount: Number(amount),
      method: 'flutterwave',
      status: 'pending',
      metadata: { tx_ref: reference, payment_type, ...meta },
    });

    return res.json({ link: data.data?.link || data.data?.authorization?.url || null, raw: data });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to initialize payment', error: error.message });
  }
});

// Webhook endpoint for Flutterwave
router.post('/flutterwave/webhook', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    if (!process.env.FLW_SECRET_HASH) {
      return res.status(500).json({ message: 'FLW_SECRET_HASH not configured' });
    }

    const signatureHeader = req.headers['verif-hash'] || req.headers['verifhash'] || '';
    const rawBody = req.body instanceof Buffer ? req.body : Buffer.from('');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.FLW_SECRET_HASH)
      .update(rawBody)
      .digest('hex');

    if (!signatureHeader || signatureHeader !== expectedSignature) {
      return res.status(403).json({ message: 'Invalid webhook signature' });
    }

    const payload = JSON.parse(rawBody.toString('utf-8'));
    const status = payload?.data?.status || payload?.event;
    const tx_ref = payload?.data?.tx_ref || payload?.data?.reference || payload?.tx_ref;

    if (!tx_ref) {
      return res.status(400).json({ message: 'Missing tx_ref' });
    }

    const tx = await Transaction.findOne({ 'metadata.tx_ref': tx_ref });
    if (!tx) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (status === 'successful' || status === 'charge.completed' || payload?.data?.status === 'successful') {
      tx.status = 'completed';
      await tx.save();

      if (tx.type === 'entry' && tx.metadata?.contestantId) {
        const contestant = await Contestant.findById(tx.metadata.contestantId);
        if (contestant) {
          contestant.entryPaid = true;
          contestant.entryTransactionRef = tx_ref;
          contestant.uploadAllowance = tx.metadata?.tier === 'premium' ? 3 : 1;
          contestant.status = 'paid';
          await contestant.save();
        }
      }

      if (tx.type === 'vote' && tx.metadata?.contestantId) {
        const contestant = await Contestant.findById(tx.metadata.contestantId);
        if (contestant) {
          contestant.votes += Number(tx.metadata?.votes || 1);
          await contestant.save();
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    res.status(500).json({ message: 'Webhook handling failed', error: error.message });
  }
});

export default router;
