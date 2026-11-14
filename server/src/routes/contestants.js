import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import Contestant from '../models/Contestant.js';
import {
  canAcceptCompetitionActivity,
  resolveRequestCompetition,
} from '../utils/competitionContext.js';
import { uploadBufferToCloudinary } from '../utils/cloudinary.js';

const router = express.Router({ mergeParams: true });

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.json([]);
  }

  try {
    const competition = await resolveRequestCompetition(req);
    if (competition.status === 'draft') {
      return res.status(404).json({ message: 'Competition is not available' });
    }
    const filter = {
      competitionId: competition._id,
      isApproved: true,
      entryPaid: true,
    };
    const contestants = await Contestant.find(filter)
      .select('-email -whatsapp')
      .sort({ votes: -1, createdAt: -1 });
    res.json(contestants);
  } catch (error) {
    res.status(error.status || 500).json({ message: 'Failed to fetch contestants', error: error.message });
  }
});

router.get('/slug/:slug', async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'Database unavailable' });
  }

  try {
    const competition = await resolveRequestCompetition(req);
    const filter = { shareSlug: req.params.slug, competitionId: competition._id };
    if (req.query.public === 'true') {
      filter.isApproved = true;
      filter.entryPaid = true;
    }
    const contestant = await Contestant.findOne(filter).select('-email -whatsapp');
    if (!contestant) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    res.json(contestant);
  } catch (error) {
    res.status(error.status || 500).json({ message: 'Failed to fetch entry', error: error.message });
  }
});

router.post('/', async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'Database unavailable' });
  }

  try {
    const competition = await resolveRequestCompetition(req);
    if (!canAcceptCompetitionActivity(competition)) {
      return res.status(400).json({ message: 'Competition is not accepting entries' });
    }
    if (typeof req.body.imageUrl !== 'string' || !req.body.imageUrl.trim()) {
      return res.status(400).json({ message: 'A contestant photo is required' });
    }
    const contestant = await Contestant.create({
      competitionId: competition._id,
      email: req.body.email,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      ageLabel: req.body.ageLabel,
      nickname: req.body.nickname,
      whatsapp: req.body.whatsapp,
      photoTitle: req.body.photoTitle,
      photoDescription: req.body.photoDescription,
      category: req.body.category,
      imageUrl: req.body.imageUrl,
      entryPaid: false,
      isApproved: false,
      status: 'pending',
      uploadAllowance: 1,
      tier: 'standard',
    });

    res.status(201).json({ ...contestant.toObject(), entryFee: Number(competition.entryFee || 0) });
  } catch (error) {
    res.status(error.status || 400).json({ message: 'Failed to create contestant', error: error.message });
  }
});

// Upload image (multipart/form-data) and return Cloudinary URL
router.post('/upload', upload.single('image'), async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'Database unavailable' });
  }

  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const result = await uploadBufferToCloudinary(req.file.buffer, 'contestants');
    res.json({ url: result.secure_url, public_id: result.public_id });
  } catch (error) {
    res.status(500).json({ message: 'Failed to upload image', error: error.message });
  }
});

export default router;
