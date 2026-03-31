const TRUST_POINTS = [
  "Pago contra entrega",
  "Garantia de satisfaccion",
  "Soporte disponible"
] as const;

export function TrustBar() {
  return (
    <div className="trust-bar" aria-label="Beneficios de compra">
      {TRUST_POINTS.map((point) => (
        <span key={point}>{point}</span>
      ))}
    </div>
  );
}
