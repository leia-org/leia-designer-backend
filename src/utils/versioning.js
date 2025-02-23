/**
 * Returns an object of parsed semver number as stored in the metadata.version field. (e.g. '1.2.3' -> { major: 1, minor: 2, patch: 3 })
 *
 * @param {String} version The version number in the format "x.y.z" being x, y and z integers.
 * @returns {Object} The object with the major, minor and patch numbers.
 */
export function getVersionObjectFromString(version) {
  const splits = version.split('.');

  const [major, minor, patch] = splits.map(Number);

  return { major, minor, patch };
}

/**
 * Returns a boolean indicating if the version number is greater than another version number.
 *
 * @param {Object} v1 The version object to compare.
 * @param {Object} v2 The version object to compare against.
 * @returns {Boolean} True if v1 is greater than v2, false otherwise.
 */
export function isObjectVersionGreater(v1, v2) {
  if (v1.major > v2.major) return true;
  if (v1.major < v2.major) return false;

  if (v1.minor > v2.minor) return true;
  if (v1.minor < v2.minor) return false;

  return v1.patch > v2.patch;
}
