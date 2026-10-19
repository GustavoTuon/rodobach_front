const { useState, useEffect, useRef } = React;

import { EXTRA_SCREEN_PERMISSIONS } from "../screen-permissions.js";
import { PERMISSION_ITEMS as TELAS, isPermissionEffective, filterPermissionGroups } from "../user-permissions.js";

const FORM_VAZIO = {
  perfil_despesas: "colaborador",
  telemetria_motorista_id: null,
  ...Object.fromEntries(EXTRA_SCREEN_PERMISSIONS.map(item => [item.column, false])),
  login: "",
  senha: "",
  email: "",
  numero: "",
  admin: false,
  ativo: true,
  perm_diretoria: false,
  perm_simulador: false,
  perm_viagens: false,
  perm_aprovar_viagens: false,
  perm_dre_empresarial: false,
  perm_analise_frota: false,
  perm_abastecimentos: false,
  perm_precos_combustivel: false,
  perm_faturamento_diario: false,
  perm_comparativo_faturamento: false,
  perm_lucro_viagens: false,
  perm_custos_veiculos: false,
  perm_manutencoes_veiculos: false,
  perm_clientes: false,
  perm_clientes_lucro: false,
  perm_status_carga: false,
  perm_pneus: false,
  perm_multas_frota: false,
  perm_manutencao: false,
  perm_automacoes_n8n: false,
  perm_settings: false,
  perm_folgas_motoristas: false,
  perm_trafegus: false,
  perm_oportunidades_retorno: false,
  perm_consulta_nfe: false,
  perm_controle_canhotos: false,
  perm_manutencao_posicoes: false,
};

