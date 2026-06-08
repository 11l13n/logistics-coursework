import StatusChip from "../components/StatusChip";
import ResourcePage from "../components/ResourcePage";

const roleOptions = [
  { value: "ADMIN", label: "Администратор" },
  { value: "DISPATCHER", label: "Диспетчер" },
  { value: "DRIVER", label: "Водитель" }
];

export default function UsersPage() {
  return (
    <ResourcePage
      title="Пользователи"
      endpoint="/users"
      searchPlaceholder="Email или ФИО"
      filter={{ queryKey: "role", label: "Роль", options: roleOptions }}
      initialValues={{ fullName: "", email: "", password: "", role: "DISPATCHER" }}
      transformBeforeSubmit={(form, row) => {
        const payload = { ...form };
        if (row && !payload.password) delete payload.password;
        return payload;
      }}
      fields={[
        { name: "fullName", label: "ФИО", required: true },
        { name: "email", label: "Email", type: "email", required: true },
        { name: "password", label: "Пароль", type: "password", required: false },
        { name: "role", label: "Роль", type: "select", options: roleOptions, required: true }
      ]}
      columns={[
        { field: "fullName", label: "ФИО" },
        { field: "email", label: "Email" },
        { field: "role", label: "Роль", render: (row) => <StatusChip value={row.role} /> },
        { field: "createdAt", label: "Создан", render: (row) => new Date(row.createdAt).toLocaleDateString("ru-RU") }
      ]}
    />
  );
}
