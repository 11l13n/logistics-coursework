require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const routeRoutes = require("./routes/routes");
const waybillRoutes = require("./routes/waybills");
const recommendationRoutes = require("./routes/recommendations");
const reportRoutes = require("./routes/reports");
const cargoRequestRoutes = require("./routes/cargoRequests");
const { createCrudRouter } = require("./routes/resources");
const swaggerSpec = require("./swagger");

const app = express();
const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || "127.0.0.1";
const allowedOrigins = new Set([
  process.env.CLIENT_URL || "http://localhost:5173",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://[::1]:5173"
]);

app.disable("etag");

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin is not allowed: ${origin}`));
    },
    credentials: true
  })
);
app.use(express.json());
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "logistics-coursework-api" });
});

app.get("/api/openapi.json", (req, res) => {
  res.json(swaggerSpec);
});
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use(
  "/api/drivers",
  createCrudRouter({
    model: "driver",
    searchFields: ["fullName", "phone", "licenseNumber"],
    include: { user: { select: { id: true, fullName: true, email: true, role: true } } },
    orderBy: { fullName: "asc" }
  })
);
app.use(
  "/api/vehicles",
  createCrudRouter({
    model: "vehicle",
    searchFields: ["brand", "model", "plateNumber"],
    orderBy: { plateNumber: "asc" }
  })
);
app.use(
  "/api/clients",
  createCrudRouter({
    model: "client",
    searchFields: ["name", "contactPerson", "phone", "email", "address"],
    orderBy: { name: "asc" }
  })
);
app.use("/api/cargo-requests", cargoRequestRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/waybills", waybillRoutes);
app.use("/api/reports", reportRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Маршрут API не найден" });
});

app.use((error, req, res, next) => {
  void next;
  console.error(error);
  const message = error.code === "P2002" ? "Запись с такими уникальными данными уже существует" : error.message;
  res.status(error.status || 500).json({ message: message || "Внутренняя ошибка сервера" });
});

if (require.main === module) {
  app.listen(port, host, () => {
    console.log(`API server started on http://${host}:${port}`);
  });
}

module.exports = app;
