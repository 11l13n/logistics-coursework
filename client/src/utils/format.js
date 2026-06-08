export const formatDate = (value) => (value ? new Date(value).toLocaleDateString("ru-RU") : "—");

export const formatDateTime = (value) => (value ? new Date(value).toLocaleString("ru-RU") : "—");

const pad = (value) => String(value).padStart(2, "0");

const toLocalDateTimeInput = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

export const inputDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return toLocalDateTimeInput(date);
};

export const todayInput = () => {
  const date = new Date();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const dateTimeTomorrow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);
  return toLocalDateTimeInput(date);
};

export const routePoints = (route) =>
  route?.waypoints?.length
    ? route.waypoints
    : [
        { address: route?.startAddress, latitude: 55.751244, longitude: 37.618423 },
        { address: route?.endAddress, latitude: 56.8587, longitude: 35.9176 }
      ];
