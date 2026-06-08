const express = require("express");
const prisma = require("../lib/prisma");
const auth = require("../middleware/auth");
const requireRoles = require("../middleware/roles");
const asyncHandler = require("../utils/asyncHandler");
const { normalizePayload } = require("./resources");

const router = express.Router();
router.use(auth);

const include = {
  route: {
    include: {
      cargoRequest: { include: { client: true, deliveryPoints: { orderBy: { orderNumber: "asc" } } } },
      driver: true,
      vehicle: true,
      waypoints: { orderBy: { orderNumber: "asc" } }
    }
  }
};

const whereForUser = (req) => {
  if (req.user.role === "DRIVER") {
    if (!req.user.driver) return { id: -1 };
    return { route: { driverId: req.user.driver.id } };
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

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const where = whereForUser(req);
    applyArchiveFilter(where, req.query.archive);

    if (req.query.status) where.status = req.query.status;

    const waybills = await prisma.waybill.findMany({
      where,
      include,
      orderBy: { issueDate: "desc" }
    });
    res.json(waybills);
  })
);

router.post(
  "/",
  requireRoles("ADMIN", "DISPATCHER"),
  asyncHandler(async (req, res) => {
    const payload = normalizePayload(req.body);
    const created = await prisma.waybill.create({ data: payload, include });
    res.status(201).json(created);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const waybill = await prisma.waybill.findFirst({
      where: { id: Number(req.params.id), ...whereForUser(req) },
      include
    });

    if (!waybill) {
      return res.status(404).json({ message: "Путевой лист не найден" });
    }

    res.json(waybill);
  })
);

router.post(
  "/:id/archive",
  asyncHandler(async (req, res) => {
    const waybill = await prisma.waybill.findFirst({
      where: { id: Number(req.params.id), ...whereForUser(req) },
      include
    });

    if (!waybill) {
      return res.status(404).json({ message: "Путевой лист не найден" });
    }

    if (waybill.status !== "COMPLETED") {
      return res.status(409).json({ message: "В архив можно отправить только выполненные путевые листы" });
    }

    const updated = await prisma.waybill.update({
      where: { id: waybill.id },
      data: { archivedAt: new Date() },
      include
    });

    res.json(updated);
  })
);

router.post(
  "/:id/unarchive",
  asyncHandler(async (req, res) => {
    const waybill = await prisma.waybill.findFirst({
      where: { id: Number(req.params.id), ...whereForUser(req) },
      include
    });

    if (!waybill) {
      return res.status(404).json({ message: "Путевой лист не найден" });
    }

    const updated = await prisma.waybill.update({
      where: { id: waybill.id },
      data: { archivedAt: null },
      include
    });

    res.json(updated);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.waybill.findFirst({
      where: { id: Number(req.params.id), ...whereForUser(req) },
      include
    });

    if (!existing) {
      return res.status(404).json({ message: "Путевой лист не найден" });
    }

    const data = normalizePayload(req.body);
    const driverAllowed = ["departureTime", "returnTime", "startMileage", "endMileage", "actualFuel", "status"];

    if (req.user.role === "DRIVER") {
      Object.keys(data).forEach((key) => {
        if (!driverAllowed.includes(key)) delete data[key];
      });
    } else if (!["ADMIN", "DISPATCHER"].includes(req.user.role)) {
      return res.status(403).json({ message: "Недостаточно прав" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const waybill = await tx.waybill.update({
        where: { id: existing.id },
        data,
        include
      });

      if (data.status === "ACTIVE") {
        await tx.route.update({ where: { id: existing.routeId }, data: { status: "IN_PROGRESS" } });
      }

      if (data.status === "COMPLETED") {
        await tx.route.update({ where: { id: existing.routeId }, data: { status: "COMPLETED" } });
        await tx.driver.update({ where: { id: existing.route.driverId }, data: { status: "AVAILABLE" } });
        await tx.vehicle.update({ where: { id: existing.route.vehicleId }, data: { status: "AVAILABLE" } });
        await tx.cargoRequest.update({
          where: { id: existing.route.cargoRequestId },
          data: { status: "COMPLETED" }
        });
      }

      return waybill;
    });

    res.json(updated);
  })
);

router.delete(
  "/:id",
  requireRoles("ADMIN", "DISPATCHER"),
  asyncHandler(async (req, res) => {
    await prisma.waybill.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  })
);

module.exports = router;
