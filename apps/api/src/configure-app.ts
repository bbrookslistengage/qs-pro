import { NestFastifyApplication } from '@nestjs/platform-fastify';

import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

export interface ConfigureAppOptions {
  /** Set to false in tests that don't want /api prefix. Default: true */
  globalPrefix?: boolean;
}

export function configureApp(
  app: NestFastifyApplication,
  options: ConfigureAppOptions = {},
): NestFastifyApplication {
  const { globalPrefix = true } = options;

  if (globalPrefix) {
    app.setGlobalPrefix('api');
  }

  app.useGlobalFilters(new GlobalExceptionFilter());

  return app;
}
