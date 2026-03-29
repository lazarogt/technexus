import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import MarketplacePage from "./pages/MarketplacePage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MarketplacePage />} path="/" />
        <Route element={<Navigate replace to="/" />} path="/storefront" />
        <Route element={<NotFoundPage />} path="*" />
      </Routes>
    </BrowserRouter>
  );
}
