import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendPort = env.BACKEND_PORT ?? "4000";
  const frontendPort = Number(env.FRONTEND_PORT ?? 5173);
  const apiTarget = env.VITE_API_TARGET ?? `http://127.0.0.1:${backendPort}`;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url))
      }
    },
    server: {
      port: frontendPort,
      proxy: {
        "/api": apiTarget,
        "/uploads": apiTarget
      }
    },
    preview: {
      port: frontendPort
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      css: true
    }
  };
});
