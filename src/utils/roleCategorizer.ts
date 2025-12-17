/**
 * Utility functions for categorizing roles into crew, talent, or both
 * This ensures consistency across signup, home page, and other components
 */

export type RoleCategory = 'crew' | 'talent' | 'both';

/**
 * Categorizes a role name into crew, talent, or both
 * This matches the logic used in SignupPage
 */
export const categorizeRole = (roleName: string): RoleCategory => {
  const normalized = roleName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  
  // Explicit support for "Engineer" roles that should be treated as talent
  // (avoid misclassifying crew roles like "sound_engineer")
  if (normalized === 'engineer' || normalized === 'main_engineer') {
    return 'talent';
  }

  // Roles that are only for talent
  const talentOnly = ['singer', 'dancer', 'model'];
  if (talentOnly.some(t => normalized.includes(t))) {
    return 'talent';
  }
  
  // Roles that are only for crew (production roles)
  const crewOnly = [
    'director', 'dop', 'editor', 'producer', 'scriptwriter', 
    'gaffer', 'grip', 'sound_engineer', 'makeup_artist', 
    'stylist', 'vfx', 'colorist', 'cinematographer', 'composer',
    'writer', 'screenwriter', 'creative_director', 'art_director',
    'sound_designer', 'vfx_artist', 'focus_puller', 'camera_operator',
    'dolly_grip', 'best_boy', 'set_dresser', 'art_director_assistant',
    'production_assistant'
  ];
  if (crewOnly.some(c => normalized.includes(c))) {
    return 'crew';
  }
  
  // Roles that can be both (actor, voice_actor)
  const bothRoles = ['actor', 'voice_actor', 'voiceactor'];
  if (bothRoles.some(b => normalized.includes(b))) {
    return 'both';
  }
  
  // Default to crew for unknown roles
  return 'crew';
};

/**
 * Filters roles for a specific category (crew or talent)
 * Returns roles that belong to the category or 'both'
 */
export const filterRolesByCategory = (
  roles: Array<string | { name: string; [key: string]: any }>,
  category: 'crew' | 'talent'
): Array<string | { name: string; [key: string]: any }> => {
  return roles.filter((role) => {
    const roleName = getRoleName(role);
    const roleCategory = categorizeRole(roleName);
    return roleCategory === category || roleCategory === 'both';
  });
};

/**
 * Extracts role names from role objects or strings
 */
export const getRoleName = (role: string | { name: string; [key: string]: any }): string => {
  return typeof role === 'string' ? role : (role.name || String(role));
};

/**
 * Normalizes role name for comparison (lowercase, underscores)
 */
export const normalizeRoleName = (roleName: string): string => {
  return roleName.toLowerCase().replace(/[^a-z0-9]/g, '_');
};





