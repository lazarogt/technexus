import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/shared/Button";
import { EmptyState } from "@/components/shared/EmptyState";
import { SurfaceCard } from "@/components/shared/SurfaceCard";
import { TextField } from "@/components/shared/TextField";
import { createCategory, deleteCategory, listCategories, updateCategory } from "@/features/api/catalog-api";
import { useAuth } from "@/features/auth/auth-context";

export function AdminCategoriesPage() {
  const { t } = useTranslation();
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
        throw new Error(t("dashboard.adminCategories.authRequired"));
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
        throw new Error(t("dashboard.adminCategories.authRequired"));
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
      <SurfaceCard title={t("dashboard.adminCategories.newTitle")} description={t("dashboard.adminCategories.newDescription")}>
        <form className="stack-md" onSubmit={handleSubmit}>
          <TextField label={t("labels.name")} value={name} onChange={(event) => setName(event.target.value)} required />
          <Button type="submit">{editingId ? t("buttons.save") : t("buttons.create")}</Button>
        </form>
      </SurfaceCard>
      <SurfaceCard title={t("dashboard.adminCategories.activeTitle")} description={t("dashboard.adminCategories.activeDescription")}>
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
                    {t("buttons.edit")}
                  </Button>
                  <Button variant="danger" onClick={() => deleteMutation.mutate(category.id)}>
                    {t("buttons.delete")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={t("dashboard.adminCategories.emptyTitle")} description={t("dashboard.adminCategories.emptyDescription")} />
        )}
      </SurfaceCard>
    </div>
  );
}
