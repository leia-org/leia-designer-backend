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
