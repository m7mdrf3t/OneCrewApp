/**
 * Password validation utility for API Client 2.9.0 security requirements
 * 
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
  };
}

/**
 * Validate password against security requirements
 */
export const validatePassword = (password: string): PasswordValidationResult => {
  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };

  const errors: string[] = [];
  
  if (!requirements.minLength) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!requirements.hasUppercase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!requirements.hasLowercase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!requirements.hasNumber) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors,
    requirements,
  };
};

/**
 * Get password strength indicator text
 */
export const getPasswordStrengthText = (password: string): string => {
  if (password.length === 0) return '';
  
  const validation = validatePassword(password);
  const metRequirements = Object.values(validation.requirements).filter(Boolean).length;
  const totalRequirements = Object.keys(validation.requirements).length;
  
  if (metRequirements === totalRequirements) {
    return 'Strong password';
  } else if (metRequirements >= totalRequirements / 2) {
    return 'Moderate password';
  } else {
    return 'Weak password';
  }
};

/**
 * Get password requirements list for display
 */
export const getPasswordRequirements = () => [
  { key: 'minLength', label: 'At least 8 characters', test: (pwd: string) => pwd.length >= 8 },
  { key: 'hasUppercase', label: 'One uppercase letter', test: (pwd: string) => /[A-Z]/.test(pwd) },
  { key: 'hasLowercase', label: 'One lowercase letter', test: (pwd: string) => /[a-z]/.test(pwd) },
  { key: 'hasNumber', label: 'One number', test: (pwd: string) => /[0-9]/.test(pwd) },
];

