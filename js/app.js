/**
 * 上院李十七世族谱 - 网页端主应用
 * 与小程序功能100%对齐
 */

class ZupuApp {
    constructor() {
        this.currentUser = null;
        this.peopleData = [];
        this.peopleDict = {};
        this.selectedTreePerson = null;
        this.selectedBaotaPerson = null;
        this.treeZoom = 100;
        this.baotaZoom = 100;
        this.treeMode = 'vertical';
        this.isDragging = false;
        this.dragStartX = 0; this.dragStartY = 0;
        this.scrollStartX = 0; this.scrollStartY = 0;
        this.annTimers = {};
        this.annCurrentIndex = {};
        this.peopleFilters = { hideDead: false, hideFemale: false, onlyAfter17: false };
        this.adminAccounts = [];
        this.adminFilter = 'all';
        this.adminLoginSortDir = 0;
        this.adminSelectedIds = new Set();
        this.worshipAncestors = [];
        this.worshipFilterShiXi = 0;
        this.worshipSortMode = 'default';
        this.worshipBurning = false;
        this.worshipBurnSeq = 0;
        this.worshipLiveRankTimer = null;
        this.homeUnreadCount = 0;
        this._navParams = {};
        this._msgImageUrls = [];
        this.init();
    }

    init() { this.bindEvents(); this.checkLogin(); }

