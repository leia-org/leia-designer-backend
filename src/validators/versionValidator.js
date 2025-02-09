export const isVersionValid = (version) => {
  const versionRegex = /^\d+\.\d+\.\d+$/;
  return versionRegex.test(version);
};
