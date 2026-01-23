import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";
import type { IncomingMessage, ServerResponse } from "http";
import { LoggerModule as PinoLoggerModule, type Params } from "nestjs-pino";

interface RequestWithUser extends IncomingMessage {
  user?: {
    tenantId?: string;
    userId?: string;
    mid?: string;
  };
}

/**
 * Sensitive header paths that must be redacted from logs.
 * Exported for testing to prevent regression.
 */
export const REDACTED_HEADER_PATHS = [
  // Standard auth headers
  "req.headers.authorization",
  "req.headers.cookie",
  // Custom security headers
  'req.headers["x-admin-key"]',
  'req.headers["x-csrf-token"]',
  'req.headers["x-xsrf-token"]',
  'req.headers["x-csrftoken"]',
] as const;

/**
 * Sensitive field names that must be redacted from logs.
 */
export const REDACTED_FIELD_PATHS = [
  "password",
  "token",
  "secret",
  "sessionSecret",
] as const;

/**
 * Custom request serializer that strips query strings from URLs
 * to prevent OAuth code/state leakage.
 * Exported for testing.
 */
export function sanitizeRequest(req: IncomingMessage): Record<string, unknown> {
  const url = req.url ?? "";
  const queryIndex = url.indexOf("?");
  const pathname = queryIndex >= 0 ? url.slice(0, queryIndex) : url;
  return {
    id: (req as { id?: string }).id,
    method: req.method,
    url: pathname,
    headers: req.headers,
    remoteAddress: (req.socket as { remoteAddress?: string })?.remoteAddress,
    remotePort: (req.socket as { remotePort?: number })?.remotePort,
  };
}

/**
 * Creates pino-http configuration based on environment settings.
 * Exported for testing.
 */
export function createPinoHttpOptions(
  nodeEnv: string | undefined,
  logFormat: string | undefined,
  logLevel: string | undefined,
): Params {
  const isProduction = nodeEnv === "production";
  const useJson = logFormat === "json" || isProduction;

  return {
    pinoHttp: {
      level: logLevel ?? (isProduction ? "info" : "debug"),
      transport: useJson
        ? undefined
        : {
            target: "pino-pretty",
            options: { colorize: true, translateTime: "SYS:standard" },
          },
      redact: {
        paths: [...REDACTED_HEADER_PATHS, ...REDACTED_FIELD_PATHS],
        censor: "[REDACTED]",
      },
      serializers: {
        req: sanitizeRequest,
      },
      genReqId: (req: IncomingMessage) =>
        (req.headers["x-request-id"] as string) || randomUUID(),
      customProps: (req: IncomingMessage, _res: ServerResponse) => {
        const reqWithUser = req as RequestWithUser;
        return {
          service: process.env.SERVICE_NAME || "unknown",
          tenantId: reqWithUser.user?.tenantId,
          userId: reqWithUser.user?.userId,
          mid: reqWithUser.user?.mid,
        };
      },
      autoLogging: {
        ignore: (req: IncomingMessage) =>
          req.url === "/health" || req.url === "/metrics",
      },
    },
  };
}

@Global()
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createPinoHttpOptions(
          config.get<string>("NODE_ENV"),
          config.get<string>("LOG_FORMAT"),
          config.get<string>("LOG_LEVEL"),
        ),
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
