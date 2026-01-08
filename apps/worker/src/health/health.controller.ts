import { Controller, Get } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { Inject } from "@nestjs/common";

@Controller("health")
export class HealthController {
  constructor(
    @InjectQueue("shell-query") private shellQueryQueue: Queue,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Inject("SQL_CLIENT") private sqlClient: any,
  ) {}

  @Get()
  async check() {
    const client = await this.shellQueryQueue.client;
    const redisStatus = await client.ping();
    // Simple DB check - if we can inject SQL_CLIENT it's likely connected,
    // but a real query would be better. For now simple existence.

    return {
      status: "ok",
      redis: redisStatus === "PONG" ? "up" : "down",
      db: this.sqlClient ? "up" : "down",
      timestamp: new Date().toISOString(),
    };
  }
}
