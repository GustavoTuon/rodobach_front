const { useState, useEffect, useRef } = React;

const TELAS = [
  { id: "perm_simulador",       label: "Calculadora" },
  { id: "perm_diarias",         label: "Diárias" },
  { id: "perm_viagens",         label: "Viagens" },
  { id: "perm_custos",          label: "Custos" },
  { id: "perm_receita",         label: "Receita" },
  { id: "perm_demonstrativo",   label: "DRE" },
  { id: "perm_dre_empresarial", label: "DRE Empresarial" },
  { id: "perm_placa",           label: "Por Placa" },
  { id: "perm_clientes",        label: "Clientes" },
  { id: "perm_pneus",           label: "Pneus" },
  { id: "perm_manutencao",      label: "Manutenção" },
  { id: "perm_settings",        label: "Configurações" },
];

const FORM_VAZIO = {
  login: "", senha: "", email: "", numero: "",
  admin: false, ativo: true,
  perm_simulador: true, perm_diarias: true, perm_viagens: true,
  perm_custos: true, perm_receita: true, perm_demonstrativo: true,
  perm_dre_empresarial: true, perm_placa: true, perm_clientes: true,
  perm_pneus: true, perm_manutencao: true, perm_settings: true,
};

const Toggle = ({ value, onChange, label }) => (
  <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", userSelect: "none" }}>
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 36, height: 20, borderRadius: 10, flexShrink: 0,
        background: value ? "var(--brand-blue)" : "var(--border)",
        position: "relative", transition: "background 150ms", cursor: "pointer",
      }}
    >
      <div style={{
        position: "absolute", top: 2, left: value ? 18 : 2,
        width: 16, height: 16, borderRadius: "50%", background: "#fff",
        transition: "left 150ms", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }}/>
    </div>
    {label && <span style={{ fontSize: 12.5, color: "var(--text)" }}>{label}</span>}
  </label>
);

