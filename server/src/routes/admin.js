import express from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import Contestant from '../models/Contestant.js';
import Transaction from '../models/Transaction.js';
import Competition from '../models/Competition.js';
import Settings from '../models/Settings.js';
import adminAuth from '../middleware/adminAuth.js';
import { resolveRequestCompetition } from '../utils/competitionContext.js';
import getCompetitionSettings from '../utils/competitionSettings.js';

const router = express.Router({ mergeParams: true });

router.get('/competitions', adminAuth, async (req, res) => {
  try {
    if (req.params.competitionId) {
      const competition = await resolveRequestCompetition(req);
      return res.json([competition]);
    }
    const competitions = await Competition.find().sort({ createdAt: -1 });
    res.json(competitions);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch competitions', error: error.message });
  }
});

router.get('/competitions/summary', adminAuth, async (req, res) => {
  try {
    const competitions = await Competition.find().select('_id status').lean();
    const competitionIds = competitions.map((competition) => competition._id);
    const [contestantTotals, revenueTotals] = await Promise.all([
      Contestant.aggregate([
        { $match: { competitionId: { $in: competitionIds } } },
        {
          $group: {
            _id: '$competitionId',
            totalContestants: { $sum: 1 },
            pendingEntries: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$isApproved', false] }, { $ne: ['$status', 'rejected'] }] },
                  1,
                  0,
                ],
              },
            },
            totalVotes: { $sum: '$votes' },
          },
        },
      ]),
      Transaction.aggregate([
        {
          $match: {
            competitionId: { $in: competitionIds },
            status: 'completed',
            type: { $in: ['entry', 'vote'] },
          },
        },
        { $group: { _id: '$competitionId', totalRevenue: { $sum: '$amount' } } },
      ]),
    ]);

    const statistics = {};
    for (const row of contestantTotals) {
      statistics[String(row._id)] = {
        totalContestants: row.totalContestants,
        pendingEntries: row.pendingEntries,
        totalVotes: row.totalVotes,
        totalRevenue: 0,
      };
    }
    for (const row of revenueTotals) {
      const competitionId = String(row._id);
      statistics[competitionId] = {
        totalContestants: statistics[competitionId]?.totalContestants || 0,
        pendingEntries: statistics[competitionId]?.pendingEntries || 0,
        totalVotes: statistics[competitionId]?.totalVotes || 0,
        totalRevenue: row.totalRevenue,
      };
    }

    const totals = competitions.reduce(
      (result, competition) => {
        const stats = statistics[String(competition._id)] || {
          totalContestants: 0,
          pendingEntries: 0,
          totalVotes: 0,
          totalRevenue: 0,
        };
        result.totalContestants += stats.totalContestants;
        result.totalVotes += stats.totalVotes;
        result.totalRevenue += stats.totalRevenue;
        if (competition.status === 'active') result.activeCompetitions += 1;
        return result;
      },
      { activeCompetitions: 0, totalContestants: 0, totalVotes: 0, totalRevenue: 0 }
    );

    res.json({ competitions: statistics, totals });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch competition summary', error: error.message });
  }
});

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
    const competition = await resolveRequestCompetition(req);
    const contestantFilter = { competitionId: competition._id };
    const totalContestants = await Contestant.countDocuments(contestantFilter);
    const pendingEntries = await Contestant.countDocuments({
      ...contestantFilter,
      isApproved: false,
      status: { $ne: 'rejected' },
    });
    const approvedEntries = await Contestant.countDocuments({ ...contestantFilter, isApproved: true });
    const votesResult = await Contestant.aggregate([
      { $match: contestantFilter },
      { $group: { _id: null, total: { $sum: '$votes' } } },
    ]);
    const revenueResult = await Transaction.aggregate([
      { $match: { competitionId: competition._id, status: 'completed', type: { $in: ['entry', 'vote'] } } },
      { $group: { _id: null, amount: { $sum: '$amount' } } },
    ]);

    const settings = await getCompetitionSettings(competition);

    res.json({
      totalContestants,
      pendingEntries,
      approvedEntries,
      totalVotes: votesResult[0]?.total || 0,
      totalRevenue: revenueResult[0]?.amount || 0,
      entryFee: Number(settings.entryFee ?? process.env.ENTRY_FEE_NAIRA ?? 0),
      voteFee: Number(settings.voteFee ?? process.env.VOTE_FEE_NAIRA ?? 0),
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch admin stats', error: error.message });
  }
});

router.get('/transactions', adminAuth, async (req, res) => {
  try {
    const competition = await resolveRequestCompetition(req);
    const transactions = await Transaction.find({ competitionId: competition._id })
      .sort({ createdAt: -1 })
      .limit(500)
      .populate('contestantId', 'firstName lastName shareSlug');
    res.json(transactions);
  } catch (error) {
    res.status(error.status || 500).json({ message: 'Failed to fetch transactions', error: error.message });
  }
});

