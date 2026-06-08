-- CreateTable
CREATE TABLE "CargoDeliveryPoint" (
    "id" SERIAL NOT NULL,
    "cargoRequestId" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "orderNumber" INTEGER NOT NULL,

    CONSTRAINT "CargoDeliveryPoint_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CargoDeliveryPoint" ADD CONSTRAINT "CargoDeliveryPoint_cargoRequestId_fkey" FOREIGN KEY ("cargoRequestId") REFERENCES "CargoRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
