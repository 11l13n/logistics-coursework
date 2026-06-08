import { Chip } from "@mui/material";

const labels = {
  ADMIN: "Администратор",
  DISPATCHER: "Диспетчер",
  DRIVER: "Водитель",
  AVAILABLE: "Свободен",
  BUSY: "Занят",
  INACTIVE: "Неактивен",
  REPAIR: "Ремонт",
  NEW: "Новая",
  PLANNED: "Запланирован",
  IN_PROGRESS: "В рейсе",
  COMPLETED: "Выполнен",
  CANCELLED: "Отменен",
  ARCHIVED: "Архив",
  CREATED: "Создан",
  ACTIVE: "Активен"
};

const colors = {
  ADMIN: "primary",
  DISPATCHER: "secondary",
  DRIVER: "default",
  AVAILABLE: "success",
  BUSY: "warning",
  INACTIVE: "default",
  REPAIR: "error",
  NEW: "info",
  PLANNED: "secondary",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "error",
  ARCHIVED: "default",
  CREATED: "default",
  ACTIVE: "warning"
};

export default function StatusChip({ value, size = "small" }) {
  return (
    <Chip
      label={labels[value] || value || "—"}
      color={colors[value] || "default"}
      size={size}
      sx={{ alignSelf: "flex-start" }}
    />
  );
}

export const statusLabel = (value) => labels[value] || value || "—";
