import { AppError, ErrorCode } from '@qpp/backend-shared';

interface ConfigRequirement {
  key: string;
  validator?: (value: string) => boolean;
  message?: string;
}

const REQUIRED_CONFIG: ConfigRequirement[] = [
  { key: 'SESSION_SECRET' },
  { key: 'SESSION_COOKIE_NAME' },
  { key: 'ENCRYPTION_KEY' },
  {
    key: 'SESSION_MAX_AGE',
    validator: (v) => !isNaN(parseInt(v, 10)),
    message: 'must be a valid number',
  },
];

export function validateRequiredConfig(): void {
  const errors: string[] = [];

  for (const { key, validator, message } of REQUIRED_CONFIG) {
    const value = process.env[key];
    if (!value) {
      errors.push(`${key} is required`);
    } else if (validator && !validator(value)) {
      errors.push(`${key} ${message || 'is invalid'}`);
    }
  }

  if (errors.length > 0) {
    throw new AppError(ErrorCode.CONFIG_ERROR, undefined, {
      statusMessage: errors.join('; '),
    });
  }
}
