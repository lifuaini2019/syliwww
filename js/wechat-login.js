/**
 * 微信扫码登录模块
 * 
 * 方案一：使用微信开放平台网站应用扫码登录（PC端推荐）
 * 方案二（备选）：后端生成一个带scene_id的二维码，用户用微信扫码后打开小程序确认登录
 * 
 * 轮询间隔：2秒
 * 与小程序 wechat-login 逻辑对齐
 */

class WechatLogin {
  constructor() {
    this.pollTimer = null;
    this.state = null;
  }

  /**
   * 初始化微信扫码登录
   * @param {string} containerId - 放置二维码的容器ID
   */
  async init(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      // 尝试微信开放平台方式
      const result = await api.getWechatQrConnectUrl();
      if (result.status === 'success' && result.url) {
        this.state = result.state;
        this.renderWechatQrCode(container, result.url);
        this.startPolling();
        return;
      }
    } catch (e) {
      console.log('[微信登录] 开放平台方式不可用，使用备选方案');
    }

    // 备选方案：显示小程序码
    this.renderFallbackQrCode(container);
  }

  /** 渲染微信开放平台二维码 */
  renderWechatQrCode(container, url) {
    container.innerHTML = `
      <div class="wechat-qr-wrap">
        <div class="wechat-qr-header">
          <i class="fab fa-weixin wechat-icon"></i>
          <span>微信扫码登录</span>
        </div>
        <div class="wechat-qr-body">
          <iframe 
            src="${url}" 
            width="300" 
            height="400" 
            frameborder="0"
            sandbox="allow-scripts allow-same-origin"
            style="border: none;"
          ></iframe>
        </div>
        <div class="wechat-qr-tip">
          <p>请使用微信扫描二维码登录</p>
        </div>
      </div>
    `;
  }

  /** 备选方案：显示小程序码让用户扫码确认 */
  renderFallbackQrCode(container) {
    // 生成一个临时的scene_id
    this.state = 'web_login_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('wechat_login_state', this.state);

    container.innerHTML = `
      <div class="wechat-qr-wrap">
        <div class="wechat-qr-header">
          <i class="fab fa-weixin wechat-icon"></i>
          <span>微信扫码登录</span>
        </div>
        <div class="wechat-qr-body">
          <div class="wechat-qr-placeholder">
            <div class="qr-placeholder-icon">
              <i class="fas fa-qrcode"></i>
            </div>
            <p class="qr-placeholder-text">微信扫码登录</p>
            <p class="qr-placeholder-tip">请使用微信扫描小程序码<br>确认登录</p>
          </div>
        </div>
        <div class="wechat-qr-tip">
          <p>打开微信扫一扫，确认后即可登录</p>
        </div>
      </div>
    `;

    this.startPolling();
  }

  /** 开始轮询扫码状态（2秒间隔） */
  startPolling() {
    this.stopPolling();
    this.pollTimer = setInterval(async () => {
      try {
        const result = await api.getWechatQrStatus(this.state);
        if (result.status === 'success' && result.token) {
          this.stopPolling();
          // 扫码成功后自动登录
          api.setToken(result.token);
          const userInfo = result.user || {};
          const fullUserInfo = {
            username: userInfo.li_shi_id || '',
            name: userInfo.nickname || '微信用户',
            role: userInfo.role || 'user',
            verified: userInfo.verified || 0,
            personId: userInfo.person_id || '',
            li_shi_id: userInfo.li_shi_id || '',
            nickname: userInfo.nickname || '',
            avatar_url: userInfo.avatar_url || '',
            phone: userInfo.phone || '',
            loginType: 'wechat'
          };
          localStorage.setItem(USER_KEY, JSON.stringify(fullUserInfo));
          clearApiCache();

          // 保存上次微信登录信息
          localStorage.setItem('last_wx_li_shi_id', fullUserInfo.li_shi_id);
          localStorage.setItem('last_wx_nickname', fullUserInfo.nickname);
          localStorage.setItem('last_wx_avatar_url', fullUserInfo.avatar_url);

          // 获取完整用户信息
          try {
            const meRes = await api.getMe();
            if (meRes.status === 'success' && meRes.data) {
              const me = meRes.data;
              const updatedInfo = {
                ...fullUserInfo,
                nickname: me.nickname || fullUserInfo.nickname,
                avatar_url: me.avatar_url || fullUserInfo.avatar_url,
                phone: me.phone || fullUserInfo.phone,
                personId: me.person_summary?.id || fullUserInfo.personId,
                role: me.role || fullUserInfo.role,
                verified: me.verified || fullUserInfo.verified,
                li_shi_id: me.li_shi_id || fullUserInfo.li_shi_id,
                person_summary: me.person_summary
              };
              localStorage.setItem(USER_KEY, JSON.stringify(updatedInfo));
            }
          } catch (e) { /* 静默 */ }

          showToast('登录成功', 'success');
          setTimeout(() => {
            window.location.hash = '#/home';
            if (typeof app !== 'undefined') {
              app.currentUser = JSON.parse(localStorage.getItem(USER_KEY));
              app.showMainPage();
              app.updateUI();
              app.loadHomeData();
            }
          }, 500);
        } else if (result.status === 'expired') {
          this.stopPolling();
          showToast('二维码已过期，请刷新', 'error');
        }
      } catch (e) {
        // 静默，继续轮询
      }
    }, 2000);
  }

  /** 停止轮询 */
  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /** 销毁 */
  destroy() {
    this.stopPolling();
  }
}

const wechatLogin = new WechatLogin();
