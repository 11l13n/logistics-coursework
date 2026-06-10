const express = require("express");
const prisma = require("../lib/prisma");
const auth = require("../middleware/auth");
const requireRoles = require("../middleware/roles");
const asyncHandler = require("../utils/asyncHandler");
const { getDayRange } = require("../utils/dates");
const { normalizePayload } = require("./resources");

const router = express.Router();
router.use(auth);

const routeInclude = {
  cargoRequest: { include: { client: true, deliveryPoints: { orderBy: { orderNumber: "asc" } } } },
  driver: true,
  vehicle: true,
  waypoints: { orderBy: { orderNumber: "asc" } },
  waybill: true
};

const routeWhereForUser = (req) => {
  if (req.user.role === "DRIVER") {
    if (!req.user.driver) return { id: -1 };
    return { driverId: req.user.driver.id };
  }

  return {};
};

const applyArchiveFilter = (where, archiveMode) => {
  if (archiveMode === "archived") {
    where.archivedAt = { not: null };
    return;
  }

  if (archiveMode !== "all") {
    where.archivedAt = null;
  }
};

const activeRouteStatuses = ["PLANNED", "IN_PROGRESS"];

const updateLinkedStatuses = async (tx, route, status) => {
  const completed = status === "COMPLETED";
  const cancelled = status === "CANCELLED";
  const active = status === "IN_PROGRESS" || status === "PLANNED";

  if (completed || cancelled) {
    await tx.driver.update({ where: { id: route.driverId }, data: { status: "AVAILABLE" } });
    await tx.vehicle.update({ where: { id: route.vehicleId }, data: { status: "AVAILABLE" } });
  }

  if (active) {
    await tx.driver.update({ where: { id: route.driverId }, data: { status: "BUSY" } });
    await tx.vehicle.update({ where: { id: route.vehicleId }, data: { status: "BUSY" } });
  }

  if (completed) {
    await tx.cargoRequest.update({
      where: { id: route.cargoRequestId },
      data: { status: "COMPLETED" }
    });
    await tx.waybill.updateMany({
      where: { routeId: route.id },
      data: { status: "COMPLETED", returnTime: new Date() }
    });
  }

  if (status === "PLANNED") {
    await tx.cargoRequest.update({
      where: { id: route.cargoRequestId },
      data: { status: "PLANNED" }
    });
    await tx.waybill.updateMany({
      where: { routeId: route.id },
      data: { status: "CREATED", departureTime: null, returnTime: null }
    });
  }

  if (cancelled) {
    await tx.cargoRequest.update({
      where: { id: route.cargoRequestId },
      data: { status: "CANCELLED" }
    });
    await tx.waybill.updateMany({
      where: { routeId: route.id },
      data: { status: "CANCELLED" }
    });
  }

  if (status === "IN_PROGRESS") {
    await tx.cargoRequest.update({
      where: { id: route.cargoRequestId },
      data: { status: "IN_PROGRESS" }
    });
    await tx.waybill.updateMany({
      where: { routeId: route.id },
      data: { status: "ACTIVE", departureTime: new Date() }
    });
  }
};

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const where = routeWhereForUser(req);
    applyArchiveFilter(where, req.query.archive);

    if (req.query.status) where.status = req.query.status;
    if (req.query.driverId) where.driverId = Number(req.query.driverId);
    if (req.query.vehicleId) where.vehicleId = Number(req.query.vehicleId);
    if (req.query.date) {
      const { start, end } = getDayRange(req.query.date);
      where.plannedDate = { gte: start, lte: end };
    }

    const routes = await prisma.route.findMany({
      where,
      include: routeInclude,
      orderBy: { plannedDate: "desc" }
    });
    res.json(routes);
  })
);

