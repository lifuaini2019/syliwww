/**
 * 隐私脱敏工具模块
 * 与小程序 miniprogram/utils/api.ts 中的脱敏逻辑完全一致
 * 前端双重脱敏：即使后端脱敏失效，前端也根据角色脱敏
 */

/** 简单字符串哈希（与后端 simpleHash 保持一致） */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).padStart(8, '0');
}

/**
 * 前端姓名脱敏（与后端 maskName 逻辑一致，双重保障）
 *  guest: 李*1, 李*A（隐藏最后2位）
 *  user:  张*（隐藏最后1位）
 *  member/admin/super_admin: 完整显示
 */
function maskName(name, role) {
  if (!name) return '';
  const r = role || getCurrentRole();
  if (r === 'guest') {
    if (name.length <= 1) return name;
    const chars = '123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const suffix = chars[Math.abs(simpleHash(name).charCodeAt(0)) % chars.length];
    return name[0] + '*' + suffix;
  }
  if (r === 'user') {
    if (name.length <= 1) return name;
    return name.slice(0, -1) + '*';
  }
  return name;
}

/**
 * 手机号脱敏：138****1234
 */
function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone || '';
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}

/**
 * 前端双重脱敏：对API返回的人员列表数据统一脱敏
 * 策略：member/admin/super_admin 不脱敏，guest/user 对 name/alias/spouse_name 等字段脱敏
 */
function applyClientPrivacy(apiResult) {
  if (!apiResult || apiResult.status !== 'success' || !apiResult.data) return apiResult;
  const role = getCurrentRole();
  if (role === 'member' || role === 'admin' || role === 'super_admin') return apiResult;

  const userInfo = getCurrentUserInfo();
  const myPersonId = userInfo?.personId || null;

  const data = apiResult.data.map(p => {
    const isSelf = myPersonId && String(p.id) === String(myPersonId) && role !== 'guest';
    if (isSelf) return p;

    const masked = { ...p };
    masked.name = maskName(p.name, role);
    masked.alias = maskName(p.alias, role);
    masked.spouse_name = maskName(p.spouse_name, role);
    if (masked.spouse_person) {
      masked.spouse_person = { ...masked.spouse_person, name: maskName(masked.spouse_person.name, role) };
    }
    if (role === 'guest') {
      masked.avatar = '';
      masked.spouse_avatar = '';
      masked.other_image = '';
      masked.spouse_other_image = '';
      if (masked.spouse_person) {
        masked.spouse_person.avatar = '';
        masked.spouse_person.other_image = '';
      }
    }
    return masked;
  });

  return { ...apiResult, data };
}

/** 前端双重脱敏：对单个人员数据脱敏 */
function applyClientPrivacySingle(apiResult) {
  if (!apiResult || apiResult.status !== 'success' || !apiResult.data) return apiResult;
  const role = getCurrentRole();
  if (role === 'member' || role === 'admin' || role === 'super_admin') return apiResult;

  const userInfo = getCurrentUserInfo();
  const myPersonId = userInfo?.personId || null;
  const p = apiResult.data;
  const isSelf = myPersonId && String(p.id) === String(myPersonId) && role !== 'guest';

  if (isSelf) return apiResult;

  const masked = { ...p };
  masked.name = maskName(p.name, role);
  masked.alias = maskName(p.alias, role);
  masked.spouse_name = maskName(p.spouse_name, role);
  if (masked.spouse_person) {
    masked.spouse_person = { ...masked.spouse_person, name: maskName(masked.spouse_person.name, role) };
  }
  if (role === 'guest') {
    masked.avatar = '';
    masked.spouse_avatar = '';
    masked.other_image = '';
    masked.spouse_other_image = '';
    if (masked.spouse_person) {
      masked.spouse_person.avatar = '';
      masked.spouse_person.other_image = '';
    }
  }

  return { ...apiResult, data: masked };
}

/** 获取当前用户信息 */
function getCurrentUserInfo() {
  try {
    const info = localStorage.getItem('userInfo');
    return info ? JSON.parse(info) : null;
  } catch (e) {
    return null;
  }
}

/** 获取当前用户角色 */
function getCurrentRole() {
  const userInfo = getCurrentUserInfo();
  return userInfo?.role || 'guest';
}

/** 判断是否已认证（member/admin/super_admin） */
function isVerifiedUser() {
  const role = getCurrentRole();
  return role === 'member' || role === 'admin' || role === 'super_admin';
}

/** 判断是否为游客 */
function isGuest() {
  return getCurrentRole() === 'guest';
}

/** 判断是否为管理员 */
function isAdmin() {
  const role = getCurrentRole();
  return role === 'admin' || role === 'super_admin';
}

/** 判断是否为超级管理员 */
function isSuperAdmin() {
  return getCurrentRole() === 'super_admin';
}

/** 判断是否是自己 */
function isSelf(person) {
  const userInfo = getCurrentUserInfo();
  if (!userInfo || !person) return false;
  return person.phone === userInfo.username || person.id === userInfo.personId;
}

/** 获取显示名称（带脱敏+我标记） */
function getDisplayName(person) {
  if (!person || !person.name) return '';
  const role = getCurrentRole();
  const self = isSelf(person);
  if (self && role !== 'guest') {
    return person.name + '(我)';
  }
  return maskName(person.name, role) + (self ? '(我)' : '');
}

/** 获取头像文字 */
function getAvatarText(person) {
  const name = person?.name || '未';
  return name.length > 1 ? name.substring(0, 1) : name;
}

/** 获取世系文字 */
function getGenerationText(shiXi) {
    if (!shiXi && shiXi !== 0) return '';
    return `第${shiXi}世`;
}

/**
 * 获取默认头像URL（内联SVG data URI）
 * 男性：蓝底深蓝剪影 / 女性：粉底深粉剪影
 * 与小程序 gender-avatar 组件逻辑一致
 */
function getDefaultAvatarUrl(gender) {
    const isFemale = gender === '女';
    const bg = isFemale ? '%23FFD6E8' : '%23D6EAFF';
    const fg = isFemale ? '%23E85A9A' : '%234A9EDE';

    // 简化人形剪影SVG
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect width="100" height="100" rx="50" fill="${bg}"/>
        <circle cx="50" cy="35" r="16" fill="${fg}"/>
        <ellipse cx="50" cy="78" rx="26" ry="22" fill="${fg}"/>
    </svg>`;

    return `data:image/svg+xml,${svg.replace(/\n/g, '').replace(/\s+/g, ' ')}`;
}

/**
 * 渲染性别头像HTML（与小程序 gender-avatar 组件对齐）
 * @param {Object} person - 人员对象
 * @param {string} className - CSS类名
 * @param {number} size - 尺寸px
 * @returns {string} HTML字符串
 */
function renderGenderAvatarHtml(person, className, size) {
    size = size || 40;
    const role = getCurrentRole();
    const isGuestMode = role === 'guest';
    const hasAvatar = person.avatar && !isGuestMode;

    if (hasAvatar) {
        return `<img class="gender-avatar ${className || ''}" src="${person.avatar}" alt="" style="width:${size}px;height:${size}px;">`;
    }

    const isFemale = person.gender === '女';
    const genderClass = isFemale ? 'female' : 'male';
    const initial = (person.name || '未')[0];

    return `<div class="gender-avatar ${genderClass} ${className || ''}" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.45)}px;">${initial}</div>`;
}
