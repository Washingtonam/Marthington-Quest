import express from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import Contestant from '../models/Contestant.js';
import Transaction from '../models/Transaction.js';
import Settings from '../models/Settings.js';
import {
  canAcceptCompetitionActivity,
  resolveRequestCompetition,
} from '../utils/competitionContext.js';

const router = express.Router();

function getReference(reference) {
  return reference || `mq_${crypto.randomUUID()}`;
}

function isDuplicateKeyError(error) {
  return error?.code === 11000;
}

async function getVotingStatus(competitionId) {
  const settings = await Settings.findOne({ competitionId });
  if (!settings) return { voteTimerOpen: false };

  const voteTimerSeconds = Number(settings.voteTimerSeconds || 0);
  const status = settings.voteTimerStatus || 'inactive';
  const startedAt = settings.voteTimerStartedAt ? new Date(settings.voteTimerStartedAt) : null;
  const elapsedSeconds = Number(settings.voteTimerElapsedSeconds || 0);

  if (status === 'running' && startedAt) {
    const elapsedSinceStart = Math.floor((Date.now() - startedAt.getTime()) / 1000);
    const remainingSeconds = Math.max(voteTimerSeconds - elapsedSeconds - elapsedSinceStart, 0);
    return { voteTimerOpen: remainingSeconds > 0, remainingSeconds };
  }

  return { voteTimerOpen: false, remainingSeconds: voteTimerSeconds };
}

router.post('/entry', async (req, res) => {
  const { contestantId, method, reference } = req.body;
  if (method !== 'free' || !contestantId) {
    return res.status(400).json({ message: 'contestantId and the free payment method are required' });
  }

  try {
    const competition = await resolveRequestCompetition(req);
    if (!canAcceptCompetitionActivity(competition)) {
      return res.status(400).json({ message: 'Competition is not accepting payments' });
    }

    const contestant = await Contestant.findOne({ _id: contestantId, competitionId: competition._id });
    if (!contestant) {
      return res.status(404).json({ message: 'Contestant not found in this competition' });
    }
    if (contestant.entryPaid) {
      return res.status(409).json({ message: 'Entry has already been paid' });
    }

    const amount = Number(competition.entryFee || 0);
    if (amount !== 0) {
      return res.status(400).json({ message: 'Payment method does not match the competition entry fee' });
    }
    const txRef = getReference(reference);
    let transaction;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const updateResult = await Contestant.updateOne(
          { _id: contestantId, competitionId: competition._id, entryPaid: false },
          { $set: { entryPaid: true, status: 'paid', entryTransactionRef: txRef } },
          { session }
        );
        if (updateResult.matchedCount !== 1) {
          const error = new Error('Entry has already been paid');
          error.status = 409;
          throw error;
        }
        [transaction] = await Transaction.create([{
          competitionId: competition._id,
          txRef,
          type: 'entry',
          contestantId,
          amount,
          method,
          status: 'completed',
          meta: { reference: txRef, payment_type: 'entry', competitionId: competition._id.toString() },
        }], { session });
      });
    } finally {
      await session.endSession();
    }

    res.status(201).json({ message: 'Entry payment recorded', transaction });
  } catch (error) {
    res.status(isDuplicateKeyError(error) ? 409 : error.status || 500).json({
      message: isDuplicateKeyError(error) ? 'Payment reference already exists' : 'Failed to record entry payment',
      error: error.message,
    });
  }
});

