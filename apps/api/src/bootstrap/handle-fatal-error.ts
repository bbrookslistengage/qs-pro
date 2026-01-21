import { AppError } from '@qpp/backend-shared';

const SENSITIVE_KEYS = /password|secret|key|token|auth|credential/i;

/**
 * Type guard for Record<string, unknown> - satisfies strict type safety (zero `as` casts).
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function redactContext(ctx: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(ctx).map(([k, v]) =>
      SENSITIVE_KEYS.test(k) ? [k, '[REDACTED]'] : [k, v],
    ),
  );
}

/**
 * Handles fatal startup errors with structured logging.
 * @param error - The error that caused startup failure
 * @param exit - Injectable exit function (default: process.exit) for testability
 */
export function handleFatalError(
  error: unknown,
  exit: (code: number) => never = (code) => process.exit(code),
): never {
  console.error('\n[FATAL] Application failed to start\n');

  if (error instanceof AppError) {
    console.error(`  Code:    ${error.code}`);
    console.error(`  Message: ${error.message}`);
    if (error.context && isRecord(error.context)) {
      const safeContext = redactContext(error.context);
      console.error(`  Context: ${JSON.stringify(safeContext, null, 2)}`);
    }
  } else if (error instanceof Error) {
    console.error(`  Error:   ${error.message}`);
    console.error(`  Stack:   ${error.stack}`);
  } else {
    console.error(`  Unknown error:`, error);
  }

  console.error('');
  exit(1);
}
