const { inferCoordinates } = require("./geo");

const toRad = (value) => (Number(value) * Math.PI) / 180;

function distanceBetween(a, b) {
  const radius = 6371;
  const dLat = toRad(Number(b.latitude) - Number(a.latitude));
  const dLon = toRad(Number(b.longitude) - Number(a.longitude));
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  return radius * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function optimizeDeliveryOrder(startPoint, deliveryPoints) {
  const remaining = deliveryPoints.map((point, index) => ({
    ...point,
    latitude: Number(point.latitude),
    longitude: Number(point.longitude),
    originalOrder: index + 1
  }));
  const ordered = [];
  let current = startPoint;

  while (remaining.length) {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    remaining.forEach((point, index) => {
      const distance = distanceBetween(current, point);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    const [next] = remaining.splice(bestIndex, 1);
    ordered.push(next);
    current = next;
  }

  return ordered.map((point, index) => ({ ...point, orderNumber: index + 2 }));
}

function calculateRouteDistance(points) {
  return Number(
    points
      .slice(1)
      .reduce((sum, point, index) => sum + distanceBetween(points[index], point), 0)
      .toFixed(1)
  );
}

function estimateDuration(distanceKm) {
  const minutes = Math.max(20, Math.round((Number(distanceKm) / 55) * 60));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (!hours) return `${minutes} мин`;
  if (!rest) return `${hours} ч`;
  return `${hours} ч ${rest} мин`;
}

function buildOptimizedRoute(cargoRequest) {
  const startCoordinates = inferCoordinates(cargoRequest.pickupAddress);
  const startPoint = {
    address: cargoRequest.pickupAddress,
    latitude: startCoordinates.latitude,
    longitude: startCoordinates.longitude,
    orderNumber: 1
  };
  const rawDeliveryPoints = cargoRequest.deliveryPoints?.length
    ? cargoRequest.deliveryPoints
    : [
        {
          address: cargoRequest.deliveryAddress,
          ...inferCoordinates(cargoRequest.deliveryAddress),
          orderNumber: 1
        }
      ];
  const optimizedDeliveryPoints = optimizeDeliveryOrder(startPoint, rawDeliveryPoints);
  const waypoints = [startPoint, ...optimizedDeliveryPoints];
  const distanceKm = calculateRouteDistance(waypoints);

  return {
    waypoints,
    distanceKm,
    estimatedDuration: estimateDuration(distanceKm)
  };
}

module.exports = { buildOptimizedRoute, calculateRouteDistance, distanceBetween, estimateDuration, optimizeDeliveryOrder };