router.post(
  "/",
  requireRoles("ADMIN", "DISPATCHER"),
  asyncHandler(async (req, res) => {
    const payload = normalizePayload(req.body);
    const waypoints = Array.isArray(req.body.waypoints) ? req.body.waypoints : [];

    const cargoRequest = await prisma.cargoRequest.findUnique({ where: { id: payload.cargoRequestId } });
    if (!cargoRequest) {
      return res.status(404).json({ message: "Заявка не найдена" });
    }

    if (cargoRequest.status !== "NEW") {
      return res.status(409).json({
        message: "Маршрут можно создать только по новой заявке. Завершенные, отмененные и уже запланированные заявки недоступны."
      });
    }

    if (payload.plannedDate) {
      const plannedDay = new Date(payload.plannedDate).toISOString().slice(0, 10);
      const requestedDay = new Date(cargoRequest.desiredDeliveryDate).toISOString().slice(0, 10);
      if (plannedDay !== requestedDay) {
        return res.status(409).json({ message: "Дата маршрута должна совпадать с датой выполнения заявки" });
      }
    }

    const vehicle = await prisma.vehicle.findUnique({ where: { id: payload.vehicleId } });
    if (!vehicle) {
      return res.status(404).json({ message: "Автомобиль не найден" });
    }
    if (["REPAIR", "INACTIVE"].includes(vehicle.status)) {
      return res.status(409).json({ message: "Автомобиль недоступен для назначения" });
    }

    const driver = await prisma.driver.findUnique({ where: { id: payload.driverId } });
    if (!driver) {
      return res.status(404).json({ message: "Водитель не найден" });
    }
    if (driver.status === "INACTIVE") {
      return res.status(409).json({ message: "Водитель недоступен для назначения" });
    }

    const { start, end } = getDayRange(payload.plannedDate || cargoRequest.desiredDeliveryDate);
    const busyRoute = await prisma.route.findFirst({
      where: {
        plannedDate: { gte: start, lte: end },
        status: { in: activeRouteStatuses },
        OR: [{ driverId: payload.driverId }, { vehicleId: payload.vehicleId }]
      }
    });
    if (busyRoute) {
      return res.status(409).json({ message: "Водитель или автомобиль уже заняты на выбранную дату" });
    }

    const plannedFuel = Number(((payload.distanceKm * vehicle.fuelConsumptionPer100Km) / 100).toFixed(2));

    const created = await prisma.$transaction(async (tx) => {
      const route = await tx.route.create({
        data: {
          cargoRequestId: payload.cargoRequestId,
          driverId: payload.driverId,
          vehicleId: payload.vehicleId,
          startAddress: payload.startAddress,
          endAddress: payload.endAddress,
          distanceKm: payload.distanceKm,
          estimatedDuration: payload.estimatedDuration,
          plannedDate: payload.plannedDate,
          status: payload.status || "PLANNED",
          waypoints: {
            create: waypoints.map((point, index) => ({
              address: point.address || `Точка ${index + 1}`,
              latitude: Number(point.latitude),
              longitude: Number(point.longitude),
              orderNumber: Number(point.orderNumber || index + 1)
            }))
          }
        },
        include: routeInclude
      });

      const count = await tx.waybill.count();
      await tx.waybill.create({
        data: {
          routeId: route.id,
          number: `PL-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`,
          plannedFuel,
          status: "CREATED"
        }
      });

      await tx.cargoRequest.update({
        where: { id: payload.cargoRequestId },
        data: { status: "PLANNED" }
      });
      await tx.driver.update({ where: { id: payload.driverId }, data: { status: "BUSY" } });
      await tx.vehicle.update({ where: { id: payload.vehicleId }, data: { status: "BUSY" } });

      return tx.route.findUnique({ where: { id: route.id }, include: routeInclude });
    });

    res.status(201).json(created);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const route = await prisma.route.findFirst({
      where: { id: Number(req.params.id), ...routeWhereForUser(req) },
      include: routeInclude
    });

    if (!route) {
      return res.status(404).json({ message: "Маршрут не найден" });
    }

    res.json(route);
  })
);

router.post(
  "/:id/archive",
  asyncHandler(async (req, res) => {
    const route = await prisma.route.findFirst({
      where: { id: Number(req.params.id), ...routeWhereForUser(req) },
      include: routeInclude
    });

    if (!route) {
      return res.status(404).json({ message: "Маршрут не найден" });
    }

    if (route.status !== "COMPLETED") {
      return res.status(409).json({ message: "В архив можно отправить только выполненные маршруты" });
    }

    const updated = await prisma.route.update({
      where: { id: route.id },
      data: { archivedAt: new Date() },
      include: routeInclude
    });

    res.json(updated);
  })
);

router.post(
  "/:id/unarchive",
  asyncHandler(async (req, res) => {
    const route = await prisma.route.findFirst({
      where: { id: Number(req.params.id), ...routeWhereForUser(req) },
      include: routeInclude
    });

    if (!route) {
      return res.status(404).json({ message: "Маршрут не найден" });
    }

    const updated = await prisma.route.update({
      where: { id: route.id },
      data: { archivedAt: null },
      include: routeInclude
    });

    res.json(updated);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const current = await prisma.route.findFirst({
      where: { id: Number(req.params.id), ...routeWhereForUser(req) },
      include: { waybill: true }
    });

    if (!current) {
      return res.status(404).json({ message: "Маршрут не найден" });
    }

    if (req.user.role === "DRIVER") {
      const allowedStatus = ["PLANNED", "IN_PROGRESS", "COMPLETED"].includes(req.body.status);
      if (!allowedStatus) {
        return res.status(403).json({ message: "Водитель может менять только статус рейса" });
      }
      if (req.body.status === "PLANNED" && current.status !== "IN_PROGRESS") {
        return res.status(409).json({ message: "Вернуть в план можно только рейс в работе" });
      }
    } else if (!["ADMIN", "DISPATCHER"].includes(req.user.role)) {
      return res.status(403).json({ message: "Недостаточно прав" });
    }

    const payload = req.user.role === "DRIVER" ? { status: req.body.status } : normalizePayload(req.body);

    const updated = await prisma.$transaction(async (tx) => {
      const route = await tx.route.update({
        where: { id: current.id },
        data: payload,
        include: routeInclude
      });

      if (payload.status) {
        await updateLinkedStatuses(tx, route, payload.status);
      }

      return tx.route.findUnique({ where: { id: route.id }, include: routeInclude });
    });

    res.json(updated);
  })
);

router.delete(
  "/:id",
  requireRoles("ADMIN", "DISPATCHER"),
  asyncHandler(async (req, res) => {
    const route = await prisma.route.findUnique({ where: { id: Number(req.params.id) } });
    if (!route) {
      return res.status(404).json({ message: "Маршрут не найден" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.route.delete({ where: { id: route.id } });
      await tx.driver.update({ where: { id: route.driverId }, data: { status: "AVAILABLE" } });
      await tx.vehicle.update({ where: { id: route.vehicleId }, data: { status: "AVAILABLE" } });
    });

    res.status(204).send();
  })
);

module.exports = router;
