const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { PassThrough, Readable } = require("node:stream");
const bcrypt = require("bcryptjs");

process.env.JWT_SECRET = "test-secret";
process.env.HOST = "127.0.0.1";
process.env.NODE_ENV = "test";

let db;
let nextId;

const clone = (value) => structuredClone(value);

function createSocket() {
  const socket = new PassThrough();
  socket.encrypted = false;
  socket.remoteAddress = "127.0.0.1";
  return socket;
}

function hash(password) {
  return bcrypt.hashSync(password, 4);
}

function resetDb() {
  nextId = {
    users: 10,
    drivers: 10,
    vehicles: 10,
    clients: 10,
    cargoRequests: 10,
    deliveryPoints: 10,
    routes: 10,
    waypoints: 10,
    waybills: 10
  };

  db = {
    users: [
      row({ id: 1, fullName: "Петров Алексей Сергеевич", email: "admin@example.com", passwordHash: hash("admin123"), role: "ADMIN" }),
      row({ id: 2, fullName: "Соколова Мария Андреевна", email: "dispatcher@example.com", passwordHash: hash("dispatcher123"), role: "DISPATCHER" }),
      row({ id: 3, fullName: "Иванов Игорь Ильич", email: "driver@example.com", passwordHash: hash("driver123"), role: "DRIVER" }),
      row({ id: 4, fullName: "Кузнецов Дмитрий Олегович", email: "driver2@example.com", passwordHash: hash("driver123"), role: "DRIVER" })
    ],
    drivers: [
      row({ id: 1, userId: 3, fullName: "Иванов Игорь Ильич", phone: "+7 900 100-20-30", licenseNumber: "77AA123456", licenseCategory: "B, C", status: "AVAILABLE" }),
      row({ id: 2, userId: 4, fullName: "Кузнецов Дмитрий Олегович", phone: "+7 901 222-33-44", licenseNumber: "77BB654321", licenseCategory: "C", status: "AVAILABLE" }),
      row({ id: 3, userId: null, fullName: "Федоров Павел Николаевич", phone: "+7 926 555-77-99", licenseNumber: "50CC778899", licenseCategory: "C, E", status: "BUSY" })
    ],
    vehicles: [
      row({ id: 1, brand: "ГАЗ", model: "ГАЗель Next", plateNumber: "А123ВС777", capacityKg: 1500, fuelConsumptionPer100Km: 10, status: "AVAILABLE" }),
      row({ id: 2, brand: "Ford", model: "Transit", plateNumber: "К456МН777", capacityKg: 2200, fuelConsumptionPer100Km: 12, status: "AVAILABLE" }),
      row({ id: 3, brand: "КАМАЗ", model: "5490", plateNumber: "Т090ТР777", capacityKg: 12000, fuelConsumptionPer100Km: 29.5, status: "REPAIR" })
    ],
    clients: [
      row({ id: 1, name: "ООО Альфа Снаб", contactPerson: "Морозова Елена", phone: "+7 495 100-11-22", email: "order@alpha-snab.ru", address: "Москва, ул. Складочная, 12" })
    ],
    cargoRequests: [
      row({ id: 1, clientId: 1, cargoName: "Мебель", weightKg: 1200, volume: 8.4, pickupAddress: "Москва, ул. Рябиновая, 22", deliveryAddress: "Тверь, ул. Коминтерна, 45", desiredDeliveryDate: new Date("2026-06-15T09:00:00.000Z"), status: "NEW", archivedAt: null }),
      row({ id: 2, clientId: 1, cargoName: "Бытовая техника", weightKg: 850, volume: 5.6, pickupAddress: "Москва, ул. Рябиновая, 22", deliveryAddress: "Тверь, ул. Коминтерна, 45", desiredDeliveryDate: new Date("2026-06-15T09:00:00.000Z"), status: "PLANNED", archivedAt: null }),
      row({ id: 3, clientId: 1, cargoName: "Строительные материалы", weightKg: 1000, volume: 6.1, pickupAddress: "Москва, Новорязанское шоссе, 3", deliveryAddress: "Калуга, ул. Кирова, 21", desiredDeliveryDate: new Date("2026-06-16T09:00:00.000Z"), status: "COMPLETED", archivedAt: null })
    ],
    deliveryPoints: [
      { id: 1, cargoRequestId: 1, address: "Тверь, ул. Коминтерна, 45", latitude: 56.8587, longitude: 35.9176, orderNumber: 1 },
      { id: 2, cargoRequestId: 2, address: "Тверь, ул. Коминтерна, 45", latitude: 56.8587, longitude: 35.9176, orderNumber: 1 },
      { id: 3, cargoRequestId: 3, address: "Калуга, ул. Кирова, 21", latitude: 54.5138, longitude: 36.2612, orderNumber: 1 }
    ],
    routes: [
      row({ id: 1, cargoRequestId: 2, driverId: 1, vehicleId: 1, startAddress: "Москва, ул. Рябиновая, 22", endAddress: "Тверь, ул. Коминтерна, 45", distanceKm: 180, estimatedDuration: "3 ч 16 мин", plannedDate: new Date("2026-06-15T09:00:00.000Z"), status: "PLANNED", archivedAt: null }),
      row({ id: 2, cargoRequestId: 3, driverId: 2, vehicleId: 2, startAddress: "Москва, Новорязанское шоссе, 3", endAddress: "Калуга, ул. Кирова, 21", distanceKm: 160, estimatedDuration: "2 ч 55 мин", plannedDate: new Date("2026-06-16T09:00:00.000Z"), status: "COMPLETED", archivedAt: null })
    ],
    waypoints: [
      { id: 1, routeId: 1, address: "Москва, ул. Рябиновая, 22", latitude: 55.7029, longitude: 37.4281, orderNumber: 1 },
      { id: 2, routeId: 1, address: "Тверь, ул. Коминтерна, 45", latitude: 56.8587, longitude: 35.9176, orderNumber: 2 },
      { id: 3, routeId: 2, address: "Москва, Новорязанское шоссе, 3", latitude: 55.6525, longitude: 37.8895, orderNumber: 1 },
      { id: 4, routeId: 2, address: "Калуга, ул. Кирова, 21", latitude: 54.5138, longitude: 36.2612, orderNumber: 2 }
    ],
    waybills: [
      row({ id: 1, routeId: 1, number: "PL-2026-0001", issueDate: new Date("2026-06-15T08:00:00.000Z"), plannedFuel: 18, actualFuel: null, startMileage: null, endMileage: null, departureTime: null, returnTime: null, status: "CREATED", archivedAt: null }),
      row({ id: 2, routeId: 2, number: "PL-2026-0002", issueDate: new Date("2026-06-16T08:00:00.000Z"), plannedFuel: 19.2, actualFuel: 24, startMileage: 1000, endMileage: 1150, departureTime: new Date("2026-06-16T09:00:00.000Z"), returnTime: new Date("2026-06-16T13:00:00.000Z"), status: "COMPLETED", archivedAt: null })
    ]
  };
}

