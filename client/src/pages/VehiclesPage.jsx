import StatusChip from "../components/StatusChip";
import ResourcePage from "../components/ResourcePage";
import { todayInput } from "../utils/format";

const statusOptions = [
  { value: "AVAILABLE", label: "Свободен" },
  { value: "BUSY", label: "Занят" },
  { value: "REPAIR", label: "Ремонт" },
  { value: "INACTIVE", label: "Неактивен" }
];

export default function VehiclesPage() {
  return (
    <ResourcePage
      title="Автомобили"
      endpoint="/vehicles"
      searchPlaceholder="Марка, модель или госномер"
      filters={[
        { queryKey: "availabilityDate", label: "Дата занятости", type: "date", defaultValue: todayInput(), minWidth: 170 },
        { queryKey: "status", label: "Статус записи", options: statusOptions }
      ]}
      initialValues={{
        brand: "",
        model: "",
        plateNumber: "",
        capacityKg: "",
        fuelConsumptionPer100Km: "",
        status: "AVAILABLE"
      }}
      fields={[
        { name: "brand", label: "Марка", required: true },
        { name: "model", label: "Модель", required: true },
        { name: "plateNumber", label: "Госномер", required: true },
        { name: "capacityKg", label: "Грузоподъемность, кг", type: "number", required: true },
        { name: "fuelConsumptionPer100Km", label: "Расход топлива, л/100 км", type: "number", required: true },
        { name: "status", label: "Статус", type: "select", options: statusOptions, required: true }
      ]}
      columns={[
        { field: "brand", label: "Марка" },
        { field: "model", label: "Модель" },
        { field: "plateNumber", label: "Госномер" },
        { field: "capacityKg", label: "Грузоподъемность", render: (row) => `${row.capacityKg} кг` },
        { field: "fuelConsumptionPer100Km", label: "Расход", render: (row) => `${row.fuelConsumptionPer100Km} л/100 км` },
        { field: "availabilityStatus", label: "На дату", render: (row) => <StatusChip value={row.availabilityStatus || row.status} /> },
        { field: "status", label: "Статус записи", render: (row) => <StatusChip value={row.status} /> }
      ]}
    />
  );
}
