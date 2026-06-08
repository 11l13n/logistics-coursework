const swaggerJsdoc = require("swagger-jsdoc");

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const nullableRef = (name) => ({ allOf: [ref(name)], nullable: true });
const arrayOf = (name) => ({ type: "array", items: ref(name) });

const idParam = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "integer" },
  description: "ID записи"
};

const searchParam = {
  name: "search",
  in: "query",
  schema: { type: "string" },
  description: "Поисковая строка"
};

const archiveParam = {
  name: "archive",
  in: "query",
  schema: { type: "string", enum: ["active", "archived", "all"] },
  description: "Режим отображения архивных записей"
};

const statusParam = (values) => ({
  name: "status",
  in: "query",
  schema: { type: "string", enum: values },
  description: "Фильтр по статусу"
});

const dateParam = {
  name: "date",
  in: "query",
  schema: { type: "string", format: "date" },
  description: "Дата маршрута"
};

const periodParams = [
  {
    name: "from",
    in: "query",
    schema: { type: "string", format: "date" },
    description: "Начало периода"
  },
  {
    name: "to",
    in: "query",
    schema: { type: "string", format: "date" },
    description: "Конец периода"
  }
];

const jsonBody = (schema) => ({
  required: true,
  content: {
    "application/json": {
      schema
    }
  }
});

const response = (description, schema) => ({
  description,
  ...(schema && {
    content: {
      "application/json": {
        schema
      }
    }
  })
});

const errorResponses = {
  400: response("Некорректный запрос", ref("ErrorResponse")),
  401: response("Не авторизован", ref("ErrorResponse")),
  403: response("Недостаточно прав", ref("ErrorResponse")),
  404: response("Запись не найдена", ref("ErrorResponse")),
  409: response("Конфликт данных", ref("ErrorResponse"))
};

const crudPaths = ({ tag, listSchema, itemSchema, inputSchema, parameters = [] }) => ({
  get: {
    tags: [tag],
    summary: `Получить список: ${tag}`,
    parameters,
    responses: {
      200: response("Список записей", listSchema),
      401: errorResponses[401],
      403: errorResponses[403]
    }
  },
  post: {
    tags: [tag],
    summary: `Создать запись: ${tag}`,
    requestBody: jsonBody(inputSchema),
    responses: {
      201: response("Запись создана", itemSchema),
      ...errorResponses
    }
  }
});

const crudByIdPaths = ({ tag, itemSchema, inputSchema, allowGet = false }) => {
  const paths = {
    put: {
      tags: [tag],
      summary: `Обновить запись: ${tag}`,
      parameters: [idParam],
      requestBody: jsonBody(inputSchema),
      responses: {
        200: response("Запись обновлена", itemSchema),
        ...errorResponses
      }
    },
    delete: {
      tags: [tag],
      summary: `Удалить запись: ${tag}`,
      parameters: [idParam],
      responses: {
        204: { description: "Запись удалена" },
        ...errorResponses
      }
    }
  };

  if (allowGet) {
    paths.get = {
      tags: [tag],
      summary: `Получить запись: ${tag}`,
      parameters: [idParam],
      responses: {
        200: response("Запись найдена", itemSchema),
        ...errorResponses
      }
    };
  }

  return paths;
};

const archiveActions = (tag, schema) => ({
  post: {
    tags: [tag],
    summary: "Отправить запись в архив",
    parameters: [idParam],
    responses: {
      200: response("Запись архивирована", schema),
      ...errorResponses
    }
  }
});

