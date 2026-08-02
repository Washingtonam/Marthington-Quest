import express from 'express';
import crypto from 'crypto';
import Contestant from '../models/Contestant.js';
import Transaction from '../models/Transaction.js';

const router = express.Router();

router.post('/entry', async (req, res) => {
  const { contestantId, amount, method, reference } = req.body;

  if (typeof amount !== 'number' || !method || !contestantId) {
    return res.status(400).json({ message: 'contestantId, amount and method are required' });
  }

  try {
    const transactionData = {
      type: 'entry',
      contestantId,
      amount,
      method,
      status: method === 'free' ? 'completed' : 'pending',
      metadata: { reference },
    };

    const transaction = await Transaction.create(transactionData);

    if (method === 'free') {
      await Contestant.findByIdAndUpdate(contestantId, {
        $set: {
          entryPaid: true,
          status: 'paid',
          entryTransactionRef: reference,
        },
      });
    }

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
    const signatureHeader = req.headers['verif-hash'] || req.headers['verifhash'] || '';
    const rawBody = req.body instanceof Buffer ? req.body : Buffer.from('');
    const payload = JSON.parse(rawBody.toString('utf-8'));

    if (process.env.FLW_SECRET_HASH) {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.FLW_SECRET_HASH)
        .update(rawBody)
        .digest('hex');

      if (!signatureHeader || signatureHeader !== expectedSignature) {
        return res.status(403).json({ message: 'Invalid webhook signature' });
      }
    } else {
      console.warn('FLW_SECRET_HASH not configured; webhook signature is not being verified.');
    }
    const status = payload?.data?.status || payload?.event;
    const tx_ref = payload?.data?.tx_ref || payload?.data?.reference || payload?.tx_ref;

    if (!tx_ref) {
      return res.status(400).json({ message: 'Missing tx_ref' });
    }

    // Only process successful charge events
    const successful = status === 'successful' || status === 'charge.completed' || payload?.data?.status === 'successful';
    if (!successful) {
      return res.json({ received: true, message: 'Event not a successful charge' });
    }

    const meta = payload?.data?.meta || {};
    const amountPaid = payload?.data?.amount || 0;

    // Attempt to atomically mark the transaction as completed if it exists and is not already completed.
    // This prevents race conditions where multiple webhook deliveries try to process the same tx_ref.
    try {
      // Try to update an existing pending transaction to completed
      const updateResult = await Transaction.updateOne(
        { 'metadata.tx_ref': tx_ref, status: { $ne: 'completed' } },
        { $set: { status: 'completed', amount: Number(amountPaid), rawResponse: payload.data } }
      );

      let txDoc = await Transaction.findOne({ 'metadata.tx_ref': tx_ref });

      if (updateResult.matchedCount === 0) {
        // No pending transaction was matched. Possible reasons:
        // - transaction doesn't exist yet
        // - transaction already completed
        if (txDoc && txDoc.status === 'completed') {
          return res.status(200).json({ status: 'already processed' });
        }

        // Create a completed transaction record if none exists
        if (!txDoc) {
          const inferredType = txDoc?.type || meta.payment_type || meta.type || payload?.data?.payment_type || 'vote';
          txDoc = await Transaction.create({
            type: inferredType,
            contestantId: meta.contestantId || null,
            amount: Number(amountPaid),
            method: 'flutterwave',
            status: 'completed',
            metadata: { tx_ref, ...meta },
          });
        }
      }

      // At this point txDoc exists and has status 'completed'
      if (!txDoc) {
        // Defensive: fetch again
        txDoc = await Transaction.findOne({ 'metadata.tx_ref': tx_ref });
      }

      // Idempotent side-effects: only perform changes if we transitioned the txn in this run
      // If updateResult.matchedCount === 1 or we just created txDoc, proceed; otherwise skip.
      const shouldApplySideEffects = updateResult.matchedCount === 1 || (txDoc && txDoc.createdAt && (new Date() - new Date(txDoc.createdAt) < 5000));

      if (shouldApplySideEffects) {
        const paymentType = txDoc.type || meta.payment_type || meta.type || 'vote';

        if (paymentType === 'vote' && (txDoc.contestantId || meta.contestantId)) {
          const contestantId = txDoc.contestantId || meta.contestantId;
          const votesToAdd = Number(txDoc.metadata?.votes || meta.votes || meta.voteCount || 1);

          // Atomic increment to avoid race conditions
          await Contestant.findByIdAndUpdate(contestantId, { $inc: { votes: votesToAdd } });
        }

        if (paymentType === 'entry' && (txDoc.contestantId || meta.contestantId)) {
          const contestantId = txDoc.contestantId || meta.contestantId;
          await Contestant.findByIdAndUpdate(contestantId, {
            $set: {
              entryPaid: true,
              entryTransactionRef: tx_ref,
              uploadAllowance: meta?.tier === 'premium' ? 3 : 1,
              status: 'paid',
            },
          });
        }
      }

      return res.status(200).json({ status: 'success' });
    } catch (err) {
      console.error('Webhook processing error:', err);
      return res.status(500).json({ error: 'Internal webhook processing error' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Webhook handling failed', error: error.message });
  }
});

export default router;
