import express from 'express';
import Contestant from '../models/Contestant.js';
import Transaction from '../models/Transaction.js';
import Settings from '../models/Settings.js';
import adminAuth from '../middleware/adminAuth.js';

const router = express.Router();

function computeVoteTimerSettings(settings) {
  const voteTimerSeconds = Number(settings.voteTimerSeconds || 0);
  const status = settings.voteTimerStatus || 'inactive';
  const startedAt = settings.voteTimerStartedAt ? new Date(settings.voteTimerStartedAt) : null;
  const elapsedSeconds = Number(settings.voteTimerElapsedSeconds || 0);

  let remainingSeconds = voteTimerSeconds;
  let voteTimerOpen = false;
  let endsAt = null;
  let effectiveStatus = status;

  if (status === 'running' && startedAt) {
    const elapsedSinceStart = Math.floor((Date.now() - startedAt.getTime()) / 1000);
    const totalElapsed = elapsedSeconds + elapsedSinceStart;
    remainingSeconds = Math.max(voteTimerSeconds - totalElapsed, 0);
    if (remainingSeconds > 0) {
      voteTimerOpen = true;
      endsAt = new Date(Date.now() + remainingSeconds * 1000);
    } else {
      voteTimerOpen = false;
      effectiveStatus = 'inactive';
      remainingSeconds = 0;
    }
  } else if (status === 'paused') {
    remainingSeconds = Math.max(voteTimerSeconds - elapsedSeconds, 0);
    voteTimerOpen = false;
  } else {
    remainingSeconds = voteTimerSeconds;
    voteTimerOpen = false;
  }

  return {
    voteTimerSeconds,
    voteTimerStatus: status,
    voteTimerEffectiveStatus: effectiveStatus,
    voteTimerStartedAt: startedAt,
    voteTimerElapsedSeconds: elapsedSeconds,
    voteTimerRemainingSeconds: remainingSeconds,
    voteTimerOpen,
    voteTimerEndsAt: endsAt,
  };
}

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
    res.json({ ...settings.toObject(), ...computeVoteTimerSettings(settings) });
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

    const { entryFee, voteFee, voteTimerSeconds, voteTimerAction } = req.body;
    if (typeof entryFee === 'number') settings.entryFee = entryFee;
    if (typeof voteFee === 'number') settings.voteFee = voteFee;
    if (typeof voteTimerSeconds === 'number') settings.voteTimerSeconds = voteTimerSeconds;

    const now = new Date();
    if (voteTimerAction === 'start') {
      if (settings.voteTimerStatus === 'paused') {
        settings.voteTimerStartedAt = now;
        settings.voteTimerStatus = 'running';
      } else {
        settings.voteTimerStartedAt = now;
        settings.voteTimerElapsedSeconds = 0;
        settings.voteTimerStatus = 'running';
      }
    } else if (voteTimerAction === 'pause' && settings.voteTimerStatus === 'running' && settings.voteTimerStartedAt) {
      const elapsedSinceStart = Math.floor((now.getTime() - new Date(settings.voteTimerStartedAt).getTime()) / 1000);
      settings.voteTimerElapsedSeconds += elapsedSinceStart;
      settings.voteTimerStartedAt = null;
      settings.voteTimerStatus = 'paused';
    } else if (voteTimerAction === 'stop') {
      settings.voteTimerStatus = 'inactive';
      settings.voteTimerStartedAt = null;
      settings.voteTimerElapsedSeconds = 0;
    } else if (voteTimerAction === 'reset') {
      settings.voteTimerStatus = 'inactive';
      settings.voteTimerStartedAt = null;
      settings.voteTimerElapsedSeconds = 0;
    }

    await settings.save();
    res.json({ message: 'Settings updated', settings: { ...settings.toObject(), ...computeVoteTimerSettings(settings) } });
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
