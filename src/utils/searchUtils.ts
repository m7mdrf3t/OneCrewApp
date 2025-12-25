/**
 * Utility functions for enhanced user search with fuzzy matching
 */

/**
 * Normalizes a string for comparison (lowercase, trim, remove extra spaces)
 */
export const normalizeString = (str: string): string => {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
};

/**
 * Checks if a search query matches a string (fuzzy/partial matching)
 */
export const matchesSearch = (text: string, query: string): boolean => {
  if (!query.trim()) return true;
  
  const normalizedText = normalizeString(text);
  const normalizedQuery = normalizeString(query);
  
  // Exact match
  if (normalizedText === normalizedQuery) return true;
  
  // Starts with query
  if (normalizedText.startsWith(normalizedQuery)) return true;
  
  // Contains query
  if (normalizedText.includes(normalizedQuery)) return true;
  
  // Word boundary matching (matches if query matches any word in text)
  const words = normalizedText.split(/\s+/);
  for (const word of words) {
    if (word.startsWith(normalizedQuery) || word.includes(normalizedQuery)) {
      return true;
    }
  }
  
  // Fuzzy matching: check if all characters in query appear in order in text
  let queryIndex = 0;
  for (let i = 0; i < normalizedText.length && queryIndex < normalizedQuery.length; i++) {
    if (normalizedText[i] === normalizedQuery[queryIndex]) {
      queryIndex++;
    }
  }
  if (queryIndex === normalizedQuery.length) return true;
  
  return false;
};

/**
 * Searches a user object against a query string
 * Checks name, email, role, and other fields
 */
export const userMatchesSearch = (user: any, query: string): boolean => {
  if (!query.trim()) return true;
  
  const searchFields = [
    user.name,
    user.email,
    user.primary_role,
    user.category,
    user.bio,
    user.specialty,
    user.location,
    user.nationality,
  ].filter(Boolean);
  
  return searchFields.some(field => matchesSearch(String(field), query));
};

/**
 * Scores a user match for ranking (higher score = better match)
 */
export const getUserMatchScore = (user: any, query: string): number => {
  if (!query.trim()) return 0;
  
  const normalizedQuery = normalizeString(query);
  let score = 0;
  
  // Exact name match gets highest score
  if (user.name && normalizeString(user.name) === normalizedQuery) {
    score += 100;
  }
  
  // Name starts with query
  if (user.name && normalizeString(user.name).startsWith(normalizedQuery)) {
    score += 50;
  }
  
  // Name contains query
  if (user.name && normalizeString(user.name).includes(normalizedQuery)) {
    score += 30;
  }
  
  // Email matches
  if (user.email && normalizeString(user.email).includes(normalizedQuery)) {
    score += 20;
  }
  
  // Role matches
  if (user.primary_role && normalizeString(user.primary_role).includes(normalizedQuery)) {
    score += 15;
  }
  
  // Other fields
  const otherFields = [user.bio, user.specialty, user.location, user.nationality];
  otherFields.forEach(field => {
    if (field && normalizeString(String(field)).includes(normalizedQuery)) {
      score += 5;
    }
  });
  
  return score;
};

/**
 * Filters and sorts users based on search query
 */
export const filterAndSortUsers = (users: any[], query: string): any[] => {
  if (!query.trim()) return users;
  
  // Filter users that match
  const matchingUsers = users.filter(user => userMatchesSearch(user, query));
  
  // Sort by match score (best matches first)
  return matchingUsers.sort((a, b) => {
    const scoreA = getUserMatchScore(a, query);
    const scoreB = getUserMatchScore(b, query);
    return scoreB - scoreA;
  });
};


