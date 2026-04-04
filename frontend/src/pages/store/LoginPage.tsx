import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/shared/Button";
import { TextField } from "@/components/shared/TextField";
import { useAuth } from "@/features/auth/auth-context";
import { ES } from "@/i18n/es";

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    try {
      const user = await login({ email, password });
      const defaultDestination =
        user.role === "admin" ? "/admin" : user.role === "seller" ? "/seller" : "/account";
      navigate((location.state as { from?: string } | null)?.from ?? defaultDestination);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : t("auth.loginError"));
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" data-testid="login-form" onSubmit={handleSubmit}>
        <p className="section-eyebrow">{ES.auth.loginEyebrow}</p>
        <h1>{ES.auth.loginTitle}</h1>
        <TextField label={ES.labels.email} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <TextField label={ES.labels.password} type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        {error ? <p className="field-error">{error}</p> : null}
        <Button type="submit" fullWidth>
          {ES.buttons.signIn}
        </Button>
        <p>
          {ES.auth.noAccount} <Link to="/register">{ES.buttons.createAccount}</Link>
        </p>
      </form>
    </div>
  );
}
