const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const addDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(9, 0, 0, 0);
  return date;
};

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

  const [admin, dispatcher, driverUser, driverUser2] = await Promise.all([
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

  void kamaz;

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

  const [request1, request2, request3, request4] = await Promise.all([
    prisma.cargoRequest.create({
      data: {
        clientId: client1.id,
        cargoName: "Бытовая техника",
        weightKg: 850,
        volume: 5.6,
        pickupAddress: "Москва, ул. Рябиновая, 22",
        deliveryAddress: "Тверь, ул. Коминтерна, 45",
        desiredDeliveryDate: addDays(1),
        status: "PLANNED",
        deliveryPoints: {
          create: [
            { address: "Тверь, ул. Коминтерна, 45", latitude: 56.8587, longitude: 35.9176, orderNumber: 1 }
          ]
        }
      }
    }),
    prisma.cargoRequest.create({
      data: {
        clientId: client2.id,
        cargoName: "Строительные материалы",
        weightKg: 4200,
        volume: 14.2,
        pickupAddress: "Москва, Новорязанское шоссе, 3",
        deliveryAddress: "Калуга, ул. Московская, 271",
        desiredDeliveryDate: addDays(3),
        status: "IN_PROGRESS",
        deliveryPoints: {
          create: [
            { address: "Калуга, ул. Московская, 271", latitude: 54.5146, longitude: 36.2612, orderNumber: 1 },
            { address: "Калуга, ул. Кирова, 21", latitude: 54.512, longitude: 36.246, orderNumber: 2 }
          ]
        }
      }
    }),
    prisma.cargoRequest.create({
      data: {
        clientId: client3.id,
        cargoName: "Мебель",
        weightKg: 1200,
        volume: 8.4,
        pickupAddress: "Химки, Вашутинское шоссе, 9",
        deliveryAddress: "Москва, Ленинградский проспект, 80",
        desiredDeliveryDate: addDays(2),
        status: "NEW",
        deliveryPoints: {
          create: [
            { address: "Москва, Ленинградский проспект, 80", latitude: 55.805, longitude: 37.515, orderNumber: 1 },
            { address: "Мытищи, ул. Мира, 15", latitude: 55.9105, longitude: 37.7363, orderNumber: 2 },
            { address: "Балашиха, проспект Ленина, 25", latitude: 55.7963, longitude: 37.9382, orderNumber: 3 }
          ]
        }
      }
    }),
    prisma.cargoRequest.create({
      data: {
        clientId: client1.id,
        cargoName: "Офисное оборудование",
        weightKg: 650,
        volume: 3.1,
        pickupAddress: "Москва, ул. Складочная, 12",
        deliveryAddress: "Москва, Пресненская наб., 10",
        desiredDeliveryDate: addDays(-2),
        status: "COMPLETED",
        deliveryPoints: {
          create: [
            { address: "Москва, Пресненская наб., 10", latitude: 55.7473, longitude: 37.5398, orderNumber: 1 }
          ]
        }
      }
    })
  ]);

  void request2;
  void request3;

  const plannedRoute = await prisma.route.create({
    data: {
      cargoRequestId: request1.id,
      driverId: driver1.id,
      vehicleId: gazelle.id,
      startAddress: request1.pickupAddress,
      endAddress: request1.deliveryAddress,
      distanceKm: 174,
      estimatedDuration: "3 ч 10 мин",
      plannedDate: addDays(1),
      status: "PLANNED",
      waypoints: {
        create: [
          { address: request1.pickupAddress, latitude: 55.7029, longitude: 37.4281, orderNumber: 1 },
          { address: "Волоколамское шоссе", latitude: 55.8317, longitude: 37.3896, orderNumber: 2 },
          { address: request1.deliveryAddress, latitude: 56.8587, longitude: 35.9176, orderNumber: 3 }
        ]
      }
    }
  });

  await prisma.waybill.create({
    data: {
      routeId: plannedRoute.id,
      number: `PL-${new Date().getFullYear()}-0001`,
      issueDate: new Date(),
      startMileage: 124300,
      plannedFuel: 21.75,
      status: "CREATED"
    }
  });

  const completedRoute = await prisma.route.create({
    data: {
      cargoRequestId: request4.id,
      driverId: driver2.id,
      vehicleId: ford.id,
      startAddress: request4.pickupAddress,
      endAddress: request4.deliveryAddress,
      distanceKm: 18,
      estimatedDuration: "55 мин",
      plannedDate: addDays(-2),
      status: "COMPLETED",
      waypoints: {
        create: [
          { address: request4.pickupAddress, latitude: 55.7998, longitude: 37.5898, orderNumber: 1 },
          { address: request4.deliveryAddress, latitude: 55.7473, longitude: 37.5398, orderNumber: 2 }
        ]
      }
    }
  });

  await prisma.waybill.create({
    data: {
      routeId: completedRoute.id,
      number: `PL-${new Date().getFullYear()}-0002`,
      issueDate: addDays(-2),
      departureTime: addDays(-2),
      returnTime: addDays(-2),
      startMileage: 88300,
      endMileage: 88321,
      plannedFuel: 1.94,
      actualFuel: 2.2,
      status: "COMPLETED"
    }
  });

  await prisma.route.create({
    data: {
      cargoRequestId: request2.id,
      driverId: driver3.id,
      vehicleId: man.id,
      startAddress: request2.pickupAddress,
      endAddress: request2.deliveryAddress,
      distanceKm: 188,
      estimatedDuration: "3 ч 40 мин",
      plannedDate: addDays(3),
      status: "IN_PROGRESS",
      waybill: {
        create: {
          number: `PL-${new Date().getFullYear()}-0003`,
          issueDate: new Date(),
          departureTime: new Date(),
          startMileage: 221900,
          plannedFuel: 34.97,
          status: "ACTIVE"
        }
      },
      waypoints: {
        create: [
          { address: request2.pickupAddress, latitude: 55.6525, longitude: 37.8895, orderNumber: 1 },
          { address: request2.deliveryAddress, latitude: 54.5146, longitude: 36.2612, orderNumber: 2 }
        ]
      }
    }
  });

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
