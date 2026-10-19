import React, { useState } from "react";
import { SupplierPicker } from "./purchases-dashboard.jsx";
import { purchasesApi as api } from "./purchases-api.js";
export function SupplierGroups({ groups, suppliers, onRefresh }) {
  const [form, setForm] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <section className="purchase-card">
      <header className="purchase-toolbar">
        <div>
          <h2>Grupos de fornecedores</h2>
          <p>
            Organize por especialidade e adicione o grupo inteiro aos produtos.
          </p>
        </div>
        <button
          onClick={() => {
            setError("");
            setForm({ nome: "", fornecedores: [] });
          }}
        >
          + Criar grupo
        </button>
      </header>
      <div className="purchase-actions">
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => {
              setForm({ ...g });
              setError("");
            }}
          >
            {g.nome} · {g.fornecedores.length} <small>Editar</small>
          </button>
        ))}
      </div>
      {!groups.length && !form && (
        <p>Crie seu primeiro grupo, como Elétrica, Pneus ou Peças.</p>
      )}
      {form && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            setError("");
            try {
              await api("/grupos", form);
              setForm(null);
              await onRefresh();
            } catch (err) {
              setError(err.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Nome do grupo
            <input
              value={form.nome}
              required
              minLength={2}
              maxLength={80}
              placeholder="Ex.: Elétrica"
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </label>
          <SupplierPicker
            showGroups={false}
            label="Participantes do grupo"
            suppliers={suppliers}
            selected={form.fornecedores}
            onChange={(fornecedores) => setForm({ ...form, fornecedores })}
          />
          <p>
            Um fornecedor pode participar de vários grupos. Alterações não
            modificam cotações já criadas.
          </p>
          {error && <p role="alert">{error}</p>}
          <div className="purchase-actions">
            <button className="purchase-primary" disabled={busy}>
              {busy ? "Salvando…" : "Salvar grupo"}
            </button>
            <button type="button" disabled={busy} onClick={() => setForm(null)}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
export function SupplierAccess({ supplier, onRefresh }) {
  const [confirm, setConfirm] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const exists =
    supplier.acesso_ativo !== null && supplier.acesso_ativo !== undefined;
  return (
    <div className="supplier-access">
      <p>
        <strong>{supplier.documento || "CNPJ não informado"}</strong>
      </p>
      <small>
        {supplier.acesso_ativo
          ? supplier.troca_obrigatoria
            ? "Aguardando troca da senha inicial"
            : "Acesso ativo"
          : exists
            ? "Acesso revogado"
            : "Acesso ainda não liberado"}
      </small>
      <div className="purchase-actions">
        <button
          disabled={busy}
          onClick={() => setConfirm(exists ? "redefinir" : "ativar")}
        >
          {exists ? "Redefinir acesso" : "Liberar acesso"}
        </button>
        {supplier.acesso_ativo && (
          <button disabled={busy} onClick={() => setConfirm("revogar")}>
            Revogar
          </button>
        )}
      </div>
      {confirm && (
        <div className="supplier-access-confirm">
          <p>
            {confirm === "revogar"
              ? "Revogar o acesso e encerrar as sessões deste fornecedor?"
              : confirm === "redefinir"
                ? "Redefinir para Senha@123? As sessões atuais serão encerradas e uma nova troca será obrigatória."
                : "Liberar login com o CNPJ e senha inicial Senha@123? A troca será obrigatória no primeiro acesso."}
          </p>
          <div className="purchase-actions">
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                setNotice("");
                try {
                  await api(`/fornecedores/${supplier.id}/acesso`, {
                    acao: confirm,
                  });
                  setConfirm(null);
                  setNotice(
                    confirm === "revogar"
                      ? "Acesso revogado."
                      : "Acesso liberado. Informe o link do portal e a senha inicial ao fornecedor.",
                  );
                  await onRefresh();
                } catch (e) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Confirmar
            </button>
            <button disabled={busy} onClick={() => setConfirm(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
