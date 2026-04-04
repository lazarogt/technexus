import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="store-footer">
      <div>
        <strong>TechNexus</strong>
        <p>{t("footer.description")}</p>
      </div>
      <div>
        <p>{t("footer.securePurchase")}</p>
        <p>{t("footer.separatePanels")}</p>
      </div>
    </footer>
  );
}
