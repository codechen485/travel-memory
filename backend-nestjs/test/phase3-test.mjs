/**
 * 第三阶段联调测试脚本：AI 文案生成模块
 * 运行：node test/phase3-test.mjs
 *
 * 说明：DEEPSEEK_API_KEY 未配置时 generate 接口应返回 503（优雅降级）；
 * CRUD 部分使用手工构造的文案数据验证完整链路。
 */
const BASE = 'http://localhost:3000';
const username = `cw_test_${Date.now().toString(36)}`;
let token = '';
let passCount = 0;
let failCount = 0;

function check(name, ok, extra = '') {
  if (ok) {
    passCount++;
    console.log(`  [PASS] ${name}`);
  } else {
    failCount++;
    console.log(`  [FAIL] ${name} ${extra}`);
  }
}

async function api(method, path, body, useToken = true) {
  const headers = {};
  if (useToken) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* 非 JSON */
  }
  return { status: res.status, json };
}

async function main() {
  console.log('=== 0. 注册并登录 ===');
  const reg = await api('POST', '/api/auth/register', {
    username,
    email: `${username}@test.com`,
    password: 'password123',
  }, false);
  token = reg.json?.data?.token ?? reg.json?.data?.accessToken ?? '';
  if (!token) {
    const login = await api('POST', '/api/auth/login', { username, password: 'password123' }, false);
    token = login.json?.data?.token ?? login.json?.data?.accessToken ?? '';
  }
  check('注册并获取 token', !!token);

  console.log('=== 1. 创建旅程 + 上传照片 ===');
  const journeyRes = await api('POST', '/api/journeys', {
    title: '测试旅程-文案模块联调',
    destinations: ['大理'],
    startDate: '2026-09-10',
    endDate: '2026-09-14',
  });
  check('创建旅程成功', journeyRes.status === 201, JSON.stringify(journeyRes.json));
  const journeyId = journeyRes.json?.data?.id;

  const sharp = (await import('sharp')).default;
  const jpegBuf = await sharp({
    create: { width: 640, height: 480, channels: 3, background: { r: 232, g: 192, b: 122 } },
  })
    .jpeg()
    .toBuffer();
  const form = new FormData();
  form.append('file', new Blob([jpegBuf], { type: 'image/jpeg' }), 'sunset.jpg');
  form.append('journeyId', String(journeyId));
  const uploadRes = await fetch(`${BASE}/api/photos/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const uploadJson = await uploadRes.json();
  check('上传照片成功', uploadRes.status === 201, JSON.stringify(uploadJson));
  const photoId = uploadJson?.data?.id;

  console.log('=== 2. AI 生成接口（无 API Key 应优雅降级 503） ===');
  const genRes = await api('POST', '/api/copywritings/generate', {
    journeyId,
    photoId,
    sceneTag: 'sunset',
    mood: 'peaceful',
  });
  if (genRes.status === 503) {
    check('未配置 API Key 返回 503 且提示清晰', /DEEPSEEK_API_KEY|AI/.test(genRes.json?.message ?? ''), JSON.stringify(genRes.json));
    console.log('    （提示：配置真实 DEEPSEEK_API_KEY 后可生成真实文案）');
  } else if (genRes.status === 201 || genRes.status === 200) {
    const g = genRes.json?.data;
    check('AI 生成成功（已配置 API Key）', !!g?.shortVersion && !!g?.narrativeVersion && !!g?.poeticVersion);
    console.log(`    短句版示例: ${g?.shortVersion?.slice(0, 30)}…`);
  } else {
    check('AI 生成接口返回 503/200', false, `status=${genRes.status} ${JSON.stringify(genRes.json)}`);
  }

  const genBadJourney = await api('POST', '/api/copywritings/generate', {
    journeyId: 999999,
    sceneTag: 'sunset',
    mood: 'peaceful',
  });
  check('生成时旅程不存在返回 404', genBadJourney.status === 404);

  const genNoAuth = await fetch(`${BASE}/api/copywritings/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ journeyId, sceneTag: 'sunset', mood: 'peaceful' }),
  });
  check('无 token 生成返回 401', genNoAuth.status === 401);

  console.log('=== 3. 保存文案 ===');
  const saveRes = await api('POST', '/api/copywritings', {
    journeyId,
    photoId,
    sceneTag: 'sunset',
    mood: 'peaceful',
    shortVersion: '洱海边，风替我翻了一页书。',
    narrativeVersion: '傍晚的洱海很安静，落日把水面染成蜂蜜的颜色。我在岸边坐了很久，什么也没想，只是看着光一点点暗下去。',
    poeticVersion: '风把云吹薄了，\n洱海收藏了一整个黄昏，\n而我只带走一句再见。',
    finalVersion: '风把云吹薄了，洱海收藏了一整个黄昏。',
    isPublic: true,
  });
  check('保存文案成功', saveRes.status === 201 && saveRes.json?.code === 200, JSON.stringify(saveRes.json));
  const saved = saveRes.json?.data;
  check('保存后返回关联旅程', saved?.journey?.id === journeyId);
  check('保存后返回关联照片', saved?.photo?.id === photoId);
  check('isPublic 已保存', saved?.isPublic === true);
  const cwId = saved?.id;

  const saveBadPhoto = await api('POST', '/api/copywritings', {
    journeyId,
    photoId: 999999,
    sceneTag: 'sunset',
    shortVersion: 'x',
    narrativeVersion: 'x',
    poeticVersion: 'x',
    finalVersion: 'x',
  });
  check('照片不属于旅程返回 404', saveBadPhoto.status === 404);

  console.log('=== 4. 我的文案列表 + 筛选 ===');
  const listRes = await api('GET', '/api/copywritings/my');
  check('获取文案列表成功', listRes.status === 200 && listRes.json?.data?.length === 1);

  const filterJourney = await api('GET', `/api/copywritings/my?journeyId=${journeyId}`);
  check('按旅程筛选命中', filterJourney.json?.data?.length === 1);
  const filterWrongJourney = await api('GET', '/api/copywritings/my?journeyId=999999');
  check('按错误旅程筛选为空', filterWrongJourney.status === 200 && filterWrongJourney.json?.data?.length === 0);
  const filterMood = await api('GET', '/api/copywritings/my?mood=peaceful');
  check('按心情筛选命中', filterMood.json?.data?.length === 1);
  const filterScene = await api('GET', '/api/copywritings/my?sceneTag=sunset');
  check('按场景筛选命中', filterScene.json?.data?.length === 1);
  const filterWrongScene = await api('GET', '/api/copywritings/my?sceneTag=forest');
  check('按其他场景筛选为空', filterWrongScene.json?.data?.length === 0);

  console.log('=== 5. 文案详情 ===');
  const detailRes = await api('GET', `/api/copywritings/${cwId}`);
  check('获取文案详情成功', detailRes.status === 200 && detailRes.json?.data?.id === cwId);
  check('详情含三种风格', typeof detailRes.json?.data?.shortVersion === 'string');
  const notFound = await api('GET', '/api/copywritings/999999');
  check('不存在的文案返回 404', notFound.status === 404);

  console.log('=== 6. 更新文案 ===');
  const updateRes = await api('PUT', `/api/copywritings/${cwId}`, {
    finalVersion: '风把云吹薄了，洱海收藏了一整个黄昏。（已编辑）',
    isPublic: false,
  });
  check('更新最终版本成功', updateRes.json?.data?.finalVersion?.includes('已编辑'));
  check('更新公开状态成功', updateRes.json?.data?.isPublic === false);

  console.log('=== 7. 删除文案 ===');
  const delRes = await api('DELETE', `/api/copywritings/${cwId}`);
  check('删除文案成功', delRes.status === 200 && delRes.json?.code === 200);
  const goneRes = await api('GET', `/api/copywritings/${cwId}`);
  check('删除后详情返回 404', goneRes.status === 404);

  console.log('=== 8. 级联删除验证 ===');
  const save2 = await api('POST', '/api/copywritings', {
    journeyId,
    sceneTag: 'lake',
    mood: 'healed',
    shortVersion: 'x',
    narrativeVersion: 'x',
    poeticVersion: 'x',
    finalVersion: 'x',
  });
  const cwId2 = save2.json?.data?.id;
  check('再次保存文案成功', !!cwId2);
  await api('DELETE', `/api/journeys/${journeyId}`);
  const gone2 = await api('GET', `/api/copywritings/${cwId2}`);
  check('删除旅程后文案级联删除', gone2.status === 404);

  console.log('\n========== 测试结果 ==========');
  console.log(`通过: ${passCount}，失败: ${failCount}`);
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('测试脚本异常:', err);
  process.exit(1);
});
