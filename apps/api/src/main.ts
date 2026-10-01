import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

const app = await NestFactory.create(AppModule);
app.enableShutdownHooks();

const port = Number(app.get(ConfigService).getOrThrow<string>("API_PORT"));
await app.listen(port);
Logger.log(`listening on http://localhost:${port}`, "Bootstrap");
