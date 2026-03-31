import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/shared/Button";
import { EmptyState } from "@/components/shared/EmptyState";
import { SurfaceCard } from "@/components/shared/SurfaceCard";
import { TextField } from "@/components/shared/TextField";
import { createCategory, deleteCategory, listCategories, updateCategory } from "@/features/api/catalog-api";
import { useAuth } from "@/features/auth/auth-context";

export function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: listCategories
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error("Falta autenticación.");
      }

      if (editingId) {
        return updateCategory(token, editingId, { name });
      }

      return createCategory(token, { name });
    },
    onSuccess: async () => {
      setName("");
      setEditingId(null);
      await queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      if (!token) {
        throw new Error("Falta autenticación.");
      }

      return deleteCategory(token, categoryId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
    }
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await saveMutation.mutateAsync();
  };

  return (
    <div className="dashboard-grid">
      <SurfaceCard title="Nueva categoría" description="Administra taxonomía del catálogo sin tocar el backend.">
        <form className="stack-md" onSubmit={handleSubmit}>
          <TextField label="Nombre" value={name} onChange={(event) => setName(event.target.value)} required />
          <Button type="submit">{editingId ? "Guardar" : "Crear"}</Button>
        </form>
      </SurfaceCard>
      <SurfaceCard title="Categorías activas" description="Edición rápida y segura.">
        {(categoriesQuery.data?.categories ?? []).length ? (
          <ul className="resource-list">
            {categoriesQuery.data?.categories.map((category) => (
              <li key={category.id}>
                <div>
                  <strong>{category.name}</strong>
                </div>
                <div className="button-row">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditingId(category.id);
                      setName(category.name);
                    }}
                  >
                    Editar
                  </Button>
                  <Button variant="danger" onClick={() => deleteMutation.mutate(category.id)}>
                    Eliminar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Sin categorías" description="Crea la primera categoría para comenzar." />
        )}
      </SurfaceCard>
    </div>
  );
}
