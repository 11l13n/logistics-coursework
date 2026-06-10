const { getDayRange } = require("./dates");

const plannedBusyStatuses = ["PLANNED", "IN_PROGRESS"];

async function getBusyResourceIdsForDate(prisma, date) {
  const { start, end } = getDayRange(date);
  const routes = await prisma.route.findMany({
    where: {
      plannedDate: { gte: start, lte: end },
      status: { in: plannedBusyStatuses }
    },
    select: { driverId: true, vehicleId: true }
  });

  return {
    driverIds: new Set(routes.map((route) => route.driverId).filter(Boolean)),
    vehicleIds: new Set(routes.map((route) => route.vehicleId).filter(Boolean))
  };
}

function availabilityStatusFor(resource, busyIds) {
  if (!resource) return "AVAILABLE";
  if (["INACTIVE", "REPAIR"].includes(resource.status)) return resource.status;
  return busyIds.has(resource.id) ? "BUSY" : "AVAILABLE";
}

async function addAvailabilityForDate(prisma, model, rows, date) {
  if (!date || !["driver", "vehicle"].includes(model)) return rows;

  const busyIds = await getBusyResourceIdsForDate(prisma, date);
  const resourceBusyIds = model === "driver" ? busyIds.driverIds : busyIds.vehicleIds;

  return rows.map((row) => ({
    ...row,
    availabilityDate: date,
    availabilityStatus: availabilityStatusFor(row, resourceBusyIds)
  }));
}

async function syncResourceRuntimeStatuses(tx, route) {
  const [driverInProgressRoutes, vehicleInProgressRoutes] = await Promise.all([
    tx.route.count({ where: { driverId: route.driverId, status: "IN_PROGRESS" } }),
    tx.route.count({ where: { vehicleId: route.vehicleId, status: "IN_PROGRESS" } })
  ]);

  await Promise.all([
    tx.driver.updateMany({
      where: { id: route.driverId, status: { not: "INACTIVE" } },
      data: { status: driverInProgressRoutes > 0 ? "BUSY" : "AVAILABLE" }
    }),
    tx.vehicle.updateMany({
      where: { id: route.vehicleId, status: { notIn: ["REPAIR", "INACTIVE"] } },
      data: { status: vehicleInProgressRoutes > 0 ? "BUSY" : "AVAILABLE" }
    })
  ]);
}

module.exports = {
  addAvailabilityForDate,
  availabilityStatusFor,
  getBusyResourceIdsForDate,
  plannedBusyStatuses,
  syncResourceRuntimeStatuses
};
