import mongoose from 'mongoose';

/**
 * @typedef {Object} Context
 * @property {string|null} userId - ID of the current user (null if not authenticated)
 * @property {boolean} internal - Whether this is an internal call (bypasses permissions)
 * @property {string} role - User role ('admin', 'user', etc.)
 */

/**
 * Apply visibility filters to a query object based on user permissions
 * @param {Object} query - The query object to modify with visibility filters
 * @param {string|null} userId - Current user ID
 * @param {string} visibility - Visibility filter ('all', 'public', 'private')
 * @param {boolean} privileged - Whether user has admin privileges
 * @returns {boolean} Returns false if should return empty result, true otherwise
 */
export function applyVisibilityFilters(query, userId, visibility = 'all', privileged = false) {
  // Convert userId to ObjectId if it's a string (needed for aggregation pipelines)
  const userObjectId = userId ? new mongoose.Types.ObjectId(userId) : null;

  if (visibility === 'public') {
    query['isPublished'] = true;
  }

  if (visibility === 'private') {
    if (!privileged) {
      if (!userId) {
        return false; // Signal that we should return empty result
      }
      query['user'] = userObjectId;
      query['isPublished'] = false;
    } else {
      query['isPublished'] = false;
    }
  }

  if (visibility === 'all' && !privileged) {
    if (userId) {
      query['$or'] = [
        { isPublished: true },
        { user: userObjectId }
      ];
    } else {
      query['isPublished'] = true;
    }
  }

  return true;
}

/**
 * Check if user can access a resource based on context
 * @param {Object} resource - The resource document
 * @param {Context} context - User context
 * @returns {boolean} Whether user can access the resource
 */
export function canAccess(resource, context) {
  if (!resource) return false;
  if (context.internal) return true; // Internal calls bypass permissions
  if (context.role === 'admin') return true; // Admin can access everything
  if (resource.isPublished) return true; // Public resource
  if (context.userId && resource.user && resource.user.toString() === context.userId) return true; // Own resource
  return false;
}

/**
 * Create error for unauthorized access
 * @param {string} resourceType - Type of resource being accessed
 * @returns {Error} Formatted error
 */
export function createUnauthorizedError(resourceType = 'Resource') {
  const error = new Error(`${resourceType} not found or access denied`);
  error.statusCode = 404; // Use 404 instead of 403 to not reveal existence
  return error;
}

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
      ? await service.findById(entity, { internal: true })
      : await service.findByNameAndVersion(entity.name, entity.version, { internal: true });
  if (!result) {
    const error = new Error(notFoundMsg);
    error.statusCode = 404;
    throw error;
  }
  return result;
}
