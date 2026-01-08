import { Module, Global } from "@nestjs/common";
import { MetricsController } from "./metrics.controller";
import { Counter, Histogram, Gauge } from "prom-client";

@Global()
@Module({
  controllers: [MetricsController],
  providers: [
    {
      provide: "METRICS_JOBS_TOTAL",
      useFactory: () =>
        new Counter({
          name: "shell_query_jobs_total",
          help: "Total number of shell query jobs",
          labelNames: ["status"],
        }),
    },
    {
      provide: "METRICS_DURATION",
      useFactory: () =>
        new Histogram({
          name: "shell_query_duration_seconds",
          help: "Duration of shell query jobs in seconds",
          buckets: [1, 5, 10, 30, 60, 300, 600, 1800],
        }),
    },
    {
      provide: "METRICS_FAILURES_TOTAL",
      useFactory: () =>
        new Counter({
          name: "shell_query_failures_total",
          help: "Total number of failed shell query jobs",
          labelNames: ["error_type"],
        }),
    },
    {
      provide: "METRICS_ACTIVE_JOBS",
      useFactory: () =>
        new Gauge({
          name: "shell_query_active_jobs",
          help: "Number of active shell query jobs",
        }),
    },
  ],
  exports: [
    "METRICS_JOBS_TOTAL",
    "METRICS_DURATION",
    "METRICS_FAILURES_TOTAL",
    "METRICS_ACTIVE_JOBS",
  ],
})
export class MetricsModule {}
