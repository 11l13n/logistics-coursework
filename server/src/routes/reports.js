const express = require("express");
const prisma = require("../lib/prisma");
const auth = require("../middleware/auth");
const requireRoles = require("../middleware/roles");
const asyncHandler = require("../utils/asyncHandler");
const { getPeriodRange } = require("../utils/dates");

const router = express.Router();
router.use(auth, requireRoles("ADMIN", "DISPATCHER"));

router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const { start, end } = getPeriodRange(req.query.from, req.query.to);
    const routes = await prisma.route.findMany({
      where: { plannedDate: { gte: start, lte: end } },
      include: { waybill: true }
    });

    const completedRoutes = routes.filter((route) => route.status === "COMPLETED");

    const totalMileage = completedRoutes.reduce((sum, route) => {
      const actual = route.waybill?.endMileage && route.waybill?.startMileage
        ? route.waybill.endMileage - route.waybill.startMileage
        : route.distanceKm;
      return sum + Number(actual || 0);
    }, 0);

    const totalFuel = completedRoutes.reduce((sum, route) => {
      const fuel = route.waybill?.actualFuel ?? route.waybill?.plannedFuel ?? 0;
      return sum + Number(fuel);
    }, 0);

    res.json({
      period: { from: start, to: end },
      routesCount: routes.length,
      activeRoutes: routes.filter((route) => route.status === "IN_PROGRESS").length,
      completedRoutes: completedRoutes.length,
      cancelledRoutes: routes.filter((route) => route.status === "CANCELLED").length,
      totalMileage: Number(totalMileage.toFixed(1)),
      totalFuel: Number(totalFuel.toFixed(1))
    });
  })
);

router.get(
  "/drivers",
  asyncHandler(async (req, res) => {
    const { start, end } = getPeriodRange(req.query.from, req.query.to);
    const drivers = await prisma.driver.findMany({
      include: {
        routes: {
          where: {
            plannedDate: { gte: start, lte: end },
            status: "COMPLETED"
          },
          include: { waybill: true }
        }
      }
    });

    const result = drivers
      .map((driver) => ({
        id: driver.id,
        fullName: driver.fullName,
        completedRoutes: driver.routes.length,
        mileage: driver.routes.reduce((sum, route) => {
          const actual = route.waybill?.endMileage && route.waybill?.startMileage
            ? route.waybill.endMileage - route.waybill.startMileage
            : route.distanceKm;
          return sum + Number(actual || 0);
        }, 0)
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "ru"));

    res.json(result);
  })
);

router.get(
  "/vehicles",
  asyncHandler(async (req, res) => {
    const { start, end } = getPeriodRange(req.query.from, req.query.to);
    const vehicles = await prisma.vehicle.findMany({
      include: {
        routes: {
          where: {
            plannedDate: { gte: start, lte: end },
            status: "COMPLETED"
          },
          include: { waybill: true }
        }
      }
    });

    const result = vehicles
      .map((vehicle) => ({
        id: vehicle.id,
        name: `${vehicle.brand} ${vehicle.model}`,
        plateNumber: vehicle.plateNumber,
        mileage: vehicle.routes.reduce((sum, route) => {
          const actual = route.waybill?.endMileage && route.waybill?.startMileage
            ? route.waybill.endMileage - route.waybill.startMileage
            : route.distanceKm;
          return sum + Number(actual || 0);
        }, 0),
        completedRoutes: vehicle.routes.length
      }))
      .sort((a, b) => b.mileage - a.mileage);

    res.json(result);
  })
);

module.exports = router;
