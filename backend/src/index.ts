import { createApp } from "./app";
import { connectToCache } from "./cache";
import { connectToDatabase } from "./db";
import { initEmailService } from "./email";
import { startEmailOutboxWorker } from "./email-outbox";
import { createLogger, installConsoleLogger } from "./logger";
import { ensureUploadsDirectory } from "./uploads";

installConsoleLogger();

const logger = createLogger("api");
const app = createApp();
const port = Number(process.env.PORT ?? 3000);

const startServer = async (): Promise<void> => {
  try {
    ensureUploadsDirectory();
    await connectToDatabase();
    await connectToCache();
    await initEmailService();
    startEmailOutboxWorker();

    app.listen(port, "0.0.0.0", () => {
      logger.info("Backend listening", {
        url: `http://0.0.0.0:${port}`
      });
    });
  } catch (error) {
    logger.error("Unable to start backend", {
      error: error instanceof Error ? error.message : "Unknown startup error"
    });
    process.exit(1);
  }
};

void startServer();
