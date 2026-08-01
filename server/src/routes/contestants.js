import express from 'express';
import Contestant from '../models/Contestant.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const contestants = await Contestant.find({ isApproved: true }).sort({ votes: -1, createdAt: -1 });
    res.json(contestants);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch contestants', error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const contestant = await Contestant.create(req.body);
    res.status(201).json(contestant);
  } catch (error) {
    res.status(400).json({ message: 'Failed to create contestant', error: error.message });
  }
});

router.post('/:id/vote', async (req, res) => {
  try {
    const contestant = await Contestant.findById(req.params.id);
    if (!contestant) return res.status(404).json({ message: 'Contestant not found' });

    contestant.votes += 1;
    await contestant.save();
    res.json(contestant);
  } catch (error) {
    res.status(400).json({ message: 'Failed to vote', error: error.message });
  }
});

export default router;
