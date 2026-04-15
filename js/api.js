/**
 * API封装层 - 与后端 Cloudflare Workers API 完全对齐
 * 与小程序 miniprogram/utils/api.ts 功能100%对齐
 * 基础地址: https://syliwoks.fekepj.com/api
 */

const API_BASE_URL = 'https://syliwoks.fekepj.com/api';
const TOKEN_KEY = 'token';
const USER_KEY = 'userInfo';
const GUEST_ID_KEY = 'guest_id';
const MAX_RETRIES = 3; // 最大重试次数
const BASE_RETRY_DELAY_MS = 1500; // 基础重试间隔（毫秒），后续指数增长

// ====== 请求去重：防止同一URL+Method并发重复请求 ======
const pendingRequests = {};

// ====== 本地缓存：API失败时用缓存数据兜底 ======
// ★ 缓存key包含用户角色，防止不同权限的用户互相读到缓存数据
function getCacheKey(url, method) {
  const userInfo = getCurrentUserInfo();
  const role = userInfo?.role || 'guest';
  return `api_cache_${role}_${method}_${url}`;
}

function setApiCache(url, method, data) {
  try {
    localStorage.setItem(getCacheKey(url, method), JSON.stringify({ data, time: Date.now() }));
  } catch (e) { /* ignore */ }
}

function getApiCache(url, method) {
  try {
    const cached = JSON.parse(localStorage.getItem(getCacheKey(url, method)));
    if (cached && cached.data) {
      // 缓存有效期5分钟
      if (Date.now() - cached.time < 5 * 60 * 1000) return cached.data;
    }
  } catch (e) { /* ignore */ }
  return null;
}

/** 清除所有API缓存（登录/退出时调用，防止不同用户读到旧缓存） */
function clearApiCache() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('api_cache_')) localStorage.removeItem(key);
    });
  } catch (e) { /* ignore */ }
}

class ZupuAPI {
  constructor() {
    this.token = localStorage.getItem(TOKEN_KEY) || '';
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem(TOKEN_KEY, token);
  }

