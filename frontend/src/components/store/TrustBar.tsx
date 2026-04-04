import { useTranslation } from "react-i18next";

export function TrustBar() {
  const { t } = useTranslation();
  const trustPoints = t("product.trustPoints", { returnObjects: true }) as string[];

  return (
    <div className="trust-bar" aria-label={t("product.trustBarAria")}>
      {trustPoints.map((point) => (
        <span key={point}>{point}</span>
      ))}
    </div>
  );
}
