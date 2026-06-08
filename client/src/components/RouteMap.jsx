import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

function FitBounds({ positions }) {
  const map = useMap();
  if (positions.length > 1) {
    map.fitBounds(positions, { padding: [32, 32] });
  }
  return null;
}

export default function RouteMap({ points = [], height = 340 }) {
  const safePoints = points
    .map((point) => ({
      ...point,
      latitude: Number(point.latitude),
      longitude: Number(point.longitude)
    }))
    .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));

  const positions = safePoints.map((point) => [point.latitude, point.longitude]);
  const center = positions[0] || [55.751244, 37.618423];

  return (
    <MapContainer center={center} zoom={positions.length > 1 ? 8 : 10} style={{ height }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {positions.length > 1 && <Polyline positions={positions} color="#9f9586" weight={4} />}
      {safePoints.map((point, index) => (
        <Marker key={`${point.address}-${index}`} position={[point.latitude, point.longitude]}>
          <Popup>{point.address || `Точка ${index + 1}`}</Popup>
        </Marker>
      ))}
      <FitBounds positions={positions} />
    </MapContainer>
  );
}