router.patch('/transactions/:id/status', adminAuth, async (req, res) => {
  const { status, reason } = req.body || {};
  const normalizedReason = typeof reason === 'string' ? reason.trim() : '';
  if (!['completed', 'failed'].includes(status)) {
    return res.status(400).json({ message: 'status must be completed or failed' });
  }
  if (!normalizedReason || normalizedReason.length > 500) {
    return res.status(400).json({ message: 'A reason of 1 to 500 characters is required' });
  }

  let session;
  try {
    const competition = await resolveRequestCompetition(req);
    session = await mongoose.startSession();
    let updatedTransaction;

    await session.withTransaction(async () => {
      const transaction = await Transaction.findOne({
        _id: req.params.id,
        competitionId: competition._id,
      }).session(session);
      if (!transaction) {
        const error = new Error('Transaction not found');
        error.status = 404;
        throw error;
      }
      if (transaction.status !== 'pending') {
        const error = new Error('Only pending transactions can be updated');
        error.status = 409;
        throw error;
      }

      if (status === 'completed') {
        if (!transaction.contestantId || !['entry', 'vote'].includes(transaction.type)) {
          const error = new Error('Transaction is missing a contestant or supported payment type');
          error.status = 400;
          throw error;
        }

        const contestantFilter = {
          _id: transaction.contestantId,
          competitionId: competition._id,
          ...(transaction.type === 'entry' ? { entryPaid: false } : {}),
        };
        const transactionMeta = transaction.meta || transaction.metadata || {};
        let contestantUpdate;
        if (transaction.type === 'vote') {
          const votes = Number(transactionMeta.votes ?? transactionMeta.voteCount ?? 1);
          if (!Number.isInteger(votes) || votes < 1) {
            const error = new Error('Transaction has an invalid vote count');
            error.status = 400;
            throw error;
          }
          contestantUpdate = { $inc: { votes } };
        } else {
          contestantUpdate = {
            $set: {
              entryPaid: true,
              entryTransactionRef: transaction.txRef,
              uploadAllowance: transactionMeta.tier === 'premium' ? 3 : 1,
              status: 'paid',
            },
          };
        }

        const contestant = await Contestant.findOneAndUpdate(
          contestantFilter,
          contestantUpdate,
          { new: true, session }
        );
        if (!contestant) {
          const error = new Error(
            transaction.type === 'entry'
              ? 'Contestant was not found or their entry has already been paid'
              : 'Contestant not found in this competition'
          );
          error.status = 409;
          throw error;
        }
      }

      transaction.status = status;
      transaction.meta = {
        ...(transaction.meta || {}),
        adminStatusUpdate: {
          status,
          reason: normalizedReason,
          updatedBy: req.headers['x-admin-email'],
          updatedAt: new Date().toISOString(),
        },
      };
      transaction.markModified('meta');
      await transaction.save({ session });
      updatedTransaction = transaction;
    });

    res.json({ message: 'Transaction status updated', transaction: updatedTransaction });
  } catch (error) {
    res.status(error.status || 500).json({ message: 'Failed to update transaction status', error: error.message });
  } finally {
    if (session) await session.endSession();
  }
});

router.get('/competition', adminAuth, async (req, res) => {
  try {
    const competition = await resolveRequestCompetition(req);
    res.json(competition);
  } catch (error) {
    res.status(error.status || 500).json({ message: 'Failed to fetch competition', error: error.message });
  }
});

router.patch('/competition', adminAuth, async (req, res) => {
  try {
    const competition = await resolveRequestCompetition(req);
    const allowed = ['title', 'description', 'bannerImage', 'rules', 'entryFee', 'voteFee', 'prizePool', 'status', 'startDate', 'endDate'];
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        if (['entryFee', 'voteFee', 'prizePool'].includes(key)) {
          const value = Number(req.body[key]);
          if (!Number.isFinite(value) || value < 0) {
            return res.status(400).json({ message: `${key} must be a non-negative number` });
          }
          competition[key] = value;
          continue;
        }
        competition[key] = req.body[key];
      }
    }
    const settings = await getCompetitionSettings(competition);
    settings.entryFee = competition.entryFee;
    settings.voteFee = competition.voteFee;
    await Promise.all([competition.save(), settings.save()]);
    res.json({ message: 'Competition updated', competition });
  } catch (error) {
    res.status(error.status || 400).json({ message: 'Failed to update competition', error: error.message });
  }
});

router.delete('/competition', adminAuth, async (req, res) => {
  try {
    const competition = await resolveRequestCompetition(req);
    await Promise.all([
      Contestant.deleteMany({ competitionId: competition._id }),
      Transaction.deleteMany({ competitionId: competition._id }),
      Settings.deleteOne({ competitionId: competition._id }),
    ]);
    await competition.deleteOne();
    res.status(204).end();
  } catch (error) {
    res.status(error.status || 500).json({ message: 'Failed to delete competition', error: error.message });
  }
});