function row(data) {
  const now = new Date("2026-06-01T10:00:00.000Z");
  return { createdAt: now, updatedAt: now, ...data };
}

function getCollection(model) {
  const map = {
    user: "users",
    driver: "drivers",
    vehicle: "vehicles",
    client: "clients",
    cargoRequest: "cargoRequests",
    deliveryPoint: "deliveryPoints",
    route: "routes",
    waypoint: "waypoints",
    waybill: "waybills"
  };

  return db[map[model]];
}

function compareValues(actual, expected) {
  if (actual instanceof Date || expected instanceof Date) {
    return new Date(actual).getTime() === new Date(expected).getTime();
  }
  return actual === expected;
}

function matchesCondition(actual, condition) {
  if (condition && typeof condition === "object" && !(condition instanceof Date) && !Array.isArray(condition)) {
    const hasOperator = ["in", "notIn", "not", "gte", "lte", "contains"].some((key) => key in condition);
    if ("in" in condition) return condition.in.includes(actual);
    if ("notIn" in condition) return !condition.notIn.includes(actual);
    if ("not" in condition && compareValues(actual, condition.not)) return false;
    if ("gte" in condition && new Date(actual).getTime() < new Date(condition.gte).getTime()) return false;
    if ("lte" in condition && new Date(actual).getTime() > new Date(condition.lte).getTime()) return false;
    if ("contains" in condition) {
      const source = String(actual || "");
      const needle = String(condition.contains || "");
      return condition.mode === "insensitive"
        ? source.toLowerCase().includes(needle.toLowerCase())
        : source.includes(needle);
    }
    if (hasOperator) return true;
  }

  return compareValues(actual, condition);
}

