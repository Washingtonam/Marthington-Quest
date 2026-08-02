import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    entryFee: { type: Number, default: Number(process.env.ENTRY_FEE_NAIRA || 0) },
    voteFee: { type: Number, default: Number(process.env.VOTE_FEE_NAIRA || 0) },
    voteTimerSeconds: { type: Number, default: 0 },
    voteTimerStatus: { type: String, enum: ['inactive', 'running', 'paused'], default: 'inactive' },
    voteTimerStartedAt: { type: Date, default: null },
    voteTimerElapsedSeconds: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Settings', settingsSchema);
