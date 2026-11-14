import mongoose from 'mongoose';
import Competition from '../models/Competition.js';

export const DEFAULT_COMPETITION_SLUG = 'marthington-baby-quest';

export function isCompetitionWithinDates(competition, now = new Date()) {
  const startsAt = competition.startDate ? new Date(competition.startDate) : null;
  const endsAt = competition.endDate ? new Date(competition.endDate) : null;

  return (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now);
}

export function canAcceptCompetitionActivity(competition, now = new Date()) {
  return competition.status === 'active' && isCompetitionWithinDates(competition, now);
}

export async function getDefaultCompetition() {
  return Competition.findOneAndUpdate(
    { slug: DEFAULT_COMPETITION_SLUG },
    {
      $setOnInsert: {
        title: process.env.DEFAULT_COMPETITION_TITLE || 'Marthington Baby Quest',
        description: '',
        entryFee: Number(process.env.ENTRY_FEE_NAIRA || 0),
        voteFee: Number(process.env.VOTE_FEE_NAIRA || 0),
        status: 'active',
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

export async function resolveCompetition({ competitionId, competitionSlug } = {}) {
  if (competitionId) {
    if (!mongoose.Types.ObjectId.isValid(competitionId)) {
      const error = new Error('Invalid competitionId');
      error.status = 400;
      throw error;
    }

    const competition = await Competition.findById(competitionId);
    if (!competition) {
      const error = new Error('Competition not found');
      error.status = 404;
      throw error;
    }
    return competition;
  }

  if (competitionSlug) {
    const competition = await Competition.findOne({ slug: String(competitionSlug).toLowerCase() });
    if (!competition) {
      const error = new Error('Competition not found');
      error.status = 404;
      throw error;
    }
    return competition;
  }

  return getDefaultCompetition();
}

export function getCompetitionInput(req) {
  const pathCompetitionId = req.params?.competitionId;
  const pathCompetitionSlug = req.params?.competitionSlug;
  return {
    competitionId:
      pathCompetitionId ||
      (pathCompetitionSlug
        ? undefined
        : req.body?.competitionId || req.query.competitionId || req.headers['x-competition-id']),
    competitionSlug:
      pathCompetitionSlug ||
      req.body?.slug ||
      req.query.slug ||
      req.body?.competitionSlug ||
      req.query.competitionSlug ||
      req.headers['x-competition-slug'],
  };
}

export async function resolveRequestCompetition(req) {
  return resolveCompetition(getCompetitionInput(req));
}
