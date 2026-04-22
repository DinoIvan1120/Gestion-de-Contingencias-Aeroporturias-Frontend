import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restaurar sesión desde localStorage al montar
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Función de logout reutilizable (navega de forma suave)
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true }); // ← navegación React Router, sin hard reload
  }, [navigate]);

  // Escuchar el evento que lanza axiosClient cuando recibe 401
  // Así el interceptor puede disparar el logout sin depender de React directamente
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener("auth:session-expired", handler);
    return () => window.removeEventListener("auth:session-expired", handler);
  }, [logout]);

  const login = useCallback((data) => {
    const { token: t, ...userData } = data;
    setToken(t);
    setUser(userData);
    localStorage.setItem("token", t);
    localStorage.setItem("user", JSON.stringify(userData));
  }, []);

  const rol = user?.rol ?? null;
  const isAdmin = rol === "ADMINISTRADOR";
  const isLider = rol === "LIDER_SAASA";
  const isAgente = rol === "AGENTE_SAASA";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        rol,
        isAdmin,
        isLider,
        isAgente,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
