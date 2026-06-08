const knownCoordinates = [
  { pattern: /калуга/i, latitude: 54.5138, longitude: 36.2612 },
  { pattern: /твер/i, latitude: 56.8587, longitude: 35.9176 },
  { pattern: /химки|вашутин/i, latitude: 55.897, longitude: 37.4297 },
  { pattern: /ленинград/i, latitude: 55.805, longitude: 37.515 },
  { pattern: /преснен/i, latitude: 55.7473, longitude: 37.5398 },
  { pattern: /рябинов/i, latitude: 55.7029, longitude: 37.4281 },
  { pattern: /новорязан/i, latitude: 55.6525, longitude: 37.8895 },
  { pattern: /складоч/i, latitude: 55.7998, longitude: 37.5898 },
  { pattern: /мытищ/i, latitude: 55.9105, longitude: 37.7363 },
  { pattern: /балаших/i, latitude: 55.7963, longitude: 37.9382 },
  { pattern: /одинцов/i, latitude: 55.6789, longitude: 37.2636 },
  { pattern: /москва/i, latitude: 55.751244, longitude: 37.618423 }
];

function inferCoordinates(address = "", fallbackIndex = 0) {
  const match = knownCoordinates.find((item) => item.pattern.test(address));
  if (match) {
    return { latitude: match.latitude, longitude: match.longitude };
  }

  return {
    latitude: 55.751244 + fallbackIndex * 0.08,
    longitude: 37.618423 + fallbackIndex * 0.08
  };
}

function normalizeDeliveryPoints(rawPoints, fallbackAddress) {
  const source = Array.isArray(rawPoints) && rawPoints.length ? rawPoints : [{ address: fallbackAddress }];

  return source
    .map((point, index) => {
      const address = String(point.address || "").trim();
      if (!address) return null;

      const inferred = inferCoordinates(address, index);
      return {
        address,
        latitude: Number(point.latitude || inferred.latitude),
        longitude: Number(point.longitude || inferred.longitude),
        orderNumber: Number(point.orderNumber || index + 1)
      };
    })
    .filter(Boolean);
}

function parseDeliveryPointsText(text) {
  if (!text) return [];

  return String(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [address, latitude, longitude] = line.split("|").map((part) => part.trim());
      return { address, latitude, longitude, orderNumber: index + 1 };
    });
}

module.exports = { inferCoordinates, normalizeDeliveryPoints, parseDeliveryPointsText };
