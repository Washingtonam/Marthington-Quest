import express from 'express';
import Contestant from '../models/Contestant.js';
import Transaction from '../models/Transaction.js';
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

    res.json({
      totalContestants,
      pendingEntries,
      approvedEntries,
      totalVotes: votesResult[0]?.total || 0,
      totalRevenue: revenueResult[0]?.amount || 0,
      entryFee: Number(process.env.ENTRY_FEE_NAIRA || 0),
      voteFee: Number(process.env.VOTE_FEE_NAIRA || 0),
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

router.patch('/contestants/:id/approve', adminAuth, async (req, res) => {
  try {
    const contestant = await Contestant.findById(req.params.id);
    if (!contestant) {
      return res.status(404).json({ message: 'Contestant not found' });
    }

    contestant.isApproved = true;
    await contestant.save();
    res.json({ message: 'Contestant approved', contestant });
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve contestant', error: error.message });
  }
});

export default router;
