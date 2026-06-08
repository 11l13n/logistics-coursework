import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AddLocationAltIcon from "@mui/icons-material/AddLocationAlt";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import http, { getErrorMessage } from "../api/http";
import RouteMap from "../components/RouteMap";
import StatusChip from "../components/StatusChip";
import { dateTimeTomorrow, formatDateTime, inputDateTime } from "../utils/format";

const defaultStart = { address: "", latitude: 55.751244, longitude: 37.618423, orderNumber: 1 };
const defaultDeliveryPoint = { address: "", latitude: 56.8587, longitude: 35.9176, orderNumber: 2 };

const knownCoordinates = [
  { pattern: /калуга/i, latitude: 54.5138, longitude: 36.2612 },
  { pattern: /твер/i, latitude: 56.8587, longitude: 35.9176 },
  { pattern: /химки|вашутин/i, latitude: 55.897, longitude: 37.4297 },
  { pattern: /ленинград/i, latitude: 55.805, longitude: 37.515 },
  { pattern: /преснен/i, latitude: 55.7473, longitude: 37.5398 },
  { pattern: /новорязан/i, latitude: 55.6525, longitude: 37.8895 },
  { pattern: /мытищ/i, latitude: 55.9105, longitude: 37.7363 },
  { pattern: /балаших/i, latitude: 55.7963, longitude: 37.9382 },
  { pattern: /москва/i, latitude: 55.751244, longitude: 37.618423 }
];

const inferAddressCoordinates = (address = "", fallbackIndex = 0) => {
  const match = knownCoordinates.find((item) => item.pattern.test(address));
  if (match) return { latitude: match.latitude, longitude: match.longitude };
  return { latitude: 55.751244 + fallbackIndex * 0.08, longitude: 37.618423 + fallbackIndex * 0.08 };
};

const toRad = (value) => (Number(value) * Math.PI) / 180;

