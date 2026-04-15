/**
 * API封装层 - 与后端 Cloudflare Workers API 完全对齐
 * 基础地址: https://syliwoks.fekepj.com/api
 */

const API_BASE_URL = 'https://syliwoks.fekepj.com/api';
const TOKEN_KEY = 'token';
const USER_KEY = 'userInfo';
const GUEST_ID_KEY = 'guest_id';

// ====== 请求去重 ======
const pendingRequests = {};

// ====== 本地缓存（API失败时兜底） ======
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
      if (Date.now() - cached.time < 5 * 60 * 1000) return cached.data;
    }
  } catch (e) { /* ignore */ }
  return null;
}

/** 清除所有API缓存（登录/退出时调用） */
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

    // 去重
    const dedupeKey = `${method}:${url}`;
    if (pendingRequests[dedupeKey]) {
      return pendingRequests[dedupeKey];
    }

    const requestPromise = (async () => {
      try {
        let lastError = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const res = await fetch(finalUrl, options);

            if (res.status === 401) {
              const userInfo = getCurrentUserInfo();
              const isGuestUser = userInfo && userInfo.role === 'guest';
              if (isGuestUser) {
                return { status: 'error', message: '游客无权限访问此接口', data: null };
              }
              this.clearToken();
              window.location.hash = '#/login';
              throw new Error('登录已过期');
            }

            const json = await res.json();

            if (res.status === 200) {
              if (method === 'GET') setApiCache(url, method, json);
              return json;
            }

            throw new Error(json.message || `请求失败: HTTP ${res.status}`);
          } catch (error) {
            lastError = error;
            const isNetworkError = error.message && (
              error.message.includes('Failed to fetch') ||
              error.message.includes('NetworkError') ||
              error.message.includes('timeout')
            );
            if (isNetworkError && attempt < 3) {
              await new Promise(r => setTimeout(r, 1500 * attempt));
              continue;
            }
            const cached = getApiCache(url, method);
            if (cached !== null) return cached;
            throw error;
          }
        }
        throw lastError;
      } finally {
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

  async createMessage(content) {
    const userInfo = getCurrentUserInfo();
    const isGuestUser = userInfo && userInfo.role === 'guest';
    const data = { content };
    if (isGuestUser) {
      data.guest_id = localStorage.getItem(GUEST_ID_KEY) || '';
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

  async createAnnouncement(content, pages, scrollDuration) {
    return this.request('/announcements', 'POST', { content, pages, scroll_duration: scrollDuration || 8 });
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

  async offerIncense(ancestorId, count) {
    return this.request('/worship/offer-incense', 'POST', { ancestor_id: ancestorId, count: count || 1 });
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

/** 获取或创建设备ID */
function getOrCreateDeviceId() {
  let deviceId = localStorage.getItem('web_device_id') || '';
  if (!deviceId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 10);
    deviceId = `web_${timestamp}_${random}`;
    localStorage.setItem('web_device_id', deviceId);
  }
  return deviceId;
}
