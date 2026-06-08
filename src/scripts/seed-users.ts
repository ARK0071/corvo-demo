import { prisma } from "../lib/db/client";

const PORTS = ["freeport", "lawa", "louisiana-gateway", "polestar-defense", "freeport-demo", "burns-engineering"];

const USER_TEMPLATES = [
  { email: "drafter@{port}.demo", name: "Alex Drafter", title: "Grants Accountant", role: "drafter" },
  { email: "reviewer@{port}.demo", name: "Pat Reviewer", title: "Grants Director", role: "reviewer" },
  { email: "cfo@{port}.demo", name: "Jamie Certifier", title: "Chief Financial Officer", role: "certifying_official" },
];

async function seedUsers() {
  for (const portId of PORTS) {
    for (const template of USER_TEMPLATES) {
      const email = template.email.replace("{port}", portId);
      await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          portId,
          email,
          name: template.name,
          title: template.title,
          role: template.role,
        },
      });
      console.log(`  Seeded ${email}`);
    }
  }
  console.log("Done seeding users.");
}

seedUsers().catch(console.error).finally(() => prisma.$disconnect());
