import mongoose from 'mongoose';

function createSlug(text) {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const contestantSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, trim: true, default: '' },
    ageLabel: { type: String, trim: true, default: '' },
    nickname: { type: String, trim: true, default: '' },
    whatsapp: { type: String, trim: true, default: '' },
    photoTitle: { type: String, trim: true, default: '' },
    photoDescription: { type: String, trim: true, default: '' },
    category: { type: String, trim: true, default: 'general' },
    imageUrl: { type: String, default: '' },
    votes: { type: Number, default: 0 },
    isApproved: { type: Boolean, default: false },
    entryPaid: { type: Boolean, default: false },
    entryTransactionRef: { type: String, trim: true, default: '' },
    shareSlug: { type: String, trim: true, unique: true, sparse: true },
    shareUrl: { type: String, trim: true, default: '' },
    uploadAllowance: { type: Number, default: 1 },
    tier: { type: String, trim: true, default: 'standard' },
    status: { type: String, trim: true, default: 'pending' },
  },
  { timestamps: true }
);

contestantSchema.pre('save', function (next) {
  if (!this.shareSlug) {
    const base = createSlug(`${this.firstName} ${this.lastName || ''} ${this.category}`) || 'entry';
    this.shareSlug = `${base}-${Math.random().toString(36).slice(2, 8)}`;
  }

  if (!this.shareUrl && this.shareSlug) {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    this.shareUrl = `${clientUrl}/entry/${this.shareSlug}`;
  }

  next();
});

export default mongoose.model('Contestant', contestantSchema);
