import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DoneIcon from "@mui/icons-material/Done";
import http, { getErrorMessage } from "../api/http";
import RouteMap from "../components/RouteMap";
import StatusChip from "../components/StatusChip";
import { formatDate, routePoints } from "../utils/format";

const hasMileage = (value) => value !== null && value !== undefined;

const mileageValue = (value) => (hasMileage(value) ? value : "—");

const formatMileage = (waybill) => {
  if (hasMileage(waybill.startMileage) && hasMileage(waybill.endMileage)) {
    return `${waybill.endMileage - waybill.startMileage} км (${waybill.endMileage} - ${waybill.startMileage})`;
  }

  return `${mileageValue(waybill.startMileage)} → ${mileageValue(waybill.endMileage)}`;
};

export default function DriverPortalPage() {
  const [routes, setRoutes] = useState([]);
  const [waybills, setWaybills] = useState([]);
  const [completeWaybill, setCompleteWaybill] = useState(null);
  const [finishForm, setFinishForm] = useState({ endMileage: "", actualFuel: "" });
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      const [routeResponse, waybillResponse] = await Promise.all([http.get("/routes"), http.get("/waybills")]);
      setRoutes(routeResponse.data);
      setWaybills(waybillResponse.data);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startRoute = async (route) => {
    try {
      await http.put(`/routes/${route.id}`, { status: "IN_PROGRESS" });
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const completeTrip = async (event) => {
    event.preventDefault();
    try {
      await http.put(`/waybills/${completeWaybill.id}`, {
        ...finishForm,
        status: "COMPLETED",
        returnTime: new Date().toISOString()
      });
      setCompleteWaybill(null);
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  return (
    <Stack spacing={2.5}>
      <Typography variant="h4" fontWeight={900}>
        Мой рейс
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={2.5}>
        {routes.map((route) => (
          <Grid item xs={12} lg={6} key={route.id}>
            <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between" spacing={1}>
                  <Typography fontWeight={900}>{formatDate(route.plannedDate)}</Typography>
                  <StatusChip value={route.status} />
                </Stack>
                <Typography>{route.startAddress} → {route.endAddress}</Typography>
                <Typography color="text.secondary">
                  {route.vehicle?.brand} {route.vehicle?.model} · {route.vehicle?.plateNumber} · {route.distanceKm} км
                </Typography>
                <RouteMap points={routePoints(route)} height={240} />
                <Stack direction="row" spacing={1}>
                  {route.status === "PLANNED" && (
                    <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={() => startRoute(route)}>
                      Начать рейс
                    </Button>
                  )}
                  {route.status === "IN_PROGRESS" && (
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<DoneIcon />}
                      onClick={() => {
                        const waybill = waybills.find((item) => item.routeId === route.id);
                        setCompleteWaybill(waybill);
                        setFinishForm({ endMileage: waybill?.endMileage ?? "", actualFuel: waybill?.actualFuel ?? "" });
                      }}
                    >
                      Завершить рейс
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h6" fontWeight={900}>
        Мои путевые листы
      </Typography>
      <Grid container spacing={2}>
        {waybills.map((waybill) => (
          <Grid item xs={12} md={6} lg={4} key={waybill.id}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography fontWeight={900}>{waybill.number}</Typography>
                  <StatusChip value={waybill.status} />
                </Stack>
                <Typography color="text.secondary">
                  Пробег: {formatMileage(waybill)}
                </Typography>
                <Typography color="text.secondary">
                  Топливо: {waybill.plannedFuel} / {waybill.actualFuel ?? "—"} л
                </Typography>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Dialog
        open={Boolean(completeWaybill)}
        onClose={() => setCompleteWaybill(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: "24px", overflow: "hidden" } }}
      >
        <form onSubmit={completeTrip}>
          <DialogTitle sx={{ px: 3, py: 2.25, fontSize: 28, fontWeight: 900 }}>Завершение рейса</DialogTitle>
          <DialogContent dividers sx={{ px: 3, py: 2.5 }}>
            <Stack spacing={2}>
              <TextField label="Конечный пробег" type="number" value={finishForm.endMileage} onChange={(event) => setFinishForm((prev) => ({ ...prev, endMileage: event.target.value }))} required />
              <TextField label="Фактический расход топлива, л" type="number" value={finishForm.actualFuel} onChange={(event) => setFinishForm((prev) => ({ ...prev, actualFuel: event.target.value }))} required />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2, bgcolor: "action.hover" }}>
            <Button onClick={() => setCompleteWaybill(null)} sx={{ minWidth: 120, borderRadius: 2.5 }}>
              Отмена
            </Button>
            <Button type="submit" variant="contained" color="success" sx={{ minWidth: 150, borderRadius: 2.5 }}>
              Завершить
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Stack>
  );
}
