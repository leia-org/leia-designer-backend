import mongoose from 'mongoose';

/**
 * Returns an aggregation pipeline that finds the latest version of each package.
 * @param {Object} match - The complete match query object containing all filters (text, visibility, apiVersion, etc.).
 * @param {string} userId - The ID of the user.
 * @param {boolean} privileged - Whether the user is admin or not.
 * @returns {Array} An array of aggregation pipeline stages.
 */
export function aggregateFindLatestVersions(match = {}, userId, privileged = false) {
  const pipeline = [];
  const labelMatch = {
    $expr: { $in: ['$_id', '$$labelIds'] },
  };

  if (!privileged) {
    const visibility = [{ isGlobal: true }];
    if (userId && mongoose.isValidObjectId(userId)) {
      visibility.push({ user: new mongoose.Types.ObjectId(userId) });
    }
    labelMatch.$or = visibility; // always non-empty
  }
  // Only add $match stage if there are conditions
  if (Object.keys(match).length > 0) {
    pipeline.push({ $match: match });
  }

  pipeline.push(
    {
      $sort: {
        'metadata.name': 1,
        'metadata.version.major': -1,
        'metadata.version.minor': -1,
        'metadata.version.patch': -1,
      },
    },
    {
      $group: {
        _id: '$metadata.name',
        latest: { $first: '$$ROOT' },
      },
    },
    {
      $replaceRoot: { newRoot: '$latest' },
    },
    {
      $addFields: {
        'metadata.labels': {
          $setUnion: [
            { $ifNull: ['$metadata.labels', []] },
            {
              $cond: [
                { $ifNull: ['$metadata.label', false] },
                ['$metadata.label'],
                [],
              ],
            },
          ],
        },
      },
    },
    {
      $lookup: {
        from: 'labels',
        let: { labelIds: '$metadata.labels' },
        pipeline: [
          {
            $match: 
              labelMatch,
          },
        ],
        as: 'metadata.labels',
      },
    },
    {
      $addFields: {
        'metadata.version': {
          $concat: [
            { $toString: '$metadata.version.major' },
            '.',
            { $toString: '$metadata.version.minor' },
            '.',
            { $toString: '$metadata.version.patch' },
          ],
        },
      },
    },
    {
      $addFields: {
        id: '$_id',
        userId: '$user',
      },
    },
    {
      $project: {
        _id: 0,
        __v: 0,
        'metadata.labels.__v': 0,
      },
    }
  );

  return pipeline;
}
