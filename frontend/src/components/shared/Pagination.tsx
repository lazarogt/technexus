import { useTranslation } from "react-i18next";
import { Button } from "@/components/shared/Button";
import type { PaginationMeta } from "@/features/api/types";

type PaginationProps = {
  pagination: PaginationMeta;
  onChange: (page: number) => void;
};

export function Pagination({ pagination, onChange }: PaginationProps) {
  const { t } = useTranslation();

  return (
    <div className="pagination">
      <Button
        variant="secondary"
        disabled={!pagination.hasPreviousPage}
        onClick={() => onChange(pagination.page - 1)}
      >
        {t("pagination.previous")}
      </Button>
      <span>{t("pagination.pageOf", { page: pagination.page, totalPages: pagination.totalPages })}</span>
      <Button
        variant="secondary"
        disabled={!pagination.hasNextPage}
        onClick={() => onChange(pagination.page + 1)}
      >
        {t("pagination.next")}
      </Button>
    </div>
  );
}