router.get('/contestants/pending', adminAuth, async (req, res) => {
  try {
    const competition = await resolveRequestCompetition(req);
    const contestants = await Contestant.find({
      competitionId: competition._id,
      isApproved: false,
      status: { $ne: 'rejected' },
    }).sort({ createdAt: -1 });
    res.json(contestants);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pending contestants', error: error.message });
  }
});

router.get('/contestants', adminAuth, async (req, res) => {
  try {
    const competition = await resolveRequestCompetition(req);
    const contestants = await Contestant.find({ competitionId: competition._id }).sort({ createdAt: -1 });
    res.json(contestants);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch contestants', error: error.message });
  }
});

router.post('/contestants/:id/votes', adminAuth, async (req, res) => {
  const votes = Number(req.body?.votes);
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
  if (!Number.isInteger(votes) || votes < 1) {
    return res.status(400).json({ message: 'votes must be a positive integer' });
  }
  if (!reason || reason.length > 500) {
    return res.status(400).json({ message: 'A reason of 1 to 500 characters is required' });
  }

  let session;
  try {
    const competition = await resolveRequestCompetition(req);
    session = await mongoose.startSession();
    let contestant;
    let transaction;

    await session.withTransaction(async () => {
      contestant = await Contestant.findOneAndUpdate(
        { _id: req.params.id, competitionId: competition._id },
        { $inc: { votes } },
        { new: true, session }
      );
      if (!contestant) {
        const error = new Error('Contestant not found');
        error.status = 404;
        throw error;
      }

      [transaction] = await Transaction.create([{
        competitionId: competition._id,
        txRef: `admin_${crypto.randomUUID()}`,
        type: 'vote',
        contestantId: contestant._id,
        amount: 0,
        method: 'admin_adjustment',
        status: 'completed',
        meta: {
          adjustment: true,
          votes,
          reason,
          adjustedBy: req.headers['x-admin-email'],
        },
      }], { session });
    });

    res.json({ message: 'Votes added', contestant, transaction });
  } catch (error) {
    res.status(error.status || 500).json({ message: 'Failed to add votes', error: error.message });
  } finally {
    if (session) await session.endSession();
  }
});

// delete contestant
router.delete('/contestants/:id', adminAuth, async (req, res) => {
  try {
    const competition = await resolveRequestCompetition(req);
    const contestant = await Contestant.findOne({ _id: req.params.id, competitionId: competition._id });
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
    const competition = await resolveRequestCompetition(req);
    const contestant = await Contestant.findOne({ _id: req.params.id, competitionId: competition._id });
    if (!contestant) return res.status(404).json({ message: 'Contestant not found' });

    const allowed = ['isApproved', 'entryPaid', 'firstName', 'lastName', 'photoTitle', 'photoDescription', 'category', 'imageUrl', 'uploadAllowance', 'status'];
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
    const competition = await resolveRequestCompetition(req);
    const settings = await getCompetitionSettings(competition);
    res.json({ ...settings.toObject(), ...computeVoteTimerSettings(settings) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch settings', error: error.message });
  }
});

router.patch('/settings', adminAuth, async (req, res) => {
  try {
    const competition = await resolveRequestCompetition(req);
    const settings = await getCompetitionSettings(competition);

    const { entryFee, voteFee, voteTimerSeconds, voteTimerAction } = req.body;
    if (typeof entryFee === 'number') {
      settings.entryFee = entryFee;
      competition.entryFee = entryFee;
    }
    if (typeof voteFee === 'number') {
      settings.voteFee = voteFee;
      competition.voteFee = voteFee;
    }
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

    await Promise.all([settings.save(), competition.save()]);
    res.json({ message: 'Settings updated', settings: { ...settings.toObject(), ...computeVoteTimerSettings(settings) } });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update settings', error: error.message });
  }
});

router.get('/contestants/:id', adminAuth, async (req, res) => {
  try {
    const competition = await resolveRequestCompetition(req);
    const contestant = await Contestant.findOne({ _id: req.params.id, competitionId: competition._id });
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
    const competition = await resolveRequestCompetition(req);
    const contestant = await Contestant.findOne({ _id: req.params.id, competitionId: competition._id });
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

router.patch('/contestants/:id/reject', adminAuth, async (req, res) => {
  try {
    const competition = await resolveRequestCompetition(req);
    const contestant = await Contestant.findOne({ _id: req.params.id, competitionId: competition._id });
    if (!contestant) {
      return res.status(404).json({ message: 'Contestant not found' });
    }

    contestant.isApproved = false;
    contestant.status = 'rejected';
    await contestant.save();
    res.json({ message: 'Contestant rejected', contestant });
  } catch (error) {
    res.status(error.status || 500).json({ message: 'Failed to reject contestant', error: error.message });
  }
});

export default router;
