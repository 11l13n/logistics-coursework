const express = require("express");
const prisma = require("../lib/prisma");
const auth = require("../middleware/auth");
const requireRoles = require("../middleware/roles");
const asyncHandler = require("../utils/asyncHandler");
const { normalizeDeliveryPoints, parseDeliveryPointsText } = require("../utils/geo");

const router = express.Router();
router.use(auth, requireRoles("ADMIN", "DISPATCHER"));

const include = {
  client: true,
  deliveryPoints: { orderBy: { orderNumber: "asc" } }
};

const activeRouteStatuses = ["PLANNED", "IN_PROGRESS"];
const editableStatuses = new Set(["NEW", "PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);

const buildDeliveryPoints = (body) => {
  const rawPoints = body.deliveryPoints || parseDeliveryPointsText(body.deliveryPointsText);
  const fallbackAddress = body.deliveryAddress || rawPoints[0]?.address;
  return normalizeDeliveryPoints(rawPoints, fallbackAddress);
};

const buildRequestFields = (body) => {
  const data = {};

  if (body.clientId !== "" && body.clientId !== undefined) {
    data.client = { connect: { id: Number(body.clientId) } };
  }
  if (body.cargoName !== "" && body.cargoName !== undefined) data.cargoName = String(body.cargoName).trim();
  if (body.weightKg !== "" && body.weightKg !== undefined) data.weightKg = Number(body.weightKg);
  if (body.volume !== "" && body.volume !== undefined) data.volume = Number(body.volume);
  if (body.pickupAddress !== "" && body.pickupAddress !== undefined) data.pickupAddress = String(body.pickupAddress).trim();
  if (body.desiredDeliveryDate !== "" && body.desiredDeliveryDate !== undefined) {
    data.desiredDeliveryDate = new Date(body.desiredDeliveryDate);
  }
  if (body.status !== "" && body.status !== undefined) {
    if (!editableStatuses.has(body.status)) {
      const error = new Error("Недопустимый статус заявки");
      error.status = 400;
      throw error;
    }
    data.status = body.status;
  }

  return data;
};

const addAnd = (where, condition) => {
  where.AND = [...(where.AND || []), condition];
};

const isArchivedFilter = { OR: [{ archivedAt: { not: null } }, { status: "ARCHIVED" }] };

const applyArchiveFilter = (where, archiveMode, hasStatusFilter) => {
  if (archiveMode === "archived") {
    addAnd(where, isArchivedFilter);
    return;
  }

  if (archiveMode !== "all") {
    where.archivedAt = null;
    if (!hasStatusFilter) {
      where.status = { not: "ARCHIVED" };
    }
  }
};

const buildCargoRequestData = (body) => {
  const deliveryPoints = buildDeliveryPoints(body);
  if (!deliveryPoints.length) {
    const error = new Error("Добавьте хотя бы одну точку разгрузки");
    error.status = 400;
    throw error;
  }

  const data = buildRequestFields(body);
  data.deliveryAddress = deliveryPoints[0].address;

  return { data, deliveryPoints };
};

const releaseResourcesIfFree = async (tx, routes) => {
  const driverIds = [...new Set(routes.map((route) => route.driverId).filter(Boolean))];
  const vehicleIds = [...new Set(routes.map((route) => route.vehicleId).filter(Boolean))];

  await Promise.all(
    driverIds.map(async (driverId) => {
      const activeCount = await tx.route.count({
        where: { driverId, status: { in: activeRouteStatuses } }
      });
      if (!activeCount) {
        await tx.driver.updateMany({ where: { id: driverId, status: "BUSY" }, data: { status: "AVAILABLE" } });
      }
    })
  );

  await Promise.all(
    vehicleIds.map(async (vehicleId) => {
      const activeCount = await tx.route.count({
        where: { vehicleId, status: { in: activeRouteStatuses } }
      });
      if (!activeCount) {
        await tx.vehicle.updateMany({ where: { id: vehicleId, status: "BUSY" }, data: { status: "AVAILABLE" } });
      }
    })
  );
};

const resetRequestRoutes = async (tx, cargoRequestId) => {
  const routes = await tx.route.findMany({
    where: { cargoRequestId, status: { in: activeRouteStatuses } },
    select: { id: true, driverId: true, vehicleId: true }
  });

  if (!routes.length) return;

  const routeIds = routes.map((route) => route.id);
  await tx.route.updateMany({
    where: { id: { in: routeIds } },
    data: { status: "CANCELLED" }
  });
  await tx.waybill.updateMany({
    where: { routeId: { in: routeIds } },
    data: { status: "CANCELLED" }
  });
  await releaseResourcesIfFree(tx, routes);
};

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { archive, search, status } = req.query;
    const where = {};

    applyArchiveFilter(where, archive, Boolean(status));

    if (status) {
      where.status = status;
    }

    if (search) {
      addAnd(where, {
        OR: ["cargoName", "pickupAddress", "deliveryAddress"].map((field) => ({
          [field]: { contains: search, mode: "insensitive" }
        }))
      });
    }

    const data = await prisma.cargoRequest.findMany({
      where,
      include,
      orderBy: { createdAt: "desc" }
    });
    res.json(data);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { data, deliveryPoints } = buildCargoRequestData(req.body);
    const created = await prisma.cargoRequest.create({
      data: {
        ...data,
        deliveryPoints: { create: deliveryPoints }
      },
      include
    });
    res.status(201).json(created);
  })
);

router.post(
  "/:id/archive",
  asyncHandler(async (req, res) => {
    const current = await prisma.cargoRequest.findUnique({
      where: { id: Number(req.params.id) },
      include
    });

    if (!current) {
      return res.status(404).json({ message: "Заявка не найдена" });
    }

    if (current.status !== "COMPLETED") {
      return res.status(409).json({ message: "В архив можно отправить только выполненные перевозки" });
    }

    const updated = await prisma.cargoRequest.update({
      where: { id: current.id },
      data: { archivedAt: new Date() },
      include
    });
    res.json(updated);
  })
);

router.post(
  "/:id/unarchive",
  asyncHandler(async (req, res) => {
    const current = await prisma.cargoRequest.findUnique({
      where: { id: Number(req.params.id) },
      include
    });

    if (!current) {
      return res.status(404).json({ message: "Заявка не найдена" });
    }

    const updated = await prisma.cargoRequest.update({
      where: { id: current.id },
      data: {
        archivedAt: null,
        status: current.status === "ARCHIVED" ? "COMPLETED" : current.status
      },
      include
    });
    res.json(updated);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { data, deliveryPoints } = buildCargoRequestData(req.body);
    const id = Number(req.params.id);
    const current = await prisma.cargoRequest.findUnique({ where: { id } });

    if (!current) {
      return res.status(404).json({ message: "Заявка не найдена" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (data.status === "NEW") {
        await resetRequestRoutes(tx, id);
      }

      return tx.cargoRequest.update({
        where: { id },
        data: {
          ...data,
          deliveryPoints: {
            deleteMany: {},
            create: deliveryPoints
          }
        },
        include
      });
    });
    res.json(updated);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.cargoRequest.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  })
);

module.exports = router;