  clearToken() {
    this.token = '';
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  async request(url, method = 'GET', data = null) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        // 标准Authorization Bearer格式（后端主要从此处取token）
        'Authorization': this.token ? `Bearer ${this.token}` : ''
      }
    };

    let finalUrl = API_BASE_URL + url;

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    } else if (data && method === 'GET') {
      const params = new URLSearchParams();
      // GET请求也附带token参数作为备用
      if (this.token) params.append('token', this.token);
      for (const key in data) {
        if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
          params.append(key, data[key]);
        }
      }
      const queryString = params.toString();
      if (queryString) finalUrl += '?' + queryString;
    }

    // ★ 去重：同一请求如果正在pending，直接复用Promise
    // 对于GET请求，data已合并到URL查询参数中，所以用URL去重即可
    // 对于非GET请求，不同data不应去重，所以用URL+Method+data摘要去重
    const dataDigest = (method !== 'GET' && data) ? `:${JSON.stringify(data)}` : '';
    const dedupeKey = `${method}:${url}${dataDigest}`;
    if (pendingRequests[dedupeKey]) {
      return pendingRequests[dedupeKey];
    }

    const requestPromise = (async () => {
      try {
        let lastError = null;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            const res = await fetch(finalUrl, options);

            if (res.status === 401) {
              // ★ 游客不处理401（游客无token，/me等接口必然401，不应跳走）
              const userInfo = getCurrentUserInfo();
              const isGuestUser = userInfo && userInfo.role === 'guest';
              if (isGuestUser) {
                // 游客遇到401，静默忽略，不清除状态
                return { status: 'error', message: '游客无权限访问此接口', data: null };
              }
              // 非游客：清除登录态并跳转登录页
              this.clearToken();
              clearApiCache();
              window.location.hash = '#/login';
              throw new Error('登录已过期');
            }

            const json = await res.json();

            if (res.status === 200) {
              // GET请求成功后写入缓存
              if (method === 'GET') setApiCache(url, method, json);
              return json;
            }

            // 提取服务端返回的错误详情
            const errMsg = json.message || `请求失败: HTTP ${res.status}`;
            throw new Error(errMsg);
          } catch (error) {
            lastError = error;
            // 网络层面的连接关闭/超时错误才重试，业务错误不重试
            const isNetworkError = error.message && (
              error.message.includes('Failed to fetch') ||
              error.message.includes('NetworkError') ||
              error.message.includes('timeout') ||
              error.message.includes('ERR_CONNECTION_CLOSED')
            );
            if (isNetworkError && attempt < MAX_RETRIES) {
              // 指数退避：1.5s → 3s → 4.5s
              const delayMs = BASE_RETRY_DELAY_MS * attempt;
              await new Promise(r => setTimeout(r, delayMs));
              continue;
            }
            // 非网络错误或已达最大重试次数，检查是否有可用缓存
            const cached = getApiCache(url, method);
            if (cached !== null) return cached;
            throw error;
          }
        }
        throw lastError;
      } finally {
        // 请求完成（无论成功失败），从去重表中移除
        delete pendingRequests[dedupeKey];
      }
    })();

    pendingRequests[dedupeKey] = requestPromise;
    return requestPromise;
  }

  // ═══ 认证相关 ═══

  async login(username, password) {
    return this.request('/login', 'POST', { username, password });
  }

  async getMe() {
    return this.request('/me', 'GET');
  }

  async changePassword(newPassword, username) {
    return this.request('/change-password', 'POST', { new_password: newPassword, username });
  }

  async bindPhone(phone) {
    return this.request('/bind-phone', 'POST', { phone });
  }

  async updateProfile(data) {
    return this.request('/update-profile', 'POST', data);
  }

  // ═══ 微信登录（网页端扫码） ═══

  /** 获取微信扫码登录URL */
  async getWechatQrConnectUrl() {
    return this.request('/wechat/qr-connect-url', 'GET');
  }

  /** 轮询微信扫码状态 */
  async getWechatQrStatus(state) {
    return this.request('/wechat/qr-status', 'GET', { state });
  }

  /** 微信网页端登录 */
  async wechatWebLogin(code, state) {
    return this.request('/wechat/web-login', 'POST', { code, state });
  }

  // ═══ 人员相关 ═══

  async getPeople(params = {}) {
    const result = await this.request('/people', 'GET', params);
    return applyClientPrivacy(result);
  }

  async getPerson(id) {
    const result = await this.request(`/people/${id}`, 'GET');
    return applyClientPrivacySingle(result);
  }

  async addPerson(data) {
    return this.request('/people', 'POST', data);
  }

  async updatePerson(id, data) {
    return this.request(`/people/${id}`, 'PUT', data);
  }

  async deletePerson(id) {
    return this.request(`/people/${id}`, 'DELETE');
  }

  async getStats() {
    return this.request('/stats', 'GET');
  }

  async uploadFile(formData) {
    const options = {
      method: 'POST',
      headers: {
        'Authorization': this.token ? `Bearer ${this.token}` : ''
      },
      body: formData
    };
    try {
      const res = await fetch(API_BASE_URL + '/upload', options);
      return await res.json();
    } catch (e) {
      return { status: 'error', message: e.message };
    }
  }

  // ═══ 帐号管理 ═══

  async getAdminWxAccounts() {
    return this.request('/admin/wx-accounts', 'GET');
  }

  async verifyMember(liShiId, personId, phone) {
    return this.request('/verify-member', 'POST', { li_shi_id: liShiId, person_id: personId || undefined, phone: phone || undefined });
  }

  async unverifyMember(liShiId) {
    return this.request('/unverify-member', 'POST', { li_shi_id: liShiId });
  }

  async batchVerify(liShiIds) {
    return this.request('/admin/batch-verify', 'POST', { li_shi_ids: liShiIds });
  }

  async batchDeleteUsers(liShiIds) {
    return this.request('/admin/batch-delete-users', 'POST', { li_shi_ids: liShiIds });
  }

  async batchChangeRole(liShiIds, role) {
    return this.request('/admin/batch-change-role', 'POST', { li_shi_ids: liShiIds, role });
  }

  async changeRole(liShiId, role) {
    return this.request('/change-role', 'POST', { li_shi_id: liShiId, role });
  }

  async adminResetPassword(liShiId, newPassword) {
    return this.request('/admin/reset-password', 'POST', { li_shi_id: liShiId, new_password: newPassword });
  }

  async bindWechatPerson(personId) {
    return this.request('/wechat/bind-person', 'POST', { person_id: personId });
  }

  async createWechatBindToken(personId, expireHours, adminUsername) {
    return this.request('/wechat/create-bind-token', 'POST', {
      person_id: personId,
      expire_hours: expireHours || 24,
      admin_username: adminUsername || undefined
    });
  }

  // ═══ 字辈 ═══

  async getGenerationNames() {
    return this.request('/generation-names', 'GET');
  }

  async updateGenerationName(shiXi, name) {
    return this.request('/generation-names', 'PUT', { shi_xi: shiXi, name });
  }

  // ═══ 留言 ═══

  async getMessages() {
    const userInfo = getCurrentUserInfo();
    const isGuestUser = userInfo && userInfo.role === 'guest';
    if (isGuestUser) {
      const guestId = localStorage.getItem(GUEST_ID_KEY) || '';
      return this.request('/messages', 'GET', { guest_id: guestId });
    }
    return this.request('/messages', 'GET');
  }

  async createMessage(content, imageUrls) {
    const userInfo = getCurrentUserInfo();
    const isGuestUser = userInfo && userInfo.role === 'guest';
    const data = { content };
    if (isGuestUser) {
      data.guest_id = localStorage.getItem(GUEST_ID_KEY) || '';
    }
    if (imageUrls && imageUrls.length > 0) {
      data.image_urls = imageUrls;
    }
    return this.request('/messages', 'POST', data);
  }

  async deleteMessage(id) {
    return this.request(`/messages/${id}`, 'DELETE');
  }

  async replyMessage(id, reply) {
    return this.request('/messages/reply', 'POST', { id, reply });
  }

  async markMessageRead(id) {
    return this.request('/messages/mark-read', 'POST', { id });
  }

  async clearAllMessages() {
    return this.request('/messages/clear-all', 'POST');
  }

  async getUnreadMessageCount() {
    return this.request('/messages/unread-count', 'GET');
  }

  // ═══ 公告 ═══

  async getAnnouncements(page) {
    const params = {};
    if (page) params.page = page;
    return this.request('/announcements', 'GET', params);
  }

  async createAnnouncement(content, pages, scrollDuration, scrollEnabled) {
    return this.request('/announcements', 'POST', {
      content,
      pages,
      scroll_duration: scrollDuration || 8,
      scroll_enabled: scrollEnabled !== undefined ? scrollEnabled : 1
    });
  }

  async updateAnnouncement(id, data) {
    return this.request(`/announcements/${id}`, 'PUT', data);
  }

  async deleteAnnouncement(id) {
    return this.request(`/announcements/${id}`, 'DELETE');
  }

  // ═══ 祭拜祖先 ═══

  async getWorshipAncestors() {
    return this.request('/worship/ancestors', 'GET');
  }

  async offerIncense(ancestorId, count = 1) {
    return this.request('/worship/offer-incense', 'POST', { ancestor_id: ancestorId, count });
  }

  async getWorshipConfig() {
    return this.request('/worship/config', 'GET');
  }

  async updateWorshipConfig(config) {
    return this.request('/worship/config', 'PUT', config);
  }

  async getMyWorshipMerit() {
    return this.request('/worship/my-merit', 'GET');
  }

  async getWorshipMeritBoard(limit) {
    return this.request('/worship/merit-board', 'GET', { limit: limit || 50 });
  }

  async adminGetMeritList(search, sort) {
    const params = {};
    if (search) params.search = search;
    if (sort) params.sort = sort;
    return this.request('/worship/admin/merit-list', 'GET', params);
  }

  async adminAdjustMerit(meritId, action, amount, reason) {
    return this.request('/worship/admin/adjust-merit', 'POST', { merit_id: meritId, action, amount, reason: reason || '' });
  }

  async adminGetWorshipRecords(wxAccountId, limit) {
    return this.request('/worship/admin/records', 'GET', { wx_account_id: wxAccountId, limit: limit || 100 });
  }

  async getWorshipLogs() {
    return this.request('/worship/logs', 'GET');
  }

  async getWorshipRecentRecords(limit) {
    return this.request('/worship/recent-records', 'GET', { limit: limit || 50 });
  }

  // ═══ 设置 ═══

  async getGenealogyDesc() {
    return this.request('/settings/genealogy-desc', 'GET');
  }

  async updateGenealogyDesc(content) {
    return this.request('/settings/genealogy-desc', 'PUT', { content });
  }

  // ═══ 数据管理 ═══

  async getBackups() {
    return this.request('/backup', 'GET');
  }

  async exportData() {
    return this.request('/export', 'GET');
  }
}