function matchesWhere(model, item, where = {}) {
  return Object.entries(where || {}).every(([key, condition]) => {
    if (key === "AND") return condition.every((part) => matchesWhere(model, item, part));
    if (key === "OR") return condition.some((part) => matchesWhere(model, item, part));
    if (key === "route") {
      const route = db.routes.find((candidate) => candidate.id === item.routeId);
      return route ? matchesWhere("route", route, condition) : false;
    }

    return matchesCondition(item[key], condition);
  });
}

function sortRows(rows, orderBy) {
  const rules = Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : [];
  if (!rules.length) return rows;

  return [...rows].sort((left, right) => {
    for (const rule of rules) {
      const [[field, direction]] = Object.entries(rule);
      const a = left[field];
      const b = right[field];
      if (a === b) continue;
      const result = a > b ? 1 : -1;
      return direction === "desc" ? -result : result;
    }

    return 0;
  });
}

function selectFields(item, select) {
  if (!select) return item;

  const selected = {};
  Object.entries(select).forEach(([key, enabled]) => {
    if (enabled) selected[key] = item[key];
  });
  return selected;
}

function withRelations(model, item, args = {}) {
  if (!item) return null;
  const output = clone(item);
  const include = args.include || {};

  if (model === "user" && (include.driver || args.select?.driver)) {
    output.driver = clone(db.drivers.find((driver) => driver.userId === output.id) || null);
  }

  if (model === "driver" && include.user) {
    output.user = clone(db.users.find((user) => user.id === output.userId) || null);
  }

  if (model === "driver" && include.routes) {
    output.routes = db.routes
      .filter((route) => route.driverId === output.id)
      .filter((route) => matchesWhere("route", route, include.routes.where || {}))
      .map((route) => withRelations("route", route, { include: include.routes.include || {} }));
  }

  if (model === "vehicle" && include.routes) {
    output.routes = db.routes
      .filter((route) => route.vehicleId === output.id)
      .filter((route) => matchesWhere("route", route, include.routes.where || {}))
      .map((route) => withRelations("route", route, { include: include.routes.include || {} }));
  }

  if (model === "cargoRequest" && (include.client || args.include?.client)) {
    output.client = clone(db.clients.find((client) => client.id === output.clientId) || null);
  }

  if (model === "cargoRequest" && (include.deliveryPoints || args.include?.deliveryPoints)) {
    output.deliveryPoints = sortRows(
      db.deliveryPoints.filter((point) => point.cargoRequestId === output.id),
      include.deliveryPoints?.orderBy
    ).map(clone);
  }

  if (model === "route") {
    if (include.cargoRequest) {
      output.cargoRequest = withRelations("cargoRequest", db.cargoRequests.find((request) => request.id === output.cargoRequestId), include.cargoRequest);
    }
    if (include.driver) output.driver = clone(db.drivers.find((driver) => driver.id === output.driverId) || null);
    if (include.vehicle) output.vehicle = clone(db.vehicles.find((vehicle) => vehicle.id === output.vehicleId) || null);
    if (include.waypoints) {
      output.waypoints = sortRows(
        db.waypoints.filter((point) => point.routeId === output.id),
        include.waypoints.orderBy
      ).map(clone);
    }
    if (include.waybill) output.waybill = clone(db.waybills.find((waybill) => waybill.routeId === output.id) || null);
  }

  if (model === "waybill" && include.route) {
    output.route = withRelations("route", db.routes.find((route) => route.id === output.routeId), include.route);
  }

  return selectFields(output, args.select);
}

