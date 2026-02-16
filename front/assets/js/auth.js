(function () {
  const config = window.AppConfig || {};
  const TOKEN_KEY = config.auth?.tokenKey || "geoapp_token";
  const TOKEN_TTL_MS = config.auth?.tokenTTL || (1000 * 60 * 60 * 8); // 8 saat
  const API_LOGIN_URL = config.api?.login || "https://auth.example.com/login";

  const $ = (id) => document.getElementById(id);
  const appRoot = () => $("appRoot");
  const overlay = () => $("loginOverlay");
  const uInput = () => $("loginUsername");
  const pInput = () => $("loginPassword");
  const errBox = () => $("loginError");
  const loginBtn = () => $("loginBtn");
  const logoutBtn = () => $("logoutBtn");
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(() => {

      Loader.hide()
    }, 1000);

  });
  function readToken() {
    try { return JSON.parse(localStorage.getItem(TOKEN_KEY)); } catch { return null; }
  }
  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }
  function decodeJwtExpMs(token) {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      return payload && payload.exp ? payload.exp * 1000 : null;
    } catch { return null; }
  }
  function isTokenValid(tok) {
    if (!tok || typeof tok !== "object") return false;
    if (!tok.value || !tok.exp) return false;
    return Date.now() < Number(tok.exp);
  }
  function writeToken({ token, user }) {
    const expFromJwt = decodeJwtExpMs(token);
    const obj = {
      value: token,
      user: user || null,
      exp: expFromJwt || (Date.now() + TOKEN_TTL_MS)
    };
    localStorage.setItem(TOKEN_KEY, JSON.stringify(obj));
    window.Auth = {
      getToken: () => obj.value,
      isAuthenticated: () => isTokenValid(readToken()),
      getUser: () => (readToken()?.user || null),
      authHeader: () => ({ Authorization: "Bearer " + (readToken()?.value || "") })
    };
  }

  function showApp() {
    appRoot()?.classList.remove("app-hidden");
    const ov = overlay();
    if (ov) { ov.classList.add("is-hidden"); ov.style.display = "none"; }
  }
  function showLogin() {
    appRoot()?.classList.add("app-hidden");
    const ov = overlay();
    if (ov) { ov.classList.remove("is-hidden"); ov.style.display = ""; ov.style.visibility = "visible"; }
  }
  function clearError() {
    if (errBox()) { errBox().textContent = ""; errBox().classList.add("is-hidden"); }
  }
  function showError(msg) {
    if (errBox()) { errBox().textContent = msg || "Login alınmadı."; errBox().classList.remove("is-hidden"); }
  }

  async function doLogin() {
    const username = (uInput()?.value || "").trim();
    const password = pInput()?.value || "";

    if (!username || !password) {
      showError("Username və şifrə tələb olunur.");
      return;
    }

    const btn = loginBtn();
    const prevLabel = btn ? btn.textContent : "";
    if (btn) { btn.disabled = true; btn.textContent = "Daxil olunur..."; }

    try {
      // Local-only login (LDAP/auth API bypass)
      if (username !== "test" || password !== "test123") {
        showError("Yanlış username və ya şifrə.");
        return;
      }

      const user = { username: "test", name: "Test User" };
      const token = "local-test-token";

      writeToken({ token, user });
      clearError();
      showApp();
      document.dispatchEvent(new CustomEvent("auth:login", { detail: { user } }));
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = prevLabel || "Login"; }
      Loader.hide(); // <<<<< LOGIN SONU
    }
  }

  // ---- Logout ----
  function bindLogout() {
    const btn = logoutBtn();
    if (!btn) return;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      clearToken();
      document.dispatchEvent(new CustomEvent("auth:logout"));
      location.reload();
    });
  }

  // ---- Login eventləri ----
  function bindLogin() {
    const btn = loginBtn();
    if (btn) btn.addEventListener("click", doLogin);
    [uInput(), pInput()].forEach(inp => {
      if (!inp) return;
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") doLogin(); });
      inp.addEventListener("input", clearError);
    });
  }

  // ---- Start ----
  window.addEventListener("DOMContentLoaded", () => {
    const tok = readToken();
    // Global Auth helper-i hər halda qur
    window.Auth = {
      getToken: () => (readToken()?.value || null),
      isAuthenticated: () => isTokenValid(readToken()),
      getUser: () => (readToken()?.user || null),
      authHeader: () => ({ Authorization: "Bearer " + (readToken()?.value || "") })
    };

    // Demo mode: always require login on refresh
    if (tok) clearToken();
    showLogin();

    bindLogin();
    bindLogout();
  });
})();
