import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

const app = await NestFactory.create(AppModule);
app.enableShutdownHooks();
const config = app.get(ConfigService);

// the JobPilot extension only; the web app needs none, it comes through a proxy as the same origin,
// and other sites stay refused
const extensionOrigin = `chrome-extension://${config.getOrThrow<string>("EXTENSION_ID")}`;
app.enableCors({ origin: [extensionOrigin] });

const port = Number(config.getOrThrow<string>("API_PORT"));
await app.listen(port);
Logger.log(`listening on http://localhost:${port}`, "Bootstrap");
