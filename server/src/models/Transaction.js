import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    competitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Competition',
      required: true,
      index: true,
    },
    txRef: { type: String, trim: true, unique: true, sparse: true },
    type: {
      type: String,
      enum: ['entry', 'vote', 'payout'],
      required: true,
    },
    contestantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contestant',
    },
    amount: {
      type: Number,
      required: true,
    },
    method: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    rawResponse: { type: mongoose.Schema.Types.Mixed, default: undefined },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Transaction', transactionSchema);
