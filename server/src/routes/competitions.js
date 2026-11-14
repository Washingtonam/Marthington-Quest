import express from 'express';
import Competition from '../models/Competition.js';
import contestantsRouter from './contestants.js';
import adminAuth from '../middleware/adminAuth.js';

const router = express.Router();

router.use('/:competitionSlug/contestants', contestantsRouter);

router.get('/', async (req, res) => {
  try {
    const competitions = await Competition.find({ status: 'active' }).sort({ startDate: 1, createdAt: -1 });
    res.json(competitions);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch competitions', error: error.message });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const competition = await Competition.findOne({
      slug: req.params.slug.toLowerCase(),
      status: { $in: ['active', 'closed'] },
    });
    if (!competition) {
      return res.status(404).json({ message: 'Competition not found' });
    }
    res.json(competition);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch competition', error: error.message });
  }
});

router.post('/', adminAuth, async (req, res) => {
  try {
    const { title, slug, description, bannerImage, rules, prizePool, entryFee, voteFee, status, startDate, endDate } = req.body;
    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ message: 'title is required' });
    }
    for (const [field, value] of Object.entries({ prizePool, entryFee, voteFee })) {
      if (value !== undefined && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
        return res.status(400).json({ message: `${field} must be a non-negative number` });
      }
    }

    const competition = await Competition.create({
      title: title.trim(),
      slug,
      description,
      bannerImage,
      rules,
      prizePool,
      entryFee,
      voteFee,
      status,
      startDate,
      endDate,
    });
    res.status(201).json(competition);
  } catch (error) {
    res.status(400).json({ message: 'Failed to create competition', error: error.message });
  }
});

export default router;