router.post('/vote', async (req, res) => {
  const { contestantId, votes = 1, method, reference } = req.body;
  const voteCount = Number(votes);
  if (!contestantId || method !== 'free' || !Number.isInteger(voteCount) || voteCount < 1) {
    return res.status(400).json({ message: 'contestantId, the free payment method and a positive integer votes value are required' });
  }

  try {
    const competition = await resolveRequestCompetition(req);
    if (!canAcceptCompetitionActivity(competition)) {
      return res.status(400).json({ message: 'Competition is not accepting votes' });
    }
    const votingStatus = await getVotingStatus(competition._id);
    if (!votingStatus.voteTimerOpen) {
      return res.status(403).json({ message: 'Voting is currently closed' });
    }

    const contestant = await Contestant.findOne({ _id: contestantId, competitionId: competition._id });
    if (!contestant) {
      return res.status(404).json({ message: 'Contestant not found' });
    }
    if (!contestant.isApproved || !contestant.entryPaid) {
      return res.status(403).json({ message: 'Contestant is not approved for voting' });
    }
    const amount = Number(competition.voteFee || 0) * voteCount;
    if (amount !== 0) {
      return res.status(400).json({ message: 'Payment method does not match the competition vote fee' });
    }

    const txRef = getReference(reference);
    let transaction;
    let updatedContestant;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        updatedContestant = await Contestant.findOneAndUpdate(
          { _id: contestantId, competitionId: competition._id, isApproved: true, entryPaid: true },
          { $inc: { votes: voteCount } },
          { new: true, session }
        );
        if (!updatedContestant) {
          const error = new Error('Contestant is not approved for voting');
          error.status = 403;
          throw error;
        }
        [transaction] = await Transaction.create([{
          competitionId: competition._id,
          txRef,
          type: 'vote',
          contestantId,
          amount,
          method,
          status: 'completed',
          meta: {
            reference: txRef,
            votes: voteCount,
            payment_type: 'vote',
            competitionId: competition._id.toString(),
          },
        }], { session });
      });
    } finally {
      await session.endSession();
    }

    res.json({ message: 'Vote purchase recorded', contestant: updatedContestant, transaction });
  } catch (error) {
    res.status(isDuplicateKeyError(error) ? 409 : error.status || 500).json({
      message: isDuplicateKeyError(error) ? 'Payment reference already exists' : 'Failed to record vote purchase',
      error: error.message,
    });
  }
});

router.post('/flutterwave/initialize', async (req, res) => {
  const {
    currency = 'NGN',
    customer_email: customerEmail,
    tx_ref: requestedReference,
    redirect_url: redirectUrl,
    meta: requestMeta,
  } = req.body;
  const meta = requestMeta || req.body.metadata || {};
  const paymentType = req.body.payment_type || meta.payment_type || meta.type || 'vote';

  if (!process.env.FLW_SECRET_KEY) {
    return res.status(500).json({ message: 'FLW_SECRET_KEY is not configured on the server' });
  }
  if (currency !== 'NGN') {
    return res.status(400).json({ message: 'Only NGN payments are supported' });
  }
  if (!customerEmail || !['entry', 'vote'].includes(paymentType)) {
    return res.status(400).json({ message: 'customer_email and a payment type of entry or vote are required' });
  }

  try {
    const competition = await resolveRequestCompetition(req);
    if (!canAcceptCompetitionActivity(competition)) {
      return res.status(400).json({ message: 'Competition is not accepting payments' });
    }

    const contestantId = meta.contestantId;
    if (!contestantId) {
      return res.status(400).json({ message: 'meta.contestantId is required' });
    }
    const contestant = await Contestant.findOne({ _id: contestantId, competitionId: competition._id });
    if (!contestant) {
      return res.status(404).json({ message: 'Contestant not found in this competition' });
    }
    if (paymentType === 'vote' && (!contestant.isApproved || !contestant.entryPaid)) {
      return res.status(403).json({ message: 'Contestant is not approved for voting' });
    }

    let voteCount = 1;
    let amount;
    if (paymentType === 'entry') {
      if (contestant.entryPaid) {
        return res.status(409).json({ message: 'Entry has already been paid' });
      }
      amount = Number(competition.entryFee || 0);
    } else {
      voteCount = Number(meta.votes ?? meta.voteCount ?? 1);
      if (!Number.isInteger(voteCount) || voteCount < 1) {
        return res.status(400).json({ message: 'meta.votes must be a positive integer' });
      }
      const votingStatus = await getVotingStatus(competition._id);
      if (!votingStatus.voteTimerOpen) {
        return res.status(403).json({ message: 'Voting is currently closed' });
      }
      amount = Number(competition.voteFee || 0) * voteCount;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'No payment is due; use the free payment flow' });
    }

    const reference = getReference(requestedReference);
    const transactionMeta = {
      payment_type: paymentType,
      type: paymentType,
      contestantId: contestant._id.toString(),
      ...(paymentType === 'vote' ? { votes: voteCount } : {}),
      ...(meta.tier ? { tier: meta.tier } : {}),
      competitionId: competition._id.toString(),
    };
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const contestantVoteUrl =
      `${clientUrl}/competitions/${encodeURIComponent(competition.slug)}/vote/` +
      encodeURIComponent(contestant.shareSlug);
    const registrationUrl = `${clientUrl}/competitions/${encodeURIComponent(competition.slug)}/register`;
    const paymentRedirectUrl = redirectUrl ||
      `${paymentType === 'entry' ? registrationUrl : contestantVoteUrl}?status=success&tx_ref=${encodeURIComponent(reference)}`;

    await Transaction.create({
      competitionId: competition._id,
      txRef: reference,
      type: paymentType,
      contestantId: contestant._id,
      amount,
      method: 'flutterwave',
      status: 'pending',
      meta: { tx_ref: reference, ...transactionMeta },
    });

    const payload = {
      tx_ref: reference,
      amount: String(amount),
      currency,
      redirect_url: paymentRedirectUrl,
      customer: { email: customerEmail },
      customizations: {
        title: competition.title,
        description: paymentType === 'entry' ? 'Entry fee payment' : 'Vote pack purchase',
      },
      meta: transactionMeta,
      payment_options: 'card,ussd,banktransfer',
    };
    if (process.env.FLW_SUBACCOUNT_ID) {
      payload.subaccounts = [{
        id: process.env.FLW_SUBACCOUNT_ID,
        transaction_charge_type: 'flat_subaccount',
        transaction_charge: process.env.FLW_SUBACCOUNT_CHARGE || '0',
      }];
    }

    const response = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      await Transaction.updateOne({ txRef: reference, status: 'pending' }, { $set: { status: 'failed', rawResponse: data } });
      return res.status(response.status).json({ message: 'Flutterwave initialization failed', data });
    }

    await Transaction.updateOne({ txRef: reference }, { $set: { rawResponse: data } });
    return res.json({ link: data.data?.link || data.data?.authorization?.url || null, raw: data });
  } catch (error) {
    res.status(isDuplicateKeyError(error) ? 409 : error.status || 500).json({
      message: isDuplicateKeyError(error) ? 'Payment reference already exists' : 'Failed to initialize payment',
      error: error.message,
    });
  }
});

