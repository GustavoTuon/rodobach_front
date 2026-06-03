const { useState } = React;

const LoginScreen = ({ onLogin }) => {
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await RB_AUTH.login(login, senha);
      onLogin(result);
    } catch (err) {
      setError(err.message || "Erro ao fazer login.");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = login.trim().length > 0 && senha.length > 0 && !loading;

  const inputStyle = {
    width: "100%",
    padding: "9px 11px",
    border: "1.5px solid var(--border)",
    borderRadius: 7,
    background: "var(--surface)",
    color: "var(--text)",
    fontSize: 13.5,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
    transition: "border-color 120ms ease",
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
      padding: "0 16px",
    }}>
      <div style={{ width: "100%", maxWidth: 380 }}>

        {/* Logotipo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img
            src="uploads/WhatsApp Image 2026-05-21 at 11.02.31.jpeg"
            alt="Norte"
            style={{ maxWidth: 180, maxHeight: 100, objectFit: "contain", marginBottom: 8 }}
          />
        </div>

        {/* Card do formulário */}
        <div className="card" style={{ padding: "24px 24px 20px" }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>Entrar no sistema</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>Informe seu login e senha para continuar</div>
          </div>

          <form onSubmit={handleSubmit} autoComplete="on">
            {/* Campo login */}
            <div style={{ marginBottom: 13 }}>
              <label style={{
                display: "block",
                fontSize: 12.5, fontWeight: 500,
                marginBottom: 5, color: "var(--text)",
              }}>
                Login
              </label>
              <input
                type="text"
                value={login}
                onChange={e => setLogin(e.target.value)}
                placeholder="seu.login"
                autoComplete="username"
                autoFocus
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = "var(--brand-blue)"}
                onBlur={e => e.target.style.borderColor = "var(--border)"}
              />
            </div>

            {/* Campo senha */}
            <div style={{ marginBottom: 18 }}>
              <label style={{
                display: "block",
                fontSize: 12.5, fontWeight: 500,
                marginBottom: 5, color: "var(--text)",
              }}>
                Senha
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ ...inputStyle, paddingRight: 38 }}
                  onFocus={e => e.target.style.borderColor = "var(--brand-blue)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  tabIndex={-1}
                  style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--muted)", padding: 2, display: "flex",
                  }}
                  title={showPass ? "Ocultar senha" : "Mostrar senha"}
                >
                  <Icon name={showPass ? "eye-off" : "eye"} size={15}/>
                </button>
              </div>
            </div>

            {/* Mensagem de erro */}
            {error && (
              <div style={{
                marginBottom: 14,
                padding: "8px 12px",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.22)",
                borderRadius: 6,
                fontSize: 12.5,
                color: "#ef4444",
              }}>
                {error}
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                width: "100%",
                padding: "9px 16px",
                background: canSubmit ? "var(--brand-blue)" : "var(--border)",
                color: canSubmit ? "#ffffff" : "var(--muted)",
                border: "none",
                borderRadius: 7,
                fontSize: 13.5,
                fontWeight: 600,
                cursor: canSubmit ? "pointer" : "not-allowed",
                fontFamily: "inherit",
                transition: "all 120ms ease",
              }}
            >
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </form>
        </div>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "var(--muted)" }}>
          Rodobach · Sistema interno
        </div>
      </div>
    </div>
  );
};

window.LoginScreen = LoginScreen;
