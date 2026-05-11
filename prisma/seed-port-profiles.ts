import { prisma } from "../src/lib/db/client";

async function main() {
  const profiles = [
    {
      slug: "freeport",
      name: "Port Freeport",
      legalName: "Port Freeport",
      uei: "NM6LJHKFGCK5",
      ein: "74-6079025",
      entityType: "port_authority",
      location: { city: "Freeport", state: "Texas", stateCode: "TX" },
      locationData: {
        address: "1100 Cherry Street",
        city: "Freeport",
        stateCode: "TX",
        zip: "77541",
        congressionalDistrict: "TX-14",
      },
      leadership: {
        name: "Phyllis Saathoff",
        title: "Executive Director/CEO",
        phone: "(979) 233-2667",
        email: "psaathoff@portfreeport.com",
      },
    },
    {
      slug: "lawa",
      name: "Los Angeles World Airports",
      legalName: "Los Angeles World Airports",
      uei: "",
      ein: "",
      entityType: "airport_authority",
      location: { city: "Los Angeles", state: "California", stateCode: "CA" },
      locationData: {
        address: "1 World Way",
        city: "Los Angeles",
        stateCode: "CA",
        zip: "90045",
        congressionalDistrict: "CA-43",
      },
      leadership: {
        name: "",
        title: "",
        phone: "",
        email: "",
      },
    },
    {
      slug: "louisiana-gateway",
      name: "Louisiana Gateway",
      legalName: "Louisiana Gateway Terminal",
      uei: "",
      ein: "",
      entityType: "port_authority",
      location: { city: "Port Allen", state: "Louisiana", stateCode: "LA" },
      locationData: {
        address: "",
        city: "Port Allen",
        stateCode: "LA",
        zip: "70767",
        congressionalDistrict: "LA-06",
      },
      leadership: {
        name: "",
        title: "",
        phone: "",
        email: "",
      },
    },
  ];

  for (const p of profiles) {
    await prisma.portProfile.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        legalName: p.legalName,
        uei: p.uei,
        ein: p.ein,
        entityType: p.entityType,
        location: p.location,
        locationData: p.locationData,
        leadership: p.leadership,
      },
      create: {
        slug: p.slug,
        name: p.name,
        legalName: p.legalName,
        uei: p.uei,
        ein: p.ein,
        entityType: p.entityType,
        location: p.location,
        locationData: p.locationData,
        leadership: p.leadership,
      },
    });
    console.log(`Upserted PortProfile: ${p.slug}`);
  }

  const count = await prisma.portProfile.count();
  console.log(`Total PortProfile records: ${count}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
