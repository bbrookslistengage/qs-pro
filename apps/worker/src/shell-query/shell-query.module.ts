import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ScheduleModule } from "@nestjs/schedule";
import { BullBoardModule } from "@bull-board/nestjs";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ShellQueryProcessor } from "./shell-query.processor";
import { RunToTempFlow } from "./strategies/run-to-temp.strategy";
import { ShellQuerySweeper } from "./shell-query.sweeper";
import { DatabaseModule, MceModule } from "@qs-pro/backend-shared";

@Module({
  imports: [
    BullModule.registerQueue({
      name: "shell-query",
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    }),
    BullBoardModule.forFeature({
      name: "shell-query",
      adapter: BullMQAdapter,
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    MceModule,
  ],
  providers: [ShellQueryProcessor, RunToTempFlow, ShellQuerySweeper],
})
export class ShellQueryModule {}
