import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";
import { Logger } from "@nestjs/common";
import { JsonLogger } from "./common/logger/json-logger.service";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    {
      logger: new JsonLogger(),
    },
  );

  app.enableShutdownHooks();

  const port = process.env.PORT || 3001;
  await app.listen(port, "0.0.0.0");
  Logger.log(`Worker running on port ${port}`, "WorkerBootstrap");
}
bootstrap();
