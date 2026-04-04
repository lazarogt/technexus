import type { ReactNode } from "react";

type ProductRailProps = {
  children: ReactNode;
};

export function ProductRail({ children }: ProductRailProps) {
  return (
    <div className="store-rail">
      <div className="store-rail-track">{children}</div>
    </div>
  );
}
