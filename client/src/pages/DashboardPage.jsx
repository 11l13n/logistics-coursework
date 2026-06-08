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
import { formatDate, formatDateTime } from "../utils/format";

export default function DashboardPage() {
  const [routes, setRoutes] = useState([]);
  const [waybills, setWaybills] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([http.get("/routes"), http.get("/waybills")])
      .then(([routesResponse, waybillsResponse]) => {
        setRoutes(routesResponse.data);
        setWaybills(waybillsResponse.data);
      })
      .catch((requestError) => setError(getErrorMessage(requestError)));
  }, []);

  const stats = useMemo(() => {
    const totalMileage = waybills.reduce((sum, item) => {
      const actual = item.endMileage && item.startMileage ? item.endMileage - item.startMileage : item.route?.distanceKm;
      return sum + Number(actual || 0);
    }, 0);
    const totalFuel = waybills.reduce((sum, item) => sum + Number(item.actualFuel ?? item.plannedFuel ?? 0), 0);

    return {
      routes: routes.length,
      active: routes.filter((route) => route.status === "IN_PROGRESS").length,
      completed: routes.filter((route) => route.status === "COMPLETED").length,
      mileage: totalMileage.toFixed(1),
      fuel: totalFuel.toFixed(1)
    };
  }, [routes, waybills]);

  return (
    <Stack spacing={2.5}>
      <Typography variant="h4" fontWeight={900}>
        Dashboard
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} lg={2.4}>
          <StatCard title="Маршруты" value={stats.routes} icon={<RouteIcon />} accent="primary.main" />
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
                  {routes.slice(0, 6).map((route) => (
                    <TableRow key={route.id} hover>
                      <TableCell>{formatDate(route.plannedDate)}</TableCell>
                      <TableCell>{route.startAddress} → {route.endAddress}</TableCell>
                      <TableCell>{route.driver?.fullName}</TableCell>
                      <TableCell><StatusChip value={route.status} /></TableCell>
                    </TableRow>
                  ))}
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
                  {waybills.slice(0, 6).map((waybill) => (
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
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
}
