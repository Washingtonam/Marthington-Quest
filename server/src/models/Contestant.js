import mongoose from 'mongoose';

const contestantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true },
    parentName: { type: String, required: true, trim: true },
    bio: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    votes: { type: Number, default: 0 },
    isApproved: { type: Boolean, default: false },
    category: { type: String, default: 'general' },
  },
  { timestamps: true }
);

export default mongoose.model('Contestant', contestantSchema);
