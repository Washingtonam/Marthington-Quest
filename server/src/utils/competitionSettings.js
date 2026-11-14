import Settings from '../models/Settings.js';

export default function getCompetitionSettings(competition) {
  return Settings.findOneAndUpdate(
    { competitionId: competition._id },
    {
      $setOnInsert: {
        entryFee: competition.entryFee,
        voteFee: competition.voteFee,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}
