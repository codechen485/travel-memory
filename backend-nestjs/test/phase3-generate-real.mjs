/**
 * 真实 DeepSeek 生成验证脚本
 * 运行：node test/phase3-generate-real.mjs
 */
const BASE = 'http://localhost:3000';
const username = `ai_test_${Date.now().toString(36)}`;

async function api(method, path, body, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

async function main() {
  console.log('=== 1. 注册并获取 token ===');
  const reg = await api('POST', '/api/auth/register', {
    username,
    email: `${username}@test.com`,
    password: 'password123',
  });
  const token = reg.json?.data?.token ?? reg.json?.data?.accessToken ?? '';
  if (!token) {
    console.error('获取 token 失败:', JSON.stringify(reg.json));
    process.exit(1);
  }
  console.log('token 获取成功\n');

  console.log('=== 2. 创建测试旅程 ===');
  const journeyRes = await api(
    'POST',
    '/api/journeys',
    {
      title: 'AI 生成验证旅程',
      destinations: ['大理'],
      startDate: '2026-09-10',
      endDate: '2026-09-14',
    },
    token,
  );
  const journeyId = journeyRes.json?.data?.id;
  if (!journeyId) {
    console.error('创建旅程失败:', JSON.stringify(journeyRes.json));
    process.exit(1);
  }

  console.log('=== 3. 调用 AI 生成（海边 + 平静） ===');
  const t1 = Date.now();
  const gen1 = await api(
    'POST',
    '/api/copywritings/generate',
    { journeyId, sceneTag: 'seaside', mood: 'peaceful' },
    token,
  );
  const elapsed1 = ((Date.now() - t1) / 1000).toFixed(1);

  if (gen1.status !== 201 || gen1.json?.code !== 200) {
    console.error(`生成失败（status=${gen1.status}）:`, JSON.stringify(gen1.json));
    process.exit(1);
  }

  const g1 = gen1.json.data;
  console.log(`耗时 ${elapsed1}s，场景概括: ${g1.scene}\n`);
  console.log('【短句版】');
  console.log(`  ${g1.shortVersion}\n`);
  console.log('【叙事版】');
  console.log(`  ${g1.narrativeVersion}\n`);
  console.log('【诗意版】');
  console.log(`  ${g1.poeticVersion.replace(/\n/g, '\n  ')}\n`);

  console.log('=== 4. 再次生成（山巅 + 震撼） ===');
  const gen2 = await api(
    'POST',
    '/api/copywritings/generate',
    { journeyId, sceneTag: 'mountain', mood: 'amazed' },
    token,
  );
  if (gen2.status === 201 && gen2.json?.code === 200) {
    const g2 = gen2.json.data;
    console.log(`场景概括: ${g2.scene}`);
    console.log('【短句版】');
    console.log(`  ${g2.shortVersion}\n`);
    console.log('【诗意版】');
    console.log(`  ${g2.poeticVersion.replace(/\n/g, '\n  ')}\n`);
  } else {
    console.error('第二次生成失败:', JSON.stringify(gen2.json));
  }

  console.log('=== 5. 清理测试数据 ===');
  await api('DELETE', `/api/journeys/${journeyId}`, undefined, token);
  console.log('测试旅程已删除，验证完成 ✅');
}

main().catch((err) => {
  console.error('脚本异常:', err);
  process.exit(1);
});
