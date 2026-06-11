import AvailabilityMenu from "../components/AvailabilityMenu";
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
      filter={{ queryKey: "status", label: "Состояние", options: statusOptions }}
      extraParams={{ availabilityDate: todayInput(), availabilityDays: 7 }}
      actionsAlign="center"
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
        { field: "brand", label: "Марка", align: "center" },
        { field: "model", label: "Модель", align: "center" },
        { field: "plateNumber", label: "Госномер", align: "center" },
        { field: "capacityKg", label: "Грузоподъемность", align: "center", render: (row) => `${row.capacityKg} кг` },
        { field: "fuelConsumptionPer100Km", label: "Расход", align: "center", render: (row) => `${row.fuelConsumptionPer100Km} л/100 км` },
        {
          field: "availabilityStatus",
          label: "Занятость",
          align: "center",
          sx: { minWidth: 220 },
          render: (row) => <AvailabilityMenu row={row} />
        }
      ]}
    />
  );
}
