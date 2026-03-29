import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { apiRequest } from "../lib/api";
import { useSession } from "../lib/auth-context";
import { getRoleDashboardPath } from "../lib/site-routes";
import {
  defaultRegisterForm,
  type AuthResponse,
  type UserRole
} from "../lib/types";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { applyAuthResponse } = useSession();
  const [form, setForm] = useState(defaultRegisterForm);
  const [submitError, setSubmitError] = useState("");

  const registerMutation = useMutation({
    mutationFn: () =>
      apiRequest<AuthResponse>("/register", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role
        })
      }),
    onSuccess: (response) => {
      applyAuthResponse(response);
      navigate(getRoleDashboardPath(response.user.role), { replace: true });
    },
    onError: (error) => {
      setSubmitError(error instanceof Error ? error.message : "Unable to register the account.");
    }
  });

  const validations = {
    name: form.name.trim().length < 2 ? "Name must have at least 2 characters." : "",
    email: form.email.trim().length === 0 ? "Email is required." : "",
    password: form.password.length < 8 ? "Password must have at least 8 characters." : ""
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(15,23,42,0.12),_rgba(248,250,252,1)_42%,_rgba(226,232,240,0.92))] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl gap-6 lg:grid-cols-[minmax(360px,0.95fr)_minmax(0,1.05fr)]">
        <section className="flex items-center">
          <Card
            className="w-full"
            description="El rol elegido se guarda en el perfil y define el dashboard visible después del alta."
            eyebrow="Register"
            title="Create account"
          >
            <div className="grid gap-4">
              <Input
                autoComplete="name"
                error={submitError ? undefined : validations.name}
                label="Full name"
                onChange={(event) => {
                  setSubmitError("");
                  setForm((current) => ({ ...current, name: event.target.value }));
                }}
                placeholder="Luna Seller"
                value={form.name}
              />
              <Input
                autoComplete="email"
                error={submitError ? undefined : validations.email}
                label="Email"
                onChange={(event) => {
                  setSubmitError("");
                  setForm((current) => ({ ...current, email: event.target.value }));
                }}
                placeholder="seller@example.com"
                type="email"
                value={form.email}
              />
              <Input
                autoComplete="new-password"
                error={submitError ? undefined : validations.password}
                label="Password"
                onChange={(event) => {
                  setSubmitError("");
                  setForm((current) => ({ ...current, password: event.target.value }));
                }}
                placeholder="Minimum 8 characters"
                type="password"
                value={form.password}
              />
              <Select
                hint="Admin no está disponible desde registro público."
                label="Role"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    role: event.target.value as Extract<UserRole, "customer" | "seller">
                  }))
                }
                options={[
                  { label: "Customer", value: "customer" },
                  { label: "Seller", value: "seller" }
                ]}
                value={form.role}
              />
            </div>

            {submitError ? (
              <p className="mt-4 text-sm font-semibold text-error" role="alert">
                {submitError}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                className="sm:flex-1"
                loading={registerMutation.isPending}
                onClick={() => void registerMutation.mutate()}
                type="button"
              >
                Create account
              </Button>
              <Link className="action-secondary sm:flex-1" to="/login">
                I already have one
              </Link>
            </div>
          </Card>
        </section>

        <section className="panel-surface hidden overflow-hidden bg-ink p-8 text-white lg:block">
          <span className="inline-flex rounded-pill border border-white/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-white/70">
            Role-aware onboarding
          </span>
          <h1 className="mt-6 max-w-xl font-display text-5xl font-bold leading-none">
            Registro público limitado a customer y seller.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-8 text-white/72">
            El frontend respeta el backend actual: el usuario sale autenticado del register y entra
            directo a su espacio permitido.
          </p>
          <div className="mt-8 grid gap-3">
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/54">Customer flow</p>
              <p className="mt-2 text-sm font-semibold text-white">
                Marketplace, cart, checkout and personal orders.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/54">Seller flow</p>
              <p className="mt-2 text-sm font-semibold text-white">
                Product CRUD, order updates and seller metrics.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
