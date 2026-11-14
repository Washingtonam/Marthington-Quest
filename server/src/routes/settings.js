import express from 'express';
import Settings from '../models/Settings.js';

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

// Public settings endpoint (read-only)
router.get('/', async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }

    const timer = computeVoteTimerSettings(settings);
    res.json({ entryFee: settings.entryFee, voteFee: settings.voteFee, ...timer });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch settings', error: error.message });
  }
});

export default router;
