const { getDayRange } = require("./dates");

const plannedBusyStatuses = ["PLANNED", "IN_PROGRESS"];
const maxScheduleDays = 14;

function dateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

function addDays(value, days) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

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

async function addAvailabilityForDate(prisma, model, rows, date, days = 1) {
  if (!date || !["driver", "vehicle"].includes(model)) return rows;

  const scheduleDays = Math.min(Math.max(Number(days) || 1, 1), maxScheduleDays);
  const schedule = await Promise.all(
    Array.from({ length: scheduleDays }, async (_, index) => {
      const currentDate = addDays(date, index);
      const busyIds = await getBusyResourceIdsForDate(prisma, currentDate);
      return {
        date: dateKey(currentDate),
        busyIds: model === "driver" ? busyIds.driverIds : busyIds.vehicleIds
      };
    })
  );
  const firstDay = schedule[0];

  return rows.map((row) => ({
    ...row,
    availabilityDate: firstDay.date,
    availabilityStatus: availabilityStatusFor(row, firstDay.busyIds),
    availabilitySchedule: schedule.map((day) => ({
      date: day.date,
      status: availabilityStatusFor(row, day.busyIds)
    }))
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
