import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/shared/Button";
import { SelectField } from "@/components/shared/SelectField";
import { TextField } from "@/components/shared/TextField";
import { useAuth } from "@/features/auth/auth-context";
import { ES } from "@/i18n/es";

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register } = useAuth();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "customer" as "customer" | "seller"
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    try {
      const user = await register(form);
      navigate(user.role === "seller" ? "/seller" : "/account");
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : t("auth.registerError"));
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" data-testid="register-form" onSubmit={handleSubmit}>
        <p className="section-eyebrow">{ES.auth.registerEyebrow}</p>
        <h1>{ES.auth.registerTitle}</h1>
        <TextField label={ES.labels.name} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
        <TextField label={ES.labels.email} type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required />
        <TextField label={ES.labels.password} type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required />
        <SelectField
          label={ES.auth.accountType}
          value={form.role}
          onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as "customer" | "seller" }))}
          options={[
            { value: "customer", label: t("auth.customer") },
            { value: "seller", label: t("auth.seller") }
          ]}
        />
        {error ? <p className="field-error">{error}</p> : null}
        <Button type="submit" fullWidth>
          {ES.buttons.createAccount}
        </Button>
        <p>
          {ES.auth.alreadyHaveAccount} <Link to="/login">{ES.buttons.signIn}</Link>
        </p>
      </form>
    </div>
  );
}