const GerenciarUsuarios = ({ onNavigate }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | "create" | objeto usuário
  const [form, setForm] = useState(FORM_VAZIO);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [showSenha, setShowSenha] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const data = await RB_API.listUsuarios();
      setUsuarios(data.usuarios);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const abrirCriacao = () => {
    setForm(FORM_VAZIO);
    setErro("");
    setShowSenha(false);
    setModal("create");
  };

  const abrirEdicao = (u) => {
    setForm({
      login: u.login, senha: "",
      email: u.email || "", numero: u.numero || "",
      admin: u.admin, ativo: u.ativo,
      perm_simulador: u.perm_simulador, perm_diarias: u.perm_diarias,
      perm_viagens: u.perm_viagens, perm_custos: u.perm_custos,
      perm_receita: u.perm_receita, perm_demonstrativo: u.perm_demonstrativo,
      perm_dre_empresarial: u.perm_dre_empresarial, perm_placa: u.perm_placa,
      perm_clientes: u.perm_clientes, perm_pneus: u.perm_pneus,
      perm_settings: u.perm_settings,
    });
    setErro("");
    setModal(u);
  };

  const fecharModal = () => { setModal(null); setErro(""); };

  const handleSalvar = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErro("");
    try {
      const payload = { ...form };
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
    if (!confirm(`Excluir o usuário "${u.login}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await RB_API.deleteUsuario(u.id);
      await carregar();
    } catch (e) {
      alert(e.message);
    }
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const inputStyle = {
    width: "100%", padding: "7px 10px",
    border: "1.5px solid var(--border)", borderRadius: 6,
    background: "var(--surface)", color: "var(--text)",
    fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", outline: "none",
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
            padding: "7px 16px", background: "var(--brand-blue)", color: "#fff",
            border: "none", borderRadius: 7, fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          + Novo usuário
        </button>
      </div>

      {/* Tabela */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 24, color: "var(--muted)", fontSize: 13 }}>Carregando…</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Login", "Email", "Número", "Perfil", "Status", "Telas liberadas", "Ações"].map(h => (
                  <th key={h} style={{
                    padding: "10px 14px", textAlign: "left",
                    fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u, i) => {
                const telasCount = TELAS.filter(t => u[t.id]).length;
                return (
                  <tr key={u.id} style={{ borderBottom: i < usuarios.length - 1 ? "1px solid var(--divider)" : "none" }}>
                    <td style={{ padding: "10px 14px", fontWeight: 500 }}>{u.login}</td>
                    <td style={{ padding: "10px 14px", color: "var(--muted)" }}>{u.email || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "var(--muted)" }}>{u.numero || "—"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 4, fontSize: 11.5, fontWeight: 500,
                        background: u.admin ? "rgba(79,127,171,0.15)" : "var(--accent-soft)",
                        color: u.admin ? "var(--brand-blue)" : "var(--muted)",
                      }}>{u.admin ? "Admin" : "Usuário"}</span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 4, fontSize: 11.5, fontWeight: 500,
                        background: u.ativo ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.08)",
                        color: u.ativo ? "#16a34a" : "#ef4444",
                      }}>{u.ativo ? "Ativo" : "Inativo"}</span>
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--muted)" }}>
                      {telasCount}/{TELAS.length} telas
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => abrirEdicao(u)} style={{
                          padding: "4px 10px", background: "var(--surface)",
                          border: "1px solid var(--border)", borderRadius: 5,
                          fontSize: 12, cursor: "pointer", fontFamily: "inherit", color: "var(--text)",
                        }}>Editar</button>
                        <button onClick={() => handleExcluir(u)} style={{
                          padding: "4px 10px", background: "transparent",
                          border: "1px solid rgba(239,68,68,0.35)", borderRadius: 5,
                          fontSize: 12, cursor: "pointer", fontFamily: "inherit", color: "#ef4444",
                        }}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: "32px 14px", color: "var(--muted)", textAlign: "center" }}>
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
          onClick={e => e.target === e.currentTarget && fecharModal()}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}
        >
          <div style={{
            background: "var(--surface)", borderRadius: 12, width: "100%", maxWidth: 540,
            maxHeight: "92vh", overflowY: "auto",
            boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
          }}>
            {/* Header modal */}
            <div style={{
              padding: "16px 20px 14px",
              borderBottom: "1px solid var(--border)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              position: "sticky", top: 0, background: "var(--surface)", zIndex: 1,
            }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>
                {modal === "create" ? "Novo usuário" : `Editar: ${modal.login}`}
              </div>
              <button onClick={fecharModal} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--muted)", fontSize: 20, lineHeight: 1, padding: "0 4px",
              }}>×</button>
            </div>

            <form onSubmit={handleSalvar} style={{ padding: 20 }}>
              {/* Dados básicos */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 5, color: "var(--text)" }}>Login *</label>
                  <input
                    type="text" value={form.login}
                    onChange={e => set("login", e.target.value)}
                    style={inputStyle} required
                    placeholder="ex: joao.silva"
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 5, color: "var(--text)" }}>
                    Senha {modal !== "create" && <span style={{ fontWeight: 400, color: "var(--muted)" }}>(vazio = não alterar)</span>}
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showSenha ? "text" : "password"} value={form.senha}
                      onChange={e => set("senha", e.target.value)}
                      style={{ ...inputStyle, paddingRight: 36 }} required={modal === "create"}
                      placeholder={modal === "create" ? "Senha inicial" : "••••••••"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSenha(v => !v)}
                      tabIndex={-1}
                      title={showSenha ? "Ocultar senha" : "Mostrar senha"}
                      style={{
                        position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--muted)", padding: 2, display: "flex",
                      }}
                    >
                      <Icon name={showSenha ? "eye-off" : "eye"} size={15}/>
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 5, color: "var(--text)" }}>Email</label>
                  <input
                    type="email" value={form.email}
                    onChange={e => set("email", e.target.value)}
                    style={inputStyle} placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 5, color: "var(--text)" }}>Número / Telefone</label>
                  <input
                    type="text" value={form.numero}
                    onChange={e => set("numero", e.target.value)}
                    style={inputStyle} placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              {/* Flags */}
              <div style={{
                display: "flex", gap: 24, padding: "12px 14px",
                background: "var(--bg)", borderRadius: 8, marginBottom: 16,
              }}>
                <Toggle value={form.admin} onChange={v => set("admin", v)} label="Administrador (pode cadastrar usuários)"/>
                <Toggle value={form.ativo} onChange={v => set("ativo", v)} label="Ativo"/>
              </div>

              {/* Permissões de telas */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>
                  Permissões de telas
                </div>
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
                  padding: "12px 14px", background: "var(--bg)", borderRadius: 8,
                }}>
                  {TELAS.map(t => (
                    <Toggle key={t.id} value={form[t.id]} onChange={v => set(t.id, v)} label={t.label}/>
                  ))}
                </div>
                <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--muted)" }}>
                  Telas desativadas ficam ocultas no menu do usuário.
                </div>
              </div>

              {/* Erro */}
              {erro && (
                <div style={{
                  marginBottom: 14, padding: "8px 12px",
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: 6, fontSize: 12.5, color: "#ef4444",
                }}>{erro}</div>
              )}

              {/* Ações */}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" onClick={fecharModal} style={{
                  padding: "8px 16px", background: "var(--surface)",
                  border: "1px solid var(--border)", borderRadius: 6,
                  fontSize: 13, cursor: "pointer", fontFamily: "inherit", color: "var(--text)",
                }}>Cancelar</button>
                <button type="submit" disabled={saving} style={{
                  padding: "8px 16px", background: "var(--brand-blue)", color: "#fff",
                  border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit",
                }}>
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
