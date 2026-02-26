import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de premios...');

  // Crear premios de ejemplo
  const prizes = [
    {
      title: 'Balón Oficial Scribe',
      description: 'Balón oficial de fútbol profesional con el logo de Scribe. Tamaño 5, perfecto para jugar con tus amigos.',
      imageUrl: 'https://via.placeholder.com/400x300/ce0e2d/ffffff?text=Bal%C3%B3n+Scribe',
      pointsRequired: 5000,
      stock: 50,
      isActive: true,
    },
    {
      title: 'Jersey del Equipo',
      description: 'Jersey oficial del equipo de la temporada actual. Incluye nombre y número personalizados.',
      imageUrl: 'https://via.placeholder.com/400x300/ce0e2d/ffffff?text=Jersey+Scribe',
      pointsRequired: 8000,
      stock: 30,
      isActive: true,
    },
    {
      title: 'Boletos para Partido VIP',
      description: '2 boletos VIP para el próximo partido en casa. Incluye acceso a palco y buffet.',
      imageUrl: 'https://via.placeholder.com/400x300/ce0e2d/ffffff?text=Boletos+VIP',
      pointsRequired: 15000,
      stock: 10,
      isActive: true,
    },
    {
      title: 'Gorra Scribe Edición Especial',
      description: 'Gorra bordada con diseño exclusivo de Scribe. Edición limitada.',
      imageUrl: 'https://via.placeholder.com/400x300/ce0e2d/ffffff?text=Gorra+Scribe',
      pointsRequired: 3000,
      stock: 100,
      isActive: true,
    },
    {
      title: 'Mochila Deportiva Scribe',
      description: 'Mochila deportiva de alta calidad con compartimentos especiales para balón y zapatos.',
      imageUrl: 'https://via.placeholder.com/400x300/ce0e2d/ffffff?text=Mochila+Scribe',
      pointsRequired: 6000,
      stock: 40,
      isActive: true,
    },
  ];

  for (const prize of prizes) {
    await prisma.prize.create({
      data: prize,
    });
  }

  console.log('✅ Seed completado exitosamente');
  console.log(`📦 Se crearon ${prizes.length} premios`);
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
