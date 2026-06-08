import { useEffect, useState } from "react";
import { Alert } from "@mui/material";
import ArchiveIcon from "@mui/icons-material/Archive";
import UnarchiveIcon from "@mui/icons-material/Unarchive";
import StatusChip from "../components/StatusChip";
import ResourcePage from "../components/ResourcePage";
import http, { getErrorMessage } from "../api/http";

const statusOptions = [
  { value: "NEW", label: "Новая" },
  { value: "PLANNED", label: "Запланирована" },
  { value: "IN_PROGRESS", label: "В работе" },
  { value: "COMPLETED", label: "Выполнена" },
  { value: "CANCELLED", label: "Отменена" }
];

const archiveOptions = [
  { value: "archived", label: "Архив" },
  { value: "all", label: "Все" }
];

const deliveryPointsToText = (row) => {
  const points = row.deliveryPoints?.length ? row.deliveryPoints : [{ address: row.deliveryAddress }];
  return points
    .map((point) => [point.address, point.latitude, point.longitude].filter((value) => value !== undefined && value !== null).join(" | "))
    .join("\n");
};

const parseDeliveryPoints = (text) =>
  String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [address, latitude, longitude] = line.split("|").map((part) => part.trim());
      return { address, latitude, longitude, orderNumber: index + 1 };
    });

const isArchived = (row) => Boolean(row.archivedAt) || row.status === "ARCHIVED";

export default function CargoRequestsPage() {
  const [clients, setClients] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    http
      .get("/clients")
      .then(({ data }) => setClients(data))
      .catch((requestError) => setError(getErrorMessage(requestError)));
  }, []);

  const clientOptions = clients.map((client) => ({
    value: client.id,
    label: client.name
  }));

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <ResourcePage
      title="Заявки на перевозку"
      endpoint="/cargo-requests"
      searchPlaceholder="Груз или адрес"
      filters={[
        { queryKey: "archive", label: "Раздел", emptyLabel: "Текущие", options: archiveOptions, minWidth: 150 },
        { queryKey: "status", label: "Статус", emptyLabel: "Все статусы", options: statusOptions }
      ]}
      initialValues={{
        clientId: "",
        cargoName: "",
        weightKg: "",
        volume: "",
        pickupAddress: "",
        deliveryPointsText: "",
        desiredDeliveryDate: "",
        status: "NEW"
      }}
      transformBeforeSubmit={(form) => {
        const deliveryPoints = parseDeliveryPoints(form.deliveryPointsText);
        return {
          clientId: form.clientId,
          cargoName: form.cargoName,
          weightKg: form.weightKg,
          volume: form.volume,
          pickupAddress: form.pickupAddress,
          deliveryPoints,
          deliveryAddress: deliveryPoints[0]?.address || "",
          desiredDeliveryDate: form.desiredDeliveryDate,
          status: form.status
        };
      }}
      rowActions={[
        {
          label: "В архив",
          icon: <ArchiveIcon />,
          isVisible: (row) => row.status === "COMPLETED" && !isArchived(row),
          onClick: async (row) => {
            if (!window.confirm(`Отправить перевозку #${row.id} в архив?`)) return false;
            await http.post(`/cargo-requests/${row.id}/archive`);
            return true;
          }
        },
        {
          label: "Вернуть из архива",
          icon: <UnarchiveIcon />,
          isVisible: isArchived,
          onClick: async (row) => {
            await http.post(`/cargo-requests/${row.id}/unarchive`);
            return true;
          }
        }
      ]}
      fields={[
        { name: "clientId", label: "Клиент", type: "select", options: clientOptions, required: true },
        { name: "cargoName", label: "Груз", required: true },
        { name: "weightKg", label: "Вес, кг", type: "number", required: true },
        { name: "volume", label: "Объем, м3", type: "number", required: true },
        { name: "pickupAddress", label: "Адрес погрузки", fullWidth: true, required: true },
        {
          name: "deliveryPointsText",
          label: "Точки разгрузки",
          fullWidth: true,
          multiline: true,
          required: true,
          getValue: deliveryPointsToText,
          placeholder: "Москва, Ленинградский проспект, 80 | 55.805 | 37.515\nМытищи, ул. Мира, 15 | 55.9105 | 37.7363",
          helperText: "Каждая точка с новой строки. Координаты можно не указывать, система подберет примерные."
        },
        { name: "desiredDeliveryDate", label: "Дата и время выполнения", type: "datetime-local", required: true },
        { name: "status", label: "Статус", type: "select", options: statusOptions, required: true }
      ]}
      columns={[
        { field: "client", label: "Клиент", render: (row) => row.client?.name || "—" },
        { field: "cargoName", label: "Груз" },
        { field: "weightKg", label: "Вес", render: (row) => `${row.weightKg} кг` },
        { field: "pickupAddress", label: "Откуда" },
        {
          field: "deliveryPoints",
          label: "Точки разгрузки",
          render: (row) => (row.deliveryPoints?.length ? row.deliveryPoints.map((point) => point.address).join("; ") : row.deliveryAddress)
        },
        { field: "desiredDeliveryDate", label: "Срок выполнения", render: (row) => new Date(row.desiredDeliveryDate).toLocaleString("ru-RU") },
        { field: "status", label: "Статус", render: (row) => <StatusChip value={row.status} /> }
      ]}
    />
  );
}
