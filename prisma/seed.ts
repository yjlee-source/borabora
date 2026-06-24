import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.hotel.count();
  if (count > 0) return;

  await prisma.hotel.createMany({
    data: [
      {
        brand: "MARRIOTT",
        name: "The Westin Josun Seoul",
        region: "Seoul, Korea",
        officialUrl: "https://www.marriott.com/",
        googleUrl: "https://www.google.com/travel/hotels",
        bookingUrl: "https://www.booking.com/",
        agodaUrl: "https://www.agoda.com/",
        expediaUrl: "https://www.expedia.com/Hotel-Search",
        hotelsUrl: "https://www.hotels.com/Hotel-Search"
      },
      {
        brand: "HILTON",
        name: "Conrad Seoul",
        region: "Seoul, Korea",
        officialUrl: "https://www.hilton.com/",
        googleUrl: "https://www.google.com/travel/hotels",
        bookingUrl: "https://www.booking.com/",
        agodaUrl: "https://www.agoda.com/",
        expediaUrl: "https://www.expedia.com/Hotel-Search",
        hotelsUrl: "https://www.hotels.com/Hotel-Search"
      },
      {
        brand: "HYATT",
        name: "Grand Hyatt Seoul",
        region: "Seoul, Korea",
        officialUrl: "https://www.hyatt.com/",
        googleUrl: "https://www.google.com/travel/hotels",
        bookingUrl: "https://www.booking.com/",
        agodaUrl: "https://www.agoda.com/",
        expediaUrl: "https://www.expedia.com/Hotel-Search",
        hotelsUrl: "https://www.hotels.com/Hotel-Search"
      },
      {
        brand: "ACCOR",
        name: "Fairmont Ambassador Seoul",
        region: "Seoul, Korea",
        officialUrl: "https://all.accor.com/",
        googleUrl: "https://www.google.com/travel/hotels",
        bookingUrl: "https://www.booking.com/",
        agodaUrl: "https://www.agoda.com/",
        expediaUrl: "https://www.expedia.com/Hotel-Search",
        hotelsUrl: "https://www.hotels.com/Hotel-Search"
      }
    ]
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
