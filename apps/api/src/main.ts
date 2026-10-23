import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { EXTENSION_ORIGINS } from "./auth/extension-origins.js";
import { SessionGuard } from "./auth/session.guard.js";

const app = await NestFactory.create(AppModule);
app.enableShutdownHooks();
const config = app.get(ConfigService);

// every route under /api, as the browser asks for it: the proxies (Vite, Caddy) pass paths as they are
app.setGlobalPrefix("api");

// the JobPilot extension only; the web app needs none, it comes through a proxy as the same origin,
// and other sites stay refused
app.enableCors({ origin: EXTENSION_ORIGINS });

// every route takes a signed-in user, but those marked @Public(): 401 without a session
app.useGlobalGuards(app.get(SessionGuard));

const port = Number(config.getOrThrow<string>("API_PORT"));
await app.listen(port);
Logger.log(`listening on http://localhost:${port}`, "Bootstrap");
