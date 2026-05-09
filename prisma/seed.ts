import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

async function upsertUser(name: string, email: string, role: Role) {
  const passwordHash = await bcrypt.hash('Password123!', 10);

  return prisma.user.upsert({
    where: { email },
    update: { name, role, passwordHash, isDeleted: false, deletedAt: null },
    create: { name, email, role, passwordHash }
  });
}

async function main() {
  const admin = await upsertUser('Admin Demo', 'admin@example.com', Role.admin);
  await upsertUser('Staff Demo', 'staff@example.com', Role.staff);
  await upsertUser('Customer Demo', 'customer@example.com', Role.customer);

  const categories = await Promise.all(
    ['Eletronicos', 'Casa e Cozinha', 'Esportes'].map((name) =>
      prisma.category.upsert({
        where: { slug: slugify(name) },
        update: { name, updatedById: admin.id, isDeleted: false, deletedAt: null },
        create: {
          name,
          slug: slugify(name),
          description: `Categoria demo: ${name}`,
          createdById: admin.id,
          updatedById: admin.id
        }
      })
    )
  );

  const products = [
    ['Fone Bluetooth Pulse', 199.9, 35, categories[0].id],
    ['Teclado Mecanico Compact', 349.9, 18, categories[0].id],
    ['Mouse Pro Wireless', 259.9, 22, categories[0].id],
    ['Monitor 27 Polegadas', 1299.9, 9, categories[0].id],
    ['Panela Antiaderente', 129.9, 28, categories[1].id],
    ['Cafeteira Compacta', 219.9, 16, categories[1].id],
    ['Kit Facas Inox', 89.9, 40, categories[1].id],
    ['Organizador Modular', 74.9, 50, categories[1].id],
    ['Garrafa Termica Sport', 69.9, 60, categories[2].id],
    ['Tapete Yoga Pro', 119.9, 24, categories[2].id],
    ['Halter Ajustavel', 499.9, 12, categories[2].id],
    ['Mochila Treino', 159.9, 26, categories[2].id]
  ] as const;

  for (const [name, price, stockQuantity, categoryId] of products) {
    await prisma.product.upsert({
      where: { slug: slugify(name) },
      update: { price, stockQuantity, categoryId, updatedById: admin.id, isDeleted: false, deletedAt: null },
      create: {
        name,
        slug: slugify(name),
        description: `Produto demo: ${name}`,
        price,
        stockQuantity,
        categoryId,
        imageUrl: `https://placehold.co/800x600?text=${encodeURIComponent(name)}`,
        createdById: admin.id,
        updatedById: admin.id
      }
    });
  }
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
