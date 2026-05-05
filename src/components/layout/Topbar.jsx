import { useState } from "react";
import { Menu, LogOut, AlertTriangle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getRolColor, getRolLabel } from "../../utils/roleUtils";
import styles from "./Topbar.module.css";

export default function Topbar({ onMenuClick }) {
  const { user, rol, logout } = useAuth();
  const rolColor = getRolColor(rol);
  const envLabel = import.meta.env.VITE_ENV_LABEL;

  // Estado del diálogo de confirmación
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [exiting, setExiting] = useState(false);

  // Abre el diálogo
  const handleLogoutClick = () => setConfirmOpen(true);

  // Cancela — cierra el diálogo con animación de salida
  const handleCancel = () => {
    setExiting(true);
    setTimeout(() => {
      setConfirmOpen(false);
      setExiting(false);
    }, 220);
  };

  // Confirma — animación breve antes de ejecutar el logout
  const handleConfirm = () => {
    setExiting(true);
    // Pequeño delay para que la animación de salida del modal se vea
    setTimeout(() => {
      setConfirmOpen(false);
      setExiting(false);
      logout(); // navigate() suave — no hard reload
    }, 200);
  };

  return (
    <>
      <header className={styles.topbar} style={{ background: rolColor }}>
        <div className={styles.left}>
          <button
            className={styles.menuBtn}
            onClick={onMenuClick}
            aria-label="Abrir menú"
          >
            <Menu size={22} color="#fff" />
          </button>
          <div className={styles.title}>
            <span className={styles.appName}>Diseño e Innovación</span>
            {envLabel && <span className={styles.envBadge}>{envLabel}</span>}
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>
              {user?.nombre} {user?.apellido}
            </span>
            <span className={styles.rolLabel}>{getRolLabel(rol)}</span>
          </div>

          {/* Botón de logout — ahora abre el diálogo */}
          <button
            className={styles.logoutBtn}
            onClick={handleLogoutClick}
            aria-label="Cerrar sesión"
          >
            <LogOut size={18} color="#fff" />
            <span className={styles.logoutLabel}>Salir</span>
          </button>
        </div>
      </header>

      {/* ── Diálogo de confirmación de cierre de sesión ── */}
      {confirmOpen && (
        <div
          className={[
            styles.overlay,
            exiting ? styles.overlayOut : styles.overlayIn,
          ].join(" ")}
        >
          <div
            className={[
              styles.dialog,
              exiting ? styles.dialogOut : styles.dialogIn,
            ].join(" ")}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            aria-describedby="logout-desc"
          >
            {/* Ícono de advertencia */}
            <div className={styles.dialogIcon}>
              <AlertTriangle size={32} color="#B45309" />
            </div>

            {/* Texto */}
            <div className={styles.dialogBody}>
              <h3 className={styles.dialogTitle} id="logout-title">
                ¿Cerrar sesión?
              </h3>
              <p className={styles.dialogDesc} id="logout-desc">
                Tu sesión se cerrará y serás redirigido a la pantalla de inicio
                de sesión.
              </p>
            </div>

            {/* Botones */}
            <div className={styles.dialogActions}>
              <button
                className={styles.cancelBtn}
                onClick={handleCancel}
                autoFocus
              >
                Cancelar
              </button>
              <button className={styles.confirmBtn} onClick={handleConfirm}>
                <LogOut size={15} />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
