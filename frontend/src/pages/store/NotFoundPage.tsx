import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="section-eyebrow">404</p>
        <h1>{t("notFound.title")}</h1>
        <p>{t("notFound.description")}</p>
        <Link to="/">{t("notFound.backHome")}</Link>
      </div>
    </div>
  );
}
