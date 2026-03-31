import { Suspense } from "react";
import { RouterProvider } from "react-router-dom";
import { AppProviders } from "@/app/providers";
import { appRouter } from "@/app/router";

export function App() {
  return (
    <AppProviders>
      <Suspense fallback={<div className="app-loader">Cargando TechNexus...</div>}>
        <RouterProvider router={appRouter} />
      </Suspense>
    </AppProviders>
  );
}