function normalizeRelationData(data) {
  const normalized = { ...data };
  if (normalized.client?.connect?.id) {
    normalized.clientId = normalized.client.connect.id;
    delete normalized.client;
  }
  return normalized;
}

function createItem(model, args) {
  const collection = getCollection(model);
  const data = normalizeRelationData({ ...args.data });
  const nestedDeliveryPoints = data.deliveryPoints?.create || [];
  const nestedWaypoints = data.waypoints?.create || [];
  delete data.deliveryPoints;
  delete data.waypoints;

  const now = new Date("2026-06-10T10:00:00.000Z");
  const item = {
    id: nextId[collectionName(model)]++,
    createdAt: now,
    updatedAt: now,
    ...data
  };

  if (model === "cargoRequest") {
    item.status = item.status || "NEW";
    item.archivedAt = item.archivedAt ?? null;
  }
  if (model === "route") item.archivedAt = item.archivedAt ?? null;
  if (model === "waybill") {
    item.issueDate = item.issueDate || now;
    item.archivedAt = item.archivedAt ?? null;
  }

  collection.push(item);

  if (model === "cargoRequest") {
    nestedDeliveryPoints.forEach((point, index) => {
      db.deliveryPoints.push({
        id: nextId.deliveryPoints++,
        cargoRequestId: item.id,
        orderNumber: Number(point.orderNumber || index + 1),
        ...point
      });
    });
  }

  if (model === "route") {
    nestedWaypoints.forEach((point, index) => {
      db.waypoints.push({
        id: nextId.waypoints++,
        routeId: item.id,
        orderNumber: Number(point.orderNumber || index + 1),
        ...point
      });
    });
  }

  return withRelations(model, item, args);
}

function collectionName(model) {
  return {
    user: "users",
    driver: "drivers",
    vehicle: "vehicles",
    client: "clients",
    cargoRequest: "cargoRequests",
    deliveryPoint: "deliveryPoints",
    route: "routes",
    waypoint: "waypoints",
    waybill: "waybills"
  }[model];
}

function updateItem(model, args) {
  const collection = getCollection(model);
  const item = collection.find((candidate) => matchesWhere(model, candidate, args.where));
  if (!item) throw new Error(`${model} not found`);

  const data = normalizeRelationData({ ...args.data });
  const deliveryPoints = data.deliveryPoints;
  delete data.deliveryPoints;

  Object.assign(item, data, { updatedAt: new Date("2026-06-10T11:00:00.000Z") });

  if (model === "cargoRequest" && deliveryPoints) {
    db.deliveryPoints = db.deliveryPoints.filter((point) => point.cargoRequestId !== item.id);
    (deliveryPoints.create || []).forEach((point, index) => {
      db.deliveryPoints.push({
        id: nextId.deliveryPoints++,
        cargoRequestId: item.id,
        orderNumber: Number(point.orderNumber || index + 1),
        ...point
      });
    });
  }

  return withRelations(model, item, args);
}

