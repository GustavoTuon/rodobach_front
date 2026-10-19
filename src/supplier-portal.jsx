import { SupplierInvitations } from "./supplier-workspace.jsx";
import React, { useEffect, useState } from "react";
import { SupplierResponse } from "./screens/compras.jsx";
import { fetchWithTimeout } from "./http.js";
const key = "RB_SUPPLIER_SESSION";
function savedSession() {
  try {
    return JSON.parse(sessionStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}
async function call(path, body) {
  const response = await fetchWithTimeout(
    `${window.RB_API_BASE_URL}/compras-fornecedor${path}`,
    {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        ...(savedSession()?.token
          ? { Authorization: `Bearer ${savedSession().token}` }
          : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
  );
  const data = await response.json();
  if (!response.ok) {
    const e = new Error(data.error || "Não foi possível concluir.");
    e.status = response.status;
    throw e;
  }
  return data;
}
export default function SupplierPortal() {
  const [session, setSession] = useState(savedSession),
    [quotes, setQuotes] = useState([]),
    [selected, setSelected] = useState(window.location.hash.slice(1)),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [change, setChange] = useState(false);
  const [cnpj, setCnpj] = useState(""),
    [password, setPassword] = useState(""),
    [nextPassword, setNextPassword] = useState(""),
    [confirmation, setConfirmation] = useState("");
  const save = (value) => {
    if (value) sessionStorage.setItem(key, JSON.stringify(value));
    else sessionStorage.removeItem(key);
    setSession(value);
    setPassword("");
    setNextPassword("");
    setConfirmation("");
  };
  const mustChange = session && (session.trocaObrigatoria || change);
  useEffect(() => {
    if (!session || session.trocaObrigatoria) return;
    let active = true;
    setLoading(true);
    call("/cotacoes")
      .then((data) => {
        if (active) setQuotes(data);
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          if (e.status === 401) save(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session]);
  const back = () => {
    setSelected("");
    window.history.replaceState(null, "", window.location.pathname);
  };
  return (
    <div className="purchase-app purchase-public supplier-portal">
      <header className="purchase-toolbar">
        <img src="/brand/rodobach.png" alt="Rodobach" width="190" height="52" />
        {session && (
          <div className="purchase-actions">
            <button
              onClick={() => {
                setChange(true);
                setError("");
              }}
            >
              Alterar senha
            </button>
            <button
              onClick={() => {
                save(null);
                setQuotes([]);
                setChange(false);
                setError("");
              }}
            >
              Sair
            </button>
          </div>
        )}
      </header>
      {error && <p role="alert">{error}</p>}
      {!session || mustChange ? (
        <form
          className="purchase-card supplier-login"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setError("");
            if (mustChange && nextPassword !== confirmation) {
              setError("As novas senhas não conferem.");
              return;
            }
            setBusy(true);
            try {
              const data = await call(
                mustChange ? "/senha" : "/login",
                mustChange
                  ? { senhaAtual: password, novaSenha: nextPassword }
                  : { cnpj, senha: password },
              );
              save(data);
              setChange(false);
            } catch (err) {
              setError(err.message);
              if (
                mustChange &&
                err.status === 401 &&
                err.message !== "Senha atual incorreta."
              )
                save(null);
            } finally {
              setBusy(false);
            }
          }}
        >
          <span className="purchase-brand-caption">PORTAL DO FORNECEDOR</span>
          <h1>
            {mustChange ? "Crie sua senha pessoal" : "Bem-vindo à Rodobach"}
          </h1>
          <p>
            {mustChange
              ? "Antes de acessar as cotações, substitua a senha inicial por uma senha só sua."
              : "Entre para consultar os produtos solicitados e enviar suas propostas."}
          </p>
          {!session && (
            <label>
              CNPJ
              <input
                autoComplete="username"
                inputMode="numeric"
                required
                maxLength={18}
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0000-00"
              />
            </label>
          )}
          <label>
            {mustChange ? "Senha atual" : "Senha"}
            <input
              type="password"
              autoComplete="current-password"
              required
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {mustChange && (
            <>
              <label>
                Nova senha
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={10}
                  maxLength={72}
                  required
                  value={nextPassword}
                  onChange={(e) => setNextPassword(e.target.value)}
                />
              </label>
              <small>
                Use pelo menos 10 caracteres, com maiúscula, minúscula, número e
                símbolo.
              </small>
              <label>
                Confirmar nova senha
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                />
              </label>
            </>
          )}
          <button className="purchase-primary" disabled={busy}>
            {busy
              ? "Aguarde…"
              : mustChange
                ? "Salvar senha e continuar"
                : "Entrar"}
          </button>
          {change && !session?.trocaObrigatoria && (
            <button type="button" onClick={() => setChange(false)}>
              Cancelar
            </button>
          )}
          {!session && (
            <small>
              Primeiro acesso ou esqueceu sua senha? Solicite a liberação à
              equipe de compras.
            </small>
          )}
        </form>
      ) : selected ? (
        <>
          <button onClick={back}>← Minhas cotações</button>
          <SupplierResponse
            key={selected}
            invitationToken={selected}
            onSaved={() =>
              setQuotes((current) =>
                current.map((q) =>
                  q.token === selected
                    ? { ...q, respondido_em: new Date().toISOString() }
                    : q,
                ),
              )
            }
          />
        </>
      ) : (
        <SupplierInvitations
          quotes={quotes}
          loading={loading}
          onOpen={(token) => {
            setSelected(token);
            window.history.replaceState(null, "", `#${token}`);
          }}
        />
      )}
    </div>
  );
}
