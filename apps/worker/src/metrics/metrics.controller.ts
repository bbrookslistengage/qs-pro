import { Controller, Get, Res } from "@nestjs/common";
import { register } from "prom-client";
import { FastifyReply } from "fastify";

@Controller("metrics")
export class MetricsController {
  @Get()
  async getMetrics(@Res() res: FastifyReply) {
    res.header("Content-Type", register.contentType);
    res.send(await register.metrics());
  }
}
