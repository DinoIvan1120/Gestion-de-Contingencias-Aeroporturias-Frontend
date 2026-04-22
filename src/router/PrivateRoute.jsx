import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/ui/Spinner.jsx";

export default function PrivateRoute() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        <Spinner size="lg" />
      </div>
    );
  }

  return token ? <Outlet /> : <Navigate to="/login" replace />;
}
