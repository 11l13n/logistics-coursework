const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const dateAt = (value, hours = 9, minutes = 0) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
};

const addHours = (date, hours) => new Date(date.getTime() + hours * 60 * 60 * 1000);

const hash = (password) => bcrypt.hash(password, 10);

async function main() {
  await prisma.waypoint.deleteMany();
  await prisma.waybill.deleteMany();
  await prisma.route.deleteMany();
  await prisma.cargoDeliveryPoint.deleteMany();
  await prisma.cargoRequest.deleteMany();
  await prisma.client.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.user.deleteMany();

  const [admin, dispatcher, driverUser, driverUser2, driverUser3] = await Promise.all([
    prisma.user.create({
      data: {
        fullName: "Петров Алексей Сергеевич",
        email: "admin@example.com",
        passwordHash: await hash("admin123"),
        role: "ADMIN"
      }
    }),
    prisma.user.create({
      data: {
        fullName: "Соколова Мария Андреевна",
        email: "dispatcher@example.com",
        passwordHash: await hash("dispatcher123"),
        role: "DISPATCHER"
      }
    }),
    prisma.user.create({
      data: {
        fullName: "Иванов Игорь Ильич",
        email: "driver@example.com",
        passwordHash: await hash("driver123"),
        role: "DRIVER"
      }
    }),
    prisma.user.create({
      data: {
        fullName: "Кузнецов Дмитрий Олегович",
        email: "driver2@example.com",
        passwordHash: await hash("driver123"),
        role: "DRIVER"
      }
    }),
    prisma.user.create({
      data: {
        fullName: "Федоров Павел Николаевич",
        email: "driver3@example.com",
        passwordHash: await hash("driver123"),
        role: "DRIVER"
      }
    })
  ]);

  void admin;
  void dispatcher;

  const [driver1, driver2, driver3] = await Promise.all([
    prisma.driver.create({
      data: {
        userId: driverUser.id,
        fullName: "Иванов Игорь Ильич",
        phone: "+7 900 100-20-30",
        licenseNumber: "77AA123456",
        licenseCategory: "B, C",
        status: "AVAILABLE"
      }
    }),
    prisma.driver.create({
      data: {
        userId: driverUser2.id,
        fullName: "Кузнецов Дмитрий Олегович",
        phone: "+7 901 222-33-44",
        licenseNumber: "77BB654321",
        licenseCategory: "C",
        status: "AVAILABLE"
      }
    }),
    prisma.driver.create({
      data: {
        userId: driverUser3.id,
        fullName: "Федоров Павел Николаевич",
        phone: "+7 926 555-77-99",
        licenseNumber: "50CC778899",
        licenseCategory: "C, E",
        status: "BUSY"
      }
    })
  ]);

  const [gazelle, ford, man, kamaz] = await Promise.all([
    prisma.vehicle.create({
      data: {
        brand: "ГАЗ",
        model: "ГАЗель Next",
        plateNumber: "А123ВС777",
        capacityKg: 1500,
        fuelConsumptionPer100Km: 12.5,
        status: "AVAILABLE"
      }
    }),
    prisma.vehicle.create({
      data: {
        brand: "Ford",
        model: "Transit",
        plateNumber: "К456МН777",
        capacityKg: 2200,
        fuelConsumptionPer100Km: 10.8,
        status: "AVAILABLE"
      }
    }),
    prisma.vehicle.create({
      data: {
        brand: "MAN",
        model: "TGL",
        plateNumber: "М777ОР777",
        capacityKg: 6500,
        fuelConsumptionPer100Km: 18.6,
        status: "BUSY"
      }
    }),
    prisma.vehicle.create({
      data: {
        brand: "КАМАЗ",
        model: "5490",
        plateNumber: "Т090ТР777",
        capacityKg: 12000,
        fuelConsumptionPer100Km: 29.5,
        status: "REPAIR"
      }
    })
  ]);

  const [client1, client2, client3] = await Promise.all([
    prisma.client.create({
      data: {
        name: "ООО Альфа Снаб",
        contactPerson: "Морозова Елена",
        phone: "+7 495 100-11-22",
        email: "order@alpha-snab.ru",
        address: "Москва, ул. Складочная, 12"
      }
    }),
    prisma.client.create({
      data: {
        name: "ТД Север",
        contactPerson: "Громов Антон",
        phone: "+7 812 333-44-55",
        email: "logistic@tdsever.ru",
        address: "Санкт-Петербург, Лиговский проспект, 84"
      }
    }),
    prisma.client.create({
      data: {
        name: "ИП Белова",
        contactPerson: "Белова Анастасия",
        phone: "+7 920 700-90-10",
        email: "belova@example.com",
        address: "Тверь, ул. Коминтерна, 45"
      }
    })
  ]);

  const routeFixtures = [
    {
      client: client1,
      driver: driver1,
      vehicle: gazelle,
      cargoName: "Архив: офисное оборудование",
      weightKg: 650,
      volume: 3.1,
      start: { address: "Москва, ул. Складочная, 12", latitude: 55.7998, longitude: 37.5898 },
      deliveryPoints: [{ address: "Москва, Пресненская наб., 10", latitude: 55.7473, longitude: 37.5398 }],
      plannedDate: dateAt("2026-06-02", 9),
      distanceKm: 18,
      estimatedDuration: "36 мин",
      plannedFuel: 2.25,
      actualFuel: 2.4,
      startMileage: 88300,
      endMileage: 88318,
      status: "COMPLETED",
      archivedAt: dateAt("2026-06-05", 18),
      waybillStatus: "COMPLETED"
    },
    {
      client: client2,
      driver: driver2,
      vehicle: ford,
      cargoName: "Архив: торговое оборудование",
      weightKg: 920,
      volume: 4.8,
      start: { address: "Москва, Ленинградский проспект, 80", latitude: 55.805, longitude: 37.515 },
      deliveryPoints: [{ address: "Химки, Вашутинское шоссе, 9", latitude: 55.897, longitude: 37.4297 }],
      plannedDate: dateAt("2026-06-03", 10),
      distanceKm: 24.6,
      estimatedDuration: "45 мин",
      plannedFuel: 2.66,
      actualFuel: 2.8,
      startMileage: 74120,
      endMileage: 74145,
      status: "COMPLETED",
      archivedAt: dateAt("2026-06-05", 18, 10),
      waybillStatus: "COMPLETED"
    },
    {
      client: client3,
      driver: driver3,
      vehicle: man,
      cargoName: "Архив: мебель",
      weightKg: 1800,
      volume: 12.4,
      start: { address: "Москва, ул. Рябиновая, 22", latitude: 55.7029, longitude: 37.4281 },
      deliveryPoints: [{ address: "Тверь, ул. Коминтерна, 45", latitude: 56.8587, longitude: 35.9176 }],
      plannedDate: dateAt("2026-06-04", 8, 30),
      distanceKm: 174,
      estimatedDuration: "4 ч 19 мин",
      plannedFuel: 32.36,
      actualFuel: 34.1,
      startMileage: 221900,
      endMileage: 222074,
      status: "COMPLETED",
      archivedAt: dateAt("2026-06-05", 18, 20),
      waybillStatus: "COMPLETED"
    },
    {
      client: client1,
      driver: driver1,
      vehicle: gazelle,
      cargoName: "Пятница: бытовая техника",
      weightKg: 850,
      volume: 5.6,
      start: { address: "Москва, ул. Рябиновая, 22", latitude: 55.7029, longitude: 37.4281 },
      deliveryPoints: [{ address: "Тверь, ул. Коминтерна, 45", latitude: 56.8587, longitude: 35.9176 }],
      plannedDate: dateAt("2026-06-12", 9),
      distanceKm: 174,
      estimatedDuration: "4 ч 19 мин",
      plannedFuel: 21.75,
      status: "PLANNED",
      waybillStatus: "CREATED"
    },
    {
      client: client2,
      driver: driver2,
      vehicle: ford,
      cargoName: "Пятница: комплектующие",
      weightKg: 1300,
      volume: 7.2,
      start: { address: "Москва, Новорязанское шоссе, 3", latitude: 55.6525, longitude: 37.8895 },
      deliveryPoints: [{ address: "Калуга, ул. Московская, 271", latitude: 54.5146, longitude: 36.2612 }],
      plannedDate: dateAt("2026-06-12", 11),
      distanceKm: 188,
      estimatedDuration: "4 ч 39 мин",
      plannedFuel: 20.3,
      status: "PLANNED",
      waybillStatus: "CREATED"
    },
    {
      client: client3,
      driver: driver3,
      vehicle: man,
      cargoName: "Пятница: мебель",
      weightKg: 2400,
      volume: 16.5,
      start: { address: "Химки, Вашутинское шоссе, 9", latitude: 55.897, longitude: 37.4297 },
      deliveryPoints: [
        { address: "Москва, Ленинградский проспект, 80", latitude: 55.805, longitude: 37.515 },
        { address: "Мытищи, ул. Мира, 15", latitude: 55.9105, longitude: 37.7363 }
      ],
      plannedDate: dateAt("2026-06-12", 14),
      distanceKm: 55.4,
      estimatedDuration: "1 ч 29 мин",
      plannedFuel: 10.3,
      status: "PLANNED",
      waybillStatus: "CREATED"
    },
    {
      client: client1,
      driver: driver1,
      vehicle: gazelle,
      cargoName: "Суббота: документы",
      weightKg: 180,
      volume: 1.1,
      start: { address: "Москва, Пресненская наб., 10", latitude: 55.7473, longitude: 37.5398 },
      deliveryPoints: [{ address: "Балашиха, проспект Ленина, 25", latitude: 55.7963, longitude: 37.9382 }],
      plannedDate: dateAt("2026-06-13", 9, 30),
      distanceKm: 32.8,
      estimatedDuration: "57 мин",
      plannedFuel: 4.1,
      status: "PLANNED",
      waybillStatus: "CREATED"
    },
    {
      client: client2,
      driver: driver2,
      vehicle: kamaz,
      cargoName: "Суббота: стройматериалы",
      weightKg: 6200,
      volume: 20.4,
      start: { address: "Москва, Новорязанское шоссе, 3", latitude: 55.6525, longitude: 37.8895 },
      deliveryPoints: [{ address: "Калуга, ул. Кирова, 21", latitude: 54.512, longitude: 36.246 }],
      plannedDate: dateAt("2026-06-13", 12),
      distanceKm: 181.2,
      estimatedDuration: "4 ч 29 мин",
      plannedFuel: 53.45,
      status: "PLANNED",
      waybillStatus: "CREATED"
    },
    {
      client: client3,
      driver: driver3,
      vehicle: man,
      cargoName: "Суббота: сборный груз",
      weightKg: 2100,
      volume: 10.8,
      start: { address: "Москва, ул. Складочная, 12", latitude: 55.7998, longitude: 37.5898 },
      deliveryPoints: [
        { address: "Одинцово, Можайское шоссе, 71", latitude: 55.6789, longitude: 37.2636 },
        { address: "Красногорск, Ильинское шоссе, 1А", latitude: 55.8196, longitude: 37.3305 }
      ],
      plannedDate: dateAt("2026-06-13", 15),
      distanceKm: 62.5,
      estimatedDuration: "1 ч 39 мин",
      plannedFuel: 11.63,
      status: "PLANNED",
      waybillStatus: "CREATED"
    }
  ];

  for (const [index, fixture] of routeFixtures.entries()) {
    const request = await prisma.cargoRequest.create({
      data: {
        clientId: fixture.client.id,
        cargoName: fixture.cargoName,
        weightKg: fixture.weightKg,
        volume: fixture.volume,
        pickupAddress: fixture.start.address,
        deliveryAddress: fixture.deliveryPoints[fixture.deliveryPoints.length - 1].address,
        desiredDeliveryDate: fixture.plannedDate,
        status: fixture.status === "COMPLETED" ? "COMPLETED" : "PLANNED",
        archivedAt: fixture.archivedAt || null,
        deliveryPoints: {
          create: fixture.deliveryPoints.map((point, pointIndex) => ({
            address: point.address,
            latitude: point.latitude,
            longitude: point.longitude,
            orderNumber: pointIndex + 1
          }))
        }
      }
    });

    await prisma.route.create({
      data: {
        cargoRequestId: request.id,
        driverId: fixture.driver.id,
        vehicleId: fixture.vehicle.id,
        startAddress: fixture.start.address,
        endAddress: request.deliveryAddress,
        distanceKm: fixture.distanceKm,
        estimatedDuration: fixture.estimatedDuration,
        plannedDate: fixture.plannedDate,
        status: fixture.status,
        archivedAt: fixture.archivedAt || null,
        waybill: {
          create: {
            number: `PL-2026-${String(index + 1).padStart(4, "0")}`,
            issueDate: fixture.plannedDate,
            departureTime: fixture.status === "COMPLETED" ? fixture.plannedDate : null,
            returnTime: fixture.status === "COMPLETED" ? addHours(fixture.plannedDate, 2) : null,
            startMileage: fixture.startMileage || null,
            endMileage: fixture.endMileage || null,
            plannedFuel: fixture.plannedFuel,
            actualFuel: fixture.actualFuel || null,
            status: fixture.waybillStatus
          }
        },
        waypoints: {
          create: [fixture.start, ...fixture.deliveryPoints].map((point, pointIndex) => ({
            address: point.address,
            latitude: point.latitude,
            longitude: point.longitude,
            orderNumber: pointIndex + 1
          }))
        }
      }
    });
  }

  console.log("Seed data created");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
