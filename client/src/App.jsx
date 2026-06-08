import { useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import AppLayout from "./layout/AppLayout";
import { createAppTheme } from "./theme/theme";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import UsersPage from "./pages/UsersPage";
import DriversPage from "./pages/DriversPage";
import VehiclesPage from "./pages/VehiclesPage";
import ClientsPage from "./pages/ClientsPage";
import CargoRequestsPage from "./pages/CargoRequestsPage";
import PlanningPage from "./pages/PlanningPage";
import RoutesPage from "./pages/RoutesPage";
import WaybillsPage from "./pages/WaybillsPage";
import DriverPortalPage from "./pages/DriverPortalPage";
import ReportsPage from "./pages/ReportsPage";

export default function App() {
  const [mode, setMode] = useState(() => localStorage.getItem("logistics_theme") || "light");
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  const toggleMode = () => {
    setMode((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("logistics_theme", next);
      return next;
    });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout mode={mode} onToggleMode={toggleMode} />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
                  <Route path="/users" element={<UsersPage />} />
                </Route>
                <Route element={<ProtectedRoute roles={["ADMIN", "DISPATCHER"]} />}>
                  <Route path="/drivers" element={<DriversPage />} />
                  <Route path="/vehicles" element={<VehiclesPage />} />
                  <Route path="/clients" element={<ClientsPage />} />
                  <Route path="/cargo-requests" element={<CargoRequestsPage />} />
                  <Route path="/planning" element={<PlanningPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                </Route>
                <Route path="/routes" element={<RoutesPage />} />
                <Route path="/waybills" element={<WaybillsPage />} />
                <Route element={<ProtectedRoute roles={["DRIVER"]} />}>
                  <Route path="/driver" element={<DriverPortalPage />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
