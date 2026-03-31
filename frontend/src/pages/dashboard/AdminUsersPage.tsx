import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/shared/Button";
import { SelectField } from "@/components/shared/SelectField";
import { SurfaceCard } from "@/components/shared/SurfaceCard";
import { TextField } from "@/components/shared/TextField";
import { createUser, deleteUser, listUsers, updateUser } from "@/features/api/admin-api";
import type { PublicUser } from "@/features/api/types";
import { useAuth } from "@/features/auth/auth-context";

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
        throw new Error("Falta autenticación.");
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
        throw new Error("Falta autenticación.");
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
      <SurfaceCard title={editingUser ? "Editar usuario" : "Nuevo usuario"} description="Alta y mantenimiento para admin, seller y customer.">
        <form className="stack-md" onSubmit={handleSubmit}>
          <TextField label="Nombre" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
          <TextField label="Correo" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required />
          {!editingUser ? (
            <TextField label="Contraseña" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required />
          ) : null}
          <SelectField
            label="Rol"
            value={form.role}
            onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as UserForm["role"] }))}
            options={[
              { value: "customer", label: "Customer" },
              { value: "seller", label: "Seller" },
              { value: "admin", label: "Admin" }
            ]}
          />
          <Button type="submit">{editingUser ? "Guardar cambios" : "Crear usuario"}</Button>
        </form>
      </SurfaceCard>
      <SurfaceCard title="Usuarios activos" description="Roles, bloqueo y eliminación controlada.">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(usersQuery.data?.users ?? []).map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{user.isBlocked ? "Bloqueado" : "Activo"}</td>
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
                        Editar
                      </Button>
                      <Button variant="ghost" onClick={() => updateUser(token!, user.id, { isBlocked: !user.isBlocked }).then(() => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }))}>
                        {user.isBlocked ? "Desbloquear" : "Bloquear"}
                      </Button>
                      <Button variant="danger" onClick={() => deleteMutation.mutate(user.id)}>
                        Eliminar
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
