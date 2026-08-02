import express from 'express';
import Settings from '../models/Settings.js';

const router = express.Router();

// Public settings endpoint (read-only)
router.get('/', async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json({ entryFee: settings.entryFee, voteFee: settings.voteFee });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch settings', error: error.message });
  }
});

export default router;