const Toggle = ({ value, onChange, label, disabled = false }) => (
  <label
    style={{
      display: "flex",
      alignItems: "center",
      gap: 7,
      cursor: "pointer",
      userSelect: "none",
    }}
  >
    <button
      type="button"
      role="switch"
      disabled={disabled}
      aria-label={label}
      aria-checked={Boolean(value)}
      onClick={() => onChange(!value)}
      style={{
        border: 0,
        padding: 0,
        width: 36,
        height: 20,
        borderRadius: 10,
        flexShrink: 0,
        background: value ? "var(--brand-blue)" : "var(--border)",
        position: "relative",
        transition: "background 150ms",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 2,
          left: value ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 150ms",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </button>
    {label && (
      <span style={{ fontSize: 12.5, color: "var(--text)" }}>{label}</span>
    )}
  </label>
);

const GerenciarUsuarios = ({ onNavigate }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | "create" | objeto usuário
  const [form, setForm] = useState(FORM_VAZIO);
  const [saving, setSaving] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState("");
  const permissionGroups = filterPermissionGroups(permissionSearch);
  const [erro, setErro] = useState("");
  const [erroLista, setErroLista] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [motoristas, setMotoristas] = useState([]);
  const [motoristasLoading, setMotoristasLoading] = useState(false);
  const [motoristasError, setMotoristasError] = useState("");
  const [motoristasAttempt, setMotoristasAttempt] = useState(0);
  useEffect(() => {
    if (!modal || form.perfil_despesas !== "motorista") return;
    let active = true;
    setMotoristasLoading(true);
    setMotoristasError("");
    RB_API.listMotoristasTelemetria().then(data => {
      if (active) setMotoristas(data.motoristas || []);
    }).catch(error => { if (active) setMotoristasError(error.message); })
      .finally(() => { if (active) setMotoristasLoading(false); });
    return () => { active = false; };
  }, [modal, form.perfil_despesas, motoristasAttempt]);

  const carregar = async () => {
    setLoading(true);
    setErroLista("");
    try {
      const data = await RB_API.listUsuarios();
      setUsuarios(Array.isArray(data?.usuarios) ? data.usuarios : []);
    } catch (e) {
      console.error(e);
      setErroLista(e.message || "Nao foi possivel carregar os usuarios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const abrirCriacao = () => {
    setPermissionSearch("");
    setForm(FORM_VAZIO);
    setErro("");
    setShowSenha(false);
    setModal("create");
  };

  const abrirEdicao = (u) => {
    setPermissionSearch("");
    setForm({
      ...Object.fromEntries(EXTRA_SCREEN_PERMISSIONS.map(item => [item.column, u[item.column] === true])),
      login: u.login,
      perfil_despesas: u.perfil_despesas || "colaborador",
      telemetria_motorista_id: u.telemetria_motorista_id || null,
      senha: "",
      email: u.email || "",
      numero: u.numero || "",
      admin: u.admin,
      ativo: u.ativo,
      perm_diretoria: u.perm_diretoria ?? false,
      perm_simulador: u.perm_simulador ?? false,
      perm_viagens: u.perm_viagens ?? false,
      perm_aprovar_viagens: u.perm_aprovar_viagens ?? false,
      perm_dre_empresarial: u.perm_dre_empresarial ?? false,
      perm_analise_frota: u.perm_analise_frota ?? false,
      perm_abastecimentos: u.perm_abastecimentos ?? false,
      perm_precos_combustivel:
        u.perm_precos_combustivel ?? u.perm_abastecimentos ?? false,
      perm_faturamento_diario: u.perm_faturamento_diario ?? false,
      perm_comparativo_faturamento: u.perm_comparativo_faturamento ?? false,
      perm_lucro_viagens: u.perm_lucro_viagens ?? false,
      perm_custos_veiculos: u.perm_custos_veiculos ?? false,
      perm_manutencoes_veiculos: u.perm_manutencoes_veiculos ?? false,
      perm_clientes: u.perm_clientes ?? false,
      perm_clientes_lucro: u.perm_clientes_lucro ?? false,
      perm_status_carga: u.perm_status_carga ?? false,
      perm_pneus: u.perm_pneus ?? false,
      perm_multas_frota: u.perm_multas_frota ?? u.perm_manutencao ?? false,
      perm_settings: u.perm_settings ?? false,
      perm_manutencao: u.perm_manutencao ?? false,
      perm_automacoes_n8n: u.perm_automacoes_n8n ?? false,
      perm_folgas_motoristas:
        u.perm_folgas_motoristas ?? u.perm_viagens ?? false,
      perm_trafegus: u.perm_trafegus ?? u.perm_viagens ?? false,
      perm_oportunidades_retorno:
        u.perm_oportunidades_retorno ?? u.perm_viagens ?? false,
      perm_consulta_nfe: u.perm_consulta_nfe ?? u.perm_viagens ?? false,
      perm_controle_canhotos:
        u.perm_controle_canhotos ??
        u.perm_consulta_nfe ??
        u.perm_viagens ?? false,
      perm_manutencao_posicoes:
        u.perm_manutencao_posicoes ?? u.perm_manutencao ?? false,
    });
    setErro("");
    setModal(u);
  };

  const fecharModal = () => {
    setModal(null);
    setErro("");
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErro("");
    try {
      const payload = { ...form };
      if (payload.perfil_despesas === "motorista") {
        if (!payload.telemetria_motorista_id) throw new Error("Selecione o motorista da telemetria.");
        payload.admin = false;
        payload.perm_conferencia_manutencao = false;
      } else payload.telemetria_motorista_id = null;
      if (!payload.senha) delete payload.senha;
      if (modal === "create") {
        await RB_API.createUsuario(payload);
      } else {
        await RB_API.updateUsuario(modal.id, payload);
      }
      await carregar();
      fecharModal();
    } catch (e) {
      setErro(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExcluir = async (u) => {
    if (
      !confirm(
        `Excluir o usuário "${u.login}"? Esta ação não pode ser desfeita.`,
      )
    )
      return;
    try {
      await RB_API.deleteUsuario(u.id);
      await carregar();
    } catch (e) {
      alert(e.message);
    }
  };

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const inputStyle = {
    width: "100%",
    padding: "7px 10px",
    border: "1.5px solid var(--border)",
    borderRadius: 6,
    background: "var(--surface)",
    color: "var(--text)",
    fontSize: 13,
    fontFamily: "inherit",
    boxSizing: "border-box",
    outline: "none",
  };

  return (
    <div className="view">
      <div className="page-head">
        <div>
          <h1>Usuários</h1>
          <div className="sub">Gerencie usuários e permissões de acesso</div>
        </div>
        <button
          onClick={abrirCriacao}
          style={{
            padding: "7px 16px",
            background: "var(--brand-blue)",
            color: "#fff",
            border: "none",
            borderRadius: 7,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          + Novo usuário
        </button>
      </div>

      {/* Tabela */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 24, color: "var(--muted)", fontSize: 13 }}>
            Carregando…
          </div>
        ) : erroLista ? (
          <div style={{ padding: 24, color: "#ef4444", fontSize: 13 }}>
            {erroLista}
          </div>
        ) : (
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {[
                  "Login",
                  "Email",
                  "Número",
                  "Perfil",
                  "Status",
                  "Permissões efetivas",
                  "Ações",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 14px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "var(--text)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u, i) => {
                const telasCount = TELAS.filter((t) => isPermissionEffective(t, u)).length;
                return (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom:
                        i < usuarios.length - 1
                          ? "1px solid var(--divider)"
                          : "none",
                    }}
                  >
                    <td style={{ padding: "10px 14px", fontWeight: 500 }}>
                      {u.login}
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--muted)" }}>
                      {u.email || "—"}
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--muted)" }}>
                      {u.numero || "—"}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 11.5,
                          fontWeight: 500,
                          background: u.admin
                            ? "rgba(79,127,171,0.15)"
                            : "var(--accent-soft)",
                          color: u.admin ? "var(--brand-blue)" : "var(--muted)",
                        }}
                      >
                        {u.admin ? "Admin" : "Usuário"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 11.5,
                          fontWeight: 500,
                          background: u.ativo
                            ? "rgba(34,197,94,0.1)"
                            : "rgba(239,68,68,0.08)",
                          color: u.ativo ? "#16a34a" : "#ef4444",
                        }}
                      >
                        {u.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--muted)" }}>
                      {telasCount}/{TELAS.length} permissões
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => abrirEdicao(u)}
                          style={{
                            padding: "4px 10px",
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderRadius: 5,
                            fontSize: 12,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            color: "var(--text)",
                          }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleExcluir(u)}
                          style={{
                            padding: "4px 10px",
                            background: "transparent",
                            border: "1px solid rgba(239,68,68,0.35)",
                            borderRadius: 5,
                            fontSize: 12,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            color: "#ef4444",
                          }}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {usuarios.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: "32px 14px",
                      color: "var(--muted)",
                      textAlign: "center",
                    }}
                  >
                    Nenhum usuário cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div
          onClick={(e) => e.target === e.currentTarget && fecharModal()}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            className="user-modal"
            style={{
              background: "var(--surface)",
              borderRadius: 12,
              width: "100%",
              maxWidth: 820,
              maxHeight: "92vh",
              overflowY: "auto",
              boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
            }}
          >
            {/* Header modal */}
            <div
              style={{
                padding: "16px 20px 14px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                position: "sticky",
                top: 0,
                background: "var(--surface)",
                zIndex: 1,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 15 }}>
                {modal === "create" ? "Novo usuário" : `Editar: ${modal.login}`}
              </div>
              <button
                onClick={fecharModal}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--muted)",
                  fontSize: 20,
                  lineHeight: 1,
                  padding: "0 4px",
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSalvar} style={{ padding: 20 }}>
              {/* Dados básicos */}
              <div
                className="user-basic-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 500,
                      marginBottom: 5,
                      color: "var(--text)",
                    }}
                  >
                    Login *
                  </label>
                  <input
                    type="text"
                    value={form.login}
                    onChange={(e) => set("login", e.target.value)}
                    style={inputStyle}
                    required
                    placeholder="ex: joao.silva"
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 500,
                      marginBottom: 5,
                      color: "var(--text)",
                    }}
                  >
                    Senha{" "}
                    {modal !== "create" && (
                      <span style={{ fontWeight: 400, color: "var(--muted)" }}>
                        (vazio = não alterar)
                      </span>
                    )}
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showSenha ? "text" : "password"}
                      value={form.senha}
                      onChange={(e) => set("senha", e.target.value)}
                      style={{ ...inputStyle, paddingRight: 36 }}
                      required={modal === "create"}
                      placeholder={
                        modal === "create" ? "Senha inicial" : "••••••••"
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowSenha((v) => !v)}
                      tabIndex={-1}
                      title={showSenha ? "Ocultar senha" : "Mostrar senha"}
                      style={{
                        position: "absolute",
                        right: 8,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--muted)",
                        padding: 2,
                        display: "flex",
                      }}
                    >
                      <Icon name={showSenha ? "eye-off" : "eye"} size={15} />
                    </button>
                  </div>
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 500,
                      marginBottom: 5,
                      color: "var(--text)",
                    }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    style={inputStyle}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 500,
                      marginBottom: 5,
                      color: "var(--text)",
                    }}
                  >
                    Número / Telefone
                  </label>
                  <input
                    type="text"
                    value={form.numero}
                    onChange={(e) => set("numero", e.target.value)}
                    style={inputStyle}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <fieldset style={{border: "1px solid var(--border)", borderRadius: 8, padding: 14, marginBottom: 16}}>
                <legend>Perfil de despesas</legend>
                <label>Quem utiliza esta conta?
                  <select aria-label="Perfil de despesas" value={form.perfil_despesas} style={inputStyle}
                    onChange={event => setForm(current => ({...current, perfil_despesas: event.target.value,
                      telemetria_motorista_id: null,
                      ...(event.target.value === "motorista" ? {admin: false, perm_conferencia_manutencao: false, perm_manutencao_plantao: true} : {})}))}>
                    <option value="colaborador">Colaborador — todas as placas</option>
                    <option value="motorista">Motorista — placa da telemetria</option>
                  </select>
                </label>
                {form.perfil_despesas === "motorista" && <>
                  <label>Motorista na telemetria
                    <select aria-label="Motorista na telemetria" required style={inputStyle}
                      disabled={motoristasLoading || Boolean(motoristasError)} value={form.telemetria_motorista_id || ""}
                      onChange={event => set("telemetria_motorista_id", event.target.value || null)}>
                      <option value="">{motoristasLoading ? "Carregando motoristas…" : "Selecione o motorista"}</option>
                      {form.telemetria_motorista_id && !motoristas.some(item => item.id === form.telemetria_motorista_id) &&
                        <option value={form.telemetria_motorista_id}>Vínculo atual · ID {form.telemetria_motorista_id}</option>}
                      {motoristas.map(item => <option key={item.id} value={item.id}>{item.nome} · ID {item.id} · {item.plate || "Sem placa confirmada"}</option>)}
                    </select>
                  </label>
                  <p>A placa acompanha automaticamente a identificação do motorista na telemetria. Esta conta não terá acesso de administrador ou conferência.</p>
                  {motoristas.find(item => item.id === form.telemetria_motorista_id)?.message && <p role="status">{motoristas.find(item => item.id === form.telemetria_motorista_id).message}</p>}
                  {motoristasError && <p role="alert">{motoristasError} <button type="button" onClick={() => setMotoristasAttempt(n => n + 1)}>Tentar novamente</button></p>}
                </>}
                {form.perfil_despesas === "colaborador" && <p>Pode registrar despesas para qualquer placa da frota, conforme as permissões abaixo.</p>}
              </fieldset>

              {/* Flags */}
              <div
                className="user-status-flags"
                style={{
                  display: "flex",
                  gap: 24,
                  padding: "12px 14px",
                  background: "var(--bg)",
                  borderRadius: 8,
                  marginBottom: 16,
                }}
              >
                <Toggle
                  value={form.admin}
                  disabled={form.perfil_despesas === "motorista"}
                  onChange={(v) => set("admin", v)}
                  label="Administrador (pode cadastrar usuários)"
                />
                <Toggle
                  value={form.ativo}
                  onChange={(v) => set("ativo", v)}
                  label="Ativo"
                />
              </div>

              <section className="user-permissions" aria-label="Permissões de telas e funções">
                <div className="user-permissions-heading">
                  <div><h3>Telas e funções</h3><p>Confira o que cada permissão libera antes de salvar.</p></div>
                  <span>{TELAS.filter(t => isPermissionEffective(t, form)).length} de {TELAS.length} ativas</span>
                </div>
                <input type="search" aria-label="Buscar tela ou função" placeholder="Buscar tela ou função…" value={permissionSearch}
                  onChange={event => setPermissionSearch(event.target.value)} style={inputStyle} />
                <p className="user-permission-note">{form.admin
                  ? "Administrador: acessos gerais e gestão de usuários incluídos. Folgas, Status Carga e Automações n8n exigem liberação explícita."
                  : "Cada controle libera as telas e funções descritas. Telas que compartilham uma permissão são ativadas juntas. Gestão de usuários é exclusiva do administrador."}</p>
                <div className="user-permission-groups">
                  {permissionGroups.map(grupo => <section className="user-permission-group" key={grupo.id} aria-label={grupo.label}>
                    <div className="user-permission-group-title">{grupo.label}</div>
                    <div className="user-permission-grid">
                      {grupo.telas.map(t => {
                        const inherited = form.admin && !t.explicit;
                        const blocked = form.perfil_despesas === "motorista" && t.id === "perm_conferencia_manutencao";
                        return <div className="user-permission-item" key={t.id}>
                          <Toggle value={!blocked && isPermissionEffective(t, form)} disabled={saving || inherited || blocked}
                            onChange={v => set(t.id, v)} label={t.label} />
                          <p>{t.description}</p>
                          {inherited && <small>Incluída no perfil administrador</small>}
                          {blocked && <small>Indisponível para o perfil Motorista</small>}
                          {t.explicit && form.admin && <small>Liberação explícita para administrador</small>}
                        </div>;
                      })}
                    </div>
                  </section>)}
                </div>
                {!permissionGroups.length && <p role="status">Nenhuma permissão encontrada.</p>}
                {form.perm_aprovar_viagens && !form.perm_viagens && !form.admin && <p className="user-permission-note">Para usar a aprovação comercial na tela Cargas e viagens, libere também Cargas e viagens.</p>}
              </section>

              {/* Erro */}
              {erro && (
                <div
                  style={{
                    marginBottom: 14,
                    padding: "8px 12px",
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: 6,
                    fontSize: 12.5,
                    color: "#ef4444",
                  }}
                >
                  {erro}
                </div>
              )}

              {/* Ações */}
              <div
                className="user-modal-actions"
                style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
              >
                <button
                  type="button"
                  onClick={fecharModal}
                  style={{
                    padding: "8px 16px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    color: "var(--text)",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: "8px 16px",
                    background: "var(--brand-blue)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: saving ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {saving ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

window.GerenciarUsuarios = GerenciarUsuarios;
