import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { RouterProvider } from "react-router-dom";
import { AppProviders } from "@/app/providers";
import { appRouter } from "@/app/router";

export function App() {
  const { t } = useTranslation();

  return (
    <AppProviders>
      <Suspense fallback={<div className="app-loader">{t("app.loading")}</div>}>
        <RouterProvider router={appRouter} />
      </Suspense>
    </AppProviders>
  );
}