const unarchiveActions = (tag, schema) => ({
  post: {
    tags: [tag],
    summary: "Вернуть запись из архива",
    parameters: [idParam],
    responses: {
      200: response("Запись восстановлена", schema),
      ...errorResponses
    }
  }
});

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Logistics Coursework API",
      version: "1.0.0",
      description: "Документация REST API информационной системы управления грузоперевозками."
    },
    servers: [
      {
        url: "/api",
        description: "Текущий сервер"
      }
    ],
    security: [{ bearerAuth: [] }],
    tags: [
      { name: "System", description: "Служебные методы" },
      { name: "Auth", description: "Регистрация, вход и текущий пользователь" },
      { name: "Users", description: "Управление пользователями" },
      { name: "Drivers", description: "Управление водителями" },
      { name: "Vehicles", description: "Управление автомобилями" },
      { name: "Clients", description: "Управление клиентами" },
      { name: "Cargo Requests", description: "Заявки на перевозку" },
      { name: "Routes", description: "Маршруты перевозок" },
      { name: "Geocoding", description: "Поиск адресов и координат" },
      { name: "Recommendations", description: "Рекомендации по назначению ресурсов" },
      { name: "Waybills", description: "Путевые листы" },
      { name: "Reports", description: "Отчеты" }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            message: { type: "string", example: "Неверный email или пароль" },
            details: { type: "object", nullable: true }
          }
        },
        HealthResponse: {
          type: "object",
          properties: {
            status: { type: "string", example: "ok" },
            service: { type: "string", example: "logistics-coursework-api" }
          }
        },
        AuthResponse: {
          type: "object",
          properties: {
            token: { type: "string", example: "jwt-token" },
            user: ref("User")
          }
        },
        LoginInput: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", example: "user@example.com" },
            password: { type: "string", format: "password", example: "password123" }
          }
        },
        RegisterInput: {
          type: "object",
          required: ["fullName", "email", "password"],
          properties: {
            fullName: { type: "string", example: "Иван Петров" },
            email: { type: "string", format: "email", example: "dispatcher@example.com" },
            password: { type: "string", format: "password", example: "dispatcher123" },
            role: { type: "string", enum: ["DISPATCHER", "DRIVER"], default: "DISPATCHER" }
          }
        },
        User: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            fullName: { type: "string", example: "Администратор" },
            email: { type: "string", format: "email", example: "admin@example.com" },
            role: { type: "string", enum: ["ADMIN", "DISPATCHER", "DRIVER"] },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            driver: nullableRef("Driver")
          }
        },
        UserInput: {
          type: "object",
          required: ["fullName", "email", "password", "role"],
          properties: {
            fullName: { type: "string", example: "Диспетчер" },
            email: { type: "string", format: "email", example: "dispatcher@example.com" },
            password: { type: "string", format: "password", example: "dispatcher123" },
            role: { type: "string", enum: ["ADMIN", "DISPATCHER", "DRIVER"] }
          }
        },
        Driver: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            userId: { type: "integer", nullable: true, example: 3 },
            fullName: { type: "string", example: "Сергей Иванов" },
            phone: { type: "string", example: "+7 900 000-00-00" },
            licenseNumber: { type: "string", example: "77 11 123456" },
            licenseCategory: { type: "string", example: "C" },
            status: { type: "string", enum: ["AVAILABLE", "BUSY", "INACTIVE"] },
            user: nullableRef("User")
          }
        },
        DriverInput: {
          type: "object",
          required: ["fullName", "phone", "licenseNumber", "licenseCategory"],
          properties: {
            userId: { type: "integer", nullable: true, example: 3 },
            fullName: { type: "string", example: "Сергей Иванов" },
            phone: { type: "string", example: "+7 900 000-00-00" },
            licenseNumber: { type: "string", example: "77 11 123456" },
            licenseCategory: { type: "string", example: "C" },
            status: { type: "string", enum: ["AVAILABLE", "BUSY", "INACTIVE"], default: "AVAILABLE" }
          }
        },
        Vehicle: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            brand: { type: "string", example: "КАМАЗ" },
            model: { type: "string", example: "5490" },
            plateNumber: { type: "string", example: "А123ВС777" },
            capacityKg: { type: "integer", example: 12000 },
            fuelConsumptionPer100Km: { type: "number", example: 28.5 },
            status: { type: "string", enum: ["AVAILABLE", "BUSY", "REPAIR", "INACTIVE"] }
          }
        },
        VehicleInput: {
          type: "object",
          required: ["brand", "model", "plateNumber", "capacityKg", "fuelConsumptionPer100Km"],
          properties: {
            brand: { type: "string", example: "КАМАЗ" },
            model: { type: "string", example: "5490" },
            plateNumber: { type: "string", example: "А123ВС777" },
            capacityKg: { type: "integer", example: 12000 },
            fuelConsumptionPer100Km: { type: "number", example: 28.5 },
            status: { type: "string", enum: ["AVAILABLE", "BUSY", "REPAIR", "INACTIVE"], default: "AVAILABLE" }
          }
        },
        Client: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            name: { type: "string", example: "ООО Альфа-Снаб" },
            contactPerson: { type: "string", example: "Анна Смирнова" },
            phone: { type: "string", example: "+7 900 111-22-33" },
            email: { type: "string", format: "email", example: "order@alpha-snab.ru" },
            address: { type: "string", example: "Москва, ул. Логистическая, 1" }
          }
        },
        ClientInput: {
          type: "object",
          required: ["name", "contactPerson", "phone", "email", "address"],
          properties: {
            name: { type: "string", example: "ООО Альфа-Снаб" },
            contactPerson: { type: "string", example: "Анна Смирнова" },
            phone: { type: "string", example: "+7 900 111-22-33" },
            email: { type: "string", format: "email", example: "order@alpha-snab.ru" },
            address: { type: "string", example: "Москва, ул. Логистическая, 1" }
          }
        },
        DeliveryPointInput: {
          type: "object",
          required: ["address", "latitude", "longitude"],
          properties: {
            address: { type: "string", example: "Тверь, ул. Центральная, 5" },
            latitude: { type: "number", example: 56.8587 },
            longitude: { type: "number", example: 35.9176 },
            orderNumber: { type: "integer", example: 1 }
          }
        },
        DeliveryPoint: {
          allOf: [
            {
              type: "object",
              properties: {
                id: { type: "integer", example: 1 },
                cargoRequestId: { type: "integer", example: 1 }
              }
            },
            ref("DeliveryPointInput")
          ]
        },
        GeocodingResult: {
          type: "object",
          properties: {
            id: { type: "string", example: "123456789" },
            address: {
              type: "string",
              example: "Ленинградский проспект, район Аэропорт, Москва, Россия"
            },
            latitude: { type: "number", example: 55.805 },
            longitude: { type: "number", example: 37.515 },
            type: { type: "string", example: "road" },
            category: { type: "string", example: "highway" }
          }
        },
        CargoRequest: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            clientId: { type: "integer", example: 1 },
            client: ref("Client"),
            cargoName: { type: "string", example: "Строительные материалы" },
            weightKg: { type: "integer", example: 5000 },
            volume: { type: "number", example: 12.5 },
            pickupAddress: { type: "string", example: "Москва, склад 12" },
            deliveryAddress: { type: "string", example: "Тверь, ул. Центральная, 5" },
            desiredDeliveryDate: { type: "string", format: "date-time" },
            status: {
              type: "string",
              enum: ["NEW", "PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "ARCHIVED"]
            },
            createdAt: { type: "string", format: "date-time" },
            archivedAt: { type: "string", format: "date-time", nullable: true },
            deliveryPoints: arrayOf("DeliveryPoint")
          }
        },
        CargoRequestInput: {
          type: "object",
          required: ["clientId", "cargoName", "weightKg", "volume", "pickupAddress", "desiredDeliveryDate"],
          properties: {
            clientId: { type: "integer", example: 1 },
            cargoName: { type: "string", example: "Строительные материалы" },
            weightKg: { type: "integer", example: 5000 },
            volume: { type: "number", example: 12.5 },
            pickupAddress: { type: "string", example: "Москва, склад 12" },
            deliveryAddress: { type: "string", example: "Тверь, ул. Центральная, 5" },
            desiredDeliveryDate: { type: "string", format: "date-time" },
            status: {
              type: "string",
              enum: ["NEW", "PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "ARCHIVED"]
            },
            deliveryPoints: {
              type: "array",
              items: ref("DeliveryPointInput")
            },
            deliveryPointsText: {
              type: "string",
              description: "Точки разгрузки текстом, если не передан массив deliveryPoints"
            }
          }
        },
        WaypointInput: {
          type: "object",
          required: ["address", "latitude", "longitude"],
          properties: {
            address: { type: "string", example: "Тверь, ул. Центральная, 5" },
            latitude: { type: "number", example: 56.8587 },
            longitude: { type: "number", example: 35.9176 },
            orderNumber: { type: "integer", example: 1 }
          }
        },
        Waypoint: {
          allOf: [
            {
              type: "object",
              properties: {
                id: { type: "integer", example: 1 },
                routeId: { type: "integer", example: 1 }
              }
            },
            ref("WaypointInput")
          ]
        },
        Route: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            cargoRequestId: { type: "integer", example: 1 },
            driverId: { type: "integer", example: 1 },
            vehicleId: { type: "integer", example: 1 },
            startAddress: { type: "string", example: "Москва, склад 12" },
            endAddress: { type: "string", example: "Тверь, ул. Центральная, 5" },
            distanceKm: { type: "number", example: 186.4 },
            estimatedDuration: { type: "string", example: "3 ч 10 мин" },
            plannedDate: { type: "string", format: "date-time" },
            status: { type: "string", enum: ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] },
            createdAt: { type: "string", format: "date-time" },
            archivedAt: { type: "string", format: "date-time", nullable: true },
            cargoRequest: ref("CargoRequest"),
            driver: ref("Driver"),
            vehicle: ref("Vehicle"),
            waypoints: arrayOf("Waypoint"),
            waybill: nullableRef("Waybill")
          }
        },
        RouteInput: {
          type: "object",
          required: [
            "cargoRequestId",
            "driverId",
            "vehicleId",
            "startAddress",
            "endAddress",
            "distanceKm",
            "estimatedDuration",
            "plannedDate"
          ],
          properties: {
            cargoRequestId: { type: "integer", example: 1 },
            driverId: { type: "integer", example: 1 },
            vehicleId: { type: "integer", example: 1 },
            startAddress: { type: "string", example: "Москва, склад 12" },
            endAddress: { type: "string", example: "Тверь, ул. Центральная, 5" },
            distanceKm: { type: "number", example: 186.4 },
            estimatedDuration: { type: "string", example: "3 ч 10 мин" },
            plannedDate: { type: "string", format: "date-time" },
            status: { type: "string", enum: ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] },
            waypoints: {
              type: "array",
              items: ref("WaypointInput")
            }
          }
        },
        Waybill: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            routeId: { type: "integer", example: 1 },
            number: { type: "string", example: "PL-2026-0001" },
            issueDate: { type: "string", format: "date-time" },
            departureTime: { type: "string", format: "date-time", nullable: true },
            returnTime: { type: "string", format: "date-time", nullable: true },
            startMileage: { type: "integer", nullable: true, example: 10000 },
            endMileage: { type: "integer", nullable: true, example: 10186 },
            plannedFuel: { type: "number", example: 53.1 },
            actualFuel: { type: "number", nullable: true, example: 55.4 },
            status: { type: "string", enum: ["CREATED", "ACTIVE", "COMPLETED", "CANCELLED"] },
            archivedAt: { type: "string", format: "date-time", nullable: true },
            route: ref("Route")
          }
        },
        WaybillInput: {
          type: "object",
          required: ["routeId", "number", "plannedFuel"],
          properties: {
            routeId: { type: "integer", example: 1 },
            number: { type: "string", example: "PL-2026-0001" },
            departureTime: { type: "string", format: "date-time" },
            returnTime: { type: "string", format: "date-time" },
            startMileage: { type: "integer", example: 10000 },
            endMileage: { type: "integer", example: 10186 },
            plannedFuel: { type: "number", example: 53.1 },
            actualFuel: { type: "number", example: 55.4 },
            status: { type: "string", enum: ["CREATED", "ACTIVE", "COMPLETED", "CANCELLED"] }
          }
        },
        RecommendationInput: {
          type: "object",
          required: ["cargoRequestId"],
          properties: {
            cargoRequestId: { type: "integer", example: 1 },
            plannedDate: { type: "string", format: "date-time" }
          }
        },
        RecommendationResponse: {
          type: "object",
          properties: {
            cargoRequest: ref("CargoRequest"),
            driver: ref("Driver"),
            vehicle: ref("Vehicle"),
            plannedFuel: { type: "number", example: 53.1 },
            distanceKm: { type: "number", example: 186.4 },
            estimatedDuration: { type: "string", example: "3 ч 10 мин" },
            optimizedWaypoints: arrayOf("WaypointInput"),
            explanation: { type: "string" }
          }
        },
        SummaryReport: {
          type: "object",
          properties: {
            period: {
              type: "object",
              properties: {
                from: { type: "string", format: "date-time" },
                to: { type: "string", format: "date-time" }
              }
            },
            routesCount: { type: "integer", example: 12 },
            activeRoutes: { type: "integer", example: 2 },
            completedRoutes: { type: "integer", example: 8 },
            cancelledRoutes: { type: "integer", example: 1 },
            totalMileage: { type: "number", example: 2400.5 },
            totalFuel: { type: "number", example: 680.4 }
          }
        },
        DriverReport: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            fullName: { type: "string", example: "Сергей Иванов" },
            completedRoutes: { type: "integer", example: 5 },
            mileage: { type: "number", example: 930.7 }
          }
        },
        VehicleReport: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            name: { type: "string", example: "КАМАЗ 5490" },
            plateNumber: { type: "string", example: "А123ВС777" },
            mileage: { type: "number", example: 930.7 },
            completedRoutes: { type: "integer", example: 5 }
          }
        }
      }
    },
    paths: {
      "/health": {
        get: {
          tags: ["System"],
          summary: "Проверка доступности API",
          security: [],
          responses: {
            200: response("API доступен", ref("HealthResponse"))
          }
        }
      },
      "/openapi.json": {
        get: {
          tags: ["System"],
          summary: "Получить OpenAPI JSON",
          security: [],
          responses: {
            200: response("OpenAPI спецификация", { type: "object" })
          }
        }
      },
      "/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Зарегистрировать пользователя",
          security: [],
          requestBody: jsonBody(ref("RegisterInput")),
          responses: {
            201: response("Пользователь зарегистрирован", ref("AuthResponse")),
            400: errorResponses[400],
            409: errorResponses[409]
          }
        }
      },
      "/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Войти в систему",
          security: [],
          requestBody: jsonBody(ref("LoginInput")),
          responses: {
            200: response("Успешный вход", ref("AuthResponse")),
            401: errorResponses[401]
          }
        }
      },
      "/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Получить текущего пользователя",
          responses: {
            200: response("Текущий пользователь", ref("User")),
            401: errorResponses[401]
          }
        }
      },
      "/users": crudPaths({
        tag: "Users",
        listSchema: arrayOf("User"),
        itemSchema: ref("User"),
        inputSchema: ref("UserInput"),
        parameters: [statusParam(["ADMIN", "DISPATCHER", "DRIVER"])]
      }),
      "/users/{id}": crudByIdPaths({ tag: "Users", itemSchema: ref("User"), inputSchema: ref("UserInput") }),
      "/drivers": crudPaths({
        tag: "Drivers",
        listSchema: arrayOf("Driver"),
        itemSchema: ref("Driver"),
        inputSchema: ref("DriverInput"),
        parameters: [searchParam, statusParam(["AVAILABLE", "BUSY", "INACTIVE"])]
      }),
      "/drivers/{id}": crudByIdPaths({ tag: "Drivers", itemSchema: ref("Driver"), inputSchema: ref("DriverInput") }),
      "/vehicles": crudPaths({
        tag: "Vehicles",
        listSchema: arrayOf("Vehicle"),
        itemSchema: ref("Vehicle"),
        inputSchema: ref("VehicleInput"),
        parameters: [searchParam, statusParam(["AVAILABLE", "BUSY", "REPAIR", "INACTIVE"])]
      }),
      "/vehicles/{id}": crudByIdPaths({
        tag: "Vehicles",
        itemSchema: ref("Vehicle"),
        inputSchema: ref("VehicleInput")
      }),
      "/clients": crudPaths({
        tag: "Clients",
        listSchema: arrayOf("Client"),
        itemSchema: ref("Client"),
        inputSchema: ref("ClientInput"),
        parameters: [searchParam]
      }),
      "/clients/{id}": crudByIdPaths({ tag: "Clients", itemSchema: ref("Client"), inputSchema: ref("ClientInput") }),
      "/cargo-requests": crudPaths({
        tag: "Cargo Requests",
        listSchema: arrayOf("CargoRequest"),
        itemSchema: ref("CargoRequest"),
        inputSchema: ref("CargoRequestInput"),
        parameters: [
          archiveParam,
          searchParam,
          statusParam(["NEW", "PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "ARCHIVED"])
        ]
      }),
      "/cargo-requests/{id}": crudByIdPaths({
        tag: "Cargo Requests",
        itemSchema: ref("CargoRequest"),
        inputSchema: ref("CargoRequestInput")
      }),
      "/cargo-requests/{id}/archive": archiveActions("Cargo Requests", ref("CargoRequest")),
      "/cargo-requests/{id}/unarchive": unarchiveActions("Cargo Requests", ref("CargoRequest")),
      "/routes": crudPaths({
        tag: "Routes",
        listSchema: arrayOf("Route"),
        itemSchema: ref("Route"),
        inputSchema: ref("RouteInput"),
        parameters: [
          archiveParam,
          statusParam(["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
          { name: "driverId", in: "query", schema: { type: "integer" } },
          { name: "vehicleId", in: "query", schema: { type: "integer" } },
          dateParam
        ]
      }),
      "/routes/{id}": crudByIdPaths({
        tag: "Routes",
        itemSchema: ref("Route"),
        inputSchema: ref("RouteInput"),
        allowGet: true
      }),
      "/routes/{id}/archive": archiveActions("Routes", ref("Route")),
      "/routes/{id}/unarchive": unarchiveActions("Routes", ref("Route")),
      "/geocoding/search": {
        get: {
          tags: ["Geocoding"],
          summary: "Найти адреса через OpenStreetMap Nominatim",
          parameters: [
            {
              name: "q",
              in: "query",
              required: true,
              schema: { type: "string", minLength: 3 },
              description: "Строка адреса"
            }
          ],
          responses: {
            200: response("Найденные адреса", arrayOf("GeocodingResult")),
            400: errorResponses[400],
            401: errorResponses[401],
            403: errorResponses[403]
          }
        }
      },
      "/recommendations/route": {
        post: {
          tags: ["Recommendations"],
          summary: "Получить рекомендацию по маршруту",
          requestBody: jsonBody(ref("RecommendationInput")),
          responses: {
            200: response("Рекомендация сформирована", ref("RecommendationResponse")),
            ...errorResponses
          }
        }
      },
      "/waybills": crudPaths({
        tag: "Waybills",
        listSchema: arrayOf("Waybill"),
        itemSchema: ref("Waybill"),
        inputSchema: ref("WaybillInput"),
        parameters: [archiveParam, statusParam(["CREATED", "ACTIVE", "COMPLETED", "CANCELLED"])]
      }),
      "/waybills/{id}": crudByIdPaths({
        tag: "Waybills",
        itemSchema: ref("Waybill"),
        inputSchema: ref("WaybillInput"),
        allowGet: true
      }),
      "/waybills/{id}/archive": archiveActions("Waybills", ref("Waybill")),
      "/waybills/{id}/unarchive": unarchiveActions("Waybills", ref("Waybill")),
      "/reports/summary": {
        get: {
          tags: ["Reports"],
          summary: "Сводный отчет",
          parameters: periodParams,
          responses: {
            200: response("Сводные показатели", ref("SummaryReport")),
            401: errorResponses[401],
            403: errorResponses[403]
          }
        }
      },
      "/reports/drivers": {
        get: {
          tags: ["Reports"],
          summary: "Отчет по водителям",
          parameters: periodParams,
          responses: {
            200: response("Показатели водителей", arrayOf("DriverReport")),
            401: errorResponses[401],
            403: errorResponses[403]
          }
        }
      },
      "/reports/vehicles": {
        get: {
          tags: ["Reports"],
          summary: "Отчет по автомобилям",
          parameters: periodParams,
          responses: {
            200: response("Показатели автомобилей", arrayOf("VehicleReport")),
            401: errorResponses[401],
            403: errorResponses[403]
          }
        }
      }
    }
  },
  apis: []
};

module.exports = swaggerJsdoc(options);
