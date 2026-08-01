import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
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
    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

export default mongoose.model('Transaction', transactionSchema);
