const express = require("express");
const prisma = require("../lib/prisma");
const auth = require("../middleware/auth");
const requireRoles = require("../middleware/roles");
const asyncHandler = require("../utils/asyncHandler");
const { getDayRange } = require("../utils/dates");
const { buildOptimizedRoute } = require("../utils/routeOptimizer");

const router = express.Router();
router.use(auth, requireRoles("ADMIN", "DISPATCHER"));

router.post(
  "/route",
  asyncHandler(async (req, res) => {
    const { cargoRequestId, plannedDate } = req.body;

    if (!cargoRequestId) {
      return res.status(400).json({ message: "Укажите заявку" });
    }

    const cargoRequest = await prisma.cargoRequest.findUnique({
      where: { id: Number(cargoRequestId) },
      include: {
        client: true,
        deliveryPoints: { orderBy: { orderNumber: "asc" } }
      }
    });

    if (!cargoRequest) {
      return res.status(404).json({ message: "Заявка не найдена" });
    }

    if (cargoRequest.status !== "NEW") {
      return res.status(409).json({
        message: "Рекомендацию можно получить только для новой заявки. Завершенные, отмененные и уже запланированные заявки недоступны."
      });
    }

    const routePlan = buildOptimizedRoute(cargoRequest);
    const routeDate = plannedDate || cargoRequest.desiredDeliveryDate;
    const { start, end } = getDayRange(routeDate);
    const busyRoutes = await prisma.route.findMany({
      where: {
        plannedDate: { gte: start, lte: end },
        status: { in: ["PLANNED", "IN_PROGRESS"] }
      },
      select: { driverId: true, vehicleId: true }
    });

    const busyDriverIds = new Set(busyRoutes.map((route) => route.driverId));
    const busyVehicleIds = new Set(busyRoutes.map((route) => route.vehicleId));

    const vehicles = await prisma.vehicle.findMany({
      where: {
        status: "AVAILABLE",
        capacityKg: { gte: cargoRequest.weightKg }
      },
      orderBy: [{ capacityKg: "asc" }, { fuelConsumptionPer100Km: "asc" }]
    });

    const drivers = await prisma.driver.findMany({
      where: { status: "AVAILABLE" },
      orderBy: { fullName: "asc" }
    });

    const vehicle = vehicles.find((item) => !busyVehicleIds.has(item.id));
    const driver = drivers.find((item) => !busyDriverIds.has(item.id));

    if (!vehicle || !driver) {
      return res.status(409).json({
        message: "Не удалось подобрать свободного водителя и автомобиль",
        details: {
          suitableVehicles: vehicles.length,
          availableDrivers: drivers.length
        }
      });
    }

    const plannedFuel = Number(((routePlan.distanceKm * vehicle.fuelConsumptionPer100Km) / 100).toFixed(2));
    const unloadOrder = routePlan.waypoints
      .slice(1)
      .map((point, index) => `${index + 1}) ${point.address}`)
      .join("; ");
    const explanation = `Рекомендуется назначить автомобиль ${vehicle.brand} ${vehicle.model} ${vehicle.plateNumber} и водителя ${driver.fullName}. Автомобиль свободен и подходит по грузоподъемности для груза массой ${cargoRequest.weightKg} кг, водитель доступен на дату выполнения заявки ${new Date(routeDate).toLocaleString("ru-RU")}. Оптимальный порядок разгрузки: ${unloadOrder}. Расчетная дистанция ${routePlan.distanceKm} км, плановый расход топлива ${plannedFuel} л.`;

    res.json({
      cargoRequest,
      driver,
      vehicle,
      plannedFuel,
      distanceKm: routePlan.distanceKm,
      estimatedDuration: routePlan.estimatedDuration,
      optimizedWaypoints: routePlan.waypoints,
      explanation
    });
  })
);

module.exports = router;
