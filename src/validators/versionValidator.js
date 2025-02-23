export const isVersionValid = (version) => {
  const versionRegex = /^\d+\.\d+\.\d+$/;
  return versionRegex.test(version);
};

export const isVersionQueryValid = (version) => {
  return version === 'latest' || isVersionValid(version);
};

export const isApiVersionValid = (apiVersion) => {
  const apiVersionRegex = /^v\d+$/;
  return apiVersionRegex.test(apiVersion);
};
