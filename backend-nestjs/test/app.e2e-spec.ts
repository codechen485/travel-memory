import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { PrismaService } from '../src/prisma/prisma.service';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = testDatabaseUrl ? describe : describe.skip;

describeDatabase('认证与旅程归属 (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const marker = randomUUID().slice(0, 8);
  const users: string[] = [];

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.JWT_SECRET = 'e2e-test-secret-that-is-at-least-32-characters';
    const { AppModule } = await import('../src/app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (prisma && users.length) await prisma.user.deleteMany({ where: { username: { in: users } } });
    await app?.close();
  });

  it('注册、登录、创建旅程，并阻止另一用户读取该旅程', async () => {
    const usernameA = `e2e_a_${marker}`;
    const usernameB = `e2e_b_${marker}`;
    users.push(usernameA, usernameB);
    const first = await request(app.getHttpServer()).post('/api/auth/register').send({
      username: usernameA, email: `${usernameA}@example.test`, password: 'test-password-123',
    }).expect(201);
    const tokenA = first.body.data.token as string;
    const created = await request(app.getHttpServer()).post('/api/journeys')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: '端到端旅程', destinations: ['杭州'], startDate: '2026-10-01', endDate: '2026-10-02' })
      .expect(201);

    await request(app.getHttpServer()).post('/api/auth/register').send({
      username: usernameB, email: `${usernameB}@example.test`, password: 'test-password-123',
    }).expect(201);
    const login = await request(app.getHttpServer()).post('/api/auth/login')
      .send({ username: usernameB, password: 'test-password-123' }).expect(200);

    await request(app.getHttpServer()).get(`/api/journeys/${created.body.data.id}`)
      .set('Authorization', `Bearer ${login.body.data.token}`).expect(404);
  });
});
