import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.educationalContent.createMany({
    data: [
      {
        title: "Nutrition During Pregnancy",
        description: "Learn what to eat to keep you and your baby healthy.",
        contentType: "youtube_video",
        contentUrl: "https://www.youtube.com/watch?v=kYJvYg25k4A",
        thumbnailUrl: "https://img.youtube.com/vi/kYJvYg25k4A/0.jpg",
        category: "Nutrition",
      },
      {
        title: "Identifying Danger Signs",
        description: "Important warning signs during pregnancy you should not ignore.",
        contentType: "article_text",
        contentBody: "### Danger Signs\\n1. **Vaginal Bleeding**\\n2. **Severe Headache**\\n3. **Blurry Vision**\\nIf you experience any of these, contact your facility immediately.",
        category: "Safety",
      },
      {
        title: "Breastfeeding Basics",
        description: "A quick guide to starting your breastfeeding journey.",
        contentType: "youtube_video",
        contentUrl: "https://www.youtube.com/watch?v=JmEqA-f-kEQ",
        thumbnailUrl: "https://img.youtube.com/vi/JmEqA-f-kEQ/0.jpg",
        category: "Newborn Care",
      }
    ],
  });
  console.log("Seeded educational content.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
