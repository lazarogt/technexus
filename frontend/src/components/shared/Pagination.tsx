import { Button } from "@/components/shared/Button";
import type { PaginationMeta } from "@/features/api/types";

type PaginationProps = {
  pagination: PaginationMeta;
  onChange: (page: number) => void;
};

export function Pagination({ pagination, onChange }: PaginationProps) {
  return (
    <div className="pagination">
      <Button
        variant="secondary"
        disabled={!pagination.hasPreviousPage}
        onClick={() => onChange(pagination.page - 1)}
      >
        Anterior
      </Button>
      <span>
        Página {pagination.page} de {pagination.totalPages}
      </span>
      <Button
        variant="secondary"
        disabled={!pagination.hasNextPage}
        onClick={() => onChange(pagination.page + 1)}
      >
        Siguiente
      </Button>
    </div>
  );
}
