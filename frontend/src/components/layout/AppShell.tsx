import { useState } from "react";
import { Outlet } from "react-router-dom";
import { MarketplaceProvider } from "../../lib/marketplace-context";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function AppShell() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <MarketplaceProvider>
      <div className="app-frame">
        <Header
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((current) => !current)}
        />
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-8">
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
          <main className="min-w-0">
            <Outlet />
          </main>
        </div>
        <Footer />
      </div>
    </MarketplaceProvider>
  );
}
