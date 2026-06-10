import StatusChip from "../components/StatusChip";
import ResourcePage from "../components/ResourcePage";
import { todayInput } from "../utils/format";

const statusOptions = [
  { value: "AVAILABLE", label: "Свободен" },
  { value: "BUSY", label: "Занят" },
  { value: "INACTIVE", label: "Неактивен" }
];

export default function DriversPage() {
  return (
    <ResourcePage
      title="Водители"
      endpoint="/drivers"
      searchPlaceholder="ФИО, телефон или права"
      filters={[
        { queryKey: "availabilityDate", label: "Дата занятости", type: "date", defaultValue: todayInput(), minWidth: 170 },
        { queryKey: "status", label: "Статус записи", options: statusOptions }
      ]}
      initialValues={{
        fullName: "",
        phone: "",
        licenseNumber: "",
        licenseCategory: "B, C",
        status: "AVAILABLE"
      }}
      fields={[
        { name: "fullName", label: "ФИО", required: true },
        { name: "phone", label: "Телефон", required: true },
        { name: "licenseNumber", label: "Номер водительского удостоверения", required: true },
        { name: "licenseCategory", label: "Категории", required: true },
        { name: "status", label: "Статус", type: "select", options: statusOptions, required: true }
      ]}
      columns={[
        { field: "fullName", label: "ФИО" },
        { field: "phone", label: "Телефон" },
        { field: "licenseNumber", label: "Права" },
        { field: "licenseCategory", label: "Категории" },
        { field: "availabilityStatus", label: "На дату", render: (row) => <StatusChip value={row.availabilityStatus || row.status} /> },
        { field: "status", label: "Статус записи", render: (row) => <StatusChip value={row.status} /> }
      ]}
    />
  );
}
