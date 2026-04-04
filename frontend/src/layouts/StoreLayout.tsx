import { Outlet } from "react-router-dom";
import { StoreLayout as StorefrontLayout } from "@/components/store/layout/StoreLayout";

export function StoreLayout() {
  return (
    <StorefrontLayout>
      <Outlet />
    </StorefrontLayout>
  );
}
