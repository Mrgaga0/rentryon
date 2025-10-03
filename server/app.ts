import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { registerRoutes } from "./routes";
import { log } from "./logger";

export interface CreateExpressAppOptions {
  /**
   * Whether to rethrow errors after responding. Defaults to true to preserve
   * the existing Express server behaviour, but can be disabled for serverless
   * runtimes where rethrowing would mark the invocation as failed twice.
   */
  rethrowErrors?: boolean;
}

export async function createExpressApp(
  options: CreateExpressAppOptions = {},
): Promise<Express> {
  const { rethrowErrors = true } = options;

  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: false, limit: "50mb" }));

  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, unknown> | undefined;

    const originalResJson = res.json.bind(res);
    res.json = function jsonInterceptor(bodyJson: unknown) {
      if (typeof bodyJson === "object" && bodyJson !== null) {
        capturedJsonResponse = bodyJson as Record<string, unknown>;
      }
      return originalResJson(bodyJson);
    } as typeof res.json;

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          try {
            logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
          } catch {
            // Ignore serialization errors
          }
        }

        if (logLine.length > 80) {
          logLine = `${logLine.slice(0, 79)}…`;
        }

        log(logLine);
      }
    });

    next();
  });

  await registerRoutes(app, { createServer: false });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const fallbackMessage = "Internal Server Error";
    const status =
      (typeof err === "object" && err && "status" in err && typeof (err as any).status === "number"
        ? (err as any).status
        : typeof err === "object" && err && "statusCode" in err && typeof (err as any).statusCode === "number"
        ? (err as any).statusCode
        : 500) ?? 500;

    const message =
      (typeof err === "object" && err && "message" in err && typeof (err as any).message === "string"
        ? (err as any).message
        : fallbackMessage) ?? fallbackMessage;

    res.status(status).json({ message });

    if (rethrowErrors) {
      throw err;
    }
  });

  return app;
}
