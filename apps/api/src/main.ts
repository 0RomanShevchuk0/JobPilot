import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

/** The JobPilot extension, by the id its manifest key gives it (apps/extension/wxt.config.ts). */
const EXTENSION_ORIGIN = "chrome-extension://dakikehdmagghigijcpneocecnenklba";

const app = await NestFactory.create(AppModule);
app.enableShutdownHooks();
// the web app needs none, it comes through a proxy as the same origin; other sites stay refused
app.enableCors({ origin: [EXTENSION_ORIGIN] });

const port = Number(app.get(ConfigService).getOrThrow<string>("API_PORT"));
await app.listen(port);
Logger.log(`listening on http://localhost:${port}`, "Bootstrap");
