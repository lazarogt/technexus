import type { ReactNode } from "react";
import { CategoryNav } from "@/components/store/layout/CategoryNav";
import { Header } from "@/components/store/layout/Header";
import { Footer } from "@/components/store/Footer";

type StoreLayoutProps = {
  children: ReactNode;
};

export function StoreLayout({ children }: StoreLayoutProps) {
  return (
    <div className="store-layout">
      <Header />
      <CategoryNav />
      <main className="store-main">{children}</main>
      <Footer />
    </div>
  );
}