function modelApi(model) {
  return {
    findUnique: async (args) => {
      const item = getCollection(model).find((candidate) => matchesWhere(model, candidate, args.where));
      return withRelations(model, item, args);
    },
    findFirst: async (args) => {
      const item = getCollection(model).find((candidate) => matchesWhere(model, candidate, args.where));
      return withRelations(model, item, args);
    },
    findMany: async (args = {}) => {
      const rows = sortRows(
        getCollection(model).filter((candidate) => matchesWhere(model, candidate, args.where || {})),
        args.orderBy
      );
      return rows.map((item) => withRelations(model, item, args));
    },
    create: async (args) => createItem(model, args),
    update: async (args) => updateItem(model, args),
    updateMany: async (args) => {
      const rows = getCollection(model).filter((candidate) => matchesWhere(model, candidate, args.where || {}));
      rows.forEach((item) => Object.assign(item, args.data, { updatedAt: new Date("2026-06-10T11:30:00.000Z") }));
      return { count: rows.length };
    },
    delete: async (args) => {
      const collection = getCollection(model);
      const index = collection.findIndex((candidate) => matchesWhere(model, candidate, args.where));
      if (index >= 0) collection.splice(index, 1);
      return {};
    },
    deleteMany: async (args = {}) => {
      const collection = getCollection(model);
      const original = collection.length;
      const kept = collection.filter((candidate) => !matchesWhere(model, candidate, args.where || {}));
      collection.splice(0, collection.length, ...kept);
      return { count: original - kept.length };
    },
    count: async (args = {}) => getCollection(model).filter((candidate) => matchesWhere(model, candidate, args.where || {})).length
  };
}

const prisma = {
  user: modelApi("user"),
  driver: modelApi("driver"),
  vehicle: modelApi("vehicle"),
  client: modelApi("client"),
  cargoRequest: modelApi("cargoRequest"),
  route: modelApi("route"),
  waybill: modelApi("waybill"),
  $transaction: async (callback) => callback(prisma)
};

const prismaPath = require.resolve("../src/lib/prisma");
require.cache[prismaPath] = {
  id: prismaPath,
  filename: prismaPath,
  loaded: true,
  exports: prisma
};

const app = require("../src/index");

test.beforeEach(() => {
  resetDb();
});

