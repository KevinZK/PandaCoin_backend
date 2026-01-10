import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始创建测试数据...');

  // 创建测试用户
  const hashedPassword = await bcrypt.hash('123456', 10);
  
  const testUser = await prisma.user.upsert({
    where: { email: 'test@pandacoin.com' },
    update: {
      password: hashedPassword,
    },
    create: {
      email: 'test@pandacoin.com',
      password: hashedPassword,
      name: '测试用户',
      authType: 'email',
    },
  });

  console.log('✅ 测试用户创建成功:', testUser.email);
}

main()
  .catch((e) => {
    console.error('❌ Seed 失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
