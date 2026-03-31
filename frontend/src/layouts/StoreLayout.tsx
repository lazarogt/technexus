import { Outlet } from "react-router-dom";
import { CategoryNav } from "@/components/store/CategoryNav";
import { Footer } from "@/components/store/Footer";
import { StoreHeader } from "@/components/store/StoreHeader";

export function StoreLayout() {
  return (
    <div className="store-layout">
      <StoreHeader />
      <CategoryNav />
      <main className="store-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