const api = new ZupuAPI();

// ====== 通用UI工具函数 ======

function showToast(message, type = 'info') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = 'toast ' + type;
  toast.classList.remove('hidden');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.add('hidden'), 3000);
}

function showLoading() {
  let el = document.getElementById('loading');
  if (!el) {
    el = document.createElement('div');
    el.id = 'loading';
    el.className = 'loading-overlay';
    el.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><span>加载中...</span></div>';
    document.body.appendChild(el);
  }
  el.classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loading')?.classList.add('hidden');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const date = new Date(dateStr);
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return formatDate(dateStr);
}

/** 获取或创建游客ID */
function getOrCreateGuestId() {
  let guestId = localStorage.getItem(GUEST_ID_KEY) || '';
  if (!guestId) {
    guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem(GUEST_ID_KEY, guestId);
  }
  return guestId;
}

/** 获取或创建设备ID（与后端 wx_device_id 对齐，浏览器指纹+时间戳生成） */
function getOrCreateDeviceId() {
  let deviceId = localStorage.getItem('wx_device_id') || '';
  if (!deviceId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 10);
    deviceId = `web_${timestamp}_${random}`;
    localStorage.setItem('wx_device_id', deviceId);
  }
  return deviceId;
}

/** 公告变量模板渲染
 * 支持的变量：{{username}} 用户昵称, {{li_shi_id}} 李氏号, {{person_name}} 绑定人名, {{generation}} 字辈, {{shi_xi}} 世系
 * 与小程序 renderAnnouncementTemplate 逻辑一致
 */
