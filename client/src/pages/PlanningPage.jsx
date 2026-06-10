import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
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
import AddressSearchField from "../components/AddressSearchField";
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

const trafficAverageSpeedKmh = 42;
const trafficBufferMinutes = 10;

const formatDuration = (distanceKm) => {
  const minutes = Math.max(30, Math.round((Number(distanceKm) / trafficAverageSpeedKmh) * 60 + trafficBufferMinutes));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${minutes} мин`;
  if (!rest) return `${hours} ч`;
  return `${hours} ч ${rest} мин`;
};

const requestLabel = (request) => (request ? `#${request.id} · ${request.cargoName} · до ${formatDateTime(request.desiredDeliveryDate)}` : "");

const formatPointCount = (count) => {
  const normalized = Math.abs(Number(count));
  const lastTwoDigits = normalized % 100;
  const lastDigit = normalized % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return `${count} точек`;
  if (lastDigit === 1) return `${count} точка`;
  if (lastDigit >= 2 && lastDigit <= 4) return `${count} точки`;
  return `${count} точек`;
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

  useEffect(() => {
    if (!selectedRequest?.pickupAddress) return;

    let ignore = false;

    const geocodePickupAddress = async () => {
      try {
        const { data } = await http.get("/geocoding/search", { params: { q: selectedRequest.pickupAddress } });
        const place = data[0];
        if (ignore || !place) return;

        setStart((prev) => {
          if (prev.address !== selectedRequest.pickupAddress) return prev;

          return {
            ...prev,
            latitude: place.latitude,
            longitude: place.longitude
          };
        });
      } catch {
        // Keep inferred coordinates if external geocoding is unavailable.
      }
    };

    geocodePickupAddress();

    return () => {
      ignore = true;
    };
  }, [selectedRequest?.id, selectedRequest?.pickupAddress]);

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
        address: "",
        latitude: 55.751244 + (prev.length + 1) * 0.08,
        longitude: 37.618423 + (prev.length + 1) * 0.08,
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
    setStart((prev) => {
      const keepCurrentCoordinates =
        prev.address === optimizedStart.address &&
        Number.isFinite(Number(prev.latitude)) &&
        Number.isFinite(Number(prev.longitude));

      return keepCurrentCoordinates
        ? {
            ...optimizedStart,
            latitude: prev.latitude,
            longitude: prev.longitude
          }
        : optimizedStart;
    });
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
    <Stack spacing={2.5} sx={{ minHeight: { lg: "calc(100vh - 48px)" } }}>
      <Typography variant="h4">Планирование маршрута</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      <Grid container spacing={2.5} sx={{ flex: { lg: 1 }, alignItems: "stretch" }}>
        <Grid item xs={12} lg={4}>
          <Paper variant="outlined" sx={{ p: 2.25, height: "100%" }}>
            <Stack spacing={2.25}>
              <Stack spacing={1.25}>
                <Typography variant="subtitle1" fontWeight={900}>
                  Заявка
                </Typography>
                <FormControl fullWidth size="small">
                  <InputLabel>Заявка</InputLabel>
                  <Select
                    label="Заявка"
                    value={selectedRequestId}
                    onChange={(event) => setSelectedRequestId(event.target.value)}
                    renderValue={(value) => {
                      const request = requests.find((item) => item.id === Number(value));
                      return (
                        <Typography component="span" noWrap sx={{ display: "block", pr: 2 }}>
                          {requestLabel(request)}
                        </Typography>
                      );
                    }}
                  >
                    {requests.map((request) => (
                      <MenuItem key={request.id} value={request.id}>
                        {requestLabel(request)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {selectedRequest && (
                  <Box
                    sx={{
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 3,
                      px: 1.5,
                      py: 1.25
                    }}
                  >
                    <Stack spacing={1.25}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary">
                            Клиент
                          </Typography>
                          <Typography fontWeight={900} noWrap>
                            {selectedRequest.client?.name}
                          </Typography>
                        </Box>
                        <StatusChip value={selectedRequest.status} />
                      </Stack>
                      <Grid container spacing={1.25}>
                        <Grid item xs={7}>
                          <Typography variant="caption" color="text.secondary">
                            Груз
                          </Typography>
                          <Typography variant="body2" fontWeight={800} noWrap>
                            {selectedRequest.cargoName}, {selectedRequest.weightKg} кг
                          </Typography>
                        </Grid>
                        <Grid item xs={5}>
                          <Typography variant="caption" color="text.secondary">
                            Объем
                          </Typography>
                          <Typography variant="body2" fontWeight={800}>
                            {selectedRequest.volume} м3
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary">
                            Срок и точки
                          </Typography>
                          <Typography variant="body2" fontWeight={800}>
                            {formatDateTime(selectedRequest.desiredDeliveryDate)} · {formatPointCount(deliveryPoints.length)}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Stack>
                  </Box>
                )}
              </Stack>

              {!requests.length && (
                <Alert severity="info">
                  Нет новых заявок для планирования. Выполненные, отмененные и уже запланированные заявки недоступны для создания маршрута.
                </Alert>
              )}

              <TextField
                label="Срок выполнения по заявке"
                type="datetime-local"
                value={plannedDate}
                InputProps={{ readOnly: true }}
                InputLabelProps={{ shrink: true }}
              />

              <Stack spacing={1.5}>
                <Typography variant="subtitle1" fontWeight={900}>
                  Адреса маршрута
                </Typography>
                <AddressSearchField
                  label="Точка загрузки"
                  value={start.address}
                  required
                  multiline
                  minRows={1}
                  maxRows={2}
                  onChange={(address) => setStart((prev) => ({ ...prev, address, ...inferAddressCoordinates(address) }))}
                  onSelect={(place) =>
                    setStart((prev) => ({
                      ...prev,
                      address: place.address,
                      latitude: place.latitude,
                      longitude: place.longitude
                    }))
                  }
                />
                {deliveryPoints.map((point, index) => (
                  <Box key={index}>
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      <Box sx={{ flex: 1 }}>
                        <AddressSearchField
                          label={`Разгрузка ${index + 1}`}
                          value={point.address}
                          required
                          multiline
                          minRows={1}
                          maxRows={2}
                          onChange={(address) =>
                            updateDeliveryPoint(index, {
                              address,
                              ...inferAddressCoordinates(address, index + 1)
                            })
                          }
                          onSelect={(place) =>
                            updateDeliveryPoint(index, {
                              address: place.address,
                              latitude: place.latitude,
                              longitude: place.longitude
                            })
                          }
                        />
                      </Box>
                      <Tooltip title="Удалить точку">
                        <span>
                          <IconButton disabled={deliveryPoints.length === 1} color="error" onClick={() => removeDeliveryPoint(index)}>
                            <DeleteIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </Box>
                ))}
                <Button variant="outlined" startIcon={<AddLocationAltIcon />} onClick={addDeliveryPoint} fullWidth>
                  Добавить точку разгрузки
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Stack spacing={2}>
            <RouteMap points={points} height="clamp(420px, calc(100vh - 300px), 720px)" />

            <Paper variant="outlined" sx={{ p: 2.25 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                  <Stack direction={{ xs: "row", md: "column" }} spacing={1.25}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Расстояние
                      </Typography>
                      <Typography variant="h5" fontWeight={900}>
                        {distanceKm} км
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Ориентировочное время в пути
                      </Typography>
                      <Typography variant="h5" fontWeight={900}>
                        {estimatedDuration}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>

                <Grid item xs={12} md={8}>
                  <Grid container spacing={1.5}>
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
                    <Grid item xs={12}>
                      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="flex-end" spacing={1.25}>
                        <Button variant="outlined" startIcon={<AutoAwesomeIcon />} disabled={!selectedRequestId} onClick={getRecommendation}>
                          Получить рекомендацию
                        </Button>
                        <Button
                          variant="contained"
                          startIcon={<SaveIcon />}
                          disabled={!selectedRequestId || !driverId || !vehicleId}
                          onClick={createRoute}
                        >
                          Создать маршрут
                        </Button>
                      </Stack>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Paper>

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
