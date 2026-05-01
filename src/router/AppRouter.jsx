import { Routes, Route, Navigate } from "react-router-dom";
import PrivateRoute from "./PrivateRoute.jsx";
import RolRoute from "./RolRoute.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";

import LoginPage from "../pages/auth/LoginPage.jsx";
import DashboardPage from "../pages/dashboard/DashboardPage.jsx";

import LiderVueloPage from "../pages/lider/LiderVueloPage.jsx";
import LiderRecursosPage from "../pages/lider/LiderRecursosPage.jsx";

import AgenteAtencionPage from "../pages/agente/AgenteAtencionPage.jsx";
import AgentePDFPage from "../pages/agente/AgentePDFPage.jsx";

import ReportesPage from "../pages/reportes/ReportesPage.jsx";

import AdminDashboardPage from "../pages/admin/AdminDashboardPage.jsx";
import AdminProveedoresPage from "../pages/admin/AdminProveedoresPage.jsx";
import AdminUsuariosPage from "../pages/admin/AdminUsuariosPage.jsx";
import AdminVuelosPage from "../pages/admin/AdminVuelosPage.jsx";

import AuditoriaPage from "../pages/auditoria/AuditoriaPage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";
import ReporteDetallePage from "../pages/reportes/ReporteDetallePage.jsx";

export default function AppRouter() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/recovery" element={<Navigate to="/login" replace />} />
      <Route
        path="/reset-password"
        element={<Navigate to="/login" replace />}
      />

      {/* Privadas */}
      <Route element={<PrivateRoute />}>
        {/* Dashboard de módulos — sin AppLayout (pantalla completa propia) */}
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Páginas con AppLayout (sidebar + topbar) */}
        <Route element={<AppLayout />}>
          <Route
            element={<RolRoute roles={["LIDER_SAASA", "ADMINISTRADOR"]} />}
          >
            <Route path="/lider/vuelo" element={<LiderVueloPage />} />
            {/* <Route path="/lider/recursos" element={<LiderRecursosPage />} /> */}
          </Route>
          <Route
            element={
              <RolRoute
                roles={["AGENTE_SAASA", "LIDER_SAASA", "ADMINISTRADOR"]}
              />
            }
          >
            <Route path="/agente/atencion" element={<AgenteAtencionPage />} />
            <Route path="/agente/pdf" element={<AgentePDFPage />} />
          </Route>
          <Route
            element={
              <RolRoute
                roles={[
                  "LINEA_AEREA",
                  "LIDER_SAASA",
                  "ADMINISTRADOR",
                  "PROVEEDOR",
                  "AGENTE_SAASA",
                ]}
              />
            }
          >
            <Route path="/reportes" element={<ReportesPage />} />
            <Route
              path="/reportes/detalle/:id"
              element={<ReporteDetallePage />}
            />
          </Route>
          {/* <Route element={<RolRoute roles={["ADMINISTRADOR"]} />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route
              path="/admin/proveedores"
              element={<AdminProveedoresPage />}
            />
            <Route path="/admin/usuarios" element={<AdminUsuariosPage />} />
            <Route path="/admin/vuelos" element={<AdminVuelosPage />} />
            <Route path="/auditoria" element={<AuditoriaPage />} />
          </Route> */}
          // ✅ CORRECCIÓN — separar /admin/proveedores con su propio RolRoute
          <Route
            element={<RolRoute roles={["ADMINISTRADOR", "LIDER_SAASA"]} />}
          >
            <Route
              path="/admin/proveedores"
              element={<AdminProveedoresPage />}
            />
          </Route>
          <Route element={<RolRoute roles={["ADMINISTRADOR"]} />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/usuarios" element={<AdminUsuariosPage />} />
            <Route path="/admin/vuelos" element={<AdminVuelosPage />} />
            <Route path="/auditoria" element={<AuditoriaPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
