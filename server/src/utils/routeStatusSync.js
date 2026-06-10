const { syncResourceRuntimeStatuses } = require("./resourceAvailability");

function waybillDataForRouteStatus(status, options = {}) {
  if (status === "PLANNED") {
    return {
      status: "CREATED",
      departureTime: null,
      returnTime: null,
      startMileage: null,
      endMileage: null,
      actualFuel: null
    };
  }

  if (status === "IN_PROGRESS") {
    const data = {
      status: "ACTIVE",
      returnTime: null
    };

    if (!options.preserveDepartureTime) {
      data.departureTime = new Date();
    }

    if (!options.preserveActualFields) {
      data.endMileage = null;
      data.actualFuel = null;
    }

    return data;
  }

  if (status === "COMPLETED") {
    const data = { status: "COMPLETED" };

    if (!options.preserveReturnTime) {
      data.returnTime = new Date();
    }

    return data;
  }

  if (status === "CANCELLED") {
    return {
      status: "CANCELLED",
      departureTime: null,
      returnTime: null,
      startMileage: null,
      endMileage: null,
      actualFuel: null
    };
  }

  return null;
}

async function syncRouteStatus(tx, route, status, options = {}) {
  const cargoStatus = {
    PLANNED: "PLANNED",
    IN_PROGRESS: "IN_PROGRESS",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED"
  }[status];
  const waybillData = waybillDataForRouteStatus(status, options);

  await syncResourceRuntimeStatuses(tx, route);

  if (cargoStatus) {
    await tx.cargoRequest.update({
      where: { id: route.cargoRequestId },
      data: { status: cargoStatus }
    });
  }

  if (waybillData) {
    await tx.waybill.updateMany({
      where: { routeId: route.id },
      data: waybillData
    });
  }
}

module.exports = { syncRouteStatus, waybillDataForRouteStatus };
