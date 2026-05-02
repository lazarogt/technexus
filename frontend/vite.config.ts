import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendPort = env.BACKEND_PORT ?? "5000";
  const frontendPort = Number(env.FRONTEND_PORT ?? 5173);
  const apiTarget = env.VITE_API_TARGET?.trim() || `http://localhost:${backendPort}`;
  const proxyOptions = {
    target: apiTarget,
    changeOrigin: true,
    secure: false
  };

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url))
      }
    },
    server: {
      host: "0.0.0.0",
      port: frontendPort,
      proxy: {
        "/api": proxyOptions,
        "/uploads": proxyOptions
      }
    },
    preview: {
      host: "0.0.0.0",
      port: frontendPort
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      css: true
    }
  };
});
