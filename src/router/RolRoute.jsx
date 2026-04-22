import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { REDIRECT_POR_ROL } from "../utils/constants";

export default function RolRoute({ roles = [] }) {
  const { rol } = useAuth();

  if (!roles.includes(rol)) {
    const redirect = REDIRECT_POR_ROL[rol] ?? "/login";
    return <Navigate to={redirect} replace />;
  }

  return <Outlet />;
}