async function completeFlutterwaveTransaction(txRef, amountPaid, rawResponse) {
  const session = await mongoose.startSession();
  let alreadyProcessed = false;
  let contestant;

  try {
    await session.withTransaction(async () => {
      const transaction = await Transaction.findOne({ txRef }).session(session);
      if (!transaction) {
        const error = new Error('Transaction reference not found');
        error.status = 404;
        throw error;
      }
      if (transaction.status === 'completed') {
        alreadyProcessed = true;
        contestant = await Contestant.findOne({
          _id: transaction.contestantId,
          competitionId: transaction.competitionId,
        }).session(session);
        return;
      }
      if (transaction.status !== 'pending') {
        const error = new Error('Transaction is not pending');
        error.status = 409;
        throw error;
      }
      if (Math.abs(Number(transaction.amount) - amountPaid) > 0.01) {
        const error = new Error('Payment amount does not match the transaction');
        error.status = 400;
        throw error;
      }

      const transactionMeta = transaction.meta || transaction.metadata || {};
      const contestantId = transaction.contestantId || transactionMeta.contestantId;
      if (!contestantId || !['entry', 'vote'].includes(transaction.type)) {
        const error = new Error('Transaction is missing contestant or payment type metadata');
        error.status = 400;
        throw error;
      }

      let contestantUpdate;
      if (transaction.type === 'vote') {
        const voteCount = Number(transactionMeta.votes ?? transactionMeta.voteCount ?? 1);
        if (!Number.isInteger(voteCount) || voteCount < 1) {
          const error = new Error('Transaction has an invalid vote count');
          error.status = 400;
          throw error;
        }
        contestantUpdate = { $inc: { votes: voteCount } };
      } else {
        contestantUpdate = {
          $set: {
            entryPaid: true,
            entryTransactionRef: txRef,
            uploadAllowance: transactionMeta.tier === 'premium' ? 3 : 1,
            status: 'paid',
          },
        };
      }

      contestant = await Contestant.findOneAndUpdate(
        { _id: contestantId, competitionId: transaction.competitionId },
        contestantUpdate,
        { new: true, session }
      );
      if (!contestant) {
        const error = new Error('Contestant not found in the transaction competition');
        error.status = 404;
        throw error;
      }

      const transactionResult = await Transaction.updateOne(
        { _id: transaction._id, status: 'pending' },
        { $set: { status: 'completed', amount: amountPaid, rawResponse } },
        { session }
      );
      if (transactionResult.modifiedCount !== 1) {
        throw new Error('Transaction could not be completed');
      }
    });

    return { alreadyProcessed, contestant };
  } finally {
    await session.endSession();
  }
}

