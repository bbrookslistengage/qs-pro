import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FastifyRequest, FastifyReply } from "fastify";

@Injectable()
export class AdminAuthMiddleware implements NestMiddleware {
  constructor(private readonly configService: ConfigService) {}

  use(
    req: FastifyRequest,
    res: FastifyReply,
    next: (error?: Error | HttpException) => void,
  ) {
    const adminApiKey = this.configService.get<string>("ADMIN_API_KEY");

    // If no admin API key is configured, deny access by default
    if (!adminApiKey) {
      throw new HttpException(
        "Unauthorized: Admin API key not configured",
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Check for x-admin-key header
    const providedKey = req.headers["x-admin-key"];

    if (!providedKey || providedKey !== adminApiKey) {
      throw new HttpException(
        "Unauthorized: Invalid or missing admin API key",
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Valid key, proceed
    next();
  }
}
