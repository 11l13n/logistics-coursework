import { useState } from "react";
import { Chip, ListItemText, Menu, MenuItem } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const statusText = {
  AVAILABLE: "свободен",
  BUSY: "занят",
  REPAIR: "в ремонте",
  INACTIVE: "неактивен"
};

const statusColors = {
  AVAILABLE: "success",
  BUSY: "warning",
  REPAIR: "error",
  INACTIVE: "default"
};

const pad = (value) => String(value).padStart(2, "0");

function localDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dayLabel(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  const today = new Date();

  if (localDateKey(date) === localDateKey(today)) return "Сегодня";

  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

function availabilityLabel(item) {
  return `${dayLabel(item.date)} ${statusText[item.status] || "—"}`;
}

export default function AvailabilityMenu({ row }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const schedule = row.availabilitySchedule?.length
    ? row.availabilitySchedule
    : [{ date: row.availabilityDate || localDateKey(new Date()), status: row.availabilityStatus || row.status }];
  const current = schedule[0];
  const open = Boolean(anchorEl);

  return (
    <>
      <Chip
        label={availabilityLabel(current)}
        color={statusColors[current.status] || "default"}
        size="small"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        onDelete={(event) => setAnchorEl(event.currentTarget)}
        deleteIcon={<ExpandMoreIcon />}
        sx={{ fontWeight: 700 }}
      />
      <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
        {schedule.map((item) => (
          <MenuItem key={item.date} selected={item.date === current.date} onClick={() => setAnchorEl(null)}>
            <ListItemText primary={availabilityLabel(item)} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