router.post('/flutterwave/verify', async (req, res) => {
  const txRef = typeof req.body?.tx_ref === 'string' ? req.body.tx_ref.trim() : '';
  if (!txRef) {
    return res.status(400).json({ message: 'tx_ref is required' });
  }
  if (!process.env.FLW_SECRET_KEY) {
    return res.status(500).json({ message: 'FLW_SECRET_KEY is not configured on the server' });
  }

  try {
    const transaction = await Transaction.findOne({ txRef, type: 'vote', method: 'flutterwave' });
    if (!transaction) {
      return res.status(404).json({ message: 'Vote payment reference not found' });
    }
    if (transaction.status === 'completed') {
      const contestant = await Contestant.findOne({
        _id: transaction.contestantId,
        competitionId: transaction.competitionId,
      }).select('votes');
      return res.json({ status: 'already processed', contestant });
    }
    if (transaction.status !== 'pending') {
      return res.status(409).json({ message: 'Vote payment is not pending' });
    }

    const response = await fetch(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
      {
        headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` },
      }
    );
    const verification = await response.json();
    if (!response.ok || verification.status !== 'success') {
      console.error('Flutterwave payment verification failed:', verification);
      return res.status(502).json({ message: 'Unable to verify payment with Flutterwave' });
    }

    const payment = verification.data;
    if (payment?.tx_ref !== txRef) {
      return res.status(400).json({ message: 'Flutterwave returned a different payment reference' });
    }
    if (String(payment?.status).toLowerCase() !== 'successful') {
      return res.status(202).json({ status: 'pending', message: 'Payment is not confirmed yet. Please check again shortly.' });
    }
    if (String(payment?.currency).toUpperCase() !== 'NGN') {
      return res.status(400).json({ message: 'Payment currency does not match the vote transaction' });
    }

    const amountPaid = Number(payment.amount);
    if (!Number.isFinite(amountPaid)) {
      return res.status(400).json({ message: 'Flutterwave returned an invalid payment amount' });
    }

    const result = await completeFlutterwaveTransaction(txRef, amountPaid, payment);
    return res.json({
      status: result.alreadyProcessed ? 'already processed' : 'success',
      contestant: result.contestant ? { votes: result.contestant.votes } : null,
    });
  } catch (error) {
    console.error('Flutterwave payment verification error:', error);
    return res.status(error.status || 500).json({
      message: 'Failed to verify vote payment',
      error: error.message,
    });
  }
});

async function handleFlutterwaveWebhook(req, res) {
  try {
    const signatureHeader = req.headers['verif-hash'] || req.headers['verifhash'] || '';
    const rawBody = req.rawBody;
    if (!rawBody?.length) {
      return res.status(400).json({ message: 'Webhook request body is missing' });
    }

    if (!process.env.FLW_SECRET_HASH) {
      return res.status(500).json({ message: 'FLW_SECRET_HASH is not configured on the server' });
    }
    const receivedSignature = Buffer.from(String(signatureHeader));
    const expectedSignature = Buffer.from(process.env.FLW_SECRET_HASH);
    if (
      receivedSignature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(receivedSignature, expectedSignature)
    ) {
      return res.status(403).json({ message: 'Invalid webhook signature' });
    }

    const payload = JSON.parse(rawBody.toString('utf-8'));
    const status = payload?.data?.status || payload?.event;
    const txRef = payload?.data?.tx_ref || payload?.data?.reference || payload?.tx_ref;
    if (!txRef) {
      return res.status(400).json({ message: 'Missing tx_ref' });
    }
    if (status !== 'successful' && status !== 'charge.completed') {
      return res.json({ received: true, message: 'Event not a successful charge' });
    }

    const amountPaid = Number(payload?.data?.amount);
    if (!Number.isFinite(amountPaid)) {
      return res.status(400).json({ message: 'Invalid payment amount' });
    }

    const result = await completeFlutterwaveTransaction(txRef, amountPaid, payload.data);
    return res.status(200).json({ status: result.alreadyProcessed ? 'already processed' : 'success' });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return res.status(400).json({ message: 'Invalid webhook JSON' });
    }
    console.error('Webhook processing error:', error);
    return res.status(error.status || 500).json({ message: 'Webhook processing failed', error: error.message });
  }
}

router.post(['/webhook', '/flutterwave/webhook'], handleFlutterwaveWebhook);

export default router;
