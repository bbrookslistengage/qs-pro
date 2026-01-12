import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";

// Mock Sentry for now as we don't have the SDK installed yet
const Sentry = {
  captureException: (exception: unknown) => {
    // In a real app, this would send to Sentry
    void exception;
  },
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  private sanitizePath(url: string): string {
    const idx = url.indexOf("?");
    return idx === -1 ? url : url.slice(0, idx);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const path = this.sanitizePath(request.url);

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : "Internal server error";

    if (status >= 500) {
      this.logger.error(`[${status}] ${path}`, exception);
      Sentry.captureException(exception);
    } else {
      this.logger.warn(`[${status}] ${path} - ${JSON.stringify(message)}`);
    }

    response.status(status).send({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path,
      message: message,
    });
  }
}
