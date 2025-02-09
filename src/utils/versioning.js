/**
 * Increments a version number according to the specified type.
 *
 * @param {string} version - Version number in the format "x.y.z".
 * @param {string} versionType - Type of version increment. Must be 'major', 'minor' or 'patch'.
 * @returns {string} The incremented version number.
 * @throws {Error} If the version number is not in the format "x.y.z" being x, y and z integers.
 */
export function incrementVersion(version, versionType) {
  const splits = version.split('.');
  if (splits.length !== 3) {
    throw new Error('Incorrect version format. Must be x.y.z');
  }

  let [major, minor, patch] = splits.map(Number);

  if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
    throw new Error('Incorrect version format. Must be x.y.z with x, y and z being integers');
  }

  switch (versionType) {
    case 'major':
      major++;
      minor = 0;
      patch = 0;
      break;
    case 'minor':
      minor++;
      patch = 0;
      break;
    case 'patch':
      patch++;
      break;
    default:
      throw new Error("Invalid version type. Must be 'major', 'minor' or 'patch'");
  }

  return `${major}.${minor}.${patch}`;
}
