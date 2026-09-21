/**
 * 第二阶段联调测试脚本：日记 CRUD + 照片上传/静态资源/详情/删除
 * 运行：node test/phase2-test.mjs
 */
const BASE = 'http://localhost:3000';
const username = `diary_test_${Date.now().toString(36)}`;
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

async function api(method, path, body, isForm = false) {
  const headers = { Authorization: `Bearer ${token}` };
  if (body && !isForm) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* 非 JSON 响应 */
  }
  return { status: res.status, json };
}

async function main() {
  console.log('=== 0. 注册并登录测试账号 ===');
  const reg = await api('POST', '/api/auth/register', {
    username,
    email: `${username}@test.com`,
    password: 'password123',
  });
  let loginRes;
  if (reg.status === 201 || reg.status === 200) {
    token = reg.json?.data?.token ?? reg.json?.data?.accessToken ?? '';
    if (!token) {
      loginRes = await api('POST', '/api/auth/login', { username, password: 'password123' });
      token = loginRes.json?.data?.token ?? loginRes.json?.data?.accessToken ?? '';
    }
    check('注册成功并获取 token', !!token);
  } else {
    // 用户名冲突等情况下直接登录已有账号
    loginRes = await api('POST', '/api/auth/login', { username, password: 'password123' });
    token = loginRes.json?.data?.token ?? loginRes.json?.data?.accessToken ?? '';
    check('登录获取 token', !!token, JSON.stringify(reg.json));
  }

  console.log('=== 1. 创建测试旅程 ===');
  const journeyRes = await api('POST', '/api/journeys', {
    title: '测试旅程-日记照片联调',
    destinations: ['杭州', '苏州'],
    startDate: '2026-09-10',
    endDate: '2026-09-15',
    tags: ['测试'],
  });
  check('创建旅程成功', journeyRes.status === 201 && journeyRes.json?.code === 200, JSON.stringify(journeyRes.json));
  const journeyId = journeyRes.json?.data?.id;
  if (!journeyId) {
    console.error('无法获取 journeyId，终止测试');
    process.exit(1);
  }
  console.log(`  journeyId = ${journeyId}`);

  console.log('=== 2. 日记创建（含心情/位置/富文本） ===');
  const createRes = await api('POST', '/api/diaries', {
    journeyId,
    date: '2026-09-11',
    title: '西湖边的一个下午',
    content: '<p>今天在<strong>西湖</strong>边坐了一下午，风吹过湖面的时候，柳絮也跟着飘了起来。</p>',
    mood: 'peaceful',
    locationName: '西湖·断桥',
  });
  check('创建日记成功', createRes.status === 201 && createRes.json?.code === 200, JSON.stringify(createRes.json));
  const diaryId = createRes.json?.data?.id;
  check('日记心情已保存', createRes.json?.data?.mood === 'peaceful');
  check('日记位置已保存', createRes.json?.data?.locationName === '西湖·断桥');
  check('日记内容已保存', typeof createRes.json?.data?.content === 'string' && createRes.json.data.content.includes('西湖'));

  console.log('=== 3. 日记详情（含 photos 数组） ===');
  const detailRes = await api('GET', `/api/diaries/${diaryId}`);
  check('获取日记详情成功', detailRes.status === 200 && detailRes.json?.data?.id === diaryId);
  check('日记包含空 photos 数组', Array.isArray(detailRes.json?.data?.photos));

  console.log('=== 4. 更新日记 ===');
  const updateRes = await api('PUT', `/api/diaries/${diaryId}`, {
    title: '西湖边的一个傍晚',
    mood: 'healed',
    content: '<p>傍晚的西湖更安静了。</p>',
  });
  check('更新日记成功', updateRes.status === 200 && updateRes.json?.data?.title === '西湖边的一个傍晚');
  check('心情已更新', updateRes.json?.data?.mood === 'healed');

  console.log('=== 5. 生成测试图片并上传 ===');
  // 用 sharp 生成一张 800x600 的测试 JPEG
  const sharp = (await import('sharp')).default;
  const jpegBuf = await sharp({
    create: { width: 800, height: 600, channels: 3, background: { r: 91, g: 140, b: 90 } },
  })
    .jpeg()
    .toBuffer();

  const form = new FormData();
  form.append('file', new Blob([jpegBuf], { type: 'image/jpeg' }), 'test-photo.jpg');
  form.append('journeyId', String(journeyId));
  form.append('diaryId', String(diaryId));
  const uploadRes = await api('POST', '/api/photos/upload', form, true);
  check('照片上传成功', uploadRes.status === 201 && uploadRes.json?.code === 200, JSON.stringify(uploadRes.json));
  const photo = uploadRes.json?.data;
  check('记录了图片尺寸', photo?.width === 800 && photo?.height === 600, `w=${photo?.width} h=${photo?.height}`);
  check('记录了文件大小', typeof photo?.fileSize === 'number' && photo.fileSize > 0);
  check('关联了日记', photo?.diaryId === diaryId);
  check('缩略图 URL 已生成', typeof photo?.thumbnailUrl === 'string' && photo.thumbnailUrl.includes('thumb_'));

  console.log('=== 6. 静态资源访问（原图 + 缩略图） ===');
  const origRes = await fetch(`${BASE}${photo.originalUrl}`);
  check('原图可访问', origRes.status === 200 && (origRes.headers.get('content-type') ?? '').includes('image'));
  const thumbRes = await fetch(`${BASE}${photo.thumbnailUrl}`);
  check('缩略图可访问', thumbRes.status === 200);
  const thumbBuf = Buffer.from(await thumbRes.arrayBuffer());
  const thumbMeta = await sharp(thumbBuf).metadata();
  check('缩略图宽度被压缩到 480', thumbMeta.width === 480, `实际宽度=${thumbMeta.width}`);
  check('缩略图为 JPEG 格式', thumbMeta.format === 'jpeg');

  console.log('=== 7. 日记详情包含照片 ===');
  const detailRes2 = await api('GET', `/api/diaries/${diaryId}`);
  check('日记 photos 数量 = 1', detailRes2.json?.data?.photos?.length === 1);
  check('照片信息含 thumbnailUrl', detailRes2.json?.data?.photos?.[0]?.thumbnailUrl === photo.thumbnailUrl);

  console.log('=== 8. 照片详情与权限校验 ===');
  const photoRes = await api('GET', `/api/photos/${photo.id}`);
  check('获取照片详情成功', photoRes.status === 200 && photoRes.json?.data?.id === photo.id);

  const noAuth = await fetch(`${BASE}/api/photos/${photo.id}`);
  check('无 token 访问照片返回 401', noAuth.status === 401);

  const badJourneyUpload = new FormData();
  badJourneyUpload.append('file', new Blob([jpegBuf], { type: 'image/jpeg' }), 'x.jpg');
  badJourneyUpload.append('journeyId', '999999');
  const badUpload = await api('POST', '/api/photos/upload', badJourneyUpload, true);
  check('上传到不存在的旅程返回 404', badUpload.status === 404, JSON.stringify(badUpload.json));

  const noFileForm = new FormData();
  noFileForm.append('journeyId', String(journeyId));
  const noFile = await api('POST', '/api/photos/upload', noFileForm, true);
  check('未上传文件返回 400', noFile.status === 400);

  console.log('=== 9. 删除照片 ===');
  const delPhotoRes = await api('DELETE', `/api/photos/${photo.id}`);
  check('删除照片成功', delPhotoRes.status === 200 && delPhotoRes.json?.code === 200);
  const photoGone = await api('GET', `/api/photos/${photo.id}`);
  check('删除后照片详情返回 404', photoGone.status === 404);

  console.log('=== 10. 封存旅程后的日记限制 ===');
  await api('POST', `/api/journeys/${journeyId}/archive`);
  const archivedCreate = await api('POST', '/api/diaries', {
    journeyId,
    date: '2026-09-12',
    title: '封存后写日记',
    content: '<p>应该被拒绝</p>',
  });
  check('封存旅程后创建日记返回 409', archivedCreate.status === 409, JSON.stringify(archivedCreate.json));
  const archivedUpdate = await api('PUT', `/api/diaries/${diaryId}`, { title: '封存后编辑' });
  check('封存旅程后编辑日记返回 409', archivedUpdate.status === 409);

  console.log('=== 11. 清理测试数据 ===');
  const delJourney = await api('DELETE', `/api/journeys/${journeyId}`);
  check('删除测试旅程（级联删除日记）', delJourney.status === 200);
  const diaryGone = await api('GET', `/api/diaries/${diaryId}`);
  check('级联删除日记成功', diaryGone.status === 404);

  console.log('\n========== 测试结果 ==========');
  console.log(`通过: ${passCount}，失败: ${failCount}`);
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('测试脚本异常:', err);
  process.exit(1);
});
