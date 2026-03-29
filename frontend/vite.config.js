import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
const proxyTarget = process.env.VITE_PROXY_TARGET ?? "http://localhost:4000";
const proxiedPrefixes = [
    "/products",
    "/categories",
    "/cart",
    "/checkout",
    "/orders",
    "/profile",
    "/admin",
    "/metrics",
    "/uploads",
    "/login",
    "/register"
];
export default defineConfig({
    plugins: [react()],
    server: {
        host: "0.0.0.0",
        port: 5173,
        proxy: Object.fromEntries(proxiedPrefixes.map((prefix) => [
            prefix,
            {
                target: proxyTarget,
                changeOrigin: true
            }
        ]))
    },
    build: {
        target: "es2020",
        sourcemap: false,
        rollupOptions: {
            output: {
                manualChunks: {
                    "react-vendor": ["react", "react-dom"],
                    "data-vendor": ["swr"]
                }
            }
        }
    }
});
