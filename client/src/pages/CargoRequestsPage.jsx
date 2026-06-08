import { useEffect, useState } from "react";
import { Alert, Box, Button, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import AddLocationAltIcon from "@mui/icons-material/AddLocationAlt";
import ArchiveIcon from "@mui/icons-material/Archive";
import DeleteIcon from "@mui/icons-material/Delete";
import UnarchiveIcon from "@mui/icons-material/Unarchive";
import AddressSearchField from "../components/AddressSearchField";
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

const emptyDeliveryPoint = (orderNumber = 1) => ({
  address: "",
  latitude: "",
  longitude: "",
  orderNumber
});

const deliveryPointsFromRow = (row) => {
  const points = row.deliveryPoints?.length ? row.deliveryPoints : [{ address: row.deliveryAddress }];
  return points.map((point, index) => ({
    address: point.address || "",
    latitude: point.latitude ?? "",
    longitude: point.longitude ?? "",
    orderNumber: point.orderNumber || index + 1
  }));
};

const isArchived = (row) => Boolean(row.archivedAt) || row.status === "ARCHIVED";

function DeliveryPointsField({ points = [], onChange }) {
  const safePoints = points.length ? points : [emptyDeliveryPoint()];

  const updatePoint = (index, patch) => {
    onChange(safePoints.map((point, itemIndex) => (itemIndex === index ? { ...point, ...patch } : point)));
  };

  const addPoint = () => {
    onChange([...safePoints, emptyDeliveryPoint(safePoints.length + 1)]);
  };

  const removePoint = (index) => {
    const next = safePoints.filter((_, itemIndex) => itemIndex !== index);
    onChange(next.length ? next : [emptyDeliveryPoint()]);
  };

  return (
    <Stack spacing={1.25}>
      <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between" spacing={1}>
        <Typography variant="subtitle2" fontWeight={900}>
          Точки разгрузки
        </Typography>
        <Button variant="outlined" size="small" startIcon={<AddLocationAltIcon />} onClick={addPoint} sx={{ borderRadius: 2.5 }}>
          Добавить точку
        </Button>
      </Stack>
      {safePoints.map((point, index) => (
        <Box key={index} sx={{ pt: index ? 0.5 : 0 }}>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <Box sx={{ flex: 1 }}>
              <AddressSearchField
                label={`Разгрузка ${index + 1}`}
                value={point.address}
                required
                onChange={(address) => updatePoint(index, { address, latitude: "", longitude: "" })}
                onSelect={(place) =>
                  updatePoint(index, {
                    address: place.address,
                    latitude: place.latitude,
                    longitude: place.longitude
                  })
                }
              />
            </Box>
            <Tooltip title="Удалить точку">
              <span>
                <IconButton disabled={safePoints.length === 1} color="error" onClick={() => removePoint(index)}>
                  <DeleteIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

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
        deliveryPoints: [emptyDeliveryPoint()],
        desiredDeliveryDate: "",
        status: "NEW"
      }}
      transformBeforeSubmit={(form) => {
        const deliveryPoints = (form.deliveryPoints || [])
          .map((point, index) => ({
            address: String(point.address || "").trim(),
            latitude: point.latitude,
            longitude: point.longitude,
            orderNumber: index + 1
          }))
          .filter((point) => point.address);

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
        {
          name: "pickupAddress",
          label: "Адрес погрузки",
          fullWidth: true,
          required: true,
          render: ({ form, setForm }) => (
            <AddressSearchField
              label="Адрес погрузки"
              value={form.pickupAddress}
              required
              onChange={(address) => setForm((prev) => ({ ...prev, pickupAddress: address }))}
              onSelect={(place) => setForm((prev) => ({ ...prev, pickupAddress: place.address }))}
            />
          )
        },
        {
          name: "deliveryPoints",
          label: "Точки разгрузки",
          fullWidth: true,
          getValue: deliveryPointsFromRow,
          render: ({ form, setForm }) => (
            <DeliveryPointsField
              points={form.deliveryPoints}
              onChange={(deliveryPoints) => setForm((prev) => ({ ...prev, deliveryPoints }))}
            />
          )
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
