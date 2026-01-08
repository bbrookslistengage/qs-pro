import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { HealthModule } from "./health/health.module";
import { ShellQueryModule } from "./shell-query/shell-query.module";
import { RedisModule } from "./redis/redis.module";
import { MetricsModule } from "./metrics/metrics.module";
import { BullBoardModule } from "@bull-board/nestjs";
import { FastifyAdapter } from "@bull-board/fastify";
import { DatabaseModule, MceModule, AuthModule } from "@qs-pro/backend-shared";
import { AdminAuthMiddleware } from "./common/middleware/admin-auth.middleware";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: "../../.env",
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>("REDIS_URL", "redis://localhost:6379"),
        },
      }),
      inject: [ConfigService],
    }),
    BullBoardModule.forRoot({
      route: "/admin/queues",
      adapter: FastifyAdapter,
    }),
    DatabaseModule,
    AuthModule,
    MceModule,
    HealthModule,
    ShellQueryModule,
    RedisModule,
    MetricsModule,
  ],
  providers: [AdminAuthMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AdminAuthMiddleware).forRoutes("/admin/*");
  }
}
