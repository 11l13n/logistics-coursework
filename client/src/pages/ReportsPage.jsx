import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@mui/material";
import AssessmentIcon from "@mui/icons-material/Assessment";
import RouteIcon from "@mui/icons-material/Route";
import SpeedIcon from "@mui/icons-material/Speed";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import CancelIcon from "@mui/icons-material/Cancel";
import http, { getErrorMessage } from "../api/http";
import StatCard from "../components/StatCard";
import { todayInput } from "../utils/format";

const monthStart = () => {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().slice(0, 10);
};

export default function ReportsPage() {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayInput());
  const [summary, setSummary] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      const params = { from, to };
      const [summaryResponse, driverResponse, vehicleResponse] = await Promise.all([
        http.get("/reports/summary", { params }),
        http.get("/reports/drivers", { params }),
        http.get("/reports/vehicles", { params })
      ]);
      setSummary(summaryResponse.data);
      setDrivers(driverResponse.data);
      setVehicles(vehicleResponse.data);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="space-between">
        <Typography variant="h4" fontWeight={900}>
          Отчеты
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
          <TextField label="С" type="date" value={from} onChange={(event) => setFrom(event.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField label="По" type="date" value={to} onChange={(event) => setTo(event.target.value)} InputLabelProps={{ shrink: true }} />
          <Button variant="contained" onClick={load}>
            Сформировать
          </Button>
        </Stack>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} lg={2.4}>
          <StatCard title="Рейсы" value={summary?.routesCount ?? 0} icon={<AssessmentIcon />} accent="primary.main" />
        </Grid>
        <Grid item xs={12} sm={6} lg={2.4}>
          <StatCard title="Выполнено" value={summary?.completedRoutes ?? 0} icon={<RouteIcon />} accent="success.main" />
        </Grid>
        <Grid item xs={12} sm={6} lg={2.4}>
          <StatCard title="Отменено" value={summary?.cancelledRoutes ?? 0} icon={<CancelIcon />} accent="error.main" />
        </Grid>
        <Grid item xs={12} sm={6} lg={2.4}>
          <StatCard title="Пробег, км" value={summary?.totalMileage ?? 0} icon={<SpeedIcon />} accent="secondary.main" />
        </Grid>
        <Grid item xs={12} sm={6} lg={2.4}>
          <StatCard title="Топливо, л" value={summary?.totalFuel ?? 0} icon={<LocalGasStationIcon />} accent="warning.main" />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={6}>
          <Typography variant="h6" fontWeight={900} sx={{ mb: 1.5 }}>
            Рейтинг водителей
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Водитель</TableCell>
                  <TableCell>Выполнено</TableCell>
                  <TableCell>Пробег</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {drivers.map((driver) => (
                  <TableRow key={driver.id} hover>
                    <TableCell>{driver.fullName}</TableCell>
                    <TableCell>{driver.completedRoutes}</TableCell>
                    <TableCell>{driver.mileage} км</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
        <Grid item xs={12} lg={6}>
          <Typography variant="h6" fontWeight={900} sx={{ mb: 1.5 }}>
            Рейтинг автомобилей
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Автомобиль</TableCell>
                  <TableCell>Госномер</TableCell>
                  <TableCell>Пробег</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id} hover>
                    <TableCell>{vehicle.name}</TableCell>
                    <TableCell>{vehicle.plateNumber}</TableCell>
                    <TableCell>{vehicle.mileage} км</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </Stack>
  );
}
