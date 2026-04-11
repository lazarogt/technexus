import { Outlet } from "react-router-dom";
import DemoTour from "@/components/DemoTour";
import { DemoTourProvider } from "@/demo/demo-tour-context";

export function AppShell() {
  return (
    <DemoTourProvider>
      <Outlet />
      <DemoTour />
    </DemoTourProvider>
  );
}
