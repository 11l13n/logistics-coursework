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
import EditIcon from "@mui/icons-material/Edit";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DoneIcon from "@mui/icons-material/Done";
import ArchiveIcon from "@mui/icons-material/Archive";
import UnarchiveIcon from "@mui/icons-material/Unarchive";
import http, { getErrorMessage } from "../api/http";
import StatusChip from "../components/StatusChip";
import { formatDateTime, inputDateTime } from "../utils/format";

const hasMileage = (value) => value !== null && value !== undefined;

const mileageValue = (value) => (hasMileage(value) ? value : "—");

const mileageTotal = (waybill) => {
  if (!hasMileage(waybill.startMileage) || !hasMileage(waybill.endMileage)) return null;
  return waybill.endMileage - waybill.startMileage;
};

function MileageCell({ waybill }) {
  const total = mileageTotal(waybill);

  if (total === null) {
    return (
      <Typography variant="body2">
        {mileageValue(waybill.startMileage)} → {mileageValue(waybill.endMileage)}
      </Typography>
    );
  }

  return (
    <Stack spacing={0.25}>
      <Typography variant="body2" fontWeight={800}>
        {total} км
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {waybill.endMileage} - {waybill.startMileage}
      </Typography>
    </Stack>
  );
}

const archiveOptions = [
  { value: "archived", label: "Архив" },
  { value: "all", label: "Все" }
];

const waybillStatuses = [
  { value: "CREATED", label: "Создан" },
  { value: "ACTIVE", label: "Активен" },
  { value: "COMPLETED", label: "Выполнен" },
  { value: "CANCELLED", label: "Отменен" }
];

export default function WaybillsPage() {
  const [waybills, setWaybills] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [filters, setFilters] = useState({ archive: "", status: "" });
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
      const { data } = await http.get("/waybills", { params });
      setWaybills(data);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  useEffect(() => {
    load();
  }, [filters]);

  const openEdit = (waybill) => {
    setEditing(waybill);
    setForm({
      departureTime: inputDateTime(waybill.departureTime),
      returnTime: inputDateTime(waybill.returnTime),
      startMileage: waybill.startMileage ?? "",
      endMileage: waybill.endMileage ?? "",
      plannedFuel: waybill.plannedFuel ?? "",
      actualFuel: waybill.actualFuel ?? "",
      status: waybill.status
    });
  };

  const save = async (event) => {
    event.preventDefault();
    try {
      await http.put(`/waybills/${editing.id}`, form);
      setEditing(null);
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const update = async (waybill, patch) => {
    try {
      await http.put(`/waybills/${waybill.id}`, patch);
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const archiveWaybill = async (waybill) => {
    if (!window.confirm(`Отправить путевой лист ${waybill.number} в архив?`)) return;

    try {
      await http.post(`/waybills/${waybill.id}/archive`);
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const restoreWaybill = async (waybill) => {
    try {
      await http.post(`/waybills/${waybill.id}/unarchive`);
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
        <Typography variant="h4" fontWeight={900}>
          Путевые листы
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
              <MenuItem value="">Все статусы</MenuItem>
              {waybillStatuses.map((status) => (
                <MenuItem key={status.value} value={status.value}>
                  {status.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Номер</TableCell>
              <TableCell>Маршрут</TableCell>
              <TableCell>Водитель</TableCell>
              <TableCell>Пробег</TableCell>
              <TableCell>Топливо</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {waybills.map((waybill) => (
              <TableRow key={waybill.id} hover>
                <TableCell>{waybill.number}</TableCell>
                <TableCell>{waybill.route?.startAddress} → {waybill.route?.endAddress}</TableCell>
                <TableCell>{waybill.route?.driver?.fullName}</TableCell>
                <TableCell>
                  <MileageCell waybill={waybill} />
                </TableCell>
                <TableCell>
                  {waybill.plannedFuel} / {waybill.actualFuel ?? "—"} л
                </TableCell>
                <TableCell><StatusChip value={waybill.status} /></TableCell>
                <TableCell align="right">
                  {waybill.status === "CREATED" && (
                    <Tooltip title="Начать рейс">
                      <IconButton color="warning" onClick={() => update(waybill, { status: "ACTIVE", departureTime: new Date().toISOString() })}>
                        <PlayArrowIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  {waybill.status === "ACTIVE" && (
                    <Tooltip title="Завершить">
                      <IconButton color="success" onClick={() => openEdit({ ...waybill, status: "COMPLETED", returnTime: new Date().toISOString() })}>
                        <DoneIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Редактировать">
                    <IconButton onClick={() => openEdit(waybill)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  {waybill.status === "COMPLETED" && !waybill.archivedAt && (
                    <Tooltip title="В архив">
                      <IconButton onClick={() => archiveWaybill(waybill)}>
                        <ArchiveIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  {waybill.archivedAt && (
                    <Tooltip title="Вернуть из архива">
                      <IconButton onClick={() => restoreWaybill(waybill)}>
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
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: "24px", overflow: "hidden" } }}
      >
        <form onSubmit={save}>
          <DialogTitle sx={{ px: 3, py: 2.25, fontSize: 28, fontWeight: 900 }}>Путевой лист {editing?.number}</DialogTitle>
          <DialogContent dividers sx={{ px: 3, py: 2.5 }}>
            <Stack spacing={2}>
              <Typography color="text.secondary">
                Выезд: {formatDateTime(editing?.departureTime)} · Возвращение: {formatDateTime(editing?.returnTime)}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField label="Время выезда" type="datetime-local" value={form.departureTime || ""} onChange={(event) => setForm((prev) => ({ ...prev, departureTime: event.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Время возвращения" type="datetime-local" value={form.returnTime || ""} onChange={(event) => setForm((prev) => ({ ...prev, returnTime: event.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Начальный пробег" type="number" value={form.startMileage ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, startMileage: event.target.value }))} fullWidth />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Конечный пробег" type="number" value={form.endMileage ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, endMileage: event.target.value }))} fullWidth />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Плановое топливо" type="number" value={form.plannedFuel ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, plannedFuel: event.target.value }))} fullWidth />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Фактическое топливо" type="number" value={form.actualFuel ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, actualFuel: event.target.value }))} fullWidth />
                </Grid>
              </Grid>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2, bgcolor: "action.hover" }}>
            <Button onClick={() => setEditing(null)} sx={{ minWidth: 120, borderRadius: 2.5 }}>
              Отмена
            </Button>
            <Button type="submit" variant="contained" sx={{ minWidth: 150, borderRadius: 2.5 }}>
              Сохранить
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Stack>
  );
}
