const test = require("node:test");
const assert = require("node:assert/strict");

const { getDayRange, getPeriodRange } = require("../src/utils/dates");
const { normalizeDeliveryPoints, parseDeliveryPointsText } = require("../src/utils/geo");
const {
  buildOptimizedRoute,
  calculateRouteDistance,
  estimateDuration,
  optimizeDeliveryOrder
} = require("../src/utils/routeOptimizer");
const { normalizePayload } = require("../src/routes/resources");

test("normalizePayload приводит числовые поля и даты к нужным типам", () => {
  const result = normalizePayload({
    cargoRequestId: "7",
    driverId: "3",
    vehicleId: "4",
    distanceKm: "185.5",
    actualFuel: "22.4",
    plannedDate: "2026-06-15T09:00:00.000Z",
    emptyValue: "",
    status: "PLANNED"
  });

  assert.equal(result.cargoRequestId, 7);
  assert.equal(result.driverId, 3);
  assert.equal(result.vehicleId, 4);
  assert.equal(result.distanceKm, 185.5);
  assert.equal(result.actualFuel, 22.4);
  assert.equal(result.status, "PLANNED");
  assert.ok(result.plannedDate instanceof Date);
  assert.equal("emptyValue" in result, false);
});

test("parseDeliveryPointsText разбирает точки разгрузки из многострочного текста", () => {
  const points = parseDeliveryPointsText("Тверь, ул. Коминтерна, 45 | 56.8587 | 35.9176\nКалуга, ул. Кирова, 21");

  assert.equal(points.length, 2);
  assert.equal(points[0].address, "Тверь, ул. Коминтерна, 45");
  assert.equal(points[0].latitude, "56.8587");
  assert.equal(points[0].longitude, "35.9176");
  assert.equal(points[1].orderNumber, 2);
});

test("normalizeDeliveryPoints добавляет координаты и порядок точек", () => {
  const points = normalizeDeliveryPoints([{ address: "Москва, ул. Рябиновая, 22" }], "Тверь");

  assert.equal(points.length, 1);
  assert.equal(points[0].orderNumber, 1);
  assert.equal(points[0].latitude, 55.7029);
  assert.equal(points[0].longitude, 37.4281);
});

test("getDayRange возвращает границы выбранного дня", () => {
  const { start, end } = getDayRange("2026-06-15T12:30:00.000Z");

  assert.equal(start.getHours(), 0);
  assert.equal(start.getMinutes(), 0);
  assert.equal(end.getHours(), 23);
  assert.equal(end.getMinutes(), 59);
  assert.equal(end.getSeconds(), 59);
});

test("getPeriodRange возвращает полный период для отчетов", () => {
  const { start, end } = getPeriodRange("2026-06-01", "2026-06-30");

  assert.equal(start.getHours(), 0);
  assert.equal(end.getHours(), 23);
  assert.equal(end.getMinutes(), 59);
});

test("optimizeDeliveryOrder ставит ближайшую точку первой", () => {
  const start = { address: "Москва", latitude: 55.751244, longitude: 37.618423 };
  const ordered = optimizeDeliveryOrder(start, [
    { address: "Калуга", latitude: 54.5138, longitude: 36.2612 },
    { address: "Химки", latitude: 55.897, longitude: 37.4297 }
  ]);

  assert.equal(ordered[0].address, "Химки");
  assert.equal(ordered[0].orderNumber, 2);
  assert.equal(ordered[1].orderNumber, 3);
});

test("calculateRouteDistance и estimateDuration считают понятные значения для маршрута", () => {
  const distance = calculateRouteDistance([
    { latitude: 55.751244, longitude: 37.618423 },
    { latitude: 56.8587, longitude: 35.9176 }
  ]);

  assert.ok(distance > 160);
  assert.ok(distance < 180);
  assert.equal(estimateDuration(110), "2 ч");
  assert.equal(estimateDuration(10), "20 мин");
});

test("buildOptimizedRoute строит маршрут из заявки с несколькими точками", () => {
  const route = buildOptimizedRoute({
    pickupAddress: "Москва, ул. Рябиновая, 22",
    deliveryAddress: "Тверь, ул. Коминтерна, 45",
    deliveryPoints: [
      { address: "Тверь, ул. Коминтерна, 45", latitude: 56.8587, longitude: 35.9176, orderNumber: 1 },
      { address: "Химки, Вашутинское шоссе, 9", latitude: 55.897, longitude: 37.4297, orderNumber: 2 }
    ]
  });

  assert.equal(route.waypoints[0].orderNumber, 1);
  assert.equal(route.waypoints.length, 3);
  assert.ok(route.distanceKm > 0);
  assert.match(route.estimatedDuration, /мин|ч/);
});
