import "reflect-metadata";
import { sentry } from "@jobpilot/observability";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpAdapterHost, NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { EXTENSION_ORIGINS } from "./auth/extension-origins.js";
import { SessionGuard } from "./auth/session.guard.js";
import { SentryExceptionFilter } from "./observability/sentry-exception.filter.js";

// error reporting first, so a crash during startup is caught too (no-op without SENTRY_DSN)
sentry.init();

const app = await NestFactory.create(AppModule);
const config = app.get(ConfigService);

// every route under /api, as the browser asks for it: the proxies (Vite, Caddy) pass paths as they are
app.setGlobalPrefix("api");

// unhandled failures go to Sentry, then Nest answers as usual
app.useGlobalFilters(new SentryExceptionFilter(app.get(HttpAdapterHost)));

// the JobPilot extension only; the web app needs none, it comes through a proxy as the same origin,
// and other sites stay refused
app.enableCors({ origin: EXTENSION_ORIGINS });

// every route takes a signed-in user, but those marked @Public(): 401 without a session
app.useGlobalGuards(app.get(SessionGuard));

const port = Number(config.getOrThrow<string>("API_PORT"));
await app.listen(port);
Logger.log(`listening on http://localhost:${port}`, "Bootstrap");

// graceful shutdown: close Nest (runs the infra providers' onApplicationShutdown), then flush Sentry
async function shutdown(signal: string) {
   Logger.log(`${signal}: shutting down`, "Bootstrap");
   await app.close();
   await sentry.close();
   process.exit(0);
}
process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
