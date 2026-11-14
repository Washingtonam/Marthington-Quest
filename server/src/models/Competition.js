import mongoose from 'mongoose';

function createSlug(text) {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const competitionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
    description: { type: String, trim: true, default: '' },
    bannerImage: { type: String, trim: true, default: '' },
    rules: { type: String, trim: true, default: '' },
    prizePool: { type: Number, min: 0, default: 0 },
    entryFee: { type: Number, min: 0, default: 0 },
    voteFee: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: ['draft', 'active', 'closed'], default: 'draft' },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
  },
  { timestamps: true }
);

competitionSchema.pre('validate', function () {
  if (this.slug) {
    this.slug = createSlug(this.slug);
  } else if (this.title) {
    this.slug = createSlug(this.title);
  }

  if (this.startDate && this.endDate && this.endDate <= this.startDate) {
    this.invalidate('endDate', 'End date must be after start date');
  }
});

export default mongoose.model('Competition', competitionSchema);
