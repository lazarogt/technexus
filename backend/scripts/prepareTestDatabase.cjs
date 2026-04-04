const { runMigrateDeployAndGenerate } = require("./db-runtime.cjs");

(async () => {
  try {
    await runMigrateDeployAndGenerate({
      env: {
        NODE_ENV: "test",
        REDIS_ENABLED: "false"
      }
    });
  } catch (error) {
    console.error("Test database bootstrap failed.", error);
    process.exit(1);
  }
})();
