/**
 * Escapes special regex characters in a string
 * @param {string} text - The text to escape
 * @returns {string} Escaped text safe for use in regex
 */
export function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Creates a regex query for multi-word search
 * Searches for documents where the target field contains all words (in any order)
 * @param {string} text - The search text (can contain multiple words)
 * @param {string} field - The MongoDB field to search (e.g., 'metadata.name')
 * @returns {Object} MongoDB query object with regex
 */
export function regexQuery(text, field) {
  if (!text || !text.trim()) {
    return {};
  }

  const regex = new RegExp(
    text
      .trim()
      .split(/\s+/)
      .map(word => `(?=.*${escapeRegex(word)})`)
      .join(''),
    'i'
  );

  return {
    [field]: regex
  };
}
