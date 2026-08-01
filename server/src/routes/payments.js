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

export default router;
