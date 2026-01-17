import { InjectQueue } from "@nestjs/bullmq";
import { Controller, Get } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { Queue } from "bullmq";

@Controller("health")
export class HealthController {
  constructor(
    @InjectQueue("shell-query") private shellQueryQueue: Queue,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Inject("SQL_CLIENT") private sqlClient: any,
  ) {}

  @Get()
  async check() {
    let redis = "down";
    try {
      const client = await Promise.race([
        this.shellQueryQueue.client,
        new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), 500);
        }),
      ]);

      if (client) {
        const redisStatus = await Promise.race([
          client.ping(),
          new Promise<string>((resolve) => {
            setTimeout(() => resolve("TIMEOUT"), 500);
          }),
        ]);
        redis = redisStatus === "PONG" ? "up" : "down";
      }
    } catch {
      redis = "down";
    }

    return {
      status: "ok",
      redis,
      db: this.sqlClient ? "up" : "down",
      timestamp: new Date().toISOString(),
    };
  }
}
