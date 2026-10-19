import React, { useEffect, useState } from "react";
import ComprasDemo from "./screens/compras.jsx";

export default function PurchasesPortal() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const expired = () => {
      if (active) {
        setUser(null);
        setError("");
        setChecking(false);
      }
    };
    window.addEventListener("rodobach:unauthorized", expired);
    setChecking(true);
    setUser(null);
    setError("");
    if (!window.RB_AUTH?.getToken()) setChecking(false);
    else
      window.RB_AUTH.me()
        .then(({ user: current }) => {
          if (active) setUser(current);
        })
        .catch((err) => {
          if (active && window.RB_AUTH.getToken())
            setError(err.message || "Não foi possível verificar seu acesso.");
        })
        .finally(() => {
          if (active) setChecking(false);
        });
    return () => {
      active = false;
      window.removeEventListener("rodobach:unauthorized", expired);
    };
  }, [attempt]);

  if (checking)
    return (
      <main className="compras-access" role="status">
        Verificando seu acesso ao portal de compras…
      </main>
    );
  if (error)
    return (
      <main className="compras-access">
        <h1>Portal de compras</h1>
        <p role="alert">{error}</p>
        <div className="compras-access-actions">
          <button onClick={() => setAttempt((n) => n + 1)}>
            Tentar novamente
          </button>
          <a href="/">Voltar ao sistema</a>
        </div>
      </main>
    );
  if (!user) {
    const Login = window.LoginScreen;
    return Login ? (
      <Login onLogin={() => setAttempt((n) => n + 1)} />
    ) : (
      <main className="compras-access">Entre no sistema para continuar.</main>
    );
  }
  if (!user.admin && !user.permissions?.compras)
    return (
      <main className="compras-access">
        <h1>Portal de compras</h1>
        <p role="alert">
          Sem acesso ao portal. Solicite a permissão de Compras ao
          administrador.
        </p>
        <a href="/">Voltar ao sistema</a>
      </main>
    );
  return <ComprasDemo standalone />;
}
