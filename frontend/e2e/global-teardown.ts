import fs from "node:fs";
import path from "node:path";
import process from "node:process";

export default async function globalTeardown() {
  const runtimePidPath = path.resolve(process.cwd(), ".e2e-runtime", "backend.pid");
  let pid = Number.NaN;

  try {
    pid = Number.parseInt(fs.readFileSync(runtimePidPath, "utf8").trim(), 10);
  } catch {
    pid = Number.NaN;
  }

  if (Number.isFinite(pid)) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // Ignore missing process.
    }
  }

  fs.rmSync(runtimePidPath, { force: true });
}