function renderAnnouncementTemplate(content) {
  if (!content) return '';
  const userInfo = getCurrentUserInfo() || {};
  const replacements = {
    'username': userInfo.nickname || userInfo.displayName || userInfo.username || '用户',
    'li_shi_id': userInfo.li_shi_id || '未分配',
    'person_name': userInfo.personName || userInfo.person_name || '',
    'generation': userInfo.generation || '',
    'shi_xi': userInfo.shi_xi ? `${userInfo.shi_xi}世` : '',
  };
  return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return replacements[key] !== undefined ? replacements[key] : match;
  });
}

/** 上传留言图片（网页端File对象上传） */
async function uploadMessageImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('file_type', 'messages');
  const token = localStorage.getItem(TOKEN_KEY);
  try {
    const res = await fetch(API_BASE_URL + '/upload', {
      method: 'POST',
      headers: { 'Authorization': token ? `Bearer ${token}` : '' },
      body: formData
    });
    const json = await res.json();
    if (json.status === 'success') return json.url;
    throw new Error(json.message || '上传失败');
  } catch (e) {
    throw new Error(e.message || '上传失败');
  }
}

// ═══ 关键存储键汇总 ═══
// token          — JWT令牌
// userInfo       — 用户信息对象（role/nickname/personId/li_shi_id/loginType等）
// guest_id       — 游客ID（格式: guest_时间戳_随机数）
// wx_device_id   — 设备ID（格式: web_时间戳_随机数）
// last_wx_li_shi_id    — 上次微信登录李氏号
// last_wx_nickname     — 上次微信昵称
// last_wx_avatar_url   — 上次微信头像URL
// bind_token     — 分享绑定令牌
