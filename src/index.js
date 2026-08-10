const prisma = require('./db');

async function main() {
  const user = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@example.com'
    }
  });

  console.log(user);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });