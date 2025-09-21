/**
 * Returns an aggregation pipeline that finds the latest version of each package.
 * @param {Object} match - The complete match query object containing all filters (text, visibility, apiVersion, etc.).
 * @returns {Array} An array of aggregation pipeline stages.
 */
export function aggregateFindLatestVersions(match = {}) {
  const pipeline = [];

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
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: {
        path: '$user',
        preserveNullAndEmptyArrays: true,
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
        'user.id': '$user._id',
      },
    },
    {
      $addFields: {
        id: '$_id',
      },
    },
    {
      $project: {
        _id: 0,
        __v: 0,
        'user._id': 0,
        'user.__v': 0,
        'user.password': 0,
      },
    }
  );

  return pipeline;
}
