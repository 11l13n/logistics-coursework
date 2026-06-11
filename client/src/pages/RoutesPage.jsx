import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DoneIcon from "@mui/icons-material/Done";
import CancelIcon from "@mui/icons-material/Cancel";
import ArchiveIcon from "@mui/icons-material/Archive";
import UnarchiveIcon from "@mui/icons-material/Unarchive";
import UndoIcon from "@mui/icons-material/Undo";
import http, { getErrorMessage } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import RouteMap from "../components/RouteMap";
import StatusChip from "../components/StatusChip";
import { formatDate, routePoints } from "../utils/format";

const routeStatuses = [
  { value: "PLANNED", label: "Запланирован" },
  { value: "IN_PROGRESS", label: "В рейсе" },
  { value: "COMPLETED", label: "Выполнен" },
  { value: "CANCELLED", label: "Отменен" }
];

const archiveOptions = [
  { value: "archived", label: "Архив" },
  { value: "all", label: "Все" }
];

export default function RoutesPage() {
  const { user } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [filters, setFilters] = useState({ archive: "", status: "", date: "", driverId: "", vehicleId: "" });
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
      const { data } = await http.get("/routes", { params });
      setRoutes(data);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  useEffect(() => {
    load();
  }, [filters]);

  useEffect(() => {
    if (user.role === "DRIVER") return;
    Promise.all([http.get("/drivers"), http.get("/vehicles")])
      .then(([driversResponse, vehiclesResponse]) => {
        setDrivers(driversResponse.data);
        setVehicles(vehiclesResponse.data);
      })
      .catch((requestError) => setError(getErrorMessage(requestError)));
  }, [user.role]);

  const updateStatus = async (route, status) => {
    try {
      const { data } = await http.put(`/routes/${route.id}`, { status });
      setRoutes((prev) => prev.map((item) => (item.id === route.id ? data : item)));
      setSelected((prev) => (prev?.id === route.id ? data : prev));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const archiveRoute = async (route) => {
    if (!window.confirm(`Отправить маршрут #${route.id} в архив?`)) return;

    try {
      await http.post(`/routes/${route.id}/archive`);
      await load();
      setSelected((prev) => (prev?.id === route.id ? null : prev));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const restoreRoute = async (route) => {
    try {
      await http.post(`/routes/${route.id}/unarchive`);
      await load();
      setSelected((prev) => (prev?.id === route.id ? null : prev));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
        <Typography variant="h4" fontWeight={900}>
          Маршруты
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Раздел</InputLabel>
            <Select label="Раздел" value={filters.archive} onChange={(event) => setFilters((prev) => ({ ...prev, archive: event.target.value }))}>
              <MenuItem value="">Текущие</MenuItem>
              {archiveOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel>Статус</InputLabel>
            <Select label="Статус" value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}>
              <MenuItem value="">Все</MenuItem>
              {routeStatuses.map((status) => (
                <MenuItem key={status.value} value={status.value}>
                  {status.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            type="date"
            label="Дата"
            value={filters.date}
            onChange={(event) => setFilters((prev) => ({ ...prev, date: event.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          {user.role !== "DRIVER" && (
            <>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Водитель</InputLabel>
                <Select label="Водитель" value={filters.driverId} onChange={(event) => setFilters((prev) => ({ ...prev, driverId: event.target.value }))}>
                  <MenuItem value="">Все</MenuItem>
                  {drivers.map((driver) => (
                    <MenuItem key={driver.id} value={driver.id}>
                      {driver.fullName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Авто</InputLabel>
                <Select label="Авто" value={filters.vehicleId} onChange={(event) => setFilters((prev) => ({ ...prev, vehicleId: event.target.value }))}>
                  <MenuItem value="">Все</MenuItem>
                  {vehicles.map((vehicle) => (
                    <MenuItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.plateNumber}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}
          <Tooltip title="Обновить">
            <IconButton onClick={load}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Дата</TableCell>
              <TableCell>Маршрут</TableCell>
              <TableCell>Водитель</TableCell>
              <TableCell>Автомобиль</TableCell>
              <TableCell>Дистанция</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {routes.map((route) => (
              <TableRow key={route.id} hover>
                <TableCell>{formatDate(route.plannedDate)}</TableCell>
                <TableCell>{route.startAddress} → {route.endAddress}</TableCell>
                <TableCell>{route.driver?.fullName}</TableCell>
                <TableCell>{route.vehicle?.brand} {route.vehicle?.model} · {route.vehicle?.plateNumber}</TableCell>
                <TableCell>{route.distanceKm} км</TableCell>
                <TableCell><StatusChip value={route.status} /></TableCell>
                <TableCell align="right">
                  <Tooltip title="Просмотреть">
                    <IconButton onClick={() => setSelected(route)}>
                      <VisibilityIcon />
                    </IconButton>
                  </Tooltip>
                  {route.status === "PLANNED" && (
                    <Tooltip title="Начать рейс">
                      <IconButton color="warning" onClick={() => updateStatus(route, "IN_PROGRESS")}>
                        <PlayArrowIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  {route.status === "IN_PROGRESS" && (
                    <>
                      <Tooltip title="Вернуть в план">
                        <IconButton color="warning" onClick={() => updateStatus(route, "PLANNED")}>
                          <UndoIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Завершить">
                        <IconButton color="success" onClick={() => updateStatus(route, "COMPLETED")}>
                          <DoneIcon />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                  {user.role !== "DRIVER" && route.status !== "COMPLETED" && route.status !== "CANCELLED" && (
                    <Tooltip title="Отменить">
                      <IconButton color="error" onClick={() => updateStatus(route, "CANCELLED")}>
                        <CancelIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  {route.status === "COMPLETED" && !route.archivedAt && (
                    <>
                      {user.role !== "DRIVER" && (
                        <Tooltip title="Вернуть в план">
                          <IconButton color="warning" onClick={() => updateStatus(route, "PLANNED")}>
                            <UndoIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="В архив">
                        <IconButton onClick={() => archiveRoute(route)}>
                          <ArchiveIcon />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                  {route.archivedAt && (
                    <Tooltip title="Вернуть из архива">
                      <IconButton onClick={() => restoreRoute(route)}>
                        <UnarchiveIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: "24px", overflow: "hidden" } }}
      >
        {selected && (
          <>
            <DialogTitle sx={{ px: 3, py: 2.25, fontSize: 28, fontWeight: 900 }}>Маршрут #{selected.id}</DialogTitle>
            <DialogContent dividers sx={{ px: 3, py: 2.5 }}>
              <Stack spacing={2}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography color="text.secondary">Водитель</Typography>
                    <Typography fontWeight={900}>{selected.driver?.fullName}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography color="text.secondary">Автомобиль</Typography>
                    <Typography fontWeight={900}>{selected.vehicle?.brand} {selected.vehicle?.model} · {selected.vehicle?.plateNumber}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography color="text.secondary">Заявка</Typography>
                    <Typography fontWeight={900}>{selected.cargoRequest?.cargoName}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography color="text.secondary">Путевой лист</Typography>
                    <Typography fontWeight={900}>{selected.waybill?.number || "—"}</Typography>
                  </Grid>
                </Grid>
                <RouteMap points={routePoints(selected)} />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, bgcolor: "action.hover" }}>
              <Button onClick={() => setSelected(null)} sx={{ minWidth: 120, borderRadius: 2.5 }}>
                Закрыть
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Stack>
  );
}
