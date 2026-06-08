import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import LoginIcon from "@mui/icons-material/Login";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { useAuth } from "../auth/AuthContext";
import { getErrorMessage } from "../api/http";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={user?.role === "DRIVER" ? "/driver" : "/dashboard"} replace />;
  }

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const loggedUser = await login(email, password);
      navigate(loggedUser.role === "DRIVER" ? "/driver" : "/dashboard", { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        background: (theme) =>
          theme.palette.mode === "dark"
            ? "linear-gradient(135deg, #262424 0%, #312f2f 58%, #1d1b1b 100%)"
            : "linear-gradient(135deg, #e7e7e1 0%, #f7f6f1 55%, #dedbd3 100%)"
      }}
    >
      <Container maxWidth="sm">
        <Stack spacing={3} alignItems="center">
          <Stack spacing={1} alignItems="center">
            <Box
              sx={{
                width: 64,
                height: 64,
                display: "grid",
                placeItems: "center",
                borderRadius: 5,
                bgcolor: "primary.main",
                color: "primary.contrastText"
              }}
            >
              <LocalShippingIcon fontSize="large" />
            </Box>
            <Typography variant="h4" fontWeight={900} textAlign="center">
              Logistics IS
            </Typography>
            <Typography color="text.secondary" textAlign="center">
              Управление маршрутами, заявками и путевыми листами
            </Typography>
          </Stack>

          <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 }, width: "100%" }}>
            <Box component="form" onSubmit={submit}>
              <Stack spacing={2.25}>
                {error && <Alert severity="error">{error}</Alert>}
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Пароль"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  fullWidth
                />
                <Button type="submit" variant="contained" size="large" startIcon={<LoginIcon />} disabled={loading}>
                  Войти
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
