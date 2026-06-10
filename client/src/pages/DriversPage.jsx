import AvailabilityMenu from "../components/AvailabilityMenu";
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
      filter={{ queryKey: "status", label: "Состояние", options: statusOptions }}
      extraParams={{ availabilityDate: todayInput(), availabilityDays: 7 }}
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
        { field: "availabilityStatus", label: "Занятость", render: (row) => <AvailabilityMenu row={row} /> }
      ]}
    />
  );
}
