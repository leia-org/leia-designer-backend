/**
 *
 * @param {string|object} entity
 * @param {class} service
 * @param {string} notFoundMsg
 * @returns  {Promise<object>}
 */
export async function findEntity(entity, service, notFoundMsg) {
  const result =
    typeof entity === 'string'
      ? await service.findById(entity)
      : await service.findByNameAndVersion(entity.name, entity.version);
  if (!result) {
    const error = new Error(notFoundMsg);
    error.statusCode = 404;
    throw error;
  }
  return result;
}

/**
 * Generate a unique code for an mongoose model
 *
 * @param {Model} model
 * @param {string} prefix
 * @param {number} maxAttempts
 * @returns {Promise<string>}
 * @throws {Error} - Error generating unique code: maximum number of attempts reached
 */
export async function generateUniqueCode(model, prefix, maxAttempts = 5) {
  let code;
  let exists = true;
  let attempts = 0;

  while (exists && attempts < maxAttempts) {
    code = String(prefix) + (Date.now().toString(36) + Math.random().toString(36).substring(2, 10)).toUpperCase();
    exists = await model.exists({ code });
    attempts++;
  }

  if (exists) {
    throw new Error('Error generating unique code: maximum number of attempts reached');
  }

  return code;
}
