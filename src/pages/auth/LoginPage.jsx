import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import authApi from "../../api/authApi";
import styles from "./LoginPage.module.css";

const VIEW = { LOGIN: "login", FORGOT: "forgot", RESET: "reset" };

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [view, setView] = useState(VIEW.LOGIN);
  const [animating, setAnimating] = useState(false);

  const [loginForm, setLoginForm] = useState({ correo: "", password: "" });
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetForm, setResetForm] = useState({ codigo: "", nuevaPassword: "" });

  const [showPass, setShowPass] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  // Un único modal para éxito Y error — type: 'success' | 'error'
  const [modal, setModal] = useState({ show: false, type: "success", msg: "" });

  const goTo = (next) => {
    if (next === view) return;
    setAnimating(true);
    setTimeout(() => {
      setView(next);
      setAnimating(false);
    }, 260);
  };

  const showModal = (type, msg) => setModal({ show: true, type, msg });
  const showError = (msg) => showModal("error", msg);
  const showOk = (msg) => showModal("success", msg);

  const closeModal = () => {
    const { type } = modal;
    setModal({ show: false, type: "success", msg: "" });
    // Navegar automáticamente sólo en casos de éxito
    if (type === "success") {
      if (view === VIEW.FORGOT) goTo(VIEW.RESET);
      if (view === VIEW.RESET) {
        setForgotEmail("");
        setResetForm({ codigo: "", nuevaPassword: "" });
        goTo(VIEW.LOGIN);
      }
    }
    // Si fue error, simplemente se cierra el modal y el usuario sigue en la misma vista
  };

  /* ── LOGIN ── */
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.correo || !loginForm.password) {
      showError("Por favor, ingresa tu correo y contraseña.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await authApi.login({
        correo: loginForm.correo,
        password: loginForm.password,
      });
      if (data.success) {
        login(data.data);
        // Siempre al dashboard — ahí cada rol ve sus módulos
        navigate("/dashboard", { replace: true });
      } else {
        showError(data.message ?? "Credenciales inválidas.");
      }
    } catch (err) {
      showError(
        err.response?.data?.message ?? "No se pudo conectar al servidor.",
      );
    } finally {
      setLoading(false);
    }
  };

  /* ── FORGOT ── */
  const handleForgot = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      showError("Por favor, ingresa tu correo electrónico.");
      return;
    }
    setLoading(true);
    try {
      await authApi.forgotPassword({ correo: forgotEmail });
      showOk(`Se envió el código de verificación al correo ${forgotEmail}`);
    } catch (err) {
      showError(
        err.response?.data?.message ??
          "No se pudo enviar el correo de recuperación.",
      );
    } finally {
      setLoading(false);
    }
  };

  /* ── RESET ── */
  const handleReset = async (e) => {
    e.preventDefault();
    if (!resetForm.codigo || !resetForm.nuevaPassword) {
      showError("Por favor, completa el código y la nueva contraseña.");
      return;
    }
    if (resetForm.nuevaPassword.length < 8) {
      showError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({
        correo: forgotEmail,
        codigo: resetForm.codigo,
        nuevaPassword: resetForm.nuevaPassword,
      });
      showOk(
        "¡Contraseña actualizada exitosamente! Ahora puedes ingresar a tu cuenta.",
      );
    } catch (err) {
      showError(err.response?.data?.message ?? "Código inválido o expirado.");
    } finally {
      setLoading(false);
    }
  };

  const TITLES = {
    login: "Acceso Operativo",
    forgot: "Recuperar Acceso",
    reset: "Nueva Contraseña",
  };
  const SUBS = {
    login: "Sistema de Gestión de Contingencias Aeroportuarias",
    forgot: "Recibirás un código de verificación en tu correo registrado",
    reset: "Ingresa el código recibido y define tu nueva contraseña",
  };

  return (
    <div className={styles.page}>
      {/* ── PANEL IZQUIERDO ── */}
      <div className={styles.left}>
        <div className={styles.radarGrid} />
        <div className={styles.ring1} />
        <div className={styles.ring2} />
        <div className={styles.ring3} />
        <div className={styles.radarSweep} />

        <div className={styles.leftInner}>
          {/* Marca */}
          <div className={styles.brandWrap}>
            <div className={styles.brandLogo}>
              <svg viewBox="0 0 48 48" fill="none" width="36" height="36">
                <path
                  d="M24 4L40 13V27L24 44L8 27V13L24 4Z"
                  stroke="rgba(255,255,255,0.6)"
                  strokeWidth="1.5"
                  fill="none"
                />
                <path
                  d="M24 4L40 13V27L24 44L8 27V13L24 4Z"
                  stroke="white"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                  fill="none"
                />
                <path
                  d="M10 18L24 10L38 18"
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="1"
                />
                <circle cx="24" cy="22" r="3" fill="white" opacity="0.9" />
                <path
                  d="M24 22L34 30"
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth="1.5"
                />
                <path
                  d="M24 22L16 14"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="1"
                />
              </svg>
            </div>
            <div>
              <p className={styles.brandName}>
                <span>SAASA</span> - Diseño e Innovación
              </p>
              <p className={styles.brandTagline}>Plus Ultra Airlines</p>
            </div>
          </div>

          {/* Hero */}
          <div className={styles.heroBlock}>
            <div className={styles.heroBadge}>
              <span className={styles.heroBadgeDot} />
              SISTEMA ACTIVO
            </div>
            <h1 className={styles.heroTitle}>
              Gestión de
              <br />
              Contingencias
              <br />
              Aeroportuarias
            </h1>
            <p className={styles.heroDesc}>
              Plataforma centralizada para atención de pasajeros afectados por
              cancelaciones, demoras y reprogramaciones de vuelo.
            </p>
          </div>

          {/* Stats */}
          <div className={styles.statsRow}>
            {[
              { val: "5", label: "Roles\noperativos" },
              { val: "24/7", label: "Monitoreo\nen tiempo real" },
              { val: "PDF", label: "Vouchers\nautomáticos" },
            ].map((s) => (
              <div key={s.label} className={styles.statItem}>
                <span className={styles.statVal}>{s.val}</span>
                <span className={styles.statLabel}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className={styles.leftFooter}>
          ✈ LIM · MAD · BOG · SCL · GRU · EZE — Rutas Plus Ultra Airlines
        </p>
      </div>

      {/* ── PANEL DERECHO ── */}
      <div className={styles.right}>
        <div className={styles.noise} />
        <div className={styles.formCard}>
          {/* Indicador de pasos */}
          <div className={styles.viewIndicator}>
            {[VIEW.LOGIN, VIEW.FORGOT, VIEW.RESET].map((v) => (
              <div
                key={v}
                className={[
                  styles.viewDot,
                  view === v ? styles.viewDotActive : "",
                ].join(" ")}
              />
            ))}
          </div>

          {/* Ícono avión */}
          <div className={styles.planeIcon}>
            <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
              <path
                d="M21 16V14L13 9V3.5A1.5 1.5 0 0 0 11.5 2A1.5 1.5 0 0 0 10 3.5V9L2 14V16L10 13.5V19L8 20.5V22L11.5 21L15 22V20.5L13 19V13.5L21 16Z"
                fill="currentColor"
              />
            </svg>
          </div>

          {/* Título */}
          <div className={styles.formHeader}>
            <h2
              className={[
                styles.formTitle,
                animating ? styles.fadeOut : styles.fadeIn,
              ].join(" ")}
            >
              {TITLES[view]}
            </h2>
            <p
              className={[
                styles.formSub,
                animating ? styles.fadeOut : styles.fadeIn,
              ].join(" ")}
            >
              {SUBS[view]}
            </p>
          </div>

          {/* ── Vistas ── */}
          <div
            className={[
              styles.formBody,
              animating ? styles.slideOut : styles.slideIn,
            ].join(" ")}
          >
            {/* LOGIN */}
            {view === VIEW.LOGIN && (
              <form onSubmit={handleLogin} noValidate>
                <div className={styles.fieldGroup}>
                  <div className={styles.field}>
                    <label className={styles.label}>Correo electrónico</label>
                    <div className={styles.inputBox}>
                      <span className={styles.inputPre}>
                        <svg
                          viewBox="0 0 20 20"
                          fill="none"
                          width="16"
                          height="16"
                        >
                          <path
                            d="M3 4h14a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M2 6l8 5 8-5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <input
                        type="email"
                        value={loginForm.correo}
                        autoComplete="email"
                        onChange={(e) =>
                          setLoginForm((f) => ({
                            ...f,
                            correo: e.target.value,
                          }))
                        }
                        placeholder="operaciones@saasa.com"
                        className={styles.input}
                      />
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Contraseña</label>
                    <div className={styles.inputBox}>
                      <span className={styles.inputPre}>
                        <svg
                          viewBox="0 0 20 20"
                          fill="none"
                          width="16"
                          height="16"
                        >
                          <rect
                            x="3"
                            y="9"
                            width="14"
                            height="10"
                            rx="2"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M7 9V6a3 3 0 016 0v3"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                          <circle cx="10" cy="14" r="1.5" fill="currentColor" />
                        </svg>
                      </span>
                      <input
                        type={showPass ? "text" : "password"}
                        value={loginForm.password}
                        autoComplete="current-password"
                        onChange={(e) =>
                          setLoginForm((f) => ({
                            ...f,
                            password: e.target.value,
                          }))
                        }
                        placeholder="••••••••••"
                        className={styles.input}
                      />
                      <button
                        type="button"
                        className={styles.eyeBtn}
                        onClick={() => setShowPass((v) => !v)}
                      >
                        {showPass ? (
                          <svg
                            viewBox="0 0 20 20"
                            fill="none"
                            width="16"
                            height="16"
                          >
                            <path
                              d="M3 10s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                            <circle
                              cx="10"
                              cy="10"
                              r="2"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                            <path
                              d="M3 3l14 14"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                        ) : (
                          <svg
                            viewBox="0 0 20 20"
                            fill="none"
                            width="16"
                            height="16"
                          >
                            <path
                              d="M3 10s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                            <circle
                              cx="10"
                              cy="10"
                              r="2"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={styles.primaryBtn}
                >
                  {loading && <span className={styles.spinner} />}
                  {loading
                    ? "Verificando credenciales..."
                    : "Ingresar al sistema"}
                </button>

                <div className={styles.linksRow}>
                  <button
                    type="button"
                    className={styles.textLink}
                    onClick={() => goTo(VIEW.FORGOT)}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              </form>
            )}

            {/* FORGOT */}
            {view === VIEW.FORGOT && (
              <form onSubmit={handleForgot} noValidate>
                <div className={styles.fieldGroup}>
                  <div className={styles.field}>
                    <label className={styles.label}>
                      Correo electrónico registrado
                    </label>
                    <div className={styles.inputBox}>
                      <span className={styles.inputPre}>
                        <svg
                          viewBox="0 0 20 20"
                          fill="none"
                          width="16"
                          height="16"
                        >
                          <path
                            d="M3 4h14a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M2 6l8 5 8-5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <input
                        type="email"
                        value={forgotEmail}
                        autoComplete="email"
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="correo@saasa.com"
                        className={styles.input}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={styles.primaryBtn}
                >
                  {loading && <span className={styles.spinner} />}
                  {loading
                    ? "Enviando código..."
                    : "Enviar código de verificación"}
                </button>

                <div className={styles.linksRow}>
                  <button
                    type="button"
                    className={styles.textLink}
                    onClick={() => goTo(VIEW.LOGIN)}
                  >
                    ← Volver al inicio de sesión
                  </button>
                </div>
              </form>
            )}

            {/* RESET */}
            {view === VIEW.RESET && (
              <form onSubmit={handleReset} noValidate>
                <div className={styles.fieldGroup}>
                  <div className={styles.field}>
                    <label className={styles.label}>
                      Código de verificación
                    </label>
                    <div className={styles.inputBox}>
                      <span className={styles.inputPre}>
                        <svg
                          viewBox="0 0 20 20"
                          fill="none"
                          width="16"
                          height="16"
                        >
                          <rect
                            x="3"
                            y="5"
                            width="14"
                            height="12"
                            rx="2"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M7 9h6M7 12h4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                          <path
                            d="M7 2v3M13 2v3"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                      <input
                        type="text"
                        value={resetForm.codigo}
                        maxLength={8}
                        onChange={(e) =>
                          setResetForm((f) => ({
                            ...f,
                            codigo: e.target.value,
                          }))
                        }
                        placeholder="Ej: 875077"
                        className={[styles.input, styles.codeInput].join(" ")}
                      />
                    </div>
                    <span className={styles.hint}>
                      Revisa tu correo electrónico
                    </span>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Nueva contraseña</label>
                    <div className={styles.inputBox}>
                      <span className={styles.inputPre}>
                        <svg
                          viewBox="0 0 20 20"
                          fill="none"
                          width="16"
                          height="16"
                        >
                          <rect
                            x="3"
                            y="9"
                            width="14"
                            height="10"
                            rx="2"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M7 9V6a3 3 0 016 0v3"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                          <circle cx="10" cy="14" r="1.5" fill="currentColor" />
                        </svg>
                      </span>
                      <input
                        type={showNew ? "text" : "password"}
                        value={resetForm.nuevaPassword}
                        onChange={(e) =>
                          setResetForm((f) => ({
                            ...f,
                            nuevaPassword: e.target.value,
                          }))
                        }
                        placeholder="Mínimo 8 caracteres"
                        className={styles.input}
                      />
                      <button
                        type="button"
                        className={styles.eyeBtn}
                        onClick={() => setShowNew((v) => !v)}
                      >
                        {showNew ? (
                          <svg
                            viewBox="0 0 20 20"
                            fill="none"
                            width="16"
                            height="16"
                          >
                            <path
                              d="M3 10s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                            <circle
                              cx="10"
                              cy="10"
                              r="2"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                            <path
                              d="M3 3l14 14"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                        ) : (
                          <svg
                            viewBox="0 0 20 20"
                            fill="none"
                            width="16"
                            height="16"
                          >
                            <path
                              d="M3 10s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                            <circle
                              cx="10"
                              cy="10"
                              r="2"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={styles.primaryBtn}
                >
                  {loading && <span className={styles.spinner} />}
                  {loading ? "Actualizando..." : "Cambiar contraseña"}
                </button>

                <div className={styles.linksRow}>
                  <button
                    type="button"
                    className={styles.textLink}
                    onClick={() => goTo(VIEW.LOGIN)}
                  >
                    ← Acceder a tu cuenta
                  </button>
                </div>
              </form>
            )}
          </div>

          <p className={styles.cardFooter}>Diseño e Innovación - 2026</p>
        </div>
      </div>

      {/* ── MODAL CENTRADO — éxito y error ── */}
      {modal.show && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            {/* Ícono según tipo */}
            <div
              className={[
                styles.modalIconWrap,
                modal.type === "success"
                  ? styles.modalIconSuccess
                  : styles.modalIconError,
              ].join(" ")}
            >
              {modal.type === "success" ? (
                <svg viewBox="0 0 40 40" fill="none" width="36" height="36">
                  <circle
                    cx="20"
                    cy="20"
                    r="19"
                    stroke="#22c55e"
                    strokeWidth="2"
                  />
                  <path
                    d="M11 20l6 7 12-14"
                    stroke="#22c55e"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 40 40" fill="none" width="36" height="36">
                  <circle
                    cx="20"
                    cy="20"
                    r="19"
                    stroke="#ef4444"
                    strokeWidth="2"
                  />
                  <path
                    d="M13 13l14 14M27 13L13 27"
                    stroke="#ef4444"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </div>

            <p className={styles.modalMsg}>{modal.msg}</p>

            <button
              className={[
                styles.modalBtn,
                modal.type === "error" ? styles.modalBtnError : "",
              ].join(" ")}
              onClick={closeModal}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
