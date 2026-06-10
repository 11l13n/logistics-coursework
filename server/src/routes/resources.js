const express = require("express");
const prisma = require("../lib/prisma");
const auth = require("../middleware/auth");
const requireRoles = require("../middleware/roles");
const asyncHandler = require("../utils/asyncHandler");
const { addAvailabilityForDate } = require("../utils/resourceAvailability");

const readOnlyFields = new Set(["id", "createdAt", "updatedAt"]);

function createCrudRouter({ model, searchFields = [], include, orderBy = { id: "desc" } }) {
  const router = express.Router();
  router.use(auth, requireRoles("ADMIN", "DISPATCHER"));

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const { availabilityDate, search, status } = req.query;
      const where = {};

      if (status) {
        where.status = status;
      }

      if (search && searchFields.length > 0) {
        where.OR = searchFields.map((field) => ({
          [field]: { contains: search, mode: "insensitive" }
        }));
      }

      const data = await prisma[model].findMany({ where, include, orderBy });
      const rows = await addAvailabilityForDate(prisma, model, data, availabilityDate);
      res.json(rows);
    })
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const data = normalizePayload(req.body);
      const created = await prisma[model].create({ data, include });
      res.status(201).json(created);
    })
  );

  router.put(
    "/:id",
    asyncHandler(async (req, res) => {
      const data = normalizePayload(req.body);
      const updated = await prisma[model].update({
        where: { id: Number(req.params.id) },
        data,
        include
      });
      res.json(updated);
    })
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      await prisma[model].delete({ where: { id: Number(req.params.id) } });
      res.status(204).send();
    })
  );

  return router;
}

function normalizePayload(payload) {
  const data = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (value === "" || value === undefined) return;
    if (readOnlyFields.has(key)) return;
    if (value && typeof value === "object" && !Array.isArray(value)) return;
    if (Array.isArray(value)) return;

    if (
      [
        "capacityKg",
        "weightKg",
        "clientId",
        "driverId",
        "vehicleId",
        "cargoRequestId",
        "startMileage",
        "endMileage"
      ].includes(key)
    ) {
      data[key] = Number(value);
      return;
    }

    if (["volume", "distanceKm", "fuelConsumptionPer100Km", "plannedFuel", "actualFuel"].includes(key)) {
      data[key] = Number(value);
      return;
    }

    if (["desiredDeliveryDate", "plannedDate", "issueDate", "departureTime", "returnTime"].includes(key)) {
      data[key] = new Date(value);
      return;
    }

    data[key] = value;
  });

  return data;
}

module.exports = { createCrudRouter, normalizePayload };
