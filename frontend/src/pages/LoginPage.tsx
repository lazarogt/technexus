import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { apiRequest } from "../lib/api";
import { useSession } from "../lib/auth-context";
import { getRoleDashboardPath } from "../lib/site-routes";
import { defaultLoginForm, type AuthResponse } from "../lib/types";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { applyAuthResponse } = useSession();
  const [form, setForm] = useState(defaultLoginForm);
  const [submitError, setSubmitError] = useState("");

  const loginMutation = useMutation({
    mutationFn: () =>
      apiRequest<AuthResponse>("/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password
        })
      }),
    onSuccess: (response) => {
      applyAuthResponse(response);
      const fallbackPath = getRoleDashboardPath(response.user.role);
      const redirectPath =
        typeof location.state === "object" &&
        location.state !== null &&
        "from" in location.state &&
        typeof location.state.from === "string"
          ? location.state.from
          : fallbackPath;

      navigate(redirectPath === "/login" || redirectPath === "/register" ? fallbackPath : redirectPath, {
        replace: true
      });
    },
    onError: (error) => {
      setSubmitError(error instanceof Error ? error.message : "Unable to sign in.");
    }
  });

  const emailError = form.email.trim().length === 0 ? "Email is required." : "";
  const passwordError = form.password.length === 0 ? "Password is required." : "";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(203,213,225,0.9),_rgba(248,250,252,1)_45%,_rgba(226,232,240,1))] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <section className="panel-surface hidden overflow-hidden bg-ink p-8 text-white lg:block">
          <span className="inline-flex rounded-pill border border-white/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-white/70">
            TechNexus access
          </span>
          <h1 className="mt-6 max-w-xl font-display text-5xl font-bold leading-none">
            Entra directo al panel correcto según tu rol real.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-8 text-white/72">
            Seller y admin no ven flujos de compra. Customer aterriza en sus pedidos, carrito y
            marketplace.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/54">Admin</p>
              <p className="mt-2 text-sm font-semibold text-white">Ops + metrics</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/54">Seller</p>
              <p className="mt-2 text-sm font-semibold text-white">Products + orders</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/54">Customer</p>
              <p className="mt-2 text-sm font-semibold text-white">Orders + cart</p>
            </div>
          </div>
        </section>

        <section className="flex items-center">
          <Card
            className="w-full"
            description="Usa credenciales reales del seed para validar dashboards, CRUD y notificaciones."
            eyebrow="Login"
            title="Sign in"
          >
            <div className="grid gap-4">
              <Input
                autoComplete="email"
                error={submitError ? undefined : emailError}
                label="Email"
                onChange={(event) => {
                  setSubmitError("");
                  setForm((current) => ({ ...current, email: event.target.value }));
                }}
                placeholder="admin@example.com"
                type="email"
                value={form.email}
              />
              <Input
                autoComplete="current-password"
                error={submitError ? undefined : passwordError}
                label="Password"
                onChange={(event) => {
                  setSubmitError("");
                  setForm((current) => ({ ...current, password: event.target.value }));
                }}
                placeholder="••••••••"
                type="password"
                value={form.password}
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
                loading={loginMutation.isPending}
                onClick={() => void loginMutation.mutate()}
                type="button"
              >
                Access account
              </Button>
              <Link className="action-secondary sm:flex-1" to="/register">
                Create account
              </Link>
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}