    bindEvents() {
        const $ = id => document.getElementById(id);
        // 登录
        $('login-btn')?.addEventListener('click', () => this.login());
        $('guest-btn')?.addEventListener('click', () => this.guestLogin());
        $('login-password')?.addEventListener('keypress', e => e.key === 'Enter' && this.login());
        $('get-qr-btn')?.addEventListener('click', () => this.initWechatLogin());
        document.querySelectorAll('.login-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.login-tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(`login-${tab.dataset.tab}`)?.classList.add('active');
            });
        });
        // 电脑端登录区两个同时显示，手机端Tab切换
        this._updateLoginLayout();
        window.addEventListener('resize', () => this._updateLoginLayout());
        // 侧边栏
        $('menu-toggle')?.addEventListener('click', () => this.toggleSidebar());
        $('sidebar-close')?.addEventListener('click', () => this.closeSidebar());
        $('overlay')?.addEventListener('click', () => this.closeSidebar());
        // 菜单
        document.querySelectorAll('.menu-item').forEach(item => item.addEventListener('click', () => item.dataset.page && this.navigateTo(item.dataset.page)));
        document.querySelectorAll('.tab-item').forEach(tab => tab.addEventListener('click', () => tab.dataset.page && this.navigateTo(tab.dataset.page)));
        // 人员列表
        $('people-search')?.addEventListener('input', () => this.filterPeople());
        // 世系图
        $('tree-zoom-in')?.addEventListener('click', () => this.zoomTree(10));
        $('tree-zoom-out')?.addEventListener('click', () => this.zoomTree(-10));
        $('tree-reset')?.addEventListener('click', () => this.resetTreeZoom());
        $('tree-mode-vertical')?.addEventListener('click', () => this.setTreeMode('vertical'));
        $('tree-mode-horizontal')?.addEventListener('click', () => this.setTreeMode('horizontal'));
        $('close-tree-panel')?.addEventListener('click', () => this.closeTreePanel());
        $('btn-add-father')?.addEventListener('click', () => this.addRelative('father'));
        $('btn-add-son')?.addEventListener('click', () => this.addRelative('son'));
        $('btn-add-spouse')?.addEventListener('click', () => this.addRelative('spouse'));
        $('btn-add-sibling')?.addEventListener('click', () => this.addRelative('sibling'));
        $('btn-edit-person')?.addEventListener('click', () => this.editSelectedTreePerson());
        $('btn-view-person')?.addEventListener('click', () => this.viewSelectedTreePerson());
        // 宝塔树
        $('baota-zoom-in')?.addEventListener('click', () => this.zoomBaota(10));
        $('baota-zoom-out')?.addEventListener('click', () => this.zoomBaota(-10));
        $('baota-reset')?.addEventListener('click', () => this.resetBaotaZoom());
        $('show-before-17')?.addEventListener('change', e => this.loadBaota(e.target.checked));
        $('close-baota-panel')?.addEventListener('click', () => this.closeBaotaPanel());
        $('baota-btn-add-son')?.addEventListener('click', () => this.addBaotaRelative('son'));
        $('baota-btn-add-spouse')?.addEventListener('click', () => this.addBaotaRelative('spouse'));
        $('baota-btn-edit-person')?.addEventListener('click', () => this.editSelectedBaotaPerson());
        $('baota-btn-view-person')?.addEventListener('click', () => this.viewSelectedBaotaPerson());
        $('baota-btn-bind-person')?.addEventListener('click', () => this.bindSelectedBaotaPerson());
        // 留言
        $('msg-compose-input')?.addEventListener('input', e => { $('msg-char-count').textContent = `${e.target.value.length}/500`; });
        $('msg-submit-btn')?.addEventListener('click', () => this.submitMessage());
        $('msg-clear-all-btn')?.addEventListener('click', () => this.clearAllMessages());
        $('msg-img-btn')?.addEventListener('click', () => $('msg-img-input')?.click());
        $('msg-img-input')?.addEventListener('change', e => this.handleMessageImage(e));
        // 公告
        $('add-announcement-btn')?.addEventListener('click', () => this.openAnnouncementEditor());
        // 帐号管理
        $('admin-search')?.addEventListener('input', () => this.filterAdminAccounts());
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const filter = tab.dataset.filter;
                if (filter === 'login_sort') { this.adminLoginSortDir = (this.adminLoginSortDir % 2) + 1; }
                else { this.adminFilter = filter; this.adminLoginSortDir = 0; }
                this.filterAdminAccounts();
            });
        });
        $('batch-verify-btn')?.addEventListener('click', () => this.batchVerify());
        $('batch-delete-btn')?.addEventListener('click', () => this.batchDeleteUsers());
        $('batch-role-btn')?.addEventListener('click', () => this.batchChangeRole());
        // 祭拜筛选
        document.querySelectorAll('.worship-filter-bar .filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.worship-filter-bar .filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.worshipFilterShiXi = parseInt(btn.dataset.shixi);
                this.filterWorshipAncestors();
            });
        });
        document.querySelectorAll('.worship-sort-bar .sort-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.worship-sort-bar .sort-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.worshipSortMode = btn.dataset.sort;
                this.filterWorshipAncestors();
            });
        });
        $('worship-search')?.addEventListener('input', () => this.filterWorshipAncestors());
        // 弹窗关闭
        document.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', () => this.closeAllModals()));
        $('confirm-cancel')?.addEventListener('click', () => this.closeModal('confirm-modal'));
    }

    // ═══ 工具函数 ═══
    isSpouse(p) { return !!(p.spouse_of_id && String(p.spouse_of_id) !== '0' && p.spouse_of_id !== ''); }
    isAlive(p) { return p.is_alive !== 0 && !p.death_date; }

    getRoleLabel(role) {
        return { guest: '匿名游客', user: '未认证', member: '家族成员', admin: '管理员', super_admin: '超管员' }[role] || role;
    }

    renderGenderAvatar(person, className, size) {
        return renderGenderAvatarHtml(person, className, size);
    }

    renderAnnouncementTemplate(content) {
        if (!content) return '';
        const u = this.currentUser || {};
        const personId = u.personId || u.person_id;
        const person = personId ? this.peopleDict[personId] : null;
        return content
            .replace(/\{\{username\}\}/g, u.nickname || u.username || '')
            .replace(/\{\{li_shi_id\}\}/g, u.li_shi_id || '')
            .replace(/\{\{person_name\}\}/g, person ? person.name : '')
            .replace(/\{\{generation\}\}/g, person ? (person.generation || '') : '')
            .replace(/\{\{shi_xi\}\}/g, person ? `第${person.shi_xi}世` : '');
    }

    showConfirm(title, message, onOk) {
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;
        document.getElementById('confirm-ok').onclick = () => { this.closeModal('confirm-modal'); onOk(); };
        this.showModal('confirm-modal');
    }

    showModal(id) { this.closeAllModals(); document.getElementById(id)?.classList.remove('hidden'); }
    closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }
    closeAllModals() { document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden')); }
    closeDynamicModal() { this.closeModal('dynamic-modal'); }

    toggleSidebar() { document.getElementById('sidebar')?.classList.toggle('open'); document.getElementById('overlay')?.classList.toggle('show'); }
    closeSidebar() { document.getElementById('sidebar')?.classList.remove('open'); document.getElementById('overlay')?.classList.remove('show'); }

    // ═══ 登录 ═══
    checkLogin() {
        const token = localStorage.getItem('token');
        const userInfo = localStorage.getItem('userInfo');
        const urlParams = new URLSearchParams(window.location.search);
        const bindToken = urlParams.get('bind_token');
        if (bindToken) localStorage.setItem('bind_token', bindToken);
        if (token && userInfo) {
            try { this.currentUser = JSON.parse(userInfo); api.setToken(token); this.showMainPage(); this.updateUI(); this.loadHomeData(); }
            catch (e) { this.showLoginPage(); }
        } else { this.showLoginPage(); }
    }

    showLoginPage() { document.getElementById('login-page')?.classList.remove('hidden'); document.getElementById('main-page')?.classList.add('hidden'); }
    showMainPage() { document.getElementById('login-page')?.classList.add('hidden'); document.getElementById('main-page')?.classList.remove('hidden'); }

    /** 更新登录页布局（电脑端两栏都显示，手机端Tab切换） */
    _updateLoginLayout() {
        const isDesktop = window.innerWidth >= 768;
        const wechatContent = document.getElementById('login-wechat');
        const accountContent = document.getElementById('login-account');
        if (isDesktop) {
            // 电脑端：两个区域都显示
            if (wechatContent) wechatContent.classList.add('active');
            if (accountContent) accountContent.classList.add('active');
        } else {
            // 手机端：按Tab切换
            const activeTab = document.querySelector('.login-tab.active');
            if (activeTab) {
                const tabName = activeTab.dataset.tab;
                if (wechatContent) wechatContent.classList.toggle('active', tabName === 'wechat');
                if (accountContent) accountContent.classList.toggle('active', tabName === 'account');
            }
        }
    }

    async login() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        if (!username || !password) { showToast('请输入用户名和密码', 'error'); return; }
        showLoading();
        try {
            const res = await api.login(username, password);
            if (res.status === 'success') {
                this.currentUser = { username: res.username || username, role: res.role || 'user', verified: res.verified || 0, personId: res.personId || '', li_shi_id: res.li_shi_id || '', loginType: 'admin_password' };
                api.setToken(res.token);
                localStorage.setItem(USER_KEY, JSON.stringify(this.currentUser));
                clearApiCache();
                try {
                    const meRes = await api.getMe();
                    if (meRes.status === 'success' && meRes.data) {
                        const me = meRes.data;
                        this.currentUser = { ...this.currentUser, nickname: me.nickname || '', avatar_url: me.avatar_url || '', phone: me.phone || username, personId: me.person_summary?.id || this.currentUser.personId, role: me.role || this.currentUser.role, verified: me.verified || 0, li_shi_id: me.li_shi_id || this.currentUser.li_shi_id, person_summary: me.person_summary };
                        localStorage.setItem(USER_KEY, JSON.stringify(this.currentUser));
                    }
                } catch (e) {}
                this.showMainPage(); this.updateUI(); this.loadHomeData();
                showToast('登录成功', 'success');
                // 检查是否有待绑定的bind_token
                this.checkBindToken();
            } else { showToast(res.message || '登录失败', 'error'); }
        } catch (e) { showToast('登录失败: ' + e.message, 'error'); }
        finally { hideLoading(); }
    }

    guestLogin() {
        const guestId = getOrCreateGuestId();
        this.currentUser = { username: '游客', role: 'guest', loginType: 'guest', guest_id: guestId };
        localStorage.setItem(USER_KEY, JSON.stringify(this.currentUser));
        clearApiCache();
        this.showMainPage(); this.updateUI(); this.loadHomeData();
        showToast('以游客身份浏览', 'info');
    }

    async initWechatLogin() { await wechatLogin.init('wechat-qr-container'); }

    logout() {
        this.showConfirm('退出登录', '确定退出当前账号吗？', () => {
            api.clearToken(); this.currentUser = null; this.peopleData = []; this.peopleDict = {}; clearApiCache();
            this.stopAllAnnTimers(); this.showLoginPage();
        });
    }

    onHeaderUserClick() { this.navigateTo('me'); }

    /** 检查并处理bind_token分享绑定 */
    async checkBindToken() {
        const bindToken = localStorage.getItem('bind_token');
        if (!bindToken || isGuest()) return;
        try {
            // bind_token 绑定逻辑：如果当前用户未绑定人物，自动绑定
            if (!this.currentUser?.personId) {
                const res = await api.bindWechatPerson(null); // 先确认当前绑定状态
                // bind_token通常由后端在首次登录时自动处理
                // 这里仅清除本地存储
            }
            localStorage.removeItem('bind_token');
        } catch (e) {
            localStorage.removeItem('bind_token');
        }
    }

    // ═══ UI更新 ═══
    updateUI() {
        if (!this.currentUser) return;
        const role = this.currentUser.role || 'guest';
        const isAdminRole = role === 'admin' || role === 'super_admin';
        const isSuperAdminRole = role === 'super_admin';
        const isGuestUser = role === 'guest';

        const displayName = this.getDisplayName();
        document.getElementById('username-display').textContent = displayName;
        const roleTag = document.getElementById('role-display');
        if (roleTag) { roleTag.textContent = this.getRoleLabel(role); roleTag.className = `role-tag-small role-tag-${role}`; }
        const liShiDisplay = document.getElementById('li-shi-display');
        if (liShiDisplay) liShiDisplay.textContent = this.currentUser.li_shi_id ? `李氏号: ${this.currentUser.li_shi_id}` : '';
        const peopleMenuText = document.getElementById('people-menu-text');
        if (peopleMenuText) peopleMenuText.textContent = isAdminRole ? '人员管理' : '人员列表';

        document.querySelectorAll('.admin-only').forEach(el => { el.classList.toggle('hidden', !isAdminRole); el.classList.toggle('show', isAdminRole); });
        document.querySelectorAll('.super-admin-only').forEach(el => { el.classList.toggle('hidden', !isSuperAdminRole); });
        document.querySelectorAll('.worship-menu-item,.worship-menu-home').forEach(el => { el.classList.toggle('hidden', isGuestUser); });

        const messagesTitle = document.getElementById('messages-title');
        if (messagesTitle) messagesTitle.textContent = isAdminRole ? '管理留言' : '给管理者留言';
        const addBtn = document.getElementById('add-person-btn');
        if (addBtn) addBtn.classList.toggle('hidden', !isAdminRole);
    }

    getDisplayName() {
        if (!this.currentUser) return '';
        if (this.currentUser.role === 'guest') return '游客';
        const personId = this.currentUser.personId || this.currentUser.person_id;
        if (personId && this.peopleDict[personId]) return `${this.peopleDict[personId].name}兄弟`;
        return this.currentUser.nickname || this.currentUser.username || '';
    }

    // ═══ 导航 ═══
    navigateTo(page, params = {}) {
        this.closeSidebar();
        document.querySelectorAll('.menu-item').forEach(item => item.classList.toggle('active', item.dataset.page === page));
        document.querySelectorAll('.tab-item').forEach(tab => tab.classList.toggle('active', tab.dataset.page === page));
        document.querySelectorAll('.content-section').forEach(section => section.classList.add('hidden'));
        const targetSection = document.getElementById(`${page}-section`);
        if (targetSection) targetSection.classList.remove('hidden');
        this._navParams = params;

        // 根据页面加载对应数据
        const loaders = {
            home: () => this.loadHomeData(), people: () => this.loadPeople(), tree: () => this.loadTree(),
            baota: () => this.loadBaota(true), 'generation-names': () => this.loadGenerationNames(),
            'gen-stats': () => this.loadGenStats(), messages: () => this.loadMessages(),
            'announcement-manage': () => this.loadAnnouncementManage(), 'announcement-board': () => this.loadAnnouncementBoard(),
            'admin-accounts': () => this.loadAdminAccounts(), worship: () => this.loadWorship(),
            'worship-admin': () => this.loadWorshipAdmin(), 'worship-live-rank': () => this.loadWorshipLiveRank(),
            'worship-merit-rank': () => this.loadWorshipMeritRank(), me: () => this.loadMe(),
            'person-detail': () => { if (params.id) this.loadPersonDetail(params.id); },
            'person-edit': () => this.loadPersonEdit(params)
        };
        if (loaders[page]) loaders[page]();
        window.scrollTo(0, 0);
    }

    // ═══ 首页 ═══
    async loadHomeData() {
        showLoading();
        try {
            const peopleRes = await api.getPeople();
            if (peopleRes.status === 'success') { this.peopleData = peopleRes.data || []; this.buildPeopleDict(); this.updateHomeStats(); this.renderRecentPeople(); }
            this.loadAnnouncementsForPage('index', 'announcement-bar', 'ann-scroll-area', 'ann-text', 'ann-dots');
            this.loadUnreadMsgCount();
        } catch (e) { showToast('加载失败', 'error'); }
        finally { hideLoading(); }
    }

    buildPeopleDict() { this.peopleDict = {}; this.peopleData.forEach(p => { this.peopleDict[p.id] = p; }); }

    updateHomeStats() {
        const people = this.peopleData;
        const nonSp = people.filter(p => !this.isSpouse(p));
        const maleCount = nonSp.filter(p => p.gender === '男').length;
        const femaleCount = nonSp.filter(p => p.gender === '女').length;
        const shiXis = nonSp.map(p => parseInt(p.shi_xi)).filter(x => !isNaN(x));
        const genSet = new Set(shiXis);
        const totalPeople = people.length;

        document.getElementById('stat-total').textContent = totalPeople;
        document.getElementById('stat-male').textContent = maleCount;
        document.getElementById('stat-female').textContent = femaleCount;
        document.getElementById('stat-gen').textContent = shiXis.length > 0 ? (Math.max(...shiXis) - Math.min(...shiXis) + 1) : 0;
        document.getElementById('gen-entry-count').textContent = `共${genSet.size}个世代 · ${totalPeople}人`;

        // 17世后统计
        const pMap = {}; people.forEach(p => { pMap[String(p.id)] = p; });
        const after17 = people.filter(p => parseInt(p.shi_xi) >= 17 && !this.isSpouse(p));
        const totalMale = after17.filter(p => p.gender === '男').length;
        const aliveMale = after17.filter(p => p.gender === '男' && this.isAlive(p)).length;
        const unmarriedMale = after17.filter(p => p.gender === '男' && this.isAlive(p) && (p.is_married === 0 || !p.is_married)).length;
        const aliveGensSet = new Set(after17.filter(p => this.isAlive(p)).map(p => parseInt(p.shi_xi) || 0).filter(x => x >= 17));
        const sortedAliveGens = Array.from(aliveGensSet).sort((a, b) => a - b);
        const aliveGenCount = sortedAliveGens.length > 0 ? (sortedAliveGens[sortedAliveGens.length - 1] - sortedAliveGens[0] + 1) : 0;

        const isAfter17 = (p) => { if (this.isSpouse(p)) { const h = pMap[String(p.spouse_of_id)]; return h && (parseInt(h.shi_xi) || 0) >= 17; } return (parseInt(p.shi_xi) || 0) >= 17; };
        const aliveTotal = people.filter(p => isAfter17(p) && this.isAlive(p)).length;
        const aliveSpouse = people.filter(p => this.isSpouse(p) && isAfter17(p) && this.isAlive(p)).length;

        document.getElementById('after17-male').textContent = totalMale;
        document.getElementById('after17-alive').textContent = aliveMale;
        document.getElementById('after17-unmarried').textContent = unmarriedMale;
        document.getElementById('after17-gens').textContent = aliveGenCount;
        document.getElementById('after17-alive-total').textContent = aliveTotal;
        document.getElementById('after17-alive-spouse').textContent = aliveSpouse;
    }

    renderRecentPeople() {
        const container = document.getElementById('recent-people-list');
        if (!container) return;
        const after17 = this.peopleData.filter(p => parseInt(p.shi_xi) >= 17 && !this.isSpouse(p));
        const recent = after17.slice(-5).reverse();
        if (recent.length === 0) { container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">暂无17世后数据</p>'; return; }
        container.innerHTML = recent.map(p => `
            <div class="recent-item" onclick="app.navigateTo('person-detail',{id:${p.id}})">
                ${this.renderGenderAvatar(p, 'recent-avatar')}
                <div class="recent-info">
                    <div class="recent-name">${getDisplayName(p)}</div>
                    <div class="recent-meta">${p.generation ? `字辈:${p.generation} ` : ''}第${p.shi_xi}世${p.ranking ? ' · ' + p.ranking : ''}</div>
                </div>
                <span class="alive-dot ${this.isAlive(p) ? 'alive' : 'dead'}"></span>
            </div>
        `).join('');
    }

    async loadUnreadMsgCount() {
        if (!isAdmin()) return;
        try {
            const res = await api.getUnreadMessageCount();
            if (res.status === 'success') {
                const count = res.count || 0; this.homeUnreadCount = count;
                const badge = document.getElementById('home-unread-badge');
                if (badge) { badge.style.display = count > 0 ? 'inline' : 'none'; badge.textContent = count > 99 ? '99+' : count; }
                const sidebarBadge = document.getElementById('sidebar-unread-badge');
                if (sidebarBadge) { sidebarBadge.classList.toggle('hidden', count === 0); sidebarBadge.textContent = count > 99 ? '99+' : count; }
                const tabBadge = document.getElementById('tab-unread-badge');
                if (tabBadge) { tabBadge.classList.toggle('hidden', count === 0); tabBadge.textContent = count > 99 ? '99+' : count; }
            }
        } catch (e) {}
    }

    // ═══ 公告系统 ═══
    async loadAnnouncementsForPage(pageKey, barId, scrollAreaId, textId, dotsId) {
        try {
            const res = await api.getAnnouncements(pageKey);
            if (res.status === 'success') {
                const anns = (res.data || []).filter(a => {
                    if (a.is_active != 1) return false;
                    const pagesStr = a.pages || '';
                    if (!pagesStr) return true;
                    return pagesStr.split(',').map(s => s.trim()).filter(s => s).includes(pageKey);
                }).map(a => {
                    const content = a.content || '';
                    const se = a.scroll_enabled !== undefined ? a.scroll_enabled : 1;
                    return { ...a, needScroll: se === 1 && content.length > 20, scrollDuration: (a.scroll_duration && a.scroll_duration > 0) ? a.scroll_duration : 8, scrollEnabled: se, renderedContent: this.renderAnnouncementTemplate(content) };
                });
                const key = pageKey;
                this.annCurrentIndex[key] = 0;
                this[`anns_${key}`] = anns;
                const bar = document.getElementById(barId);
                if (!bar) return;
                if (anns.length === 0) { bar.classList.add('hidden'); return; }
                bar.classList.remove('hidden');
                this.renderAnnouncementContent(key, barId, scrollAreaId, textId, dotsId);
                this.startAnnTimer(key, barId, scrollAreaId, textId, dotsId);
            }
        } catch (e) { console.error('公告加载失败:', e); }
    }

    renderAnnouncementContent(key, barId, scrollAreaId, textId, dotsId) {
        const anns = this[`anns_${key}`] || [];
        const idx = this.annCurrentIndex[key] || 0;
        const ann = anns[idx];
        if (!ann) return;
        const textEl = document.getElementById(textId);
        if (textEl) {
            const content = ann.renderedContent || ann.content;
            if (ann.needScroll) {
                textEl.className = 'ann-text ann-scrolling';
                textEl.style.animationDuration = ann.scrollDuration + 's';
            } else {
                textEl.className = 'ann-text';
                textEl.style.animationDuration = '';
            }
            textEl.textContent = content;
        }
        const dotsEl = document.getElementById(dotsId);
        if (dotsEl && anns.length > 1) {
            dotsEl.innerHTML = anns.map((a, i) => `<div class="ann-dot ${i === idx ? 'active' : ''}"></div>`).join('');
        }
    }

    startAnnTimer(key, barId, scrollAreaId, textId, dotsId) {
        this.stopAnnTimer(key);
        const anns = this[`anns_${key}`] || [];
        if (anns.length <= 1) return;
        const scheduleNext = () => {
            const idx = this.annCurrentIndex[key] || 0;
            const current = anns[idx];
            const delay = current ? (current.scrollDuration || 8) * 1000 : 8000;
            this.annTimers[key] = setTimeout(() => {
                this.annCurrentIndex[key] = ((this.annCurrentIndex[key] || 0) + 1) % anns.length;
                this.renderAnnouncementContent(key, barId, scrollAreaId, textId, dotsId);
                this.startAnnTimer(key, barId, scrollAreaId, textId, dotsId);
            }, delay);
        };
        scheduleNext();
    }

    stopAnnTimer(key) { if (this.annTimers[key]) { clearTimeout(this.annTimers[key]); delete this.annTimers[key]; } }
    stopAllAnnTimers() { Object.keys(this.annTimers).forEach(k => this.stopAnnTimer(k)); }

    // ═══ 人员列表 ═══
    async loadPeople() {
        showLoading();
        try {
            const res = await api.getPeople();
            if (res.status === 'success') {
                this.peopleData = res.data || []; this.buildPeopleDict();
                const params = this._navParams || {};
                this.peopleFilters = { hideDead: false, hideFemale: false, onlyAfter17: false, filterShiXi: params.filterShiXi ? String(params.filterShiXi) : '', filterAlive: !!params.filterAlive, filterMale: !!params.filterMale, filterSpouse: !!params.filterSpouse, filterFemale: !!params.filterFemale };
                this.updateFilterButtons(); this.filterPeople();
            }
            this.loadAnnouncementsForPage('people', 'people-announcement-bar', 'people-ann-scroll-area', 'people-ann-text');
        } catch (e) { showToast('加载失败', 'error'); }
        finally { hideLoading(); }
    }

    togglePeopleFilter(name) { this.peopleFilters[name] = !this.peopleFilters[name]; this.updateFilterButtons(); this.filterPeople(); }

    updateFilterButtons() {
        const f = this.peopleFilters;
        const set = (id, active, aText, iText) => { const b = document.getElementById(id); if (b) { b.classList.toggle('active', active); b.textContent = active ? aText : iText; } };
        set('filter-dead-toggle', f.hideDead, '健故通显', '隐藏已故');
        set('filter-female-toggle', f.hideFemale, '男女通显', '隐藏女性');
        set('filter-before17-toggle', f.onlyAfter17, '全部世代', '只显17世后');
    }

    filterPeople() {
        const search = document.getElementById('people-search')?.value.toLowerCase() || '';
        const f = this.peopleFilters;
        const filtered = this.peopleData.filter(p => {
            if (search && !((p.name && p.name.toLowerCase().includes(search)) || (p.alias && p.alias.toLowerCase().includes(search)) || (p.generation && p.generation.toLowerCase().includes(search)))) return false;
            if (f.hideDead && !this.isAlive(p)) return false;
            if (f.hideFemale && p.gender === '女' && !this.isSpouse(p)) return false;
            if (f.onlyAfter17 && parseInt(p.shi_xi) < 17 && !this.isSpouse(p)) return false;
            if (f.filterShiXi && String(p.shi_xi) !== f.filterShiXi) return false;
            if (f.filterAlive && !this.isAlive(p)) return false;
            if (f.filterMale && p.gender !== '男') return false;
            if (f.filterSpouse && !this.isSpouse(p)) return false;
            if (f.filterFemale && (p.gender !== '女' || this.isSpouse(p))) return false;
            return true;
        });
        this.renderPeopleList(filtered);
    }

    renderPeopleList(people) {
        const container = document.getElementById('people-list');
        if (!container) return;
        if (people.length === 0) { container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">暂无数据</p>'; return; }
        container.innerHTML = people.map(p => {
            const spouse = this.isSpouse(p);
            const father = p.father_id ? this.peopleDict[p.father_id] : null;
            const fatherName = father ? father.name : (p.father_name || '');
            return `
            <div class="person-card" onclick="app.navigateTo('person-detail',{id:${p.id}})">
                <div class="card-header">
                    ${this.renderGenderAvatar(p, 'person-avatar')}
                    <div class="person-main">
                        <div class="person-name">${getDisplayName(p)}${p.alias ? `(${p.alias})` : ''}</div>
                        <div class="person-meta">
                            ${spouse ? '<span class="spouse-tag">配偶</span>' : ''}
                            ${p.generation && !spouse ? `<span class="gen-tag">${p.generation}</span>` : ''}
                            ${p.shi_xi && !spouse ? `第${p.shi_xi}世` : ''}
                            ${fatherName ? ` · ${fatherName}之子` : ''}
                        </div>
                    </div>
                    <span class="alive-dot ${this.isAlive(p) ? 'alive' : 'dead'}"></span>
                </div>
            </div>`;
        }).join('');
    }

    // ═══ 人员详情 ═══
    async loadPersonDetail(id) {
        showLoading();
        try {
            const res = await api.getPerson(id);
            if (res.status === 'success') this.renderPersonDetail(res.data);
            else showToast(res.message || '加载失败', 'error');
        } catch (e) { showToast('加载失败', 'error'); }
        finally { hideLoading(); }
    }

    renderPersonDetail(p) {
        const container = document.getElementById('person-detail-content');
        if (!container) return;
        const spouse = this.isSpouse(p);
        const alive = this.isAlive(p);
        const father = p.father_id ? this.peopleDict[p.father_id] : null;
        const children = this.peopleData.filter(c => c.father_id == p.id);
        const role = getCurrentRole();
        const canEdit = isAdmin() || isSelf(p);
        const canDelete = isAdmin() && children.length === 0;
        const canBind = !isGuest() && isVerifiedUser() && !isAdmin() && !isSelf(p);
        const canUnbind = !isAdmin() && this.currentUser?.personId && String(p.id) === String(this.currentUser.personId);

        const calcAge = (b, d) => { if (!b) return null; const by = parseInt(b.substring(0,4)); if (isNaN(by)) return null; const dy = d ? parseInt(d.substring(0,4)) : new Date().getFullYear(); return isNaN(dy) ? null : dy - by; };
        const deathAge = calcAge(p.birth_date, p.death_date);

        container.innerHTML = `
        <div class="detail-back-bar">
            <button class="btn btn-small btn-outline" onclick="app.navigateTo('people')"><i class="fas fa-arrow-left"></i> 返回</button>
            ${canEdit ? `<button class="btn btn-small btn-primary" onclick="app.navigateTo('person-edit',{id:${p.id}})"><i class="fas fa-edit"></i> 编辑</button>` : ''}
        </div>
        <div class="detail-header">
            ${this.renderGenderAvatar(p, 'detail-avatar', 80)}
            <h2>${getDisplayName(p)}</h2>
            <p>${p.generation && !spouse ? `字辈: ${p.generation} · ` : ''}${p.shi_xi && !spouse ? `第${p.shi_xi}世` : ''}</p>
            <div class="detail-badges">
                <span class="badge" style="background:${p.gender==='男'?'#dbeafe':'#fce7f3'};color:${p.gender==='男'?'#1e40af':'#be185d'};">${p.gender}</span>
                <span class="badge ${alive?'badge-alive':'badge-deceased'}">${alive?'健在':'已逝'}</span>
                ${p.ranking?`<span class="badge" style="background:#e0e7ff;color:#4338ca;">${p.ranking}</span>`:''}
            </div>
        </div>
        <div class="card">
            <h3><i class="fas fa-info-circle"></i> 基本信息</h3>
            <div class="detail-grid">
                ${p.alias?`<div class="detail-item"><div class="detail-item-label">别名</div><div class="detail-item-value">${p.alias}</div></div>`:''}
                <div class="detail-item"><div class="detail-item-label">排行</div><div class="detail-item-value">${p.ranking||'-'}</div></div>
                <div class="detail-item"><div class="detail-item-label">父亲</div><div class="detail-item-value">${father?`<a href="javascript:app.navigateTo('person-detail',{id:${father.id}})">${getDisplayName(father)}</a>`:'-'}</div></div>
                <div class="detail-item"><div class="detail-item-label">出生</div><div class="detail-item-value">${p.birth_date||'-'}${p.birth_calendar?`(${p.birth_calendar})`:''}</div></div>
                ${!alive?`<div class="detail-item"><div class="detail-item-label">去世</div><div class="detail-item-value">${p.death_date||'-'}${p.death_calendar?`(${p.death_calendar})`:''}</div></div>`:''}
                ${deathAge!==null?`<div class="detail-item"><div class="detail-item-label">享年</div><div class="detail-item-value">${deathAge}岁</div></div>`:''}
                <div class="detail-item"><div class="detail-item-label">籍贯</div><div class="detail-item-value">${p.birth_place||'-'}</div></div>
                <div class="detail-item"><div class="detail-item-label">现居地</div><div class="detail-item-value">${p.live_place||'-'}</div></div>
                ${p.move_info?`<div class="detail-item"><div class="detail-item-label">迁出</div><div class="detail-item-value">${p.move_info}</div></div>`:''}
                ${p.remark?`<div class="detail-item"><div class="detail-item-label">备注</div><div class="detail-item-value">${p.remark}</div></div>`:''}
            </div>
        </div>
        ${p.bio?`<div class="card"><h3><i class="fas fa-file-alt"></i> 生平简介</h3><p style="font-size:14px;color:var(--text-secondary);line-height:1.8;">${p.bio}</p></div>`:''}
        ${p.spouse_name||p.spouse_person?`
        <div class="card"><h3><i class="fas fa-heart"></i> 配偶信息</h3><div class="detail-grid">
            <div class="detail-item"><div class="detail-item-label">配偶</div><div class="detail-item-value">${p.spouse_person?`<a href="javascript:app.navigateTo('person-detail',{id:${p.spouse_person.id}})">${maskName(p.spouse_person.name,role)}</a>`:(maskName(p.spouse_name,role)||'-')}</div></div>
            ${p.spouse_person?`<div class="detail-item"><div class="detail-item-label">配偶生日</div><div class="detail-item-value">${p.spouse_person.birth_date||'-'}</div></div>
            <div class="detail-item"><div class="detail-item-label">配偶状态</div><div class="detail-item-value">${this.isAlive(p.spouse_person)?'健在':'已逝'}</div></div>`:''}
        </div></div>`:''}
        ${children.length>0?`
        <div class="card"><h3><i class="fas fa-users"></i> 子女 (${children.length}人)</h3>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">${children.map(c=>`<span class="badge badge-alive" style="cursor:pointer;" onclick="app.navigateTo('person-detail',{id:${c.id}})">${getDisplayName(c)}</span>`).join('')}</div></div>`:''}
        <div class="detail-actions">
            ${canBind?`<button class="btn btn-primary" onclick="app.bindPerson(${p.id})"><i class="fas fa-link"></i> 绑定此人物</button>`:''}
            ${canUnbind?`<button class="btn btn-outline" onclick="app.unbindPerson()"><i class="fas fa-unlink"></i> 解绑人物</button>`:''}
            ${canDelete?`<button class="btn btn-danger" onclick="app.deletePerson(${p.id})"><i class="fas fa-trash"></i> 删除</button>`:''}
            ${isAdmin()?`<button class="btn btn-outline" onclick="app.createBindToken(${p.id})"><i class="fas fa-share-alt"></i> 邀请链接</button>`:''}
        </div>`;
    }

    async bindPerson(personId) {
        showLoading();
        try {
            const res = await api.bindWechatPerson(personId);
            if (res.status === 'success') { showToast('绑定成功', 'success'); this.currentUser.personId = personId; localStorage.setItem(USER_KEY, JSON.stringify(this.currentUser)); this.navigateTo('person-detail', { id: personId }); }
            else showToast(res.message || '绑定失败', 'error');
        } catch (e) { showToast('绑定失败', 'error'); }
        finally { hideLoading(); }
    }

    async unbindPerson() {
        this.showConfirm('解绑人物', '确定解绑当前绑定的人物吗？', async () => {
            showLoading();
            try {
                const res = await api.bindWechatPerson(null);
                if (res.status === 'success') { showToast('已解绑', 'success'); this.currentUser.personId = ''; localStorage.setItem(USER_KEY, JSON.stringify(this.currentUser)); this.navigateTo('me'); }
                else showToast(res.message || '解绑失败', 'error');
            } catch (e) { showToast('解绑失败', 'error'); }
            finally { hideLoading(); }
        });
    }

    async deletePerson(id) {
        this.showConfirm('删除人员', '确定删除此人吗？此操作不可恢复！', async () => {
            showLoading();
            try {
                const res = await api.deletePerson(id);
                if (res.status === 'success') { showToast('删除成功', 'success'); this.navigateTo('people'); }
                else showToast(res.message || '删除失败', 'error');
            } catch (e) { showToast('删除失败', 'error'); }
            finally { hideLoading(); }
        });
    }

    async createBindToken(personId) {
        try {
            const res = await api.createWechatBindToken(personId, 24);
            if (res.status === 'success' && res.bind_token) {
                const url = `${window.location.origin}${window.location.pathname}?bind_token=${res.bind_token}`;
                navigator.clipboard?.writeText(url).then(() => showToast('链接已复制到剪贴板', 'success')).catch(() => {
                    prompt('请复制以下链接：', url);
                });
            } else showToast(res.message || '创建失败', 'error');
        } catch (e) { showToast('创建失败', 'error'); }
    }

    // ═══ 人员编辑 ═══
    loadPersonEdit(params) {
        showToast('人员编辑页开发中...', 'info');
    }

    openAddPersonModal() { this.navigateTo('person-edit', { mode: 'add' }); }

    // ═══ 字辈列表 ═══
    async loadGenerationNames() {
        showLoading();
        try {
            const res = await api.getGenerationNames();
            if (res.status === 'success') this.renderGenerationNames(res.data || []);
            this.loadAnnouncementsForPage('generation-names', 'gen-names-announcement-bar', 'gen-names-ann-scroll-area', 'gen-names-ann-text');
        } catch (e) { showToast('加载失败', 'error'); }
        finally { hideLoading(); }
    }

    renderGenerationNames(data) {
        const container = document.getElementById('generation-names-list');
        if (!container) return;
        const adminHint = isAdmin() ? '<div class="admin-hint-bar">💡 管理员可点击"修改"统一设置字辈，保存后自动同步该世系所有人员</div>' : '';
        container.innerHTML = adminHint + data.map(g => `
            <div class="gen-name-card">
                <div class="gen-name-header">
                    <span class="gen-name-shi">第${g.shi_xi}世</span>
                    <span class="gen-name-value">${g.display_name || g.name || '未设置'}</span>
                    <span class="gen-name-count">${g.people_count || 0}人</span>
                    ${g.is_unified === 0 && g.name ? '<span class="gen-name-warning">⚠️ 未统一</span>' : ''}
                    ${isAdmin() ? `<button class="btn btn-small btn-outline" onclick="app.editGenerationName(${g.shi_xi},'${g.name||''}')">修改</button>` : ''}
                </div>
            </div>
        `).join('');
    }

    async editGenerationName(shiXi, currentName) {
        const newName = prompt(`修改第${shiXi}世字辈：`, currentName);
        if (newName === null) return;
        showLoading();
        try {
            const res = await api.updateGenerationName(shiXi, newName);
            if (res.status === 'success') { showToast(`已同步${res.synced || 0}人`, 'success'); this.loadGenerationNames(); }
            else showToast(res.message || '修改失败', 'error');
        } catch (e) { showToast('修改失败', 'error'); }
        finally { hideLoading(); }
    }

    // ═══ 各世统计 ═══
    async loadGenStats() {
        showLoading();
        try {
            const res = await api.getPeople();
            if (res.status === 'success') {
                this.peopleData = res.data || []; this.buildPeopleDict();
                this.renderGenStats();
            }
        } catch (e) { showToast('加载失败', 'error'); }
        finally { hideLoading(); }
    }

    renderGenStats() {
        const container = document.getElementById('gen-stats-content');
        if (!container) return;
        const nonSp = this.peopleData.filter(p => !this.isSpouse(p));
        const gens = {};
        nonSp.forEach(p => {
            const g = p.shi_xi || '未知';
            if (!gens[g]) gens[g] = { count: 0, maleCount: 0, aliveCount: 0, aliveMaleCount: 0 };
            gens[g].count++;
            if (p.gender === '男') gens[g].maleCount++;
            if (this.isAlive(p)) { gens[g].aliveCount++; if (p.gender === '男') gens[g].aliveMaleCount++; }
        });
        const sorted = Object.keys(gens).sort((a, b) => parseInt(a) - parseInt(b));
        const totalPeople = nonSp.length;
        const totalMale = nonSp.filter(p => p.gender === '男').length;
        container.innerHTML = `
        <div class="gen-stats-overview">
            <div class="gen-overview-card"><span class="gen-overview-num">${totalPeople}</span><span class="gen-overview-label">总人数</span></div>
            <div class="gen-overview-card"><span class="gen-overview-num">${totalMale}</span><span class="gen-overview-label">男丁数</span></div>
            <div class="gen-overview-card"><span class="gen-overview-num">${sorted.length}</span><span class="gen-overview-label">世代数</span></div>
        </div>
        <div class="gen-stats-grid">
            ${sorted.map(g => `
            <div class="gen-stat-card" onclick="app.navigateTo('people',{filterShiXi:${g}})">
                <div class="gen-stat-shi">第${g}世</div>
                <div class="gen-stat-num">${gens[g].count}</div>
                <div class="gen-stat-sub">男${gens[g].maleCount}</div>
            </div>`).join('')}
        </div>
        <div class="gen-stats-tip">💡 点击世代卡片可跳转到人员列表</div>`;
    }

    // ═══ 我的页面 ═══
    async loadMe() {
        showLoading();
        try {
            // 刷新用户信息
            if (!isGuest()) {
                try {
                    const meRes = await api.getMe();
                    if (meRes.status === 'success' && meRes.data) {
                        const me = meRes.data;
                        this.currentUser = {
                            ...this.currentUser,
                            nickname: me.nickname || this.currentUser.nickname,
                            avatar_url: me.avatar_url || this.currentUser.avatar_url,
                            phone: me.phone || this.currentUser.phone,
                            personId: me.person_summary?.id || this.currentUser.personId,
                            role: me.role || this.currentUser.role,
                            verified: me.verified || this.currentUser.verified,
                            li_shi_id: me.li_shi_id || this.currentUser.li_shi_id,
                            person_summary: me.person_summary
                        };
                        localStorage.setItem(USER_KEY, JSON.stringify(this.currentUser));
                    }
                } catch (e) { /* 静默 */ }
            }
            this.renderMe();
            this.loadAnnouncementsForPage('me', 'me-announcement-bar', 'me-ann-scroll-area', 'me-ann-text');
        } catch (e) { showToast('加载失败', 'error'); }
        finally { hideLoading(); }
    }

    renderMe() {
        const container = document.getElementById('me-content');
        if (!container) return;
        const u = this.currentUser || {};
        const role = u.role || 'guest';
        const isGuestUser = role === 'guest';
        const isAdminRole = role === 'admin' || role === 'super_admin';
        const isVerified = role === 'member' || role === 'admin' || role === 'super_admin';
        const isWechatLogin = u.loginType === 'wechat';
        const personId = u.personId || u.person_id;
        const person = personId ? this.peopleDict[personId] : null;

        // 头像
        const avatarHtml = u.avatar_url && !isGuestUser
            ? `<img src="${u.avatar_url}" class="me-avatar-img" onclick="app.editAvatar()">`
            : `<div class="me-avatar-default" onclick="${isWechatLogin ? 'app.editAvatar()' : ''}">${(u.nickname || u.username || '游')[0]}</div>`;

        // 角色标签
        const roleLabels = { guest: '匿名游客', user: '未认证', member: '家族成员', admin: '管理员', super_admin: '超级管理员' };

        container.innerHTML = `
        <!-- 个人信息卡片 -->
        <div class="card me-profile-card">
            <div class="me-profile-top">
                ${avatarHtml}
                <div class="me-profile-info">
                    <div class="me-name-row">
                        <span class="me-name">${isGuestUser ? '游客' : (person ? person.name + '兄弟' : (u.nickname || u.username || '用户'))}</span>
                        ${isWechatLogin ? `<i class="fas fa-edit me-name-edit" onclick="app.editNickname()"></i>` : ''}
                    </div>
                    <span class="role-tag role-tag-${role}">${roleLabels[role]}</span>
                </div>
            </div>
            <div class="me-info-grid">
                ${u.li_shi_id ? `<div class="me-info-item"><span class="me-info-label">李氏号</span><span class="me-info-value">${u.li_shi_id}</span></div>` : ''}
                ${person ? `<div class="me-info-item"><span class="me-info-label">绑定人物</span><span class="me-info-value">${person.name}${person.generation ? '(' + person.generation + ')' : ''}</span></div>` : ''}
                ${person?.shi_xi ? `<div class="me-info-item"><span class="me-info-label">世系</span><span class="me-info-value">第${person.shi_xi}世</span></div>` : ''}
                ${u.phone ? `<div class="me-info-item"><span class="me-info-label">手机号</span><span class="me-info-value">${maskPhone(u.phone)}</span></div>` : ''}
            </div>
        </div>

        <!-- 公告滚动栏 -->
        <div id="me-announcement-bar" class="announcement-bar hidden" onclick="app.navigateTo('announcement-board',{fromPage:'me'})">
            <div class="ann-icon-wrap"><span class="ann-icon">📢</span></div>
            <div class="ann-content-wrap"><div class="ann-scroll-area" id="me-ann-scroll-area"><span class="ann-text" id="me-ann-text"></span></div></div>
        </div>

        ${isGuestUser ? `
        <!-- 游客隐私说明 -->
        <div class="card me-status-card">
            <div class="me-status-icon">🔒</div>
            <div class="me-status-text">游客模式下，姓名和头像等隐私信息已脱敏处理</div>
        </div>
        <!-- 游客操作区 -->
        <div class="card me-actions-card">
            <button class="btn btn-block btn-outline me-action-btn" onclick="app.navigateTo('messages')"><i class="fas fa-envelope"></i> 给管理者留言</button>
            <button class="btn btn-block btn-primary me-action-btn" onclick="app.showLoginPage()"><i class="fas fa-sign-in-alt"></i> 前往登录</button>
            <button class="btn btn-block btn-outline me-action-btn" onclick="app.logout()"><i class="fas fa-sign-out-alt"></i> 退出游客模式</button>
        </div>
        ` : `
        ${role === 'user' ? `
        <!-- 未认证提示 -->
        <div class="card me-status-card me-status-unverified">
            <div class="me-status-icon">⚠️</div>
            <div class="me-status-text">您尚未被认证为家族成员，部分功能受限。请联系管理员认证。</div>
        </div>
        ` : ''}
        ${isVerified ? `
        <!-- 已认证提示 -->
        <div class="card me-status-card me-status-verified">
            <div class="me-status-icon">✅</div>
            <div class="me-status-text">您已认证为家族成员</div>
        </div>
        ` : ''}

        <!-- 操作按钮区 -->
        <div class="card me-actions-card">
            <button class="btn btn-block btn-outline me-action-btn" onclick="app.navigateTo('messages')"><i class="fas fa-envelope"></i> 给管理者留言</button>
            ${role === 'user' ? `<div class="me-hint-text">未认证用户暂无法绑定人物，请联系管理员认证。</div>` : ''}
            ${isVerified && !personId ? `<button class="btn btn-block btn-primary me-action-btn" onclick="app.navigateTo('baota',{bind_mode:1})"><i class="fas fa-link"></i> 去绑定人物</button>` : ''}
            ${isAdminRole ? `<button class="btn btn-block btn-outline me-action-btn" onclick="app.navigateTo('admin-accounts')"><i class="fas fa-user-shield"></i> 帐号管理</button>` : ''}
            ${isWechatLogin ? `<button class="btn btn-block btn-outline me-action-btn" onclick="app.showBindPhoneModal()"><i class="fas fa-phone"></i> 添加/修改手机号</button>` : ''}
            <button class="btn btn-block btn-outline me-action-btn" onclick="app.showChangePasswordModal()"><i class="fas fa-key"></i> 修改密码</button>
            <button class="btn btn-block btn-outline me-action-btn me-logout-btn" onclick="app.logout()"><i class="fas fa-sign-out-alt"></i> 退出登录</button>
        </div>
        `}

        <!-- 族谱说明 -->
        <div class="card me-desc-card">
            <h3><i class="fas fa-info-circle"></i> 族谱说明 ${isAdminRole ? '<button class="btn btn-small btn-outline" onclick="app.showEditDescModal()" style="float:right;">编辑</button>' : ''}</h3>
            <div id="me-desc-content" class="me-desc-content">加载中...</div>
        </div>

        <!-- 关于程序 -->
        <div class="card me-about-card">
            <h3><i class="fas fa-code"></i> 关于程序</h3>
            <div class="me-about-info">
                <span>版本：V1.05</span>
                <span>开发者：化州保叔</span>
            </div>
        </div>`;
        // 加载族谱说明
        this.loadGenealogyDesc();
    }

    async loadGenealogyDesc() {
        try {
            const res = await api.getGenealogyDesc();
            const el = document.getElementById('me-desc-content');
            if (el) el.textContent = (res.status === 'success' && res.data?.content) ? res.data.content : '暂无说明';
        } catch (e) { /* 静默 */ }
    }

    // ═══ 弹窗 ═══
    showChangePasswordModal() {
        const isWechat = this.currentUser?.loginType === 'wechat';
        const body = `
            ${isWechat ? '<p style="color:var(--warning);font-size:13px;margin-bottom:12px;">⚠️ 微信登录用户设置密码后也可用密码登录</p>' : ''}
            <div class="form-group"><label>新密码</label><input type="password" id="new-password" placeholder="请输入新密码（至少6位）"></div>
            <div class="form-group"><label>确认密码</label><input type="password" id="confirm-password" placeholder="请再次输入新密码"></div>
        `;
        this.showDynamicModal('修改密码', body, () => this.doChangePassword());
    }

    async doChangePassword() {
        const pwd = document.getElementById('new-password')?.value;
        const confirmPwd = document.getElementById('confirm-password')?.value;
        if (!pwd || pwd.length < 6) { showToast('密码至少6位', 'error'); return; }
        if (pwd !== confirmPwd) { showToast('两次密码不一致', 'error'); return; }
        showLoading();
        try {
            const res = await api.changePassword(pwd, this.currentUser?.username);
            if (res.status === 'success') { showToast('密码修改成功', 'success'); this.closeDynamicModal(); }
            else showToast(res.message || '修改失败', 'error');
        } catch (e) { showToast('修改失败', 'error'); }
        finally { hideLoading(); }
    }

    showBindPhoneModal() {
        const body = `<div class="form-group"><label>手机号</label><input type="tel" id="bind-phone-input" placeholder="请输入手机号（1开头11位）" maxlength="11"></div>`;
        this.showDynamicModal('绑定手机号', body, () => this.doBindPhone());
    }

    async doBindPhone() {
        const phone = document.getElementById('bind-phone-input')?.value?.trim();
        if (!phone || !/^1\d{10}$/.test(phone)) { showToast('请输入正确的手机号', 'error'); return; }
        showLoading();
        try {
            const res = await api.bindPhone(phone);
            if (res.status === 'success') { showToast('手机号绑定成功', 'success'); this.currentUser.phone = phone; localStorage.setItem(USER_KEY, JSON.stringify(this.currentUser)); this.closeDynamicModal(); this.loadMe(); }
            else showToast(res.message || '绑定失败', 'error');
        } catch (e) { showToast('绑定失败', 'error'); }
        finally { hideLoading(); }
    }

    showEditDescModal() {
        const current = document.getElementById('me-desc-content')?.textContent || '';
        const body = `<div class="form-group"><label>族谱说明 <span id="desc-char-count">${current.length}/500</span></label><textarea id="desc-edit-input" maxlength="500" rows="6" oninput="document.getElementById('desc-char-count').textContent=this.value.length+'/500'">${current}</textarea></div>`;
        this.showDynamicModal('编辑族谱说明', body, () => this.doEditDesc());
    }

    async doEditDesc() {
        const content = document.getElementById('desc-edit-input')?.value?.trim();
        if (!content) { showToast('内容不能为空', 'error'); return; }
        showLoading();
        try {
            const res = await api.updateGenealogyDesc(content);
            if (res.status === 'success') { showToast('保存成功', 'success'); this.closeDynamicModal(); this.loadGenealogyDesc(); }
            else showToast(res.message || '保存失败', 'error');
        } catch (e) { showToast('保存失败', 'error'); }
        finally { hideLoading(); }
    }

    async editAvatar() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            showLoading();
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('file_type', 'avatars');
                const res = await api.uploadFile(formData);
                if (res.status === 'success' && res.url) {
                    await api.updateProfile({ avatar_url: res.url });
                    this.currentUser.avatar_url = res.url;
                    localStorage.setItem(USER_KEY, JSON.stringify(this.currentUser));
                    showToast('头像更新成功', 'success');
                    this.renderMe();
                } else showToast(res.message || '上传失败', 'error');
            } catch (e) { showToast('上传失败', 'error'); }
            finally { hideLoading(); }
        };
        input.click();
    }

    editNickname() {
        const current = this.currentUser?.nickname || '';
        const newNickname = prompt('修改昵称：', current);
        if (newNickname === null || newNickname === current) return;
        showLoading();
        api.updateProfile({ nickname: newNickname }).then(res => {
            if (res.status === 'success') {
                this.currentUser.nickname = newNickname;
                localStorage.setItem(USER_KEY, JSON.stringify(this.currentUser));
                showToast('昵称修改成功', 'success');
                this.renderMe();
            } else showToast(res.message || '修改失败', 'error');
        }).catch(() => showToast('修改失败', 'error')).finally(() => hideLoading());
    }

    showDynamicModal(title, bodyHtml, onOk) {
        const titleEl = document.getElementById('dynamic-modal-title');
        const bodyEl = document.getElementById('dynamic-modal-body');
        const footerEl = document.getElementById('dynamic-modal-footer');
        if (titleEl) titleEl.textContent = title;
        if (bodyEl) bodyEl.innerHTML = bodyHtml;
        if (footerEl) footerEl.innerHTML = `<button class="btn" onclick="app.closeDynamicModal()">取消</button><button class="btn btn-primary" id="dynamic-modal-ok">确定</button>`;
        const okBtn = document.getElementById('dynamic-modal-ok');
        if (okBtn && onOk) okBtn.addEventListener('click', onOk);
        this.showModal('dynamic-modal');
    }

    // ═══ 留言板 ═══
    async loadMessages() {
        showLoading();
        try {
            const res = await api.getMessages();
            if (res.status === 'success') this.renderMessages(res.data || []);
            this.loadAnnouncementsForPage('messages', 'msg-announcement-bar', 'msg-ann-scroll-area', 'msg-ann-text');
        } catch (e) { showToast('加载失败', 'error'); }
        finally { hideLoading(); }
    }

    renderMessages(messages) {
        const container = document.getElementById('messages-list');
        if (!container) return;
        const role = getCurrentRole();
        const isAdminRole = isAdmin();
        // 非管理员显示发布区
        document.querySelector('.non-admin-area')?.classList.toggle('hidden', isAdminRole);

        if (messages.length === 0) { container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">暂无留言</p>'; return; }
        container.innerHTML = messages.map(m => {
            const isRead = m.is_read === 1;
            const images = m.image_urls ? (typeof m.image_urls === 'string' ? JSON.parse(m.image_urls) : m.image_urls) : [];
            return `
            <div class="msg-card">
                <div class="msg-header">
                    <span class="msg-user">${m.nickname || m.li_shi_id || m.guest_id || '匿名'}</span>
                    <span class="msg-time">${timeAgo(m.created_at)}</span>
                    ${isAdminRole ? `<span class="msg-read-tag ${isRead?'read':'unread'}">${isRead?'已读':'未读'}</span>` : ''}
                </div>
                <div class="msg-content">${m.content || ''}</div>
                ${images.length > 0 ? `<div class="msg-images">${images.map(url => `<img src="${url}" onclick="window.open('${url}','_blank')" style="max-width:120px;max-height:120px;border-radius:8px;cursor:pointer;margin:4px;">`).join('')}</div>` : ''}
                ${m.reply ? `<div class="msg-reply"><i class="fas