import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from "@mui/material";
import RouteIcon from "@mui/icons-material/Route";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import SpeedIcon from "@mui/icons-material/Speed";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import http, { getErrorMessage } from "../api/http";
import StatusChip from "../components/StatusChip";
import StatCard from "../components/StatCard";
import { formatDate } from "../utils/format";

const periodOptions = [
  { value: "today", label: "Сегодня" },
  { value: "week", label: "7 дней" },
  { value: "month", label: "Месяц" },
  { value: "all", label: "Все" }
];
const dashboardPeriodStorageKey = "logistics_dashboard_period";
const periodValues = new Set(periodOptions.map((option) => option.value));

const getSavedPeriod = () => {
  const savedPeriod = localStorage.getItem(dashboardPeriodStorageKey);
  return periodValues.has(savedPeriod) ? savedPeriod : "all";
};

const startOfDay = (date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const endOfDay = (date) => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

const getPeriodRange = (period) => {
  if (period === "all") return null;

  const today = new Date();
  const start = startOfDay(today);

  if (period === "week") {
    const end = endOfDay(today);
    end.setDate(end.getDate() + 6);
    return { start, end };
  }

  if (period === "month") {
    return {
      start: new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0),
      end: new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
    };
  }

  return { start, end: endOfDay(today) };
};

const isInPeriod = (value, range) => {
  if (!range) return true;
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  return date >= range.start && date <= range.end;
};

export default function DashboardPage() {
  const [routes, setRoutes] = useState([]);
  const [waybills, setWaybills] = useState([]);
  const [period, setPeriod] = useState(getSavedPeriod);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([http.get("/routes"), http.get("/waybills")])
      .then(([routesResponse, waybillsResponse]) => {
        setRoutes(routesResponse.data);
        setWaybills(waybillsResponse.data);
      })
      .catch((requestError) => setError(getErrorMessage(requestError)));
  }, []);

  useEffect(() => {
    localStorage.setItem(dashboardPeriodStorageKey, period);
  }, [period]);

  const stats = useMemo(() => {
    const range = getPeriodRange(period);
    const filteredRoutes = routes.filter((route) => isInPeriod(route.plannedDate, range));
    const filteredWaybills = waybills.filter((item) => isInPeriod(item.route?.plannedDate || item.issueDate, range));
    const completedWaybills = filteredWaybills.filter(
      (item) => item.status === "COMPLETED" && item.route?.status === "COMPLETED"
    );
    const totalMileage = completedWaybills.reduce((sum, item) => {
      const actual = item.endMileage && item.startMileage ? item.endMileage - item.startMileage : item.route?.distanceKm;
      return sum + Number(actual || 0);
    }, 0);
    const totalFuel = completedWaybills.reduce((sum, item) => sum + Number(item.actualFuel ?? item.plannedFuel ?? 0), 0);

    return {
      routes: filteredRoutes.length,
      active: filteredRoutes.filter((route) => route.status === "IN_PROGRESS").length,
      completed: filteredRoutes.filter((route) => route.status === "COMPLETED").length,
      routesList: filteredRoutes,
      waybillsList: filteredWaybills,
      mileage: totalMileage.toFixed(1),
      fuel: totalFuel.toFixed(1)
    };
  }, [period, routes, waybills]);

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2}>
        <Typography variant="h4" fontWeight={900}>
          Dashboard
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={period}
          onChange={(_, value) => value && setPeriod(value)}
          sx={{
            bgcolor: "background.paper",
            borderRadius: 3,
            "& .MuiToggleButton-root": {
              px: 2.25,
              py: 1,
              fontWeight: 800,
              textTransform: "none"
            }
          }}
        >
          {periodOptions.map((option) => (
            <ToggleButton key={option.value} value={option.value}>
              {option.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} lg={2.4}>
          <StatCard title="Маршруты за период" value={stats.routes} icon={<RouteIcon />} accent="primary.main" />
        </Grid>
        <Grid item xs={12} sm={6} lg={2.4}>
          <StatCard title="Активные рейсы" value={stats.active} icon={<LocalShippingIcon />} accent="warning.main" />
        </Grid>
        <Grid item xs={12} sm={6} lg={2.4}>
          <StatCard title="Выполнено" value={stats.completed} icon={<TaskAltIcon />} accent="success.main" />
        </Grid>
        <Grid item xs={12} sm={6} lg={2.4}>
          <StatCard title="Пробег, км" value={stats.mileage} icon={<SpeedIcon />} accent="secondary.main" />
        </Grid>
        <Grid item xs={12} sm={6} lg={2.4}>
          <StatCard title="Топливо, л" value={stats.fuel} icon={<LocalGasStationIcon />} accent="error.main" />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={7}>
          <Stack spacing={1.5}>
            <Typography variant="h6" fontWeight={900}>
              Последние маршруты
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Дата</TableCell>
                    <TableCell>Маршрут</TableCell>
                    <TableCell>Водитель</TableCell>
                    <TableCell>Статус</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.routesList.slice(0, 6).map((route) => (
                    <TableRow key={route.id} hover>
                      <TableCell>{formatDate(route.plannedDate)}</TableCell>
                      <TableCell>{route.startAddress} → {route.endAddress}</TableCell>
                      <TableCell>{route.driver?.fullName}</TableCell>
                      <TableCell><StatusChip value={route.status} /></TableCell>
                    </TableRow>
                  ))}
                  {!stats.routesList.length && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 4, color: "text.secondary" }}>
                        Маршрутов за период нет
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Stack spacing={1.5}>
            <Typography variant="h6" fontWeight={900}>
              Последние путевые листы
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Номер</TableCell>
                    <TableCell>Водитель</TableCell>
                    <TableCell>Статус</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.waybillsList.slice(0, 6).map((waybill) => (
                    <TableRow key={waybill.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <ReceiptLongIcon fontSize="small" color="action" />
                          <span>{waybill.number}</span>
                        </Stack>
                      </TableCell>
                      <TableCell>{waybill.route?.driver?.fullName}</TableCell>
                      <TableCell><StatusChip value={waybill.status} /></TableCell>
                    </TableRow>
                  ))}
                  {!stats.waybillsList.length && (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 4, color: "text.secondary" }}>
                        Путевых листов за период нет
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
}
