const { runPrismaCommand } = require("./db-runtime.cjs");

const args = process.argv.slice(2);
const result = runPrismaCommand(args);

if (typeof result.status === "number") {
  process.exit(result.status);
}

process.exit(1);