const distanceBetween = (a, b) => {
  const radius = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  return radius * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

const calculateDistance = (points) =>
  points.slice(1).reduce((sum, point, index) => sum + distanceBetween(points[index], point), 0);

const formatDuration = (distanceKm) => {
  const minutes = Math.max(20, Math.round((Number(distanceKm) / 55) * 60));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${minutes} мин`;
  if (!rest) return `${hours} ч`;
  return `${hours} ч ${rest} мин`;
};

export default function PlanningPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [plannedDate, setPlannedDate] = useState(dateTimeTomorrow());
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [start, setStart] = useState(defaultStart);
  const [deliveryPoints, setDeliveryPoints] = useState([defaultDeliveryPoint]);
  const [recommendation, setRecommendation] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    Promise.all([http.get("/cargo-requests", { params: { status: "NEW" } }), http.get("/drivers"), http.get("/vehicles")])
      .then(([requestResponse, driverResponse, vehicleResponse]) => {
        const requestData = requestResponse.data;
        setRequests(requestData);
        setSelectedRequestId((currentId) => {
          if (requestData.some((request) => request.id === Number(currentId))) return currentId;
          return requestData[0]?.id ?? "";
        });
        setDrivers(driverResponse.data);
        setVehicles(vehicleResponse.data);
      })
      .catch((requestError) => setError(getErrorMessage(requestError)));
  }, []);

  const selectedRequest = requests.find((request) => request.id === Number(selectedRequestId));

  useEffect(() => {
    if (!selectedRequest) return;

    const startCoordinates = inferAddressCoordinates(selectedRequest.pickupAddress);
    setStart({ address: selectedRequest.pickupAddress, ...startCoordinates, orderNumber: 1 });
    setPlannedDate(inputDateTime(selectedRequest.desiredDeliveryDate));
    setRecommendation(null);
    setDriverId("");
    setVehicleId("");

    const points = selectedRequest.deliveryPoints?.length
      ? selectedRequest.deliveryPoints
      : [{ address: selectedRequest.deliveryAddress, ...inferAddressCoordinates(selectedRequest.deliveryAddress) }];

    setDeliveryPoints(
      points.map((point, index) => ({
        address: point.address,
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
        orderNumber: index + 2
      }))
    );
  }, [selectedRequest]);

  const points = useMemo(
    () =>
      [start, ...deliveryPoints].map((point, index) => ({
        ...point,
        orderNumber: index + 1
      })),
    [start, deliveryPoints]
  );

  const distanceKm = Number(calculateDistance(points).toFixed(1));
  const estimatedDuration = formatDuration(distanceKm);

  const updateDeliveryPoint = (index, patch) => {
    setDeliveryPoints((prev) => prev.map((point, itemIndex) => (itemIndex === index ? { ...point, ...patch } : point)));
  };

  const addDeliveryPoint = () => {
    setDeliveryPoints((prev) => [
      ...prev,
      {
        address: "Новая точка разгрузки",
        latitude: 55.91,
        longitude: 37.73,
        orderNumber: prev.length + 2
      }
    ]);
  };

  const removeDeliveryPoint = (index) => {
    setDeliveryPoints((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const applyOptimizedWaypoints = (waypoints = []) => {
    if (waypoints.length < 2) return;
    const [optimizedStart, ...optimizedDeliveries] = waypoints;
    setStart(optimizedStart);
    setDeliveryPoints(optimizedDeliveries);
  };

  const getRecommendation = async () => {
    setError("");
    setRecommendation(null);
    try {
      const { data } = await http.post("/recommendations/route", {
        cargoRequestId: selectedRequestId,
        plannedDate
      });
      setRecommendation(data);
      applyOptimizedWaypoints(data.optimizedWaypoints);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const acceptRecommendation = () => {
    if (!recommendation) return;
    setDriverId(recommendation.driver.id);
    setVehicleId(recommendation.vehicle.id);
    applyOptimizedWaypoints(recommendation.optimizedWaypoints);
  };

  const createRoute = async () => {
    setError("");
    setSuccess("");
    try {
      await http.post("/routes", {
        cargoRequestId: selectedRequestId,
        driverId,
        vehicleId,
        startAddress: start.address,
        endAddress: deliveryPoints[deliveryPoints.length - 1]?.address,
        distanceKm,
        estimatedDuration,
        plannedDate,
        waypoints: points
      });
      setSuccess("Маршрут создан, путевой лист сформирован автоматически");
      setTimeout(() => navigate("/routes"), 800);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  return (
    <Stack spacing={2.5}>
      <Typography variant="h4">Планирование маршрута</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={5}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Заявка</InputLabel>
                <Select label="Заявка" value={selectedRequestId} onChange={(event) => setSelectedRequestId(event.target.value)}>
                  {requests.map((request) => (
                    <MenuItem key={request.id} value={request.id}>
                      #{request.id} · {request.cargoName} · до {formatDateTime(request.desiredDeliveryDate)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {!requests.length && (
                <Alert severity="info">
                  Нет новых заявок для планирования. Выполненные, отмененные и уже запланированные заявки недоступны для создания маршрута.
                </Alert>
              )}

              {selectedRequest && (
                <Card variant="outlined">
                  <CardContent>
                    <Stack spacing={1}>
                      <Typography fontWeight={900}>{selectedRequest.client?.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedRequest.cargoName}, {selectedRequest.weightKg} кг, {selectedRequest.volume} м3
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Выполнить: {formatDateTime(selectedRequest.desiredDeliveryDate)} · точек разгрузки: {deliveryPoints.length}
                      </Typography>
                      <StatusChip value={selectedRequest.status} />
                    </Stack>
                  </CardContent>
                </Card>
              )}

              <TextField
                label="Срок выполнения по заявке"
                type="datetime-local"
                value={plannedDate}
                InputProps={{ readOnly: true }}
                InputLabelProps={{ shrink: true }}
                helperText="Дата маршрута берется из заявки, чтобы рейс планировался под согласованный срок."
              />

              <TextField
                label="Точка загрузки"
                value={start.address}
                onChange={(event) => setStart((prev) => ({ ...prev, address: event.target.value }))}
              />
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <TextField label="Широта" type="number" value={start.latitude} onChange={(event) => setStart((prev) => ({ ...prev, latitude: event.target.value }))} fullWidth />
                </Grid>
                <Grid item xs={6}>
                  <TextField label="Долгота" type="number" value={start.longitude} onChange={(event) => setStart((prev) => ({ ...prev, longitude: event.target.value }))} fullWidth />
                </Grid>
              </Grid>

              <Stack spacing={1.25}>
                <Typography variant="subtitle2" fontWeight={900}>
                  Точки разгрузки
                </Typography>
                {deliveryPoints.map((point, index) => (
                  <Box key={`${point.address}-${index}`}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <TextField
                        label={`Разгрузка ${index + 1}`}
                        value={point.address}
                        onChange={(event) => updateDeliveryPoint(index, { address: event.target.value })}
                        fullWidth
                      />
                      <Tooltip title="Удалить точку">
                        <span>
                          <IconButton disabled={deliveryPoints.length === 1} color="error" onClick={() => removeDeliveryPoint(index)}>
                            <DeleteIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <TextField label="Широта" type="number" value={point.latitude} onChange={(event) => updateDeliveryPoint(index, { latitude: event.target.value })} fullWidth />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField label="Долгота" type="number" value={point.longitude} onChange={(event) => updateDeliveryPoint(index, { longitude: event.target.value })} fullWidth />
                      </Grid>
                    </Grid>
                  </Box>
                ))}
              </Stack>

              <Button variant="outlined" startIcon={<AddLocationAltIcon />} onClick={addDeliveryPoint}>
                Добавить точку разгрузки
              </Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={7}>
          <Stack spacing={2}>
            <RouteMap points={points} height={380} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField label="Расстояние, км" value={distanceKm} fullWidth InputProps={{ readOnly: true }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Примерное время" value={estimatedDuration} fullWidth InputProps={{ readOnly: true }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Водитель</InputLabel>
                  <Select label="Водитель" value={driverId} onChange={(event) => setDriverId(event.target.value)}>
                    {drivers.map((driver) => (
                      <MenuItem key={driver.id} value={driver.id}>
                        {driver.fullName} · {driver.status}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Автомобиль</InputLabel>
                  <Select label="Автомобиль" value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>
                    {vehicles.map((vehicle) => (
                      <MenuItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.brand} {vehicle.model} · {vehicle.plateNumber}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <Button variant="outlined" startIcon={<AutoAwesomeIcon />} disabled={!selectedRequestId} onClick={getRecommendation}>
                Получить рекомендацию
              </Button>
              <Button variant="contained" startIcon={<SaveIcon />} disabled={!selectedRequestId || !driverId || !vehicleId} onClick={createRoute}>
                Создать маршрут
              </Button>
            </Stack>

            {recommendation && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={1.5}>
                  <Typography fontWeight={900}>Рекомендация и оптимальный порядок</Typography>
                  <Typography color="text.secondary">{recommendation.explanation}</Typography>
                  <Stack spacing={0.5}>
                    {recommendation.optimizedWaypoints?.slice(1).map((point, index) => (
                      <Typography key={`${point.address}-${index}`} variant="body2">
                        {index + 1}. {point.address}
                      </Typography>
                    ))}
                  </Stack>
                  <Button startIcon={<CheckCircleIcon />} variant="contained" color="secondary" onClick={acceptRecommendation}>
                    Принять рекомендацию
                  </Button>
                </Stack>
              </Paper>
            )}
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
}
