import ResourcePage from "../components/ResourcePage";

export default function ClientsPage() {
  return (
    <ResourcePage
      title="Клиенты"
      endpoint="/clients"
      searchPlaceholder="Название, контакт или адрес"
      initialValues={{
        name: "",
        contactPerson: "",
        phone: "",
        email: "",
        address: ""
      }}
      fields={[
        { name: "name", label: "Название", required: true },
        { name: "contactPerson", label: "Контактное лицо", required: true },
        { name: "phone", label: "Телефон", required: true },
        { name: "email", label: "Email", type: "email", required: true },
        { name: "address", label: "Адрес", fullWidth: true, required: true }
      ]}
      columns={[
        { field: "name", label: "Клиент" },
        { field: "contactPerson", label: "Контактное лицо" },
        { field: "phone", label: "Телефон" },
        { field: "email", label: "Email" },
        { field: "address", label: "Адрес" }
      ]}
    />
  );
}
