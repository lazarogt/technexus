import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/shared/Button";
import { TextField } from "@/components/shared/TextField";
import { useAuth } from "@/features/auth/auth-context";

export function LoginPage() {
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
      setError(loginError instanceof Error ? loginError.message : "No se pudo iniciar sesión.");
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" data-testid="login-form" onSubmit={handleSubmit}>
        <p className="section-eyebrow">Acceso</p>
        <h1>Ingresa a TechNexus</h1>
        <TextField label="Correo" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <TextField label="Contraseña" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        {error ? <p className="field-error">{error}</p> : null}
        <Button type="submit" fullWidth>
          Ingresar
        </Button>
        <p>
          ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
        </p>
      </form>
    </div>
  );
}
