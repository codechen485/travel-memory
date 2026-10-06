import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

// 用 vi.hoisted 持有 mock 引用，避免 bcrypt 同步/异步重载导致的类型推断问题
const { hashMock, compareMock } = vi.hoisted(() => ({
  hashMock: vi.fn(),
  compareMock: vi.fn(),
}));

// 隔离原生 bcrypt 依赖（避免真实加解密的耗时与平台绑定）
vi.mock('bcrypt', () => ({
  hash: hashMock,
  compare: compareMock,
}));

import { AuthService } from './auth.service';

const sampleUser = {
  id: 7,
  username: 'tester',
  email: 't@example.com',
  password: 'hashed-password',
  avatar: 'http://x/a.png',
};

describe('AuthService', () => {
  const prisma = {
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  };
  const jwtService = { sign: vi.fn(() => 'jwt-token') };
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    jwtService.sign.mockReturnValue('jwt-token');
    hashMock.mockResolvedValue('hashed-password');
    compareMock.mockResolvedValue(true);
    service = new AuthService(prisma as never, jwtService as never);
  });

  describe('register', () => {
    const dto = { username: 'tester', email: 't@example.com', password: 'secret123' };

    it('用户名已存在应抛冲突异常', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(sampleUser);
      await expect(service.register(dto as never)).rejects.toThrow(ConflictException);
    });

    it('邮箱已被注册应抛冲突异常', async () => {
      prisma.user.findFirst
        .mockResolvedValueOnce(null) // 用户名不存在
        .mockResolvedValueOnce(sampleUser); // 邮箱已存在
      await expect(service.register(dto as never)).rejects.toThrow(ConflictException);
    });

    it('注册成功应加密密码、建用户并返回 token', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(sampleUser);

      const res = await service.register(dto as never);

      expect(hashMock).toHaveBeenCalledWith('secret123', 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { username: 'tester', email: 't@example.com', password: 'hashed-password' },
      });
      expect(jwtService.sign).toHaveBeenCalledWith({ sub: 7, username: 'tester' });
      expect(res.token).toBe('jwt-token');
      expect(res.userId).toBe(7);
      expect(res.username).toBe('tester');
      expect(res.email).toBe('t@example.com');
      expect(res.avatar).toBe('http://x/a.png');
    });
  });

  describe('login', () => {
    const dto = { username: 'tester', password: 'secret123' };

    it('用户不存在应抛未授权异常', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.login(dto as never)).rejects.toThrow(UnauthorizedException);
    });

    it('密码错误应抛未授权异常', async () => {
      prisma.user.findFirst.mockResolvedValue(sampleUser);
      compareMock.mockResolvedValueOnce(false);
      await expect(service.login(dto as never)).rejects.toThrow(UnauthorizedException);
    });

    it('登录成功应比对密码并返回 token', async () => {
      prisma.user.findFirst.mockResolvedValue(sampleUser);
      compareMock.mockResolvedValueOnce(true);

      const res = await service.login(dto as never);

      expect(compareMock).toHaveBeenCalledWith('secret123', 'hashed-password');
      expect(res.token).toBe('jwt-token');
      expect(res.userId).toBe(7);
    });
  });
});
