import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/shared/Button";
import { SelectField } from "@/components/shared/SelectField";
import { SurfaceCard } from "@/components/shared/SurfaceCard";
import { TextField } from "@/components/shared/TextField";
import { createUser, deleteUser, listUsers, updateUser } from "@/features/api/admin-api";
import type { PublicUser } from "@/features/api/types";
import { useAuth } from "@/features/auth/auth-context";
import { getUserRoleLabel } from "@/i18n/es";

type UserForm = {
  name: string;
  email: string;
  password: string;
  role: "admin" | "seller" | "customer";
};

const emptyUserForm: UserForm = {
  name: "",
  email: "",
  password: "",
  role: "customer"
};

export function AdminUsersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const [editingUser, setEditingUser] = useState<PublicUser | null>(null);
  const [form, setForm] = useState<UserForm>(emptyUserForm);

  const usersQuery = useQuery({
    queryKey: ["admin", "users"],
    enabled: Boolean(token),
    queryFn: () => listUsers(token!, { limit: 100 })
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error(t("dashboard.adminUsers.authRequired"));
      }

      if (editingUser) {
        return updateUser(token, editingUser.id, {
          name: form.name,
          email: form.email,
          role: form.role
        });
      }

      return createUser(token, form);
    },
    onSuccess: async () => {
      setEditingUser(null);
      setForm(emptyUserForm);
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!token) {
        throw new Error(t("dashboard.adminUsers.authRequired"));
      }

      return deleteUser(token, userId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    }
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await saveMutation.mutateAsync();
  };

  return (
    <div className="dashboard-grid">
      <SurfaceCard title={editingUser ? t("dashboard.adminUsers.editTitle") : t("dashboard.adminUsers.newTitle")} description={t("dashboard.adminUsers.description")}>
        <form className="stack-md" onSubmit={handleSubmit}>
          <TextField label={t("labels.name")} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
          <TextField label={t("labels.email")} type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required />
          {!editingUser ? (
            <TextField label={t("labels.password")} type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required />
          ) : null}
          <SelectField
            label={t("labels.role")}
            value={form.role}
            onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as UserForm["role"] }))}
            options={[
              { value: "customer", label: getUserRoleLabel("customer") },
              { value: "seller", label: getUserRoleLabel("seller") },
              { value: "admin", label: getUserRoleLabel("admin") }
            ]}
          />
          <Button type="submit">{editingUser ? t("buttons.saveChanges") : t("buttons.createUser")}</Button>
        </form>
      </SurfaceCard>
      <SurfaceCard title={t("dashboard.adminUsers.activeTitle")} description={t("dashboard.adminUsers.activeDescription")}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("labels.name")}</th>
                <th>{t("labels.email")}</th>
                <th>{t("labels.role")}</th>
                <th>{t("labels.status")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(usersQuery.data?.users ?? []).map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{getUserRoleLabel(user.role)}</td>
                  <td>{user.isBlocked ? t("dashboard.adminUsers.blocked") : t("dashboard.adminUsers.active")}</td>
                  <td>
                    <div className="button-row">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setEditingUser(user);
                          setForm({
                            name: user.name,
                            email: user.email,
                            password: "",
                            role: user.role
                          });
                        }}
                      >
                        {t("buttons.edit")}
                      </Button>
                      <Button variant="ghost" onClick={() => updateUser(token!, user.id, { isBlocked: !user.isBlocked }).then(() => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }))}>
                        {user.isBlocked ? t("buttons.unblock") : t("buttons.block")}
                      </Button>
                      <Button variant="danger" onClick={() => deleteMutation.mutate(user.id)}>
                        {t("buttons.delete")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SurfaceCard>
    </div>
  );
}
