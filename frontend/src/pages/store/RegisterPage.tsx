import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/shared/Button";
import { SelectField } from "@/components/shared/SelectField";
import { TextField } from "@/components/shared/TextField";
import { useAuth } from "@/features/auth/auth-context";

export function RegisterPage() {
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
      setError(registerError instanceof Error ? registerError.message : "No se pudo crear la cuenta.");
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" data-testid="register-form" onSubmit={handleSubmit}>
        <p className="section-eyebrow">Alta pública</p>
        <h1>Crea tu cuenta</h1>
        <TextField label="Nombre" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
        <TextField label="Correo" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required />
        <TextField label="Contraseña" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required />
        <SelectField
          label="Tipo de cuenta"
          value={form.role}
          onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as "customer" | "seller" }))}
          options={[
            { value: "customer", label: "Comprador" },
            { value: "seller", label: "Vendedor" }
          ]}
        />
        {error ? <p className="field-error">{error}</p> : null}
        <Button type="submit" fullWidth>
          Crear cuenta
        </Button>
        <p>
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </form>
    </div>
  );
}
