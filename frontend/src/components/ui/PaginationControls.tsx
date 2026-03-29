import type { PaginationMeta } from "../../lib/types";

type PaginationControlsProps = {
  pagination: PaginationMeta;
  onPrevious: () => void;
  onNext: () => void;
};

export function PaginationControls(props: PaginationControlsProps) {
  return (
    <div className="pagination-controls">
      <button
        className="ghost-button"
        disabled={!props.pagination.hasPreviousPage}
        onClick={props.onPrevious}
        type="button"
      >
        Anterior
      </button>
      <span>
        Pagina {props.pagination.page} de {props.pagination.totalPages} ·{" "}
        {props.pagination.total} resultados
      </span>
      <button
        disabled={!props.pagination.hasNextPage}
        onClick={props.onNext}
        type="button"
      >
        Siguiente
      </button>
    </div>
  );
}