async function request(method, path, { body, token } = {}) {
  const requestBody = body ? JSON.stringify(body) : "";
  const req = new MockRequest({
    method,
    url: path,
    headers: {
      ...(body ? { "content-type": "application/json", "content-length": Buffer.byteLength(requestBody) } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: requestBody
  });

  const res = new MockResponse();
  await new Promise((resolve, reject) => {
    res.on("finish", resolve);
    app.handle(req, res, reject);
  });

  const text = Buffer.concat(res.chunks).toString("utf8");
  return {
    status: res.statusCode,
    body: text ? JSON.parse(text) : null
  };
}

class MockRequest extends Readable {
  constructor({ method, url, headers, body }) {
    super();
    this.method = method;
    this.url = url;
    this.originalUrl = url;
    this.headers = headers;
    this.httpVersionMajor = 1;
    this.httpVersionMinor = 1;
    this.socket = createSocket();
    this.connection = this.socket;
    this.bodyText = body;
    this._read = () => {
      if (this.bodyText !== null) {
        this.push(this.bodyText);
        this.bodyText = null;
        return;
      }
      this.push(null);
    };
  }
}

class MockResponse {
  constructor() {
    const events = new EventEmitter();
    this.statusCode = 200;
    this.headers = {};
    this.chunks = [];
    this.headersSent = false;
    this.finished = false;
    this.writableEnded = false;
    this.socket = createSocket();
    this.connection = this.socket;
    this.on = events.on.bind(events);
    this.once = events.once.bind(events);
    this.emit = events.emit.bind(events);
    this.removeListener = events.removeListener.bind(events);
    this.setHeader = (name, value) => {
      this.headers[name.toLowerCase()] = value;
    };
    this.getHeader = (name) => this.headers[name.toLowerCase()];
    this.getHeaders = () => ({ ...this.headers });
    this.removeHeader = (name) => {
      delete this.headers[name.toLowerCase()];
    };
    this.writeHead = (statusCode, headers = {}) => {
      this.statusCode = statusCode;
      Object.entries(headers).forEach(([name, value]) => this.setHeader(name, value));
    };
    this.write = (chunk, encoding, callback) => {
      if (chunk) this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      if (typeof callback === "function") callback();
      return true;
    };
    this.end = (chunk, encoding, callback) => {
      if (chunk) this.write(chunk, encoding);
      this.headersSent = true;
      this.finished = true;
      this.writableEnded = true;
      if (typeof callback === "function") callback();
      this.emit("finish");
      this.emit("close");
    };
    this._write = (chunk, encoding, callback) => {
      this.write(chunk, encoding);
      callback();
    };
  }
}

async function tokenFor(email, password) {
  const response = await request("POST", "/api/auth/login", { body: { email, password } });
  assert.equal(response.status, 200);
  return response.body.token;
}

test("авторизация проходит при верных учетных данных", async () => {
  const response = await request("POST", "/api/auth/login", {
    body: { email: "dispatcher@example.com", password: "dispatcher123" }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.user.role, "DISPATCHER");
  assert.ok(response.body.token);
  assert.equal("passwordHash" in response.body.user, false);
});

test("авторизация отклоняется при неверном пароле", async () => {
  const response = await request("POST", "/api/auth/login", {
    body: { email: "dispatcher@example.com", password: "wrong-password" }
  });

  assert.equal(response.status, 401);
  assert.match(response.body.message, /Неверный email или пароль/);
});

test("администратор создает пользователя с указанной ролью", async () => {
  const adminToken = await tokenFor("admin@example.com", "admin123");
  const response = await request("POST", "/api/users", {
    token: adminToken,
    body: {
      fullName: "Новый диспетчер",
      email: "new-dispatcher@example.com",
      password: "password123",
      role: "DISPATCHER"
    }
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.email, "new-dispatcher@example.com");
  assert.equal(response.body.role, "DISPATCHER");
  assert.equal("passwordHash" in response.body, false);
});

test("диспетчер не получает доступ к управлению пользователями", async () => {
  const dispatcherToken = await tokenFor("dispatcher@example.com", "dispatcher123");
  const response = await request("GET", "/api/users", { token: dispatcherToken });

  assert.equal(response.status, 403);
});

test("диспетчер создает новую заявку на перевозку", async () => {
  const dispatcherToken = await tokenFor("dispatcher@example.com", "dispatcher123");
  const response = await request("POST", "/api/cargo-requests", {
    token: dispatcherToken,
    body: cargoRequestPayload({ cargoName: "Офисная техника" })
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.cargoName, "Офисная техника");
  assert.equal(response.body.status, "NEW");
  assert.equal(response.body.deliveryPoints.length, 1);
});

test("диспетчер редактирует данные существующей заявки", async () => {
  const dispatcherToken = await tokenFor("dispatcher@example.com", "dispatcher123");
  const response = await request("PUT", "/api/cargo-requests/1", {
    token: dispatcherToken,
    body: cargoRequestPayload({ cargoName: "Мебель и фурнитура", weightKg: 1350 })
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.cargoName, "Мебель и фурнитура");
  assert.equal(response.body.weightKg, 1350);
});

test("модуль рекомендаций подбирает свободного водителя и автомобиль", async () => {
  const dispatcherToken = await tokenFor("dispatcher@example.com", "dispatcher123");
  db.drivers.find((driver) => driver.id === 2).status = "BUSY";
  db.vehicles.find((vehicle) => vehicle.id === 2).status = "BUSY";

  const response = await request("POST", "/api/recommendations/route", {
    token: dispatcherToken,
    body: { cargoRequestId: 1, plannedDate: "2026-06-15T09:00:00.000Z" }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.driver.id, 2);
  assert.equal(response.body.vehicle.id, 2);
  assert.ok(response.body.plannedFuel > 0);
  assert.match(response.body.explanation, /Рекомендуется назначить автомобиль/);
});

test("возврат заявки в новую удаляет активный маршрут", async () => {
  const dispatcherToken = await tokenFor("dispatcher@example.com", "dispatcher123");
  const response = await request("PUT", "/api/cargo-requests/2", {
    token: dispatcherToken,
    body: cargoRequestPayload({
      cargoName: "Бытовая техника",
      status: "NEW",
      desiredDeliveryDate: "2026-06-15T09:00:00.000Z"
    })
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "NEW");
  assert.equal(db.routes.some((route) => route.cargoRequestId === 2), false);
});

test("создание маршрута назначает водителя, автомобиль и создает путевой лист", async () => {
  const dispatcherToken = await tokenFor("dispatcher@example.com", "dispatcher123");
  const response = await request("POST", "/api/routes", {
    token: dispatcherToken,
    body: routePayload()
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.cargoRequestId, 1);
  assert.equal(response.body.driverId, 2);
  assert.equal(response.body.vehicleId, 2);
  assert.equal(response.body.waybill.status, "CREATED");
  assert.equal(response.body.waybill.plannedFuel, 24);
  assert.equal(db.cargoRequests.find((item) => item.id === 1).status, "PLANNED");
  assert.equal(db.drivers.find((item) => item.id === 2).status, "AVAILABLE");
  assert.equal(db.vehicles.find((item) => item.id === 2).status, "AVAILABLE");

  const driversResponse = await request("GET", "/api/drivers?availabilityDate=2026-06-15&availabilityDays=3", {
    token: dispatcherToken
  });
  const vehiclesResponse = await request("GET", "/api/vehicles?availabilityDate=2026-06-15", {
    token: dispatcherToken
  });

  assert.equal(driversResponse.body.find((item) => item.id === 2).availabilityStatus, "BUSY");
  assert.equal(driversResponse.body.find((item) => item.id === 2).availabilitySchedule.length, 3);
  assert.equal(driversResponse.body.find((item) => item.id === 2).availabilitySchedule[1].status, "AVAILABLE");
  assert.equal(vehiclesResponse.body.find((item) => item.id === 2).availabilityStatus, "BUSY");
});

test("водитель сохраняет фактический пробег и расход топлива в путевом листе", async () => {
  const driverToken = await tokenFor("driver@example.com", "driver123");
  const response = await request("PUT", "/api/waybills/1", {
    token: driverToken,
    body: {
      startMileage: 2000,
      endMileage: 2182,
      actualFuel: 21.7,
      status: "ACTIVE"
    }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.startMileage, 2000);
  assert.equal(response.body.endMileage, 2182);
  assert.equal(response.body.actualFuel, 21.7);
  assert.equal(db.routes.find((route) => route.id === 1).status, "IN_PROGRESS");
  assert.equal(db.cargoRequests.find((requestItem) => requestItem.id === 2).status, "IN_PROGRESS");
  assert.equal(db.drivers.find((driver) => driver.id === 1).status, "BUSY");
  assert.equal(db.vehicles.find((vehicle) => vehicle.id === 1).status, "BUSY");
});

test("начало рейса меняет статус маршрута и путевого листа", async () => {
  const driverToken = await tokenFor("driver@example.com", "driver123");
  const response = await request("PUT", "/api/routes/1", {
    token: driverToken,
    body: { status: "IN_PROGRESS" }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "IN_PROGRESS");
  assert.equal(response.body.waybill.status, "ACTIVE");
  assert.equal(db.drivers.find((driver) => driver.id === 1).status, "BUSY");
  assert.equal(db.vehicles.find((vehicle) => vehicle.id === 1).status, "BUSY");
});

test("рейс в работе можно вернуть в план", async () => {
  const driverToken = await tokenFor("driver@example.com", "driver123");
  const dispatcherToken = await tokenFor("dispatcher@example.com", "dispatcher123");
  await request("PUT", "/api/routes/1", {
    token: driverToken,
    body: { status: "IN_PROGRESS" }
  });

  const response = await request("PUT", "/api/routes/1", {
    token: driverToken,
    body: { status: "PLANNED" }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "PLANNED");
  assert.equal(response.body.waybill.status, "CREATED");
  assert.equal(db.cargoRequests.find((requestItem) => requestItem.id === response.body.cargoRequestId).status, "PLANNED");
  assert.equal(db.drivers.find((driver) => driver.id === response.body.driverId).status, "AVAILABLE");
  assert.equal(db.vehicles.find((vehicle) => vehicle.id === response.body.vehicleId).status, "AVAILABLE");

  const driversResponse = await request("GET", "/api/drivers?availabilityDate=2026-06-15", {
    token: dispatcherToken
  });
  assert.equal(driversResponse.status, 200);
  assert.equal(driversResponse.body.find((driver) => driver.id === response.body.driverId).availabilityStatus, "BUSY");
});

test("завершение рейса освобождает водителя и автомобиль", async () => {
  const driverToken = await tokenFor("driver@example.com", "driver123");
  const response = await request("PUT", "/api/routes/1", {
    token: driverToken,
    body: { status: "COMPLETED" }
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "COMPLETED");
  assert.equal(response.body.waybill.status, "COMPLETED");
  assert.equal(db.drivers.find((driver) => driver.id === 1).status, "AVAILABLE");
  assert.equal(db.vehicles.find((vehicle) => vehicle.id === 1).status, "AVAILABLE");
  assert.equal(db.cargoRequests.find((requestItem) => requestItem.id === 2).status, "COMPLETED");
});

test("панель мониторинга получает статистику по маршрутам", async () => {
  const dispatcherToken = await tokenFor("dispatcher@example.com", "dispatcher123");
  const response = await request("GET", "/api/reports/summary?from=2026-06-01&to=2026-06-30", {
    token: dispatcherToken
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.routesCount, 2);
  assert.equal(response.body.completedRoutes, 1);
  assert.equal(response.body.totalMileage, 330);
  assert.equal(response.body.totalFuel, 42);
});

test("отчет по водителям считает пробег за период", async () => {
  const dispatcherToken = await tokenFor("dispatcher@example.com", "dispatcher123");
  const response = await request("GET", "/api/reports/drivers?from=2026-06-01&to=2026-06-30", {
    token: dispatcherToken
  });

  assert.equal(response.status, 200);
  const driver = response.body.find((item) => item.id === 2);
  assert.equal(driver.completedRoutes, 1);
  assert.equal(driver.mileage, 150);
});

test("водитель видит только назначенные ему маршруты", async () => {
  const driverToken = await tokenFor("driver@example.com", "driver123");
  const response = await request("GET", "/api/routes", { token: driverToken });

  assert.equal(response.status, 200);
  assert.equal(response.body.length, 1);
  assert.equal(response.body[0].driverId, 1);
});

test("проверка health подтверждает доступность API", async () => {
  const response = await request("GET", "/api/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
});

function cargoRequestPayload(overrides = {}) {
  return {
    clientId: 1,
    cargoName: "Мебель",
    weightKg: 1200,
    volume: 8.4,
    pickupAddress: "Москва, ул. Рябиновая, 22",
    deliveryAddress: "Тверь, ул. Коминтерна, 45",
    desiredDeliveryDate: "2026-06-20T09:00:00.000Z",
    deliveryPoints: [{ address: "Тверь, ул. Коминтерна, 45", latitude: 56.8587, longitude: 35.9176, orderNumber: 1 }],
    ...overrides
  };
}

function routePayload(overrides = {}) {
  return {
    cargoRequestId: 1,
    driverId: 2,
    vehicleId: 2,
    startAddress: "Москва, ул. Рябиновая, 22",
    endAddress: "Тверь, ул. Коминтерна, 45",
    distanceKm: 200,
    estimatedDuration: "3 ч 38 мин",
    plannedDate: "2026-06-15T09:00:00.000Z",
    waypoints: [
      { address: "Москва, ул. Рябиновая, 22", latitude: 55.7029, longitude: 37.4281, orderNumber: 1 },
      { address: "Тверь, ул. Коминтерна, 45", latitude: 56.8587, longitude: 35.9176, orderNumber: 2 }
    ],
    ...overrides
  };
}
