import express from 'express';
import Contestant from '../models/Contestant.js';
import Transaction from '../models/Transaction.js';
import Settings from '../models/Settings.js';
import adminAuth from '../middleware/adminAuth.js';

const router = express.Router();

router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalContestants = await Contestant.countDocuments();
    const pendingEntries = await Contestant.countDocuments({ isApproved: false });
    const approvedEntries = await Contestant.countDocuments({ isApproved: true });
    const votesResult = await Contestant.aggregate([
      { $group: { _id: null, total: { $sum: '$votes' } } },
    ]);
    const revenueResult = await Transaction.aggregate([
      { $group: { _id: null, amount: { $sum: '$amount' } } },
    ]);

    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }

    res.json({
      totalContestants,
      pendingEntries,
      approvedEntries,
      totalVotes: votesResult[0]?.total || 0,
      totalRevenue: revenueResult[0]?.amount || 0,
      entryFee: Number(settings.entryFee || process.env.ENTRY_FEE_NAIRA || 0),
      voteFee: Number(settings.voteFee || process.env.VOTE_FEE_NAIRA || 0),
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch admin stats', error: error.message });
  }
});

router.get('/contestants/pending', adminAuth, async (req, res) => {
  try {
    const contestants = await Contestant.find({ isApproved: false }).sort({ createdAt: -1 });
    res.json(contestants);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pending contestants', error: error.message });
  }
});

router.get('/contestants', adminAuth, async (req, res) => {
  try {
    const contestants = await Contestant.find().sort({ createdAt: -1 });
    res.json(contestants);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch contestants', error: error.message });
  }
});

// delete contestant
router.delete('/contestants/:id', adminAuth, async (req, res) => {
  try {
    const contestant = await Contestant.findById(req.params.id);
    if (!contestant) return res.status(404).json({ message: 'Contestant not found' });

    await contestant.deleteOne();
    res.json({ message: 'Contestant deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete contestant', error: error.message });
  }
});

// update contestant (patch fields)
router.patch('/contestants/:id', adminAuth, async (req, res) => {
  try {
    const contestant = await Contestant.findById(req.params.id);
    if (!contestant) return res.status(404).json({ message: 'Contestant not found' });

    const allowed = ['isApproved', 'entryPaid', 'firstName', 'lastName', 'photoTitle', 'photoDescription', 'category', 'uploadAllowance', 'status', 'votes'];
    allowed.forEach((k) => {
      if (Object.prototype.hasOwnProperty.call(req.body, k)) {
        contestant[k] = req.body[k];
      }
    });

    await contestant.save();
    res.json({ message: 'Contestant updated', contestant });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update contestant', error: error.message });
  }
});

// settings GET/PATCH
router.get('/settings', adminAuth, async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch settings', error: error.message });
  }
});

router.patch('/settings', adminAuth, async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }

    const { entryFee, voteFee } = req.body;
    if (typeof entryFee === 'number') settings.entryFee = entryFee;
    if (typeof voteFee === 'number') settings.voteFee = voteFee;

    await settings.save();
    res.json({ message: 'Settings updated', settings });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update settings', error: error.message });
  }
});

router.get('/contestants/:id', adminAuth, async (req, res) => {
  try {
    const contestant = await Contestant.findById(req.params.id);
    if (!contestant) {
      return res.status(404).json({ message: 'Contestant not found' });
    }

    res.json(contestant);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch contestant details', error: error.message });
  }
});

router.patch('/contestants/:id/approve', adminAuth, async (req, res) => {
  try {
    const contestant = await Contestant.findById(req.params.id);
    if (!contestant) {
      return res.status(404).json({ message: 'Contestant not found' });
    }

    contestant.isApproved = true;
    contestant.status = 'approved';
    await contestant.save();
    res.json({ message: 'Contestant approved', contestant });
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve contestant', error: error.message });
  }
});

export default router;
