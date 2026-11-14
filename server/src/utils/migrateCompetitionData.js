import Contestant from '../models/Contestant.js';
import Settings from '../models/Settings.js';
import Transaction from '../models/Transaction.js';
import { getDefaultCompetition } from './competitionContext.js';

export default async function migrateCompetitionData() {
  const competition = await getDefaultCompetition();

  await Promise.all([
    Contestant.updateMany(
      { $or: [{ competitionId: { $exists: false } }, { competitionId: null }] },
      { $set: { competitionId: competition._id } }
    ),
    Settings.updateMany(
      { $or: [{ competitionId: { $exists: false } }, { competitionId: null }] },
      { $set: { competitionId: competition._id } }
    ),
    Transaction.updateMany(
      {
        $or: [
          { competitionId: { $exists: false } },
          { competitionId: null },
          { meta: { $exists: false } },
          { txRef: { $exists: false } },
        ],
      },
      [
        {
          $set: {
            competitionId: { $ifNull: ['$competitionId', competition._id] },
            meta: { $ifNull: ['$meta', { $ifNull: ['$metadata', {}] }] },
            txRef: { $ifNull: ['$txRef', '$metadata.tx_ref'] },
          },
        },
      ]
    ),
  ]);

  const duplicateSettings = await Settings.aggregate([
    { $group: { _id: '$competitionId', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 1 },
  ]);
  if (duplicateSettings.length > 0) {
    throw new Error('Multiple Settings documents exist for the same competition; resolve duplicates before enabling unique indexes.');
  }

  const duplicateTransactionRefs = await Transaction.aggregate([
    { $match: { txRef: { $type: 'string', $ne: '' } } },
    { $group: { _id: '$txRef', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 1 },
  ]);
  if (duplicateTransactionRefs.length > 0) {
    throw new Error('Duplicate transaction references exist; resolve them before enabling unique indexes.');
  }
}
