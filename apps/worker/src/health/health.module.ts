import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { BullModule } from "@nestjs/bullmq";
import { DatabaseModule } from "@qs-pro/backend-shared";

@Module({
  imports: [
    BullModule.registerQueue({
      name: "shell-query",
    }),
    DatabaseModule,
  ],
  controllers: [HealthController],
})
export class HealthModule {}
