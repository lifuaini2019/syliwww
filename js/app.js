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

    init() { this.bindEvents(); this.checkLogin(); this._initLazyLoad(); }

    /** 图片懒加载初始化 */
    _initLazyLoad() {
        if (!('IntersectionObserver' in window)) return;
        this._lazyObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        img.classList.add('lazy-loaded');
                    }
                    this._lazyObserver.unobserve(img);
                }
            });
        }, { rootMargin: '200px' });
    }

    /** 观察懒加载图片 */
    _observeLazyImages() {
        if (!this._lazyObserver) return;
        document.querySelectorAll('img[data-src]').forEach(img => {
            this._lazyObserver.observe(img);
        });
    }

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
        $('tree-expand-all')?.addEventListener('click', () => this.toggleExpandAll());
        $('close-tree-panel')?.addEventListener('click', () => this.closeTreePanel());
        $('btn-add-father')?.addEventListener('click', () => this.addRelative('father'));
        $('btn-add-son')?.addEventListener('click', () => this.addRelative('son'));
        $('btn-add-spouse')?.addEventListener('click', () => this.addRelative('spouse'));
        $('btn-add-sibling')?.addEventListener('click', () => this.addRelative('sibling'));
        $('btn-edit-person')?.addEventListener('click', () => this.editSelectedTreePerson());
        $('btn-view-person')?.addEventListener('click', () => this.viewSelectedTreePerson());
        $('tree-search')?.addEventListener('input', e => this.treeSearch(e.target.value));
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
        $('baota-search')?.addEventListener('input', e => { this._baotaState.searchKeyword = e.target.value; this.renderBaota(); if (e.target.value) { setTimeout(() => { const first = document.querySelector('.baota-node-highlight'); if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100); } });
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
    isAlive(p) { 
        // ★★★ 任务14补充修复：严格以 is_alive 字段为准，不再暴力检查 death_date
        return p.is_alive !== 0 && p.is_alive !== '0' && p.is_alive !== false;
    }

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

        // 更新侧边栏用户信息
        const sidebarUserInfo = document.getElementById('sidebar-user-info');
        if (sidebarUserInfo) {
            const avatarInitial = (displayName || '游')[0];
            const avatarHtml = this.currentUser?.avatar_url && !isGuestUser
                ? `<div class="sidebar-avatar"><img src="${this.currentUser.avatar_url}"></div>`
                : `<div class="sidebar-avatar">${avatarInitial}</div>`;
            sidebarUserInfo.innerHTML = `${avatarHtml}<div><div class="sidebar-user-name">${displayName}</div><div class="sidebar-user-role"><span class="role-tag-small role-tag-${role}">${this.getRoleLabel(role)}</span>${this.currentUser.li_shi_id ? ` · 李氏号:${this.currentUser.li_shi_id}` : ''}</div></div>`;
        }
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
        // 手机端：关闭抽屉侧边栏
        if (window.innerWidth < 768) this.closeSidebar();
        // ★ 离开实时排行页时停止定时器
        if (page !== 'worship-live-rank') this.stopLiveRankTimer();
        // 更新侧边栏/Tab的active状态
        document.querySelectorAll('.menu-item').forEach(item => item.classList.toggle('active', item.dataset.page === page));
        document.querySelectorAll('.tab-item').forEach(tab => tab.classList.toggle('active', tab.dataset.page === page));
        document.querySelectorAll('.content-section').forEach(section => section.classList.add('hidden'));
        const targetSection = document.getElementById(`${page}-section`);
        if (targetSection) targetSection.classList.remove('hidden');
        this._navParams = params;

        // ★ 电脑端侧边栏滚动到当前active项
        if (window.innerWidth >= 768) {
            const activeItem = document.querySelector('.menu-item.active');
            if (activeItem) activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }

        // 根据页面加载对应数据
        const loaders = {
            home: () => this.loadHomeData(), people: () => this.loadPeople(), tree: () => this.loadTree(),
            baota: () => this.loadBaota(true), 'generation-names': () => this.loadGenerationNames(),
            'gen-stats': () => this.loadGenStats(), messages: () => this.loadMessages(),
            'announcement-manage': () => this.loadAnnouncementManage(), 'announcement-board': () => this.loadAnnouncementBoard(),
            'admin-accounts': () => this.loadAdminAccounts(), 'admin-center': () => this.loadAdminCenter(),
            worship: () => this.loadWorship(),
            'worship-altar': () => this.loadWorshipAltar(params),
            'worship-admin': () => this.loadWorshipAdmin(), 'worship-live-rank': () => this.loadWorshipLiveRank(),
            'worship-merit-rank': () => this.loadWorshipMeritRank(), me: () => this.loadMe(),
            'db-backup': () => this.loadDbBackup(),
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
        // 触发懒加载
        this._observeLazyImages();
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
        const isVerifiedMember = role === 'member' && this.currentUser?.personId;
        // ★★★ 权限改造：区分基本信息和世系关系字段
        // 管理员：可编辑所有（基本信息+世系关系）
        // 已认证+已绑定的普通成员(member)：可编辑基本信息（前端宽松判断，后端精确校验上下三代范围）
        // 未认证/游客：不可编辑
        let canEdit = false;
        if (isAdmin()) {
            canEdit = true;
        } else if (isVerifiedMember) {
            canEdit = true; // 前端宽松，后端会精确校验上下三代范围
        }
        const canDelete = isAdmin() && children.length === 0;
        // ★ 已认证但尚未绑定的member可以看到绑定按钮（首次绑定）
        const canBind = role === 'member' && !this.currentUser?.personId && !isSelf(p);
        // ★★★ 修改：已认证+已绑定的普通成员不能自行解绑，只有管理员可以解绑
        const canUnbind = isAdmin() && this.currentUser?.personId && String(p.id) === String(this.currentUser.personId);

        const calcAge = (b, d) => { 
            if (!b || !d) return null; 
            const by = parseInt(b.substring(0,4)); 
            const dy = parseInt(d.substring(0,4));
            if (isNaN(by) || isNaN(dy)) return null; 
            return dy - by + 1; 
        };
        // ★★★ 任务14补充修复：只有已逝人员才显示享年
        const deathAge = !alive ? calcAge(p.birth_date, p.death_date) : null;

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
                ${spouse ? `<div class="detail-item"><div class="detail-item-label">亲属关系</div><div class="detail-item-value" style="color:#e91e63;">${this._getSpouseOfName(p)}的妻子</div></div>` : `<div class="detail-item"><div class="detail-item-label">父亲</div><div class="detail-item-value">${father?`<a href="javascript:app.navigateTo('person-detail',{id:${father.id}})">${getDisplayName(father)}</a>`:'-'}</div></div>`}
                <div class="detail-item"><div class="detail-item-label">出生</div><div class="detail-item-value">${p.birth_date||'-'}${p.birth_calendar?`(${p.birth_calendar})`:''}</div></div>
                ${!alive && p.death_date ? `<div class="detail-item"><div class="detail-item-label">去世</div><div class="detail-item-value">${p.death_date}${p.death_calendar?`(${p.death_calendar})`:''}</div></div>` : ''}
                ${deathAge!==null?`<div class="detail-item"><div class="detail-item-label">享年</div><div class="detail-item-value">${deathAge}岁</div></div>`:''}
                <div class="detail-item"><div class="detail-item-label">籍贯</div><div class="detail-item-value">${p.birth_place||'-'}</div></div>
                <div class="detail-item"><div class="detail-item-label">现居地</div><div class="detail-item-value">${p.live_place||'-'}</div></div>
                ${p.move_info?`<div class="detail-item"><div class="detail-item-label">迁出</div><div class="detail-item-value">${p.move_info}</div></div>`:''}
                ${p.remark?`<div class="detail-item"><div class="detail-item-label">备注</div><div class="detail-item-value">${p.remark}</div></div>`:''}
            </div>
        </div>
        ${p.bio?`<div class="card"><h3><i class="fas fa-file-alt"></i> 生平简介</h3><p style="font-size:14px;color:var(--text-secondary);line-height:1.8;">${p.bio}</p></div>`:''}
        ${p.other_image?`
        <div class="card"><h3><i class="fas fa-images"></i> 其他图片</h3>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">${p.other_image.split(',').filter(s=>s.trim()).map(url=>`<img src="${url.trim()}" style="max-width:150px;max-height:150px;border-radius:8px;cursor:pointer;object-fit:cover;" onclick="window.open('${url.trim()}','_blank')">`).join('')}</div></div>`:''}
        ${p.spouse_name||p.spouse_person?`
        <div class="card"><h3><i class="fas fa-heart"></i> 配偶信息</h3><div class="detail-grid">
            <div class="detail-item"><div class="detail-item-label">配偶</div><div class="detail-item-value">${p.spouse_person?`<a href="javascript:app.navigateTo('person-detail',{id:${p.spouse_person.id}})">${maskName(p.spouse_person.name,role)}</a>`:(maskName(p.spouse_name,role)||'-')}</div></div>
            ${p.spouse_person?.alias?`<div class="detail-item"><div class="detail-item-label">配偶别名</div><div class="detail-item-value">${maskName(p.spouse_person.alias,role)}</div></div>`:''}
            ${p.spouse_person?`<div class="detail-item"><div class="detail-item-label">配偶生日</div><div class="detail-item-value">${p.spouse_person.birth_date||'-'}${p.spouse_person.birth_calendar?`(${p.spouse_person.birth_calendar})`:''}</div></div>
            <div class="detail-item"><div class="detail-item-label">配偶状态</div><div class="detail-item-value"><span class="badge ${this.isAlive(p.spouse_person)?'badge-alive':'badge-deceased'}">${this.isAlive(p.spouse_person)?'健在':'已逝'}</span></div></div>`:''}
            ${p.spouse_person&&!this.isAlive(p.spouse_person)&&p.spouse_person.death_date?`<div class="detail-item"><div class="detail-item-label">配偶去世</div><div class="detail-item-value">${p.spouse_person.death_date}${p.spouse_person.death_calendar?`(${p.spouse_person.death_calendar})`:''}</div></div>`:''}
            ${p.spouse_person&&!this.isAlive(p.spouse_person)&&p.spouse_person.birth_date&&p.spouse_person.death_date?`<div class="detail-item"><div class="detail-item-label">配偶享年</div><div class="detail-item-value">${calcAge(p.spouse_person.birth_date,p.spouse_person.death_date)}岁</div></div>`:''}
            ${p.spouse_person?.birth_place?`<div class="detail-item"><div class="detail-item-label">配偶籍贯</div><div class="detail-item-value">${p.spouse_person.birth_place}</div></div>`:''}
            ${p.spouse_person?.live_place?`<div class="detail-item"><div class="detail-item-label">配偶现居</div><div class="detail-item-value">${p.spouse_person.live_place}</div></div>`:''}
            ${p.spouse_person?.bio?`<div class="detail-item" style="grid-column:1/-1"><div class="detail-item-label">配偶简介</div><div class="detail-item-value">${p.spouse_person.bio}</div></div>`:''}
        </div></div>`:''}
        ${p.wx_nickname||p.bound_wx_nickname?`
        <div class="card"><h3><i class="fab fa-weixin" style="color:#07c160;"></i> 已绑定微信</h3><div class="detail-grid">
            <div class="detail-item"><div class="detail-item-label">微信昵称</div><div class="detail-item-value">${p.wx_nickname||p.bound_wx_nickname||'-'}</div></div>
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

    /** ★ 获取配偶所属户主名称 */
    _getSpouseOfName(spousePerson) {
        const ownerId = spousePerson.spouse_of_id;
        if (!ownerId) return '';
        const owner = this.peopleDict[ownerId];
        return owner ? (owner.name || getDisplayName(owner)) : '';
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
    // 编辑状态
    _editState = {
        id: '', isEdit: false, isSpouseMode: false, spousePersonId: '',
        relation: '', targetId: '', targetName: '',
        peopleList: [], fatherList: [], adoptFatherList: [],
        otherImages: [], spouseOtherImages: [],
        form: {
            name: '', alias: '', phone: '', gender: '男',
            is_alive: 1, death_date: '', death_calendar: '农历',
            is_married: 1, is_adopted: 0, generation: '', shi_xi: '',
            birth_date: '', birth_calendar: '农历', father_id: '',
            spouse_of_id: '', ranking: '老大', birth_place: '',
            live_place: '', move_info: '', remark: '', sort: '',
            bio: '', avatar: '', other_image: '',
            // 配偶字段
            spouse_name: '', spouse_alias: '', spouse_phone: '',
            spouse_gender: '女', spouse_avatar: '', spouse_other_image: '',
            spouse_alive: 1, spouse_death_date: '', spouse_death_calendar: '农历',
            spouse_birth_date: '', spouse_birth_calendar: '农历',
            spouse_sort: '', spouse_birth_place: '', spouse_live_place: '',
            spouse_move_info: '', spouse_remark: '', spouse_bio: '',
        },
        submitting: false, deathAgeHint: '', spouseDeathAgeHint: '', spouseOfName: '',
    };

    async loadPersonEdit(params) {
        if (!params) params = this._navParams || {};
        const st = this._editState;
        // 重置状态
        st.id = ''; st.isEdit = false; st.isSpouseMode = false; st.spousePersonId = '';
        st.relation = ''; st.targetId = ''; st.targetName = '';
        st.otherImages = []; st.spouseOtherImages = [];
        st.adoptFatherList = []; st.submitting = false;
        st.deathAgeHint = ''; st.spouseDeathAgeHint = ''; st.spouseOfName = '';
        // 重置form
        Object.assign(st.form, {
            name:'',alias:'',phone:'',gender:'男',is_alive:1,death_date:'',death_calendar:'农历',
            is_married:1,is_adopted:0,generation:'',shi_xi:'',birth_date:'',birth_calendar:'农历',
            father_id:'',spouse_of_id:'',ranking:'老大',birth_place:'',live_place:'',move_info:'',
            remark:'',sort:'',bio:'',avatar:'',other_image:'',
            spouse_name:'',spouse_alias:'',spouse_phone:'',spouse_gender:'女',spouse_avatar:'',
            spouse_other_image:'',spouse_alive:1,spouse_death_date:'',spouse_death_calendar:'农历',
            spouse_birth_date:'',spouse_birth_calendar:'农历',spouse_sort:'',spouse_birth_place:'',
            spouse_live_place:'',spouse_move_info:'',spouse_remark:'',spouse_bio:'',
        });

        if (params.id) {
            st.id = String(params.id);
            st.isEdit = true;
            if (params.editSpouse === '1' || params.editSpouse === true) st.isSpouseMode = true;
            await this._loadEditData(st.id);
        } else {
            st.isEdit = false;
            st.relation = params.relation || '';
            st.targetId = params.targetId || '';
            st.targetName = params.targetName ? decodeURIComponent(params.targetName) : '';
            const isSpouseMode = st.relation === 'spouse';
            st.isSpouseMode = isSpouseMode;
            const father_id = params.father_id || '';
            const gender = params.gender ? decodeURIComponent(params.gender) : '男';
            const rankingText = params.rankingText ? decodeURIComponent(params.rankingText) : '';
            const generation = params.generation ? decodeURIComponent(params.generation) : '';
            let shi_xi = params.shi_xi ? decodeURIComponent(params.shi_xi) : '';
            const spouseOfId = isSpouseMode ? st.targetId : '';
            Object.assign(st.form, {
                father_id: father_id || '', spouse_of_id: spouseOfId,
                gender: isSpouseMode ? '女' : gender,
                generation: isSpouseMode ? '' : generation,
                shi_xi: isSpouseMode ? '' : shi_xi,
                ranking: isSpouseMode ? '' : (rankingText || '老大'),
                is_married: isSpouseMode ? 1 : 1,
                spouse_gender: '女',
            });
            await this._loadEditPeopleList();
            // 新增模式：字辈为空但有世系值时自动推送
            if (!isSpouseMode && !st.form.generation && st.form.shi_xi) {
                this._autoFillGeneration(st.form.shi_xi);
            }
            // ★ 新增配偶模式：设置户主名称
            if (isSpouseMode && st.targetName) {
                st.spouseOfName = st.targetName;
            }
        }
        this._renderPersonEdit();
    }

    async _loadEditData(id) {
        showLoading();
        try {
            const [personRes, peopleRes] = await Promise.all([api.getPerson(id), api.getPeople()]);
            const st = this._editState;
            let person = null;
            if (personRes.status === 'success') {
                person = personRes.data;
                const isSpouseMode = st.isSpouseMode || !!(person.spouse_of_id);
                const sp = person.spouse_person || {};
                // 初始化表单默认值
                let f = {
                    name: person.name || '', alias: person.alias || '', phone: person.phone || '',
                    gender: person.gender || '男',
                    is_alive: person.is_alive !== undefined ? person.is_alive : (person.death_date ? 0 : 1),
                    death_date: person.death_date || '', death_calendar: person.death_calendar || '农历',
                    is_married: person.is_married !== undefined ? person.is_married : 1,
                    is_adopted: person.is_adopted !== undefined ? person.is_adopted : 0,
                    generation: person.generation || '', shi_xi: person.shi_xi || '',
                    birth_date: person.birth_date || '', birth_calendar: person.birth_calendar || '农历',
                    father_id: person.father_id || '', spouse_of_id: person.spouse_of_id || '',
                    ranking: person.ranking || '老大', birth_place: person.birth_place || '',
                    live_place: person.live_place || '', move_info: person.move_info || '',
                    remark: person.remark || '', sort: person.sort || '',
                    bio: person.bio || '', avatar: person.avatar || '', other_image: person.other_image || '',
                    spouse_name: sp.name || person.spouse_name || '', spouse_alias: sp.alias || '',
                    spouse_phone: sp.phone || person.spouse_phone || '', spouse_gender: sp.gender || '女',
                    spouse_avatar: sp.avatar || person.spouse_avatar || '',
                    spouse_other_image: sp.other_image || person.spouse_other_image || '',
                    spouse_alive: sp.is_alive !== undefined ? sp.is_alive : (person.spouse_alive !== undefined ? person.spouse_alive : 1),
                    spouse_death_date: sp.death_date || person.spouse_death_date || '',
                    spouse_death_calendar: sp.death_calendar || '农历',
                    spouse_birth_date: sp.birth_date || person.spouse_birth_date || '',
                    spouse_birth_calendar: sp.birth_calendar || '农历',
                    spouse_sort: sp.sort || '', spouse_birth_place: sp.birth_place || '',
                    spouse_live_place: sp.live_place || '', spouse_move_info: sp.move_info || '',
                    spouse_remark: sp.remark || '', spouse_bio: sp.bio || person.spouse_bio || '',
                };
                let spousePersonId = sp.id ? String(sp.id) : '';
                let otherImages = [];
                let spouseOtherImages = [];

                if (isSpouseMode && person.spouse_of_id) {
                    // 配偶自己的记录
                    Object.assign(f, {
                        spouse_name: person.name || '', spouse_alias: person.alias || '',
                        spouse_phone: person.phone || '', spouse_gender: person.gender || '女',
                        spouse_avatar: person.avatar || '', spouse_other_image: person.other_image || '',
                        spouse_alive: person.is_alive !== undefined ? person.is_alive : 1,
                        spouse_death_date: person.death_date || '', spouse_death_calendar: person.death_calendar || '农历',
                        spouse_birth_date: person.birth_date || '', spouse_birth_calendar: person.birth_calendar || '农历',
                        spouse_sort: person.sort || '', spouse_birth_place: person.birth_place || '',
                        spouse_live_place: person.live_place || '', spouse_move_info: person.move_info || '',
                        spouse_remark: person.remark || '', spouse_bio: person.bio || '',
                    });
                    spousePersonId = String(person.id);
                    f.spouse_of_id = String(person.spouse_of_id);
                    const spouseOImg = person.other_image || '';
                    spouseOtherImages = spouseOImg ? spouseOImg.split(',').filter(s => s.trim()) : [];
                    // 从 people 列表找户主信息填充主字段
                    const peopleData = peopleRes.status === 'success' ? (peopleRes.data || []) : [];
                    const houseOwner = peopleData.find(p => String(p.id) === String(person.spouse_of_id));
                    if (houseOwner) {
                        Object.assign(f, {
                            name: houseOwner.name || '', alias: houseOwner.alias || '',
                            phone: houseOwner.phone || '', gender: houseOwner.gender || '男',
                            is_alive: houseOwner.is_alive !== undefined ? houseOwner.is_alive : 1,
                            death_date: houseOwner.death_date || '', death_calendar: houseOwner.death_calendar || '农历',
                            is_married: houseOwner.is_married !== undefined ? houseOwner.is_married : 1,
                            is_adopted: houseOwner.is_adopted !== undefined ? houseOwner.is_adopted : 0,
                            generation: houseOwner.generation || '', shi_xi: houseOwner.shi_xi || '',
                            birth_date: houseOwner.birth_date || '', birth_calendar: houseOwner.birth_calendar || '农历',
                            father_id: houseOwner.father_id || '', ranking: houseOwner.ranking || '老大',
                            birth_place: houseOwner.birth_place || '', live_place: houseOwner.live_place || '',
                            move_info: houseOwner.move_info || '', remark: houseOwner.remark || '',
                            sort: houseOwner.sort || '', bio: houseOwner.bio || '',
                            avatar: houseOwner.avatar || '', other_image: houseOwner.other_image || '',
                        });
                        const ownerOImg = houseOwner.other_image || '';
                        otherImages = ownerOImg ? ownerOImg.split(',').filter(s => s.trim()) : [];
                    }
                } else {
                    otherImages = (person.other_image || '') ? (person.other_image || '').split(',').filter(s => s.trim()) : [];
                    const spouseOImg = sp.other_image || person.spouse_other_image || '';
                    spouseOtherImages = spouseOImg ? spouseOImg.split(',').filter(s => s.trim()) : [];
                }

                st.form = f;
                st.spousePersonId = spousePersonId;
                st.isSpouseMode = isSpouseMode;
                st.otherImages = otherImages;
                st.spouseOtherImages = spouseOtherImages;
                // ★ 配偶模式：获取户主名称用于显示"亲属关系：XXX的妻子"
                if (isSpouseMode && person.spouse_of_id) {
                    const peopleData = peopleRes.status === 'success' ? (peopleRes.data || []) : [];
                    const houseOwner = peopleData.find(p => String(p.id) === String(person.spouse_of_id));
                    st.spouseOfName = houseOwner ? (houseOwner.name || getDisplayName(houseOwner)) : '';
                }
                this._refreshDeathAgeHint();
                this._refreshSpouseDeathAgeHint();

                // 从 adopt_father_ids JSON 恢复继父列表
                if (person.adopt_father_ids) {
                    try {
                        const ids = JSON.parse(person.adopt_father_ids);
                        const allPeople = peopleRes.status === 'success' ? (peopleRes.data || []) : [];
                        st.adoptFatherList = ids.map(aid => {
                            const found = allPeople.find(p => String(p.id) === String(aid));
                            return found ? { id: String(found.id), name: found.name, displayName: `${found.name}(${found.generation || '?'}世)` } : { id: String(aid), name: '', displayName: `ID:${aid}` };
                        }).filter(item => item.id);
                    } catch (e) { /* ignore */ }
                }
            }
            if (peopleRes.status === 'success') {
                st.peopleList = peopleRes.data || [];
                this._loadFatherList();
            }
        } catch (e) { showToast('加载失败', 'error'); }
        finally { hideLoading(); }
    }

    async _loadEditPeopleList() {
        try {
            const res = await api.getPeople();
            if (res.status === 'success') {
                this._editState.peopleList = res.data || [];
                this._loadFatherList();
            }
        } catch (e) { console.error('加载人员列表失败:', e); }
    }

    _loadFatherList() {
        const st = this._editState;
        const people = st.peopleList || [];
        const myId = st.id;
        const currentFatherId = st.form.father_id;
        const currentFather = currentFatherId ? people.find(p => String(p.id) === String(currentFatherId)) : null;
        const fatherShiXi = currentFather ? String(currentFather.shi_xi) : '';
        const alreadySelectedIds = st.adoptFatherList.map(item => item.id).filter(id => id);
        let filtered = people.filter(p => p.gender === '男');
        if (fatherShiXi) filtered = filtered.filter(p => String(p.shi_xi) === fatherShiXi);
        filtered = filtered.filter(p => String(p.id) !== String(myId));
        filtered = filtered.filter(p => !alreadySelectedIds.includes(String(p.id)));
        st.fatherList = filtered.map(p => ({ id: String(p.id), name: p.name, displayName: `${p.name}(${p.generation || '?'}世)` }));
    }

    async _autoFillGeneration(shiXi) {
        try {
            const res = await api.getGenerationNames();
            if (res.status === 'success' && res.data) {
                const found = res.data.find(item => String(item.shi_xi) === String(shiXi));
                if (found && found.name && !this._editState.form.generation) {
                    this._editState.form.generation = found.name;
                    const el = document.getElementById('edit-generation');
                    if (el) el.value = found.name;
                }
            }
        } catch (e) { /* 静默 */ }
    }

    _calcDeathAge(birthDate, deathDate) {
        if (!birthDate || !deathDate) return null;
        const b = new Date(birthDate), d = new Date(deathDate);
        if (isNaN(b.getTime()) || isNaN(d.getTime()) || d < b) return null;
        // ★★★ 对齐小程序：传统享年 = 去世年 - 出生年 + 1（虚岁：出生即1岁）
        const age = d.getFullYear() - b.getFullYear() + 1;
        return age >= 1 ? age : null;
    }

    _refreshDeathAgeHint() {
        const f = this._editState.form;
        if (Number(f.is_alive) !== 0) { this._editState.deathAgeHint = ''; return; }
        const age = this._calcDeathAge(f.birth_date, f.death_date);
        this._editState.deathAgeHint = age === null ? '' : `享年 ${age} 岁`;
    }

    _refreshSpouseDeathAgeHint() {
        const f = this._editState.form;
        if (Number(f.spouse_alive) !== 0) { this._editState.spouseDeathAgeHint = ''; return; }
        const age = this._calcDeathAge(f.spouse_birth_date, f.spouse_death_date);
        this._editState.spouseDeathAgeHint = age === null ? '' : `享年 ${age} 岁`;
    }

    /** 统一日期输入渲染：公历用 input[type=date]，农历用三个 select */
    _renderDateInput(field, value, calendar) {
        if (calendar !== '农历') {
            return `<input type="date" class="pe-date-input" id="edit-${field}" value="${value || ''}" min="1160-01-01" onchange="app._editOnDateChange('${field}', this.value)">`;
        }
        
        // 农历逻辑
        const lunar = lunarUtil.parseLunarDate(value) || { year: 2000, month: 1, day: 1, isLeapMonth: false };
        const years = Array.from({length: 2026 - 1160 + 1}, (_, i) => 1160 + i);
        const months = lunarUtil.getLunarMonthList(lunar.year);
        const days = lunarUtil.getLunarDayList(lunar.year, lunar.month, lunar.isLeapMonth);

        return `
        <div class="pe-lunar-picker" data-field="${field}">
            <select class="pe-lunar-select" onchange="app._editOnLunarPartChange('${field}', 'year', this.value)">
                ${years.map(y => `<option value="${y}" ${y === lunar.year ? 'selected' : ''}>${y}年</option>`).join('')}
            </select>
            <select class="pe-lunar-select" onchange="app._editOnLunarPartChange('${field}', 'month', this.value)">
                ${months.map((m, i) => `<option value="${i}" ${m.month === lunar.month && m.isLeap === lunar.isLeapMonth ? 'selected' : ''}>${m.name}</option>`).join('')}
            </select>
            <select class="pe-lunar-select" onchange="app._editOnLunarPartChange('${field}', 'day', this.value)">
                ${days.map(d => `<option value="${d.value}" ${d.value === lunar.day ? 'selected' : ''}>${d.name}</option>`).join('')}
            </select>
        </div>`;
    }

    _renderPersonEdit() {
        const container = document.getElementById('person-edit-content');
        if (!container) return;
        const st = this._editState;
        const f = st.form;
        const isSM = st.isSpouseMode;
        const rankingOptions = ['老大','老二','老三','老四','老五','老六','老七','老八','老九'];
        const shiXiOptions = Array.from({length: 50}, (_, i) => String(i + 1));
        const fatherList = st.fatherList || [];
        const peopleList = st.peopleList || [];

        const title = st.isEdit ? (isSM ? '编辑配偶' : '编辑人员') : (isSM ? '添加配偶' : '添加人员');
        const avatarSrc = isSM ? f.spouse_avatar : f.avatar;
        const aliveVal = isSM ? f.spouse_alive : f.is_alive;
        const birthCal = isSM ? f.spouse_birth_calendar : f.birth_calendar;
        const birthDate = isSM ? f.spouse_birth_date : f.birth_date;
        const deathDate = isSM ? f.spouse_death_date : f.death_date;
        const deathCal = isSM ? f.spouse_death_calendar : f.death_calendar;
        const deathHint = isSM ? st.spouseDeathAgeHint : st.deathAgeHint;
        const curImages = isSM ? st.spouseOtherImages : st.otherImages;

        // 当前父亲名
        const fatherPerson = f.father_id ? peopleList.find(p => String(p.id) === String(f.father_id)) : null;
        const fatherName = fatherPerson ? fatherPerson.name : '请选择';

        container.innerHTML = `
        <div class="pe-back-bar">
            <button class="btn btn-small btn-outline" onclick="app.navigateTo('people')"><i class="fas fa-arrow-left"></i> 返回</button>
            <h3 class="pe-title">${title}</h3>
            <span></span>
        </div>
        <div class="pe-scroll-content">
            ${isSM ? `
            <div class="pe-spouse-hint">
                <span class="pe-hint-icon">💑</span>
                <span class="pe-hint-text">配偶模式 — 只录入基础个人信息，不用世系/字辈/父亲/排行</span>
            </div>
            ${st.spouseOfName ? `<div class="pe-relation-hint"><span class="pe-relation-hint-icon">💕</span><span class="pe-relation-hint-text">亲属关系：${st.spouseOfName}的妻子</span></div>` : ''}
            ` : ''}

            <!-- 姓名+头像区 -->
            <div class="pe-card pe-avatar-name-card">
                <div class="pe-avatar-name-row">
                    <div class="pe-avatar-box" onclick="app._editChooseAvatar('${isSM ? 'spouse_avatar' : 'avatar'}')">
                        ${avatarSrc ? `<img src="${avatarSrc}" class="pe-avatar-img">` : `<div class="pe-avatar-placeholder"><span class="pe-avatar-icon">+</span><span class="pe-avatar-text">头像</span></div>`}
                    </div>
                    <div class="pe-name-fields">
                        <div class="pe-name-row">
                            <span class="pe-field-label">姓名：</span>
                            <div class="pe-input-wrap pe-name-input-wrap">
                                <input class="pe-input" type="text" id="edit-${isSM ? 'spouse_name' : 'name'}" placeholder="输入姓名" value="${isSM ? f.spouse_name : f.name}" oninput="app._editOnInput('${isSM ? 'spouse_name' : 'name'}', this.value)">
                            </div>
                            <div class="pe-gender-box" onclick="app._editToggleGender('${isSM ? 'spouse_gender' : 'gender'}')">${isSM ? f.spouse_gender : f.gender}</div>
                        </div>
                        <div class="pe-name-row">
                            <span class="pe-field-label">别名：</span>
                            <div class="pe-input-wrap">
                                <input class="pe-input" type="text" id="edit-${isSM ? 'spouse_alias' : 'alias'}" placeholder="选填别名" value="${isSM ? f.spouse_alias : f.alias}" oninput="app._editOnInput('${isSM ? 'spouse_alias' : 'alias'}', this.value)">
                            </div>
                        </div>
                        ${!isSM ? `
                        <div class="pe-name-row">
                            <span class="pe-field-label">字辈：</span>
                            <div class="pe-input-wrap pe-gen-input-wrap">
                                <input class="pe-input" type="text" id="edit-generation" placeholder="输入字辈" value="${f.generation}" oninput="app._editOnInput('generation', this.value)">
                            </div>
                            <span class="pe-shixi-label">世系：</span>
                            <select class="pe-shixi-select" id="edit-shi_xi" onchange="app._editOnShiXiChange(this.value)">
                                ${shiXiOptions.map((v, i) => `<option value="${v}" ${f.shi_xi === v ? 'selected' : ''}>${v}</option>`).join('')}
                            </select>
                        </div>` : ''}
                    </div>
                </div>
                <div class="pe-phone-row">
                    <span class="pe-field-label">手机：</span>
                    <div class="pe-input-wrap">
                        <input class="pe-input" type="text" id="edit-${isSM ? 'spouse_phone' : 'phone'}" placeholder="作为登录账号" value="${isSM ? f.spouse_phone : f.phone}" oninput="app._editOnInput('${isSM ? 'spouse_phone' : 'phone'}', this.value)">
                    </div>
                </div>
            </div>

            ${!isSM ? `
            <!-- 排行+父亲+过继 -->
            <div class="pe-card pe-triple-row">
                <div class="pe-triple-item">
                    <span class="pe-triple-label">排行</span>
                    <select class="pe-triple-picker" id="edit-ranking" onchange="app._editOnInput('ranking', this.value)">
                        ${rankingOptions.map(v => `<option value="${v}" ${f.ranking === v ? 'selected' : ''}>${v}</option>`).join('')}
                    </select>
                </div>
                <div class="pe-triple-item">
                    <span class="pe-triple-label">父亲</span>
                    <select class="pe-triple-picker" id="edit-father_id" onchange="app._editOnFatherChange(this.value)">
                        <option value="">请选择</option>
                        ${peopleList.map(p => `<option value="${p.id}" ${String(f.father_id) === String(p.id) ? 'selected' : ''}>${p.name}${p.generation ? '(' + p.generation + ')' : ''}</option>`).join('')}
                    </select>
                </div>
                <div class="pe-triple-item">
                    <span class="pe-triple-label">过继</span>
                    <label class="pe-switch"><input type="checkbox" id="edit-is_adopted" ${f.is_adopted ? 'checked' : ''} onchange="app._editOnAdoptedChange(this.checked)"><span class="pe-switch-slider"></span></label>
                </div>
            </div>

            <!-- 继父列表 -->
            ${f.is_adopted ? `
            <div class="pe-card pe-adopt-section">
                <div class="pe-section-header">继父列表：</div>
                ${st.adoptFatherList.map((af, idx) => `
                <div class="pe-adopt-row">
                    <span class="pe-adopt-label">继父${idx + 1}：</span>
                    <select class="pe-adopt-picker" onchange="app._editOnAdoptFatherSelect(${idx}, this.value)">
                        <option value="">选择继父</option>
                        ${fatherList.map(fp => `<option value="${fp.id}" ${af.id === fp.id ? 'selected' : ''}>${fp.displayName}</option>`).join('')}
                    </select>
                    <span class="pe-adopt-remove" onclick="app._editRemoveAdoptFather(${idx})">✕</span>
                </div>`).join('')}
                ${st.adoptFatherList.length < 3 ? `<div class="pe-adopt-add" onclick="app._editAddAdoptFather()">+ 添加继父</div>` : ''}
            </div>` : ''}
            ` : ''}

            <!-- 健在开关+历法 -->
            <div class="pe-card pe-status-row">
                <div class="pe-alive-toggle">
                    <span class="pe-alive-label">是否健在</span>
                    <label class="pe-switch"><input type="checkbox" id="edit-${isSM ? 'spouse_alive' : 'is_alive'}" ${aliveVal ? 'checked' : ''} onchange="app._editOnAliveChange('${isSM ? 'spouse' : 'self'}', this.checked)"><span class="pe-switch-slider"></span></label>
                    <span class="pe-alive-status">${aliveVal ? '健在' : '已故'}</span>
                </div>
                <div class="pe-calendar-select">
                    <span class="pe-calendar-label">历法</span>
                    <select class="pe-calendar-box" id="edit-${isSM ? 'spouse_birth_calendar' : 'birth_calendar'}" onchange="app._editOnInput('${isSM ? 'spouse_birth_calendar' : 'birth_calendar'}', this.value)">
                        <option value="公历" ${birthCal === '公历' ? 'selected' : ''}>公历</option>
                        <option value="农历" ${birthCal === '农历' ? 'selected' : ''}>农历</option>
                    </select>
                </div>
            </div>

            <!-- 出生信息 -->
            <div class="pe-card pe-birth-section">
                <div class="pe-section-header">出生信息</div>
                <div class="pe-date-row">
                    <span class="pe-field-label">出生日期：</span>
                    ${this._renderDateInput(isSM ? 'spouse_birth_date' : 'birth_date', birthDate, birthCal)}
                    <button class="pe-unknown-btn ${!birthDate ? 'pe-unknown-active' : ''}" onclick="app._editSetUnknown('${isSM ? 'spouse_birth_date' : 'birth_date'}')">不详</button>
                </div>
            </div>

            <!-- 去世信息（健在关闭时显示） -->
            ${!aliveVal ? `
            <div class="pe-card pe-death-section">
                <div class="pe-section-header">去世信息</div>
                <div class="pe-date-row">
                    <span class="pe-field-label">去世日期：</span>
                    ${this._renderDateInput(isSM ? 'spouse_death_date' : 'death_date', deathDate, birthCal)}
                    <button class="pe-unknown-btn ${!deathDate ? 'pe-unknown-active' : ''}" onclick="app._editSetUnknown('${isSM ? 'spouse_death_date' : 'death_date'}')">不详</button>
                </div>
                ${deathHint ? `<div class="pe-death-age">${deathHint}</div>` : ''}
            </div>` : ''}

            <!-- 其他图片 -->
            <div class="pe-card pe-other-image-section">
                <div class="pe-section-header">其他图片信息</div>
                <div class="pe-other-image-box">
                    ${curImages.map((url, idx) => `
                    <div class="pe-other-thumb-wrap">
                        <img src="${url}" class="pe-other-thumb">
                        <span class="pe-thumb-remove" onclick="app._editRemoveOtherImage('${isSM ? 'spouse' : 'self'}', ${idx})">×</span>
                    </div>`).join('')}
                    ${curImages.length < 3 ? `<div class="pe-other-add" onclick="app._editChooseOtherImage('${isSM ? 'spouse' : 'self'}')"><span class="pe-other-add-icon">+</span></div>` : ''}
                </div>
            </div>

            <!-- 籍贯/排序/居住地 -->
            <div class="pe-card pe-info-grid">
                <div class="pe-info-row">
                    <span class="pe-field-label">籍贯：</span>
                    <div class="pe-input-wrap"><input class="pe-input" type="text" placeholder="请输入籍贯" value="${isSM ? f.spouse_birth_place : f.birth_place}" oninput="app._editOnInput('${isSM ? 'spouse_birth_place' : 'birth_place'}', this.value)"></div>
                </div>
                <div class="pe-info-row">
                    <span class="pe-field-label">排序：</span>
                    <div class="pe-input-wrap"><input class="pe-input" type="text" placeholder="排序" value="${isSM ? f.spouse_sort : f.sort}" oninput="app._editOnInput('${isSM ? 'spouse_sort' : 'sort'}', this.value)"></div>
                </div>
                <div class="pe-info-row">
                    <span class="pe-field-label">居住：</span>
                    <div class="pe-input-wrap"><input class="pe-input" type="text" placeholder="请输入居住地" value="${isSM ? f.spouse_live_place : f.live_place}" oninput="app._editOnInput('${isSM ? 'spouse_live_place' : 'live_place'}', this.value)"></div>
                </div>
            </div>

            <!-- 生平简介 -->
            <div class="pe-card pe-bio-section">
                <div class="pe-section-header">生平简介：</div>
                <textarea class="pe-textarea" placeholder="请输入生平简介" oninput="app._editOnInput('${isSM ? 'spouse_bio' : 'bio'}', this.value)">${isSM ? f.spouse_bio : f.bio}</textarea>
            </div>

            <!-- 详细地址 -->
            <div class="pe-card pe-address-section">
                <div class="pe-section-header">详细地址：</div>
                <textarea class="pe-textarea pe-textarea-sm" placeholder="请输入详细地址" oninput="app._editOnInput('address', this.value)">${isSM ? '' : (f.address || '')}</textarea>
            </div>

            <!-- 备注 -->
            <div class="pe-card pe-remark-section">
                <div class="pe-section-header">备注：</div>
                <textarea class="pe-textarea pe-textarea-sm" placeholder="请输入备注" oninput="app._editOnInput('${isSM ? 'spouse_remark' : 'remark'}', this.value)">${isSM ? f.spouse_remark : f.remark}</textarea>
            </div>

            ${isSM ? `
            <div class="pe-card">
                <div class="pe-info-row">
                    <span class="pe-field-label">归属户主ID：</span>
                    <input class="pe-input" type="text" value="${f.spouse_of_id}" disabled style="color:#999;">
                </div>
            </div>` : ''}

            <!-- 启用配偶开关（底部，仅非配偶模式） -->
            ${!isSM ? `
            <div class="pe-bottom-area">
                <div class="pe-spouse-toggle-row">
                    <label class="pe-switch"><input type="checkbox" id="edit-is_married" ${f.is_married ? 'checked' : ''} ${f.gender === '女' ? 'disabled' : ''} onchange="app._editOnMarriedChange(this.checked)"><span class="pe-switch-slider"></span></label>
                    <span class="pe-spouse-toggle-label ${f.gender === '女' ? 'pe-label-disabled' : ''}">💑 启用配偶信息</span>
                    ${f.gender === '女' ? '<span class="pe-spouse-toggle-status">女儿不适用</span>' : `<span class="pe-spouse-toggle-status">${f.is_married ? '已启用' : '未启用'}</span>`}
                </div>
            </div>` : ''}

            <!-- 配偶编辑面板 -->
            ${!isSM && f.is_married ? this._renderSpousePanel() : ''}

            <!-- 保存按钮 -->
            <div class="pe-bottom-area">
                <button class="pe-submit-btn" onclick="app._editOnSubmit()" ${st.submitting ? 'disabled' : ''}>
                    ${st.submitting ? '提交中...' : (st.isEdit ? '保存修改' : '添加人员')}
                </button>
            </div>
        </div>`;
    }

    _renderSpousePanel() {
        const f = this._editState.form;
        const st = this._editState;
        const spouseImages = st.spouseOtherImages;
        return `
        <div class="pe-spouse-panel">
            <div class="pe-spouse-divider">— 以下为配偶信息 —</div>

            <!-- 配偶姓名+头像区 -->
            <div class="pe-card pe-avatar-name-card pe-spouse-card">
                <div class="pe-avatar-name-row">
                    <div class="pe-avatar-box" onclick="app._editChooseAvatar('spouse_avatar')">
                        ${f.spouse_avatar ? `<img src="${f.spouse_avatar}" class="pe-avatar-img">` : `<div class="pe-avatar-placeholder"><span class="pe-avatar-icon">+</span><span class="pe-avatar-text">头像</span></div>`}
                    </div>
                    <div class="pe-name-fields">
                        <div class="pe-name-row">
                            <span class="pe-field-label">姓名：</span>
                            <div class="pe-input-wrap pe-name-input-wrap">
                                <input class="pe-input" type="text" placeholder="配偶姓名" value="${f.spouse_name}" oninput="app._editOnInput('spouse_name', this.value)">
                            </div>
                            <div class="pe-gender-box" onclick="app._editToggleGender('spouse_gender')">${f.spouse_gender}</div>
                        </div>
                        <div class="pe-name-row">
                            <span class="pe-field-label">别名：</span>
                            <div class="pe-input-wrap">
                                <input class="pe-input" type="text" placeholder="选填" value="${f.spouse_alias}" oninput="app._editOnInput('spouse_alias', this.value)">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="pe-phone-row">
                    <span class="pe-field-label">手机：</span>
                    <div class="pe-input-wrap">
                        <input class="pe-input" type="text" placeholder="作为登录账号" value="${f.spouse_phone}" oninput="app._editOnInput('spouse_phone', this.value)">
                    </div>
                </div>
            </div>

            <!-- 配偶健在+历法 -->
            <div class="pe-card pe-status-row pe-spouse-card">
                <div class="pe-alive-toggle">
                    <span class="pe-alive-label">是否健在</span>
                    <label class="pe-switch"><input type="checkbox" ${f.spouse_alive ? 'checked' : ''} onchange="app._editOnAliveChange('spouse', this.checked)"><span class="pe-switch-slider"></span></label>
                    <span class="pe-alive-status">${f.spouse_alive ? '健在' : '已故'}</span>
                </div>
                <div class="pe-calendar-select">
                    <span class="pe-calendar-label">历法</span>
                    <select class="pe-calendar-box" onchange="app._editOnInput('spouse_birth_calendar', this.value)">
                        <option value="公历" ${f.spouse_birth_calendar === '公历' ? 'selected' : ''}>公历</option>
                        <option value="农历" ${f.spouse_birth_calendar === '农历' ? 'selected' : ''}>农历</option>
                    </select>
                </div>
            </div>

            <!-- 配偶出生信息 -->
            <div class="pe-card pe-birth-section pe-spouse-card">
                <div class="pe-section-header">出生信息</div>
                <div class="pe-date-row">
                    <span class="pe-field-label">出生日期：</span>
                    ${this._renderDateInput('spouse_birth_date', f.spouse_birth_date, f.spouse_birth_calendar)}
                    <button class="pe-unknown-btn ${!f.spouse_birth_date ? 'pe-unknown-active' : ''}" onclick="app._editSetUnknown('spouse_birth_date')">不详</button>
                </div>
            </div>

            <!-- 配偶去世信息 -->
            ${!f.spouse_alive ? `
            <div class="pe-card pe-death-section pe-spouse-card">
                <div class="pe-section-header">去世信息</div>
                <div class="pe-date-row">
                    <span class="pe-field-label">去世日期：</span>
                    ${this._renderDateInput('spouse_death_date', f.spouse_death_date, f.spouse_birth_calendar)}
                    <button class="pe-unknown-btn ${!f.spouse_death_date ? 'pe-unknown-active' : ''}" onclick="app._editSetUnknown('spouse_death_date')">不详</button>
                </div>
                ${st.spouseDeathAgeHint ? `<div class="pe-death-age">${st.spouseDeathAgeHint}</div>` : ''}
            </div>` : ''}

            <!-- 配偶其他图片 -->
            <div class="pe-card pe-other-image-section pe-spouse-card">
                <div class="pe-section-header">其他图片信息</div>
                <div class="pe-other-image-box">
                    ${spouseImages.map((url, idx) => `
                    <div class="pe-other-thumb-wrap">
                        <img src="${url}" class="pe-other-thumb">
                        <span class="pe-thumb-remove" onclick="app._editRemoveOtherImage('spouse', ${idx})">×</span>
                    </div>`).join('')}
                    ${spouseImages.length < 3 ? `<div class="pe-other-add" onclick="app._editChooseOtherImage('spouse')"><span class="pe-other-add-icon">+</span></div>` : ''}
                </div>
            </div>

            <!-- 配偶籍贯/排序/居住地 -->
            <div class="pe-card pe-info-grid pe-spouse-card">
                <div class="pe-info-row">
                    <span class="pe-field-label">籍贯：</span>
                    <div class="pe-input-wrap"><input class="pe-input" type="text" placeholder="请输入" value="${f.spouse_birth_place}" oninput="app._editOnInput('spouse_birth_place', this.value)"></div>
                </div>
                <div class="pe-info-row">
                    <span class="pe-field-label">排序：</span>
                    <div class="pe-input-wrap"><input class="pe-input" type="text" placeholder="排序" value="${f.spouse_sort}" oninput="app._editOnInput('spouse_sort', this.value)"></div>
                </div>
                <div class="pe-info-row">
                    <span class="pe-field-label">居住：</span>
                    <div class="pe-input-wrap"><input class="pe-input" type="text" placeholder="请输入" value="${f.spouse_live_place}" oninput="app._editOnInput('spouse_live_place', this.value)"></div>
                </div>
            </div>

            <!-- 配偶简介 -->
            <div class="pe-card pe-bio-section pe-spouse-card">
                <div class="pe-section-header">生平简介：</div>
                <textarea class="pe-textarea" placeholder="请输入配偶简介" oninput="app._editOnInput('spouse_bio', this.value)">${f.spouse_bio}</textarea>
            </div>

            <!-- 配偶备注 -->
            <div class="pe-card pe-remark-section pe-spouse-card">
                <div class="pe-section-header">备注：</div>
                <textarea class="pe-textarea pe-textarea-sm" placeholder="请输入备注" oninput="app._editOnInput('spouse_remark', this.value)">${f.spouse_remark}</textarea>
            </div>
        </div>`;
    }

    // ═══ 编辑页事件处理 ═══
    _editOnInput(field, value) {
        this._editState.form[field] = value;
        // 输入姓名时自动推送字辈
        if (field === 'name' && !this._editState.form.generation && this._editState.form.shi_xi && !this._editState.isSpouseMode) {
            this._autoFillGeneration(this._editState.form.shi_xi);
        }
        // ★★★ 对齐小程序：历法切换时联动修改另一个历法+日期转换
        if (field.includes('calendar')) {
            const st = this._editState;
            const f = st.form;
            const isBirth = field.includes('birth');
            const who = field.startsWith('spouse') ? 'spouse' : 'self';
            const alive = who === 'spouse' ? Number(f.spouse_alive) !== 0 : Number(f.is_alive) !== 0;

            // ★★★ 对齐小程序：出生历法切换→联动修改去世历法为相同值
            if (isBirth) {
                const deathCalendarField = who === 'spouse' ? 'spouse_death_calendar' : 'death_calendar';
                f[deathCalendarField] = value;
            }

            // 转换当前日期
            const dateField = field.replace('_calendar', '_date');
            const curVal = f[dateField];
            if (value === '农历') {
                // 公历→农历
                if (curVal && curVal.trim() !== '') {
                    let l = null;
                    if (!curVal.includes('(闰)')) {
                        const parts = curVal.split('-');
                        if (parts.length === 3) l = lunarUtil.solarToLunar(parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]));
                    }
                    const lunar = l || { year: 2000, month: 1, day: 1, isLeapMonth: false };
                    f[dateField] = lunarUtil.formatLunarDate(lunar.year, lunar.month, lunar.day, lunar.isLeapMonth);
                }
                // ★★★ 对齐小程序：如果是出生历法切换，同时转换去世日期
                if (isBirth && !alive) {
                    const deathDateField = who === 'spouse' ? 'spouse_death_date' : 'death_date';
                    const deathVal = f[deathDateField];
                    if (deathVal && deathVal.trim() !== '') {
                        let l = null;
                        if (!deathVal.includes('(闰)')) {
                            const parts = deathVal.split('-');
                            if (parts.length === 3) l = lunarUtil.solarToLunar(parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]));
                        }
                        const lunar = l || { year: 2000, month: 1, day: 1, isLeapMonth: false };
                        f[deathDateField] = lunarUtil.formatLunarDate(lunar.year, lunar.month, lunar.day, lunar.isLeapMonth);
                    }
                }
            } else {
                // 农历→公历
                if (curVal && curVal.includes('(闰)')) {
                    const l = lunarUtil.parseLunarDate(curVal);
                    if (l) {
                        const s = lunarUtil.lunarToSolar(l.year, l.month, l.day, l.isLeapMonth);
                        if (s) f[dateField] = `${s.year}-${String(s.month).padStart(2, '0')}-${String(s.day).padStart(2, '0')}`;
                    }
                }
                // ★★★ 对齐小程序：如果是出生历法切换，同时转换去世日期
                if (isBirth && !alive) {
                    const deathDateField = who === 'spouse' ? 'spouse_death_date' : 'death_date';
                    const deathVal = f[deathDateField];
                    if (deathVal && deathVal.includes('(闰)')) {
                        const l = lunarUtil.parseLunarDate(deathVal);
                        if (l) {
                            const s = lunarUtil.lunarToSolar(l.year, l.month, l.day, l.isLeapMonth);
                            if (s) f[deathDateField] = `${s.year}-${String(s.month).padStart(2, '0')}-${String(s.day).padStart(2, '0')}`;
                        }
                    }
                }
            }
            this._renderPersonEdit();
            this._refreshDeathAgeHint();
            this._refreshSpouseDeathAgeHint();
        }
    }

    _editToggleGender(field) {
        const st = this._editState;
        const cur = st.form[field];
        st.form[field] = cur === '男' ? '女' : '男';
        // 性别改为女时关闭配偶
        if (field === 'gender' && st.form.gender === '女') {
            st.form.is_married = 0;
        }
        this._renderPersonEdit();
    }

    _editOnShiXiChange(value) {
        const st = this._editState;
        st.form.shi_xi = value;
        if (value && !st.isSpouseMode) {
            this._autoFillGeneration(value);
        }
    }

    _editOnFatherChange(fatherId) {
        const st = this._editState;
        const people = st.peopleList || [];
        const father = fatherId ? people.find(p => String(p.id) === String(fatherId)) : null;
        if (father && father.shi_xi) {
            const fatherShiXi = parseInt(father.shi_xi) || 0;
            if (fatherShiXi > 0) {
                const calcShiXi = fatherShiXi + 1;
                st.form.father_id = fatherId;
                st.form.shi_xi = String(calcShiXi);
                st.form.generation = '';
                this._loadFatherList();
                this._autoFillGeneration(String(calcShiXi));
                this._renderPersonEdit();
                return;
            }
        }
        st.form.father_id = fatherId || '';
        this._loadFatherList();
        this._renderPersonEdit();
    }

    _editOnAdoptedChange(checked) {
        this._editState.form.is_adopted = checked ? 1 : 0;
        if (checked && this._editState.fatherList.length === 0) this._loadFatherList();
        this._renderPersonEdit();
    }

    _editOnAdoptFatherSelect(idx, value) {
        const st = this._editState;
        const father = value ? st.fatherList.find(f => f.id === value) : null;
        if (father) st.adoptFatherList[idx] = { id: father.id, name: father.name, displayName: father.displayName };
        else st.adoptFatherList[idx] = { id: '', name: '', displayName: '' };
        this._loadFatherList(); // 重新筛选排除已选
    }

    _editAddAdoptFather() {
        const st = this._editState;
        if (st.adoptFatherList.length >= 3) { showToast('最多3个继父', 'error'); return; }
        st.adoptFatherList.push({ id: '', name: '', displayName: '' });
        this._renderPersonEdit();
    }

    _editRemoveAdoptFather(idx) {
        this._editState.adoptFatherList.splice(idx, 1);
        this._loadFatherList();
        this._renderPersonEdit();
    }

    _editOnAliveChange(who, checked) {
        const st = this._editState;
        const isAlive = checked ? 1 : 0;
        if (who === 'spouse') {
            st.form.spouse_alive = isAlive;
            if (isAlive) st.form.spouse_death_date = '';
            this._refreshSpouseDeathAgeHint();
        } else {
            st.form.is_alive = isAlive;
            if (isAlive) st.form.death_date = '';
            this._refreshDeathAgeHint();
        }
        this._renderPersonEdit();
    }

    _editOnDateChange(field, value) {
        this._editState.form[field] = value;
        if (field.includes('death') || field.includes('birth')) {
            this._refreshDeathAgeHint();
            this._refreshSpouseDeathAgeHint();
            // 更新享年提示（局部更新而非全量渲染）
            const hintEl = document.querySelector('.pe-death-age');
            const hint = field.startsWith('spouse') ? this._editState.spouseDeathAgeHint : this._editState.deathAgeHint;
            if (hintEl) hintEl.textContent = hint;
        }
    }

    /** 处理农历部件变化 */
    _editOnLunarPartChange(field, part, value) {
        const st = this._editState;
        const curValue = st.form[field];
        const lunar = lunarUtil.parseLunarDate(curValue) || { year: 2000, month: 1, day: 1, isLeapMonth: false };

        if (part === 'year') {
            lunar.year = parseInt(value);
        } else if (part === 'month') {
            const months = lunarUtil.getLunarMonthList(lunar.year);
            const m = months[parseInt(value)];
            lunar.month = m.month;
            lunar.isLeapMonth = m.isLeap;
        } else if (part === 'day') {
            lunar.day = parseInt(value);
        }

        // 校验日期合法性（月份天数可能因年/月变化）
        const days = lunarUtil.getLunarDayList(lunar.year, lunar.month, lunar.isLeapMonth);
        if (lunar.day > days.length) lunar.day = days.length;

        const newValue = lunarUtil.formatLunarDate(lunar.year, lunar.month, lunar.day, lunar.isLeapMonth);
        st.form[field] = newValue;

        // 重新渲染编辑区域（为了更新月份/日期列表）
        this._renderPersonEdit();
        this._refreshDeathAgeHint();
        this._refreshSpouseDeathAgeHint();
    }

    _editSetUnknown(field) {
        this._editState.form[field] = '';
        this._refreshDeathAgeHint();
        this._refreshSpouseDeathAgeHint();
        this._renderPersonEdit();
        showToast('已设为不详', 'info');
    }

    _editOnMarriedChange(checked) {
        const st = this._editState;
        st.form.is_married = checked ? 1 : 0;
        if (!checked) {
            // 清空配偶数据
            Object.assign(st.form, {
                spouse_name:'', spouse_alias:'', spouse_phone:'', spouse_gender:'女',
                spouse_avatar:'', spouse_other_image:'', spouse_alive:1,
                spouse_death_date:'', spouse_death_calendar:'农历',
                spouse_birth_date:'', spouse_birth_calendar:'农历',
                spouse_sort:'', spouse_birth_place:'', spouse_live_place:'',
                spouse_move_info:'', spouse_remark:'', spouse_bio:'',
            });
            st.spouseOtherImages = [];
        }
        this._renderPersonEdit();
    }

    _editChooseAvatar(type) {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0]; if (!file) return;
            showLoading();
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('type', type === 'spouse_avatar' || type === 'avatar' ? 'avatar' : 'avatars');
                const res = await api.uploadFile(formData);
                if (res.status === 'success' && res.url) {
                    this._editState.form[type] = res.url;
                    showToast('上传成功', 'success');
                    this._renderPersonEdit();
                } else showToast(res.message || '上传失败', 'error');
            } catch (e) { showToast('上传失败', 'error'); }
            finally { hideLoading(); }
        };
        input.click();
    }

    _editChooseOtherImage(who) {
        const st = this._editState;
        const curImages = who === 'spouse' ? st.spouseOtherImages : st.otherImages;
        const remain = 3 - curImages.length;
        if (remain <= 0) { showToast('最多3张图片', 'error'); return; }
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'image/*'; input.multiple = true;
        input.onchange = async (e) => {
            const files = Array.from(e.target.files).slice(0, remain);
            for (const file of files) {
                showLoading();
                try {
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('type', 'other');
                    const res = await api.uploadFile(formData);
                    if (res.status === 'success' && res.url) {
                        if (who === 'spouse') st.spouseOtherImages.push(res.url);
                        else st.otherImages.push(res.url);
                    } else showToast(res.message || '上传失败', 'error');
                } catch (e) { showToast('上传失败', 'error'); }
                finally { hideLoading(); }
            }
            this._renderPersonEdit();
        };
        input.click();
    }

    _editRemoveOtherImage(who, idx) {
        const st = this._editState;
        if (who === 'spouse') st.spouseOtherImages.splice(idx, 1);
        else st.otherImages.splice(idx, 1);
        this._renderPersonEdit();
    }

    async _editOnSubmit() {
        const st = this._editState;
        const f = st.form;
        const nameToCheck = st.isSpouseMode ? f.spouse_name : f.name;
        if (!nameToCheck) { showToast('请输入姓名', 'error'); return; }
        st.submitting = true;
        this._renderPersonEdit(); // 显示"提交中..."

        try {
            // ═══ 配偶模式 ═══
            if (st.isSpouseMode) {
                const spouseData = {
                    name: f.spouse_name || f.name, alias: f.spouse_alias || f.alias,
                    phone: f.spouse_phone || f.phone,
                    gender: f.spouse_gender || f.gender || '女',
                    is_alive: Number(f.spouse_alive !== undefined ? f.spouse_alive : f.is_alive) || 0,
                    death_date: f.spouse_death_date || f.death_date,
                    death_calendar: f.spouse_death_calendar || f.death_calendar,
                    is_married: 1, is_adopted: 0, generation: '', shi_xi: '',
                    father_id: '', ranking: '',
                    birth_date: f.spouse_birth_date || f.birth_date,
                    birth_calendar: f.spouse_birth_calendar || f.birth_calendar,
                    spouse_of_id: f.spouse_of_id,
                    birth_place: f.spouse_birth_place || f.birth_place,
                    live_place: f.spouse_live_place || f.live_place,
                    move_info: f.spouse_move_info || f.move_info,
                    remark: f.spouse_remark || f.remark,
                    sort: f.spouse_sort || f.sort, bio: f.spouse_bio || f.bio,
                    avatar: f.spouse_avatar || f.avatar,
                    other_image: st.spouseOtherImages.join(',') || st.otherImages.join(','),
                };
                if (!spouseData.spouse_of_id && st.targetId) spouseData.spouse_of_id = String(st.targetId);
                if (!spouseData.spouse_of_id && st.id) spouseData.spouse_of_id = String(st.id);

                let result;
                if (st.spousePersonId) result = await api.updatePerson(st.spousePersonId, spouseData);
                else result = await api.addPerson(spouseData);
                if (result.status !== 'success') { showToast(result.message || '操作失败', 'error'); return; }
                showToast(st.isEdit ? '修改成功' : '添加成功', 'success');
                setTimeout(() => this.navigateTo('people'), 1500);
                return;
            }

            // ═══ 户主模式 ═══
            const effectiveIsMarried = Number(f.is_married) || 0;
            const hasSpouseName = !!(f.spouse_name && f.spouse_name.trim());
            const finalIsMarried = hasSpouseName ? 1 : effectiveIsMarried;

            const selfData = {
                name: f.name, alias: f.alias, phone: f.phone, gender: f.gender,
                is_alive: Number(f.is_alive) || 0, death_date: f.death_date,
                death_calendar: f.death_calendar, is_married: finalIsMarried,
                is_adopted: Number(f.is_adopted) || 0,
                adopt_father_ids: JSON.stringify(st.adoptFatherList.map(item => item.id).filter(id => id)),
                generation: f.generation, shi_xi: f.shi_xi,
                birth_date: f.birth_date, birth_calendar: f.birth_calendar,
                father_id: f.father_id, spouse_of_id: '', ranking: f.ranking,
                birth_place: f.birth_place, live_place: f.live_place,
                move_info: f.move_info, remark: f.remark, sort: f.sort,
                bio: f.bio, avatar: f.avatar, other_image: st.otherImages.join(','),
            };

            if (finalIsMarried && f.spouse_name) {
                selfData.spouse_data = {
                    name: f.spouse_name, alias: f.spouse_alias, phone: f.spouse_phone,
                    gender: f.spouse_gender || '女',
                    is_alive: Number(f.spouse_alive) || 0,
                    death_date: f.spouse_death_date, death_calendar: f.spouse_death_calendar,
                    birth_date: f.spouse_birth_date, birth_calendar: f.spouse_birth_calendar,
                    generation: '', shi_xi: '', father_id: '', ranking: '',
                    birth_place: f.spouse_birth_place, live_place: f.spouse_live_place,
                    move_info: f.spouse_move_info, remark: f.spouse_remark,
                    sort: f.spouse_sort, bio: f.spouse_bio, avatar: f.spouse_avatar,
                    other_image: st.spouseOtherImages.join(','),
                    is_married: 1, is_adopted: 0,
                };
            }

            let result;
            if (st.isEdit) result = await api.updatePerson(st.id, selfData);
            else result = await api.addPerson(selfData);

            if (result.status !== 'success') { showToast(result.message || '操作失败', 'error'); return; }

            // 添加父亲模式：自动更新儿子的 father_id
            if (!st.isEdit && st.relation === 'father' && st.targetId) {
                try {
                    showLoading();
                    const peopleRes = await api.getPeople();
                    if (peopleRes.status === 'success' && peopleRes.data) {
                        const allPeople = peopleRes.data;
                        let matchedFather = allPeople.find(p => p.name === f.name && String(p.shi_xi) === String(f.shi_xi));
                        if (!matchedFather && f.shi_xi) matchedFather = allPeople.find(p => p.name === f.name);
                        if (matchedFather && matchedFather.id) {
                            const sonRes = await api.getPerson(String(st.targetId));
                            if (sonRes.status === 'success' && sonRes.data) {
                                const sonData = sonRes.data;
                                sonData.father_id = String(matchedFather.id);
                                if (sonData.is_alive !== undefined) sonData.is_alive = Number(sonData.is_alive) || 0;
                                if (sonData.is_married !== undefined) sonData.is_married = Number(sonData.is_married) || 0;
                                if (sonData.is_adopted !== undefined) sonData.is_adopted = Number(sonData.is_adopted) || 0;
                                await api.updatePerson(String(st.targetId), sonData);
                                showToast(`成功！${f.name}已设为父亲`, 'success');
                            }
                        } else {
                            showToast('父亲已添加但自动关联失败，请手动设置', 'info');
                        }
                    }
                    hideLoading();
                } catch (err) { hideLoading(); showToast('建立关系异常', 'error'); }
            } else {
                showToast(st.isEdit ? '修改成功' : '添加成功', 'success');
            }

            setTimeout(() => this.navigateTo('people'), 1500);
        } catch (e) {
            showToast(e.message || '操作失败', 'error');
        } finally {
            st.submitting = false;
        }
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
                    <span class="gen-name-value ${g.is_unified === 0 && g.name ? 'gen-name-ununified' : ''}">${g.display_name || g.name || '未设置'}</span>
                    <span class="gen-name-count">${g.people_count || 0}人</span>
                    ${g.is_unified === 0 && g.name ? '<span class="gen-name-warning">⚠️ 未统一</span>' : ''}
                    ${isAdmin() ? `<div class="gen-name-actions">
                        <button class="btn btn-small btn-outline" onclick="app.editGenerationName(${g.shi_xi},'${(g.name||'').replace(/'/g,"\\'")}',${g.people_count||0},${g.is_unified})">修改</button>
                        ${g.name ? `<button class="btn btn-small btn-danger" onclick="app.clearGenerationName(${g.shi_xi})">清空</button>` : ''}
                    </div>` : ''}
                </div>
            </div>
        `).join('');
    }

    editGenerationName(shiXi, currentName, peopleCount, isUnified) {
        const body = `
            <div style="margin-bottom:12px;">
                <div style="font-size:14px;color:var(--text-secondary);margin-bottom:4px;">第${shiXi}世 · ${peopleCount || 0}人 ${isUnified === 0 && currentName ? '<span style="color:var(--warning);">⚠️ 未统一</span>' : '<span style="color:var(--success);">✅ 已统一</span>'}</div>
            </div>
            <div class="form-group"><label>字辈名称</label><input type="text" id="gen-name-input" value="${currentName || ''}" placeholder="请输入字辈" maxlength="10"></div>
        `;
        this.showDynamicModal(`修改第${shiXi}世字辈`, body, () => this._doEditGenerationName(shiXi));
    }

    async _doEditGenerationName(shiXi) {
        const newName = document.getElementById('gen-name-input')?.value?.trim() || '';
        showLoading();
        try {
            const res = await api.updateGenerationName(shiXi, newName);
            if (res.status === 'success') { showToast(`已同步${res.synced || 0}人`, 'success'); this.closeDynamicModal(); this.loadGenerationNames(); }
            else showToast(res.message || '修改失败', 'error');
        } catch (e) { showToast('修改失败', 'error'); }
        finally { hideLoading(); }
    }

    async clearGenerationName(shiXi) {
        this.showConfirm('清空字辈', `确定清空第${shiXi}世的字辈吗？`, async () => {
            showLoading();
            try {
                const res = await api.updateGenerationName(shiXi, '');
                if (res.status === 'success') { showToast(`已清空，已同步${res.synced || 0}人`, 'success'); this.loadGenerationNames(); }
                else showToast(res.message || '清空失败', 'error');
            } catch (e) { showToast('清空失败', 'error'); }
            finally { hideLoading(); }
        });
    }

    // ═══ 各世统计 ═══
    _genStatsState = { showBefore17: true, showDeceased: true, filterMode: 'total' };

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
        const st = this._genStatsState;
        const nonSp = this.peopleData.filter(p => !this.isSpouse(p));
        const gens = {};
        nonSp.forEach(p => {
            const rawSx = p.shi_xi;
            const sx = (rawSx != null && rawSx !== '') ? parseInt(String(rawSx)) : 0;
            const g = isNaN(sx) ? 0 : sx;
            if (g <= 0) return;
            if (!gens[g]) gens[g] = { count: 0, maleCount: 0, aliveCount: 0, aliveMaleCount: 0 };
            gens[g].count++;
            if (p.gender === '男') gens[g].maleCount++;
            if (this.isAlive(p)) { gens[g].aliveCount++; if (p.gender === '男') gens[g].aliveMaleCount++; }
        });
        let sorted = Object.keys(gens).map(Number).sort((a, b) => a - b);
        // ★ 筛选17世前
        let filteredGens = st.showBefore17 ? sorted : sorted.filter(g => g >= 17);
        const isMale = st.filterMode === 'male';
        const hideDeceased = !st.showDeceased;
        // ★ 可见人数
        const visibleTotal = filteredGens.reduce((sum, g) => {
            if (hideDeceased) return sum + (isMale ? gens[g].aliveMaleCount : gens[g].aliveCount);
            return sum + (isMale ? gens[g].maleCount : gens[g].count);
        }, 0);
        const totalMale = sorted.reduce((s, g) => s + gens[g].maleCount, 0);

        container.innerHTML = `
        <div class="gen-stats-controls">
            <button class="filter-toggle-btn ${!st.showBefore17 ? 'active' : ''}" onclick="app.toggleGenStatsFilter('showBefore17')">${st.showBefore17 ? '🔒 隐藏17世前' : '🔓 显示17世前'}</button>
            <button class="filter-toggle-btn ${!st.showDeceased ? 'active' : ''}" onclick="app.toggleGenStatsFilter('showDeceased')">${st.showDeceased ? '💀 隐已故' : '👥 显全部'}</button>
            <button class="filter-toggle-btn ${isMale ? 'active' : ''}" onclick="app.toggleGenStatsFilter('filterMode')">${isMale ? '👨 男丁模式' : '👥 总人数'}</button>
        </div>
        <div class="gen-stats-overview">
            <div class="gen-overview-card clickable" onclick="app.onGenStatsOverviewClick()">
                <span class="gen-overview-num">${isMale ? filteredGens.reduce((s,g)=>s+(hideDeceased?gens[g].aliveMaleCount:gens[g].maleCount),0) : visibleTotal}</span>
                <span class="gen-overview-label">${isMale ? '男丁数' : '总人数'}</span>
            </div>
            <div class="gen-overview-card"><span class="gen-overview-num">${filteredGens.length}</span><span class="gen-overview-label">世代数</span></div>
            <div class="gen-overview-card"><span class="gen-overview-num">${visibleTotal}</span><span class="gen-overview-label">可见人数</span></div>
        </div>
        <div class="gen-stats-grid">
            ${filteredGens.map(g => {
                const num = hideDeceased ? (isMale ? gens[g].aliveMaleCount : gens[g].aliveCount) : (isMale ? gens[g].maleCount : gens[g].count);
                const sub = isMale ? `总${gens[g].count}人` : `男${gens[g].maleCount}`;
                return `
            <div class="gen-stat-card" onclick="app.navigateTo('people',{filterShiXi:${g}${isMale?',filterMale:1':''}})">
                <div class="gen-stat-shi">第${g}世</div>
                <div class="gen-stat-num">${num}</div>
                <div class="gen-stat-sub">${sub}</div>
            </div>`; }).join('')}
        </div>
        <div class="gen-stats-tip">${!st.showBefore17 ? '💡 当前仅显示第17世及之后的人员统计' : ''}<br>👆 点击世代卡片可跳转到人员列表</div>`;
    }

    toggleGenStatsFilter(name) {
        const st = this._genStatsState;
        if (name === 'filterMode') st.filterMode = st.filterMode === 'total' ? 'male' : 'total';
        else st[name] = !st[name];
        this.renderGenStats();
    }

    onGenStatsOverviewClick() {
        const st = this._genStatsState;
        const params = {};
        if (st.filterMode === 'male') params.filterMale = 1;
        if (!st.showDeceased) params.filterAlive = 1;
        if (!st.showBefore17) params.onlyAfter17 = 1;
        this.navigateTo('people', params);
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
                <span>版本：V1.06</span>
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
            <div class="msg-card" data-msg-id="${m.id}">
                <div class="msg-header">
                    <span class="msg-user">${m.nickname || m.li_shi_id || m.guest_id || '匿名'}</span>
                    <span class="msg-time">${timeAgo(m.created_at)}</span>
                    ${isAdminRole ? `<span class="msg-read-tag ${isRead?'read':'unread'}">${isRead?'已读':'未读'}</span>` : ''}
                </div>
                <div class="msg-content">${m.content || ''}</div>
                ${images.length > 0 ? `<div class="msg-images">${images.map(url => `<img src="${url}" onclick="window.open('${url}','_blank')" style="max-width:120px;max-height:120px;border-radius:8px;cursor:pointer;margin:4px;">`).join('')}</div>` : ''}
                ${m.reply ? `<div class="msg-reply"><i class="fas fa-reply"></i> <span class="msg-reply-text">${m.reply}</span><span class="msg-reply-time">${timeAgo(m.reply_at || m.updated_at)}</span></div>` : ''}
                <div class="msg-actions">
                    ${isAdminRole ? `
                        ${!isRead ? `<button class="btn btn-small btn-outline" onclick="app.markMessageRead(${m.id})"><i class="fas fa-check"></i> 已读</button>` : ''}
                        <button class="btn btn-small btn-outline" onclick="app.replyMessage(${m.id})"><i class="fas fa-reply"></i> ${m.reply ? '修改回复' : '回复'}</button>
                        <button class="btn btn-small btn-danger" onclick="app.deleteMessage(${m.id})"><i class="fas fa-trash"></i></button>
                    ` : (m.guest_id === (this.currentUser?.guest_id) || m.li_shi_id === this.currentUser?.li_shi_id ? `<button class="btn btn-small btn-danger" onclick="app.deleteMessage(${m.id})"><i class="fas fa-trash"></i> 删除</button>` : '')}
                </div>
            </div>`;
        }).join('');
        // 触发懒加载
        this._observeLazyImages();
    }

    async submitMessage() {
        const input = document.getElementById('msg-compose-input');
        const content = input?.value?.trim();
        if (!content) { showToast('请输入留言内容', 'error'); return; }
        showLoading();
        try {
            const imageUrls = (this._msgImageUrls && this._msgImageUrls.length > 0) ? JSON.stringify(this._msgImageUrls) : undefined;
            const res = await api.createMessage(content, imageUrls);
            if (res.status === 'success') { showToast('留言发布成功', 'success'); input.value = ''; this._msgImageUrls = []; document.getElementById('msg-img-preview').innerHTML = ''; document.getElementById('msg-char-count').textContent = '0/500'; this.loadMessages(); }
            else showToast(res.message || '发布失败', 'error');
        } catch (e) { showToast('发布失败', 'error'); }
        finally { hideLoading(); }
    }

    async handleMessageImage(e) {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        if (!this._msgImageUrls) this._msgImageUrls = [];
        const remain = 9 - this._msgImageUrls.length;
        if (remain <= 0) { showToast('最多9张图片', 'error'); return; }
        for (const file of files.slice(0, remain)) {
            showLoading();
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('type', 'messages');
                const res = await api.uploadFile(formData);
                if (res.status === 'success' && res.url) {
                    this._msgImageUrls.push(res.url);
                    this._renderMsgImagePreview();
                } else showToast(res.message || '上传失败', 'error');
            } catch (e) { showToast('上传失败', 'error'); }
            finally { hideLoading(); }
        }
        e.target.value = '';
    }

    _renderMsgImagePreview() {
        const container = document.getElementById('msg-img-preview');
        if (!container) return;
        container.innerHTML = (this._msgImageUrls || []).map((url, idx) =>
            `<img src="${url}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;margin:2px;cursor:pointer;" onclick="app._removeMsgImage(${idx})">`
        ).join('');
    }

    _removeMsgImage(idx) {
        this._msgImageUrls.splice(idx, 1);
        this._renderMsgImagePreview();
    }

    async markMessageRead(id) {
        try {
            const res = await api.markMessageRead(id);
            if (res.status === 'success') this.loadMessages();
        } catch (e) { showToast('操作失败', 'error'); }
    }

    replyMessage(id) {
        // 检查是否已有内联回复框，有则聚焦
        const existing = document.getElementById(`reply-input-${id}`);
        if (existing) { existing.focus(); return; }
        // 在留言卡片下方插入内联回复框
        const msgCard = document.querySelector(`[data-msg-id="${id}"]`);
        if (!msgCard) return;
        const replyBox = document.createElement('div');
        replyBox.className = 'msg-reply-box';
        replyBox.id = `reply-box-${id}`;
        replyBox.innerHTML = `
            <textarea id="reply-input-${id}" class="msg-reply-input" placeholder="输入回复内容..." rows="2" maxlength="500"></textarea>
            <div class="msg-reply-actions">
                <button class="btn btn-small" onclick="app.cancelReply(${id})">取消</button>
                <button class="btn btn-small btn-primary" onclick="app.submitReply(${id})">发送回复</button>
            </div>
        `;
        msgCard.appendChild(replyBox);
        document.getElementById(`reply-input-${id}`)?.focus();
    }

    cancelReply(id) {
        const box = document.getElementById(`reply-box-${id}`);
        if (box) box.remove();
    }

    async submitReply(id) {
        const input = document.getElementById(`reply-input-${id}`);
        const reply = input?.value?.trim();
        if (!reply) { showToast('请输入回复内容', 'error'); return; }
        showLoading();
        try {
            const res = await api.replyMessage(id, reply);
            if (res.status === 'success') { showToast('回复成功', 'success'); this.loadMessages(); }
            else showToast(res.message || '回复失败', 'error');
        } catch (e) { showToast('回复失败', 'error'); }
        finally { hideLoading(); }
    }

    async deleteMessage(id) {
        this.showConfirm('删除留言', '确定删除此留言吗？', async () => {
            showLoading();
            try {
                const res = await api.deleteMessage(id);
                if (res.status === 'success') { showToast('已删除', 'success'); this.loadMessages(); }
                else showToast(res.message || '删除失败', 'error');
            } catch (e) { showToast('删除失败', 'error'); }
            finally { hideLoading(); }
        });
    }

    async clearAllMessages() {
        this.showConfirm('清空留言', '确定清空所有留言吗？此操作不可恢复！', async () => {
            showLoading();
            try {
                const res = await api.clearAllMessages();
                if (res.status === 'success') { showToast('已清空', 'success'); this.loadMessages(); }
                else showToast(res.message || '清空失败', 'error');
            } catch (e) { showToast('清空失败', 'error'); }
            finally { hideLoading(); }
        });
    }

    // ═══ 公告管理 ═══
    async loadAnnouncementManage() {
        showLoading();
        try {
            const res = await api.getAnnouncements();
            if (res.status === 'success') this.renderAnnouncementManage(res.data || []);
        } catch (e) { showToast('加载失败', 'error'); }
        finally { hideLoading(); }
    }

    renderAnnouncementManage(announcements) {
        const container = document.getElementById('announcement-manage-list');
        if (!container) return;
        if (announcements.length === 0) { container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">暂无公告</p>'; return; }
        const pageLabels = { index: '首页', 'announcement-board': '公告板', people: '人员管理', tree: '世系图', baota: '宝塔树', 'generation-names': '字辈列表', messages: '留言', me: '我的', worship: '祭拜' };
        container.innerHTML = announcements.map(a => `
        <div class="ann-mgmt-card">
            <div class="ann-mgmt-header">
                <span class="ann-mgmt-id">#${a.id}</span>
                <span class="badge ${a.is_active == 1 ? 'badge-alive' : 'badge-deceased'}">${a.is_active == 1 ? '生效' : '停用'}</span>
            </div>
            <div class="ann-mgmt-content">${a.content || ''}</div>
            <div class="ann-mgmt-meta">
                ${(a.pages || '').split(',').filter(s=>s).map(p => `<span class="chip">${pageLabels[p] || p}</span>`).join('')}
                <span class="ann-mgmt-duration">${a.scroll_duration || 8}秒</span>
            </div>
            <div class="ann-mgmt-actions">
                <button class="btn btn-small btn-outline" onclick="app.editAnnouncement(${a.id})"><i class="fas fa-edit"></i> 编辑</button>
                <button class="btn btn-small btn-outline" onclick="app.toggleAnnouncement(${a.id}, ${a.is_active == 1 ? 0 : 1})">${a.is_active == 1 ? '停用' : '启用'}</button>
                <button class="btn btn-small btn-danger" onclick="app.deleteAnnouncement(${a.id})"><i class="fas fa-trash"></i></button>
            </div>
        </div>`).join('');
    }

    openAnnouncementEditor(ann) {
        const isEdit = !!ann;
        const a = ann || {};
        const pageLabels = { index: '首页', 'announcement-board': '公告板', people: '人员管理', tree: '世系图', baota: '宝塔树', 'generation-names': '字辈列表', messages: '留言', me: '我的', worship: '祭拜' };
        const selectedPages = (a.pages || '').split(',').filter(s => s);
        const tplVars = [
            { key: '{{username}}', label: '用户名' },
            { key: '{{li_shi_id}}', label: '李氏号' },
            { key: '{{person_name}}', label: '人物姓名' },
            { key: '{{generation}}', label: '字辈' },
            { key: '{{shi_xi}}', label: '世系' }
        ];
        const body = `
            <div class="form-group"><label>公告内容 <span id="ann-char-count">${(a.content||'').length}/500</span></label>
                <div class="ann-tpl-bar">插入变量：${tplVars.map(v => `<button type="button" class="btn btn-small btn-outline" onclick="app._insertAnnTemplate('${v.key}')">${v.label}</button>`).join('')}</div>
                <textarea id="ann-content-input" maxlength="500" rows="4" oninput="document.getElementById('ann-char-count').textContent=this.value.length+'/500'">${a.content || ''}</textarea>
            </div>
            <div class="form-group"><label>展示页面</label><div class="ann-page-chips">${Object.keys(pageLabels).map(k => `<label class="chip-selectable"><input type="checkbox" name="ann-pages" value="${k}" ${selectedPages.includes(k)?'checked':''}>${pageLabels[k]}</label>`).join('')}</div></div>
            <div class="form-group"><label>展示时长（秒）</label><input type="number" id="ann-duration-input" min="1" max="120" value="${a.scroll_duration || 8}"></div>
            <div class="form-group"><label><input type="checkbox" id="ann-scroll-enabled" ${a.scroll_enabled !== 0 ? 'checked' : ''}> 启用滚动效果</label></div>
        `;
        this.showDynamicModal(isEdit ? '编辑公告' : '新建公告', body, () => this._saveAnnouncement(isEdit ? a.id : null));
    }

    _insertAnnTemplate(key) {
        const input = document.getElementById('ann-content-input');
        if (!input) return;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const val = input.value;
        input.value = val.substring(0, start) + key + val.substring(end);
        input.selectionStart = input.selectionEnd = start + key.length;
        input.focus();
        document.getElementById('ann-char-count').textContent = input.value.length + '/500';
    }

    async _saveAnnouncement(id) {
        const content = document.getElementById('ann-content-input')?.value?.trim();
        if (!content) { showToast('请输入公告内容', 'error'); return; }
        const pages = Array.from(document.querySelectorAll('input[name="ann-pages"]:checked')).map(el => el.value).join(',');
        const scrollDuration = parseInt(document.getElementById('ann-duration-input')?.value) || 8;
        const scrollEnabled = document.getElementById('ann-scroll-enabled')?.checked ? 1 : 0;
        showLoading();
        try {
            let res;
            if (id) res = await api.updateAnnouncement(id, { content, pages, scroll_duration: scrollDuration, scroll_enabled: scrollEnabled });
            else res = await api.createAnnouncement(content, pages, scrollDuration, scrollEnabled);
            if (res.status === 'success') { showToast('保存成功', 'success'); this.closeDynamicModal(); this.loadAnnouncementManage(); }
            else showToast(res.message || '保存失败', 'error');
        } catch (e) { showToast('保存失败', 'error'); }
        finally { hideLoading(); }
    }

    editAnnouncement(id) {
        api.getAnnouncements().then(res => {
            if (res.status === 'success') {
                const ann = (res.data || []).find(a => a.id === id);
                if (ann) this.openAnnouncementEditor(ann);
            }
        });
    }

    async toggleAnnouncement(id, isActive) {
        showLoading();
        try {
            const res = await api.updateAnnouncement(id, { is_active: isActive });
            if (res.status === 'success') { showToast(isActive ? '已启用' : '已停用', 'success'); this.loadAnnouncementManage(); }
            else showToast(res.message || '操作失败', 'error');
        } catch (e) { showToast('操作失败', 'error'); }
        finally { hideLoading(); }
    }

    async deleteAnnouncement(id) {
        this.showConfirm('删除公告', '确定删除此公告吗？', async () => {
            showLoading();
            try {
                const res = await api.deleteAnnouncement(id);
                if (res.status === 'success') { showToast('已删除', 'success'); this.loadAnnouncementManage(); }
                else showToast(res.message || '删除失败', 'error');
            } catch (e) { showToast('删除失败', 'error'); }
            finally { hideLoading(); }
        });
    }

    // ═══ 公告板 ═══
    async loadAnnouncementBoard() {
        showLoading();
        try {
            const params = this._navParams || {};
            const fromPage = params.fromPage || '';
            const res = await api.getAnnouncements();
            if (res.status === 'success') {
                let anns = (res.data || []).filter(a => a.is_active == 1);
                if (fromPage) {
                    const fromPageSet = new Set(fromPage.split(','));
                    anns = anns.filter(a => {
                        const pages = (a.pages || '').split(',').map(s => s.trim()).filter(s => s);
                        return pages.some(p => fromPageSet.has(p)) || pages.includes('announcement-board');
                    });
                } else {
                    anns = anns.filter(a => {
                        const pages = (a.pages || '').split(',').map(s => s.trim()).filter(s => s);
                        return pages.includes('announcement-board');
                    });
                }
                this.renderAnnouncementBoard(anns);
            }
        } catch (e) { showToast('加载失败', 'error'); }
        finally { hideLoading(); }
    }

    renderAnnouncementBoard(announcements) {
        const container = document.getElementById('announcement-board-content');
        if (!container) return;
        if (announcements.length === 0) { container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">暂无公告</p>'; return; }
        container.innerHTML = announcements.map(a => `
        <div class="card" style="margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-size:12px;color:var(--text-muted);">${a.created_at ? new Date(a.created_at).toLocaleDateString() : ''}</span>
            </div>
            <div style="font-size:15px;color:var(--text-primary);line-height:1.8;">${this.renderAnnouncementTemplate(a.content || '')}</div>
        </div>`).join('') + `
        <div class="board-bottom-nav">
            <button class="btn btn-outline btn-block" onclick="app.navigateTo('home')" style="flex:1;"><i class="fas fa-home"></i> 首页</button>
            <button class="btn btn-outline btn-block" onclick="app.navigateTo('baota')" style="flex:1;"><i class="fas fa-tree"></i> 宝塔树</button>
            <button class="btn btn-outline btn-block" onclick="app.navigateTo('me')" style="flex:1;"><i class="fas fa-user"></i> 我的</button>
        </div>`;
    }

    // ═══ 管理中心（对齐小程序admin-center） ═══
    async loadAdminCenter() {
        if (!isAdmin()) { showToast('仅管理员可访问', 'error'); this.navigateTo('home'); return; }
        showLoading();
        try {
            let unreadCount = 0;
            if (isAdmin()) {
                try {
                    const res = await api.getUnreadMessageCount();
                    if (res.status === 'success') unreadCount = res.count || 0;
                } catch (e) {}
            }
            this.renderAdminCenter(unreadCount);
        } catch (e) { showToast('加载失败', 'error'); }
        finally { hideLoading(); }
    }

    renderAdminCenter(unreadCount) {
        const container = document.getElementById('admin-center-content');
        if (!container) return;
        const isAdminRole = isAdmin();
        const isSuperAdminRole = isSuperAdmin();

        container.innerHTML = `
        <div class="section-toolbar">
            <button class="btn btn-small btn-outline" onclick="app.navigateTo('home')"><i class="fas fa-arrow-left"></i> 返回</button>
            <h3><i class="fas fa-shield-alt"></i> 管理中心</h3>
        </div>
        <div class="card admin-center-card" onclick="app.navigateTo('admin-accounts')">
            <div class="ac-icon" style="background:#e3f2fd;color:#1565c0;"><i class="fas fa-user-shield"></i></div>
            <div class="ac-info"><div class="ac-title">帐号管理</div><div class="ac-desc">管理用户认证、角色、绑定</div></div>
            <i class="fas fa-chevron-right ac-arrow"></i>
        </div>
        <div class="card admin-center-card" onclick="app.navigateTo('messages')">
            <div class="ac-icon" style="background:#fff3e0;color:#e65100;"><i class="fas fa-envelope"></i></div>
            <div class="ac-info"><div class="ac-title">留言信箱${unreadCount > 0 ? `<span class="badge-danger" style="margin-left:6px;">${unreadCount > 99 ? '99+' : unreadCount}</span>` : ''}</div><div class="ac-desc">查看和管理用户留言</div></div>
            <i class="fas fa-chevron-right ac-arrow"></i>
        </div>
        <div class="card admin-center-card" onclick="app.navigateTo('announcement-manage')">
            <div class="ac-icon" style="background:#f3e5f5;color:#7b1fa2;"><i class="fas fa-bullhorn"></i></div>
            <div class="ac-info"><div class="ac-title">公告管理</div><div class="ac-desc">创建、编辑和发布公告</div></div>
            <i class="fas fa-chevron-right ac-arrow"></i>
        </div>
        ${isSuperAdminRole ? `
        <div class="card admin-center-card" onclick="app.navigateTo('worship-admin')">
            <div class="ac-icon" style="background:#fce4ec;color:#c62828;"><i class="fas fa-cog"></i></div>
            <div class="ac-info"><div class="ac-title">祭拜设置</div><div class="ac-desc">配置上香规则和功德积分</div></div>
            <i class="fas fa-chevron-right ac-arrow"></i>
        </div>
        <div class="card admin-center-card" onclick="app.navigateTo('db-backup')">
            <div class="ac-icon" style="background:#e8f5e9;color:#2e7d32;"><i class="fas fa-database"></i></div>
            <div class="ac-info"><div class="ac-title">数据备份</div><div class="ac-desc">备份数据库到云存储，恢复历史数据</div></div>
            <i class="fas fa-chevron-right ac-arrow"></i>
        </div>
        ` : ''}
        <div style="text-align:center;margin-top:20px;color:var(--text-muted);font-size:13px;">
            <i class="fas fa-info-circle"></i> 仅管理员和超级管理员可访问此页面
        </div>`;
    }

    // ═══ 数据备份与恢复（对齐小程序db-backup，仅超管） ═══
    _dbBackupState = { backups: [], isBackingUp: false, isRestoring: false, showConfirmModal: false, confirmRestoreKey: '', confirmRestoreDate: '', confirmInput: '' };

    async loadDbBackup() {
        if (!isSuperAdmin()) { showToast('仅超级管理员可访问', 'error'); this.navigateTo('home'); return; }
        showLoading();
        try {
            const res = await api.dbBackupList();
            if (res.status === 'success') {
                this._dbBackupState.backups = res.data || [];
            }
            this.renderDbBackup();
        } catch (e) { showToast('加载备份列表失败', 'error'); }
        finally { hideLoading(); }
    }

    renderDbBackup() {
        const container = document.getElementById('db-backup-content');
        if (!container) return;
        const st = this._dbBackupState;
        const backups = st.backups || [];

        container.innerHTML = `
        <div class="section-toolbar">
            <button class="btn btn-small btn-outline" onclick="app.navigateTo('admin-center')"><i class="fas fa-arrow-left"></i> 返回</button>
            <h3><i class="fas fa-database"></i> 数据备份与恢复</h3>
        </div>
        <div class="card">
            <button class="btn btn-primary btn-block" onclick="app.onDbBackup()" ${st.isBackingUp ? 'disabled' : ''}>
                <i class="fas fa-cloud-upload-alt"></i> ${st.isBackingUp ? '备份中...' : '一键备份数据库'}
            </button>
            <p style="font-size:12px;color:var(--text-muted);margin-top:8px;text-align:center;">
                备份全量数据库到云存储，最多保留10份
            </p>
        </div>
        <div class="card mt-20">
            <h3><i class="fas fa-history"></i> 备份记录 (${backups.length})</h3>
            ${backups.length === 0 ? '<p style="color:var(--text-muted);text-align:center;padding:20px;">暂无备份记录</p>' :
            backups.map((b, i) => `
            <div class="backup-item">
                <div class="backup-info">
                    <div class="backup-date">${b.uploaded_beijing || b.uploaded_at || '未知时间'}</div>
                    <div class="backup-meta">
                        ${b.people_count !== undefined ? `人员: ${b.people_count}人` : ''}
                        ${b.size ? ` · 大小: ${(b.size / 1024).toFixed(1)}KB` : ''}
                        ${b.table_count ? ` · 表数: ${b.table_count}` : ''}
                    </div>
                </div>
                <button class="btn btn-small btn-danger" onclick="app.onDbRestoreConfirm('${b.key || ''}', '${b.uploaded_beijing || b.uploaded_at || ''}')" ${st.isRestoring ? 'disabled' : ''}>
                    <i class="fas fa-undo"></i> 恢复
                </button>
            </div>`).join('')}
        </div>
        ${st.showConfirmModal ? `
        <div class="modal" style="display:flex;">
            <div class="modal-content modal-small">
                <div class="modal-header"><h3>⚠️ 确认恢复数据</h3><button class="modal-close" onclick="app._cancelDbRestore()">&times;</button></div>
                <div class="modal-body">
                    <p style="color:var(--danger);font-weight:bold;">此操作将用备份数据覆盖当前数据库，不可逆！</p>
                    <p>恢复目标：${st.confirmRestoreDate}</p>
                    <p style="margin-top:12px;">请输入 <strong>确认恢复</strong> 以继续：</p>
                    <input type="text" id="db-restore-confirm-input" class="pe-input" placeholder="请输入"确认恢复"" oninput="app._dbBackupState.confirmInput=this.value">
                </div>
                <div class="modal-footer">
                    <button class="btn" onclick="app._cancelDbRestore()">取消</button>
                    <button class="btn btn-danger" onclick="app._doDbRestore()" ${st.confirmInput !== '确认恢复' ? 'disabled' : ''}>确认恢复</button>
                </div>
            </div>
        </div>` : ''}`;
    }

    async onDbBackup() {
        const st = this._dbBackupState;
        if (st.isBackingUp) return;
        this.showConfirm('备份数据库', '确定将当前全量数据库备份到云存储吗？', async () => {
            st.isBackingUp = true;
            this.renderDbBackup();
            try {
                const res = await api.dbBackupCreate();
                if (res.status === 'success') {
                    showToast('备份成功', 'success');
                    st.backups = res.data ? [res.data, ...st.backups].slice(0, 10) : st.backups;
                    this.loadDbBackup();
                } else showToast(res.message || '备份失败', 'error');
            } catch (e) { showToast('备份失败', 'error'); }
            finally { st.isBackingUp = false; this.renderDbBackup(); }
        });
    }

    onDbRestoreConfirm(key, date) {
        const st = this._dbBackupState;
        st.showConfirmModal = true;
        st.confirmRestoreKey = key;
        st.confirmRestoreDate = date;
        st.confirmInput = '';
        this.renderDbBackup();
    }

    _cancelDbRestore() {
        const st = this._dbBackupState;
        st.showConfirmModal = false;
        st.confirmRestoreKey = '';
        st.confirmRestoreDate = '';
        st.confirmInput = '';
        this.renderDbBackup();
    }

    async _doDbRestore() {
        const st = this._dbBackupState;
        if (st.confirmInput !== '确认恢复') { showToast('请输入"确认恢复"', 'error'); return; }
        st.isRestoring = true;
        st.showConfirmModal = false;
        this.renderDbBackup();
        showLoading();
        try {
            const res = await api.dbBackupRestore(st.confirmRestoreKey, true);
            if (res.status === 'success') {
                showToast('数据恢复成功', 'success');
                clearApiCache();
                this.peopleData = [];
                this.loadDbBackup();
            } else showToast(res.message || '恢复失败', 'error');
        } catch (e) { showToast('恢复失败', 'error'); }
        finally { st.isRestoring = false; st.confirmRestoreKey = ''; hideLoading(); this.renderDbBackup(); }
    }

    // ═══ 帐号管理 ═══
    async loadAdminAccounts() {
        showLoading();
        try {
            const res = await api.getAdminWxAccounts();
            if (res.status === 'success') { this.adminAccounts = res.data || []; this.filterAdminAccounts(); }
        } catch (e) { showToast('加载失败', 'error'); }
        finally { hideLoading(); }
    }

    filterAdminAccounts() {
        const search = document.getElementById('admin-search')?.value.toLowerCase() || '';
        const filter = this.adminFilter;
        const sortDir = this.adminLoginSortDir;
        let accounts = [...this.adminAccounts];
        // Filter
        if (filter === 'unverified') accounts = accounts.filter(a => a.verified !== 1);
        else if (filter === 'verified') accounts = accounts.filter(a => a.verified === 1);
        else if (filter === 'admin') accounts = accounts.filter(a => a.role === 'admin' || a.role === 'super_admin');
        if (search) accounts = accounts.filter(a => ((a.nickname || '').toLowerCase().includes(search)) || ((a.li_shi_id || '').toLowerCase().includes(search)) || ((a.phone || '').includes(search)));
        // Sort
        if (sortDir === 1) accounts.sort((a, b) => (b.last_login_at || '').localeCompare(a.last_login_at || ''));
        else if (sortDir === 2) accounts.sort((a, b) => (a.last_login_at || '').localeCompare(b.last_login_at || ''));
        // Update batch buttons
        const hasSelected = this.adminSelectedIds.size > 0;
        document.getElementById('batch-verify-btn')?.toggleAttribute('disabled', !hasSelected);
        document.getElementById('batch-delete-btn')?.toggleAttribute('disabled', !hasSelected);
        document.getElementById('batch-role-btn')?.toggleAttribute('disabled', !hasSelected);
        this.renderAdminAccounts(accounts);
    }

    renderAdminAccounts(accounts) {
        const container = document.getElementById('admin-accounts-list');
        if (!container) return;
        const roleLabels = { guest: '匿名游客', user: '未认证', member: '家族成员', admin: '管理员', super_admin: '超管员' };
        const roleColors = { guest: '#999', user: '#e67e22', member: '#27ae60', admin: '#2196F3', super_admin: '#c0392b' };
        if (accounts.length === 0) { container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">暂无帐号数据</p>'; return; }
        container.innerHTML = accounts.map(a => {
            const isSelected = this.adminSelectedIds.has(a.li_shi_id);
            const isMe = a.li_shi_id === this.currentUser?.li_shi_id;
            const isSuperAdmin = this.currentUser?.role === 'super_admin';
            return `
            <div class="admin-card ${isSelected ? 'selected' : ''}">
                <div class="admin-card-left">
                    ${!isMe ? `<input type="checkbox" ${isSelected ? 'checked' : ''} onchange="app.toggleAdminSelect('${a.li_shi_id}')">` : ''}
                </div>
                <div class="admin-card-main">
                    <div class="admin-name">${a.nickname || '未设置'}</div>
                    <span class="role-tag-small" style="background:${roleColors[a.role] || '#999'};color:#fff;">${roleLabels[a.role] || a.role}</span>
                    <span class="admin-verify ${a.verified === 1 ? 'verified' : 'unverified'}">${a.verified === 1 ? '✅' : '❌'}</span>
                </div>
                <div class="admin-card-info">
                    <div>李氏号: ${a.li_shi_id || '-'}</div>
                    <div>绑定: ${a.person_name || '-'}</div>
                    <div>登录: ${a.last_login_at ? timeAgo(a.last_login_at) : '-'}</div>
                    ${a.self_bind_attempts > 0 && a.self_bind_disabled !== 1 ? '<div style="color:#e74c3c;font-size:12px;">⚠️ 绑定失败' + a.self_bind_attempts + '次</div>' : ''}
                    ${a.self_bind_disabled === 1 && a.self_bind_attempts === 0 ? '<div style="color:#999;font-size:12px;">用户不想认证</div>' : ''}
                    ${a.self_bind_disabled === 1 && a.self_bind_attempts > 0 ? '<div style="color:#e74c3c;font-size:12px;">🔒 绑定失败' + a.self_bind_attempts + '次(已锁定)</div>' : ''}
                </div>
                <div class="admin-card-actions">
                    ${a.verified !== 1 ? `<button class="btn btn-small btn-outline" onclick="app.verifyMember('${a.li_shi_id}')">认证</button>` : ''}
                    ${a.verified === 1 && isSuperAdmin ? `<button class="btn btn-small btn-outline" onclick="app.unverifyMember('${a.li_shi_id}')">取消认证</button>` : ''}
                    <button class="btn btn-small btn-outline" onclick="app.adminBindPerson('${a.li_shi_id}')">绑定人物</button>
                    ${a.person_id ? `<button class="btn btn-small btn-outline" onclick="app.adminUnbindPerson('${a.li_shi_id}')">解绑</button>` : ''}
                    ${isSuperAdmin ? `<button class="btn btn-small btn-outline" onclick="app.changeRole('${a.li_shi_id}')">改角色</button>` : ''}
                    ${isSuperAdmin ? `<button class="btn btn-small btn-outline" onclick="app.adminResetPassword('${a.li_shi_id}')">重置密码</button>` : ''}
                </div>
            </div>`;
        }).join('');
        // 触发懒加载
        this._observeLazyImages();
    }

    toggleAdminSelect(liShiId) {
        if (this.adminSelectedIds.has(liShiId)) this.adminSelectedIds.delete(liShiId);
        else this.adminSelectedIds.add(liShiId);
        this.filterAdminAccounts();
    }

    async verifyMember(liShiId) {
        showLoading();
        try {
            const res = await api.verifyMember(liShiId);
            if (res.status === 'success') { showToast('认证成功', 'success'); this.loadAdminAccounts(); }
            else showToast(res.message || '认证失败', 'error');
        } catch (e) { showToast('认证失败', 'error'); }
        finally { hideLoading(); }
    }

    async unverifyMember(liShiId) {
        showLoading();
        try {
            const res = await api.unverifyMember(liShiId);
            if (res.status === 'success') { showToast('已取消认证', 'success'); this.loadAdminAccounts(); }
            else showToast(res.message || '操作失败', 'error');
        } catch (e) { showToast('操作失败', 'error'); }
        finally { hideLoading(); }
    }

    adminBindPerson(liShiId) {
        // 跳转宝塔树，管理员帮绑定模式
        this.navigateTo('baota', { bind_mode: 1, admin_bind_li_shi_id: liShiId });
    }

    changeRole(liShiId) {
        const roles = ['user', 'member', 'admin', 'super_admin'];
        const roleLabels = { user: '未认证', member: '家族成员', admin: '管理员', super_admin: '超级管理员' };
        const body = `<div class="form-group"><label>选择角色</label><select id="change-role-select">${roles.map(r => `<option value="${r}">${roleLabels[r]}</option>`).join('')}</select></div>`;
        this.showDynamicModal('修改角色', body, () => this._doChangeRole(liShiId));
    }

    async _doChangeRole(liShiId) {
        const role = document.getElementById('change-role-select')?.value;
        showLoading();
        try {
            const res = await api.changeRole(liShiId, role);
            if (res.status === 'success') { showToast('角色修改成功', 'success'); this.closeDynamicModal(); this.loadAdminAccounts(); }
            else showToast(res.message || '修改失败', 'error');
        } catch (e) { showToast('修改失败', 'error'); }
        finally { hideLoading(); }
    }

    async batchVerify() {
        if (this.adminSelectedIds.size === 0) return;
        this.showConfirm('批量认证', `确定认证选中的 ${this.adminSelectedIds.size} 个帐号吗？`, async () => {
            showLoading();
            try {
                const res = await api.batchVerify(Array.from(this.adminSelectedIds));
                if (res.status === 'success') { showToast('批量认证成功', 'success'); this.adminSelectedIds.clear(); this.loadAdminAccounts(); }
                else showToast(res.message || '操作失败', 'error');
            } catch (e) { showToast('操作失败', 'error'); }
            finally { hideLoading(); }
        });
    }

    async batchDeleteUsers() {
        if (this.adminSelectedIds.size === 0) return;
        this.showConfirm('批量删除', `确定删除选中的 ${this.adminSelectedIds.size} 个帐号吗？`, async () => {
            showLoading();
            try {
                const res = await api.batchDeleteUsers(Array.from(this.adminSelectedIds));
                if (res.status === 'success') { showToast('删除成功', 'success'); this.adminSelectedIds.clear(); this.loadAdminAccounts(); }
                else showToast(res.message || '操作失败', 'error');
            } catch (e) { showToast('操作失败', 'error'); }
            finally { hideLoading(); }
        });
    }

    async batchChangeRole() {
        if (this.adminSelectedIds.size === 0) return;
        const roles = ['user', 'member', 'admin'];
        const roleLabels = { user: '未认证', member: '家族成员', admin: '管理员' };
        const body = `<div class="form-group"><label>选择角色</label><select id="batch-role-select">${roles.map(r => `<option value="${r}">${roleLabels[r]}</option>`).join('')}</select></div>`;
        this.showDynamicModal('批量改角色', body, async () => {
            const role = document.getElementById('batch-role-select')?.value;
            showLoading();
            try {
                const res = await api.batchChangeRole(Array.from(this.adminSelectedIds), role);
                if (res.status === 'success') { showToast('批量改角色成功', 'success'); this.closeDynamicModal(); this.adminSelectedIds.clear(); this.loadAdminAccounts(); }
                else showToast(res.message || '操作失败', 'error');
            } catch (e) { showToast('操作失败', 'error'); }
            finally { hideLoading(); }
        });
    }

    // ═══ 祭拜祖先 ═══
    async loadWorship() {
        if (isGuest()) { showToast('请先登录', 'error'); this.navigateTo('home'); return; }
        showLoading();
        try {
            const [ancestorsRes, meritRes] = await Promise.all([api.getWorshipAncestors(), api.getMyWorshipMerit()]);
            if (ancestorsRes.status === 'success') { this.worshipAncestors = ancestorsRes.data || []; this.filterWorshipAncestors(); }
            if (meritRes.status === 'success') {
                const meritEl = document.getElementById('worship-my-merit');
                if (meritEl) meritEl.textContent = `功德 ${meritRes.data?.merit_points || 0}`;
            }
        } catch (e) { showToast('加载失败', 'error'); }
        finally { hideLoading(); }
    }

    filterWorshipAncestors() {
        const search = document.getElementById('worship-search')?.value.toLowerCase() || '';
        let ancestors = [...this.worshipAncestors];
        if (search) ancestors = ancestors.filter(a => ((a.name || '').toLowerCase().includes(search)) || ((a.generation || '').toLowerCase().includes(search)) || ((a.alias || '').toLowerCase().includes(search)) || ((a.father_name || '').toLowerCase().includes(search)));
        if (this.worshipFilterShiXi > 0) ancestors = ancestors.filter(a => parseInt(a.shi_xi) <= this.worshipFilterShiXi);
        if (this.worshipSortMode === 'shi_xi') ancestors.sort((a, b) => parseInt(a.shi_xi) - parseInt(b.shi_xi));
        else if (this.worshipSortMode === 'incense') ancestors.sort((a, b) => (b.incense_count || 0) - (a.incense_count || 0));
        this.renderWorshipAncestors(ancestors);
    }

    renderWorshipAncestors(ancestors) {
        const container = document.getElementById('worship-ancestors-list');
        if (!container) return;
        if (ancestors.length === 0) { container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">暂无先祖数据</p>'; return; }
        container.innerHTML = ancestors.map(a => `
        <div class="worship-ancestor-card" onclick="app.navigateTo('worship-altar',{ancestor_id:${a.id},ancestor_name:'${encodeURIComponent(a.name)}',shi_xi:'${a.shi_xi}'})">
            ${this.renderGenderAvatar(a, 'worship-avatar')}
            <div class="worship-info">
                <div class="worship-name">${a.name}${a.alias ? `(${a.alias})` : ''}</div>
                <div class="worship-meta">第${a.shi_xi}世${a.generation ? ' · ' + a.generation : ''}${a.father_name ? ' · ' + a.father_name + '之子' : ''}</div>
                ${a.age_at_death ? `<div class="worship-age">享年${a.age_at_death}岁</div>` : ''}
            </div>
            <button class="btn btn-small btn-primary" onclick="event.stopPropagation();app.navigateTo('worship-altar',{ancestor_id:${a.id},ancestor_name:'${encodeURIComponent(a.name)}',shi_xi:'${a.shi_xi}'})">🕯️ 上香</button>
        </div>`).join('');
    }

    // ═══ 祭拜神台 ═══
    async loadWorshipAltar(params) {
        if (!params) params = this._navParams || {};
        const ancestorName = params.ancestor_name ? decodeURIComponent(params.ancestor_name) : '先祖';
        const shiXi = params.shi_xi || '';
        const ancestorId = params.ancestor_id;
        const container = document.getElementById('worship-altar-content');
        if (!container) return;
        container.innerHTML = `
        <div class="altar-page">
            <div class="altar-back"><button class="btn btn-small btn-outline" onclick="app.navigateTo('worship')"><i class="fas fa-arrow-left"></i> 返回</button></div>
            <div class="altar-main">
                <div class="altar-plaque">慎终追远</div>
                <div class="altar-tablet">
                    <div class="altar-shi-xi">第${shiXi}世</div>
                    <div class="altar-name">${ancestorName}</div>
                    <div class="altar-title">先祖之位</div>
                </div>
                <div class="altar-censer" id="altar-censer">
                    <div class="altar-smoke-layer smoke-1" id="smoke-1"></div>
                    <div class="altar-smoke-layer smoke-2" id="smoke-2"></div>
                    <div class="altar-smoke-layer smoke-3" id="smoke-3"></div>
                    <div class="altar-incense-container" id="altar-incense-container"></div>
                </div>
                <div class="altar-candles">
                    <div class="altar-candle left"><div class="candle-flame"></div></div>
                    <div class="altar-candle right"><div class="candle-flame"></div></div>
                </div>
                <div class="altar-offerings">🍎 🍊 🍵</div>
            </div>
            <div class="altar-progress" id="altar-progress"></div>
            <div class="altar-buttons">
                <button class="btn btn-worship" id="btn-one-incense" onclick="app.offerIncense(${ancestorId}, 1)">🕯️ 敬上一炷香</button>
                <button class="btn btn-worship" id="btn-three-incense" onclick="app.offerIncense(${ancestorId}, 3)">🕯️🕯️🕯️ 敬上三支香</button>
            </div>
            <div class="altar-merit-info" id="altar-merit-info"></div>
        </div>`;
        // Load config
        try {
            const configRes = await api.getWorshipConfig();
            if (configRes.status === 'success' && configRes.data) {
                this._worshipConfig = configRes.data;
            }
        } catch (e) {}
        // Load merit
        try {
            const meritRes = await api.getMyWorshipMerit();
            if (meritRes.status === 'success') {
                const info = document.getElementById('altar-merit-info');
                if (info) info.textContent = `当前功德: ${meritRes.data?.merit_points || 0} | 累计上香: ${meritRes.data?.total_incense || 0}次`;
            }
        } catch (e) {}
    }

    /** ★ 启动香的视觉动画 + 烟雾 */
    _startIncenseAnimation(count, duration) {
        // 烟雾激活
        for (let i = 1; i <= 3; i++) {
            const smoke = document.getElementById(`smoke-${i}`);
            if (smoke) smoke.classList.add('burning');
        }
        // 渲染香支
        const incenseContainer = document.getElementById('altar-incense-container');
        if (!incenseContainer) return;
        incenseContainer.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const stick = document.createElement('div');
            stick.className = 'altar-incense-stick burning' + (count === 3 && i === 1 ? ' spark' : '');
            stick.style.animationDuration = duration + 's';
            incenseContainer.appendChild(stick);
        }
    }

    /** ★ 停止香的视觉动画 + 烟雾 */
    _stopIncenseAnimation() {
        for (let i = 1; i <= 3; i++) {
            const smoke = document.getElementById(`smoke-${i}`);
            if (smoke) smoke.classList.remove('burning');
        }
        const incenseContainer = document.getElementById('altar-incense-container');
        if (incenseContainer) incenseContainer.innerHTML = '';
    }

    async offerIncense(ancestorId, count) {
        if (this.worshipBurning) { showToast('香正在燃烧中，请稍候', 'info'); return; }
        this.worshipBurning = true;
        this.worshipBurnSeq++;
        const seq = this.worshipBurnSeq;
        const durationSec = this._worshipConfig?.worship_incense_duration || 60;
        const duration = durationSec * 1000;
        const startTime = Date.now();
        // 禁用按钮
        document.getElementById('btn-one-incense')?.setAttribute('disabled', 'true');
        document.getElementById('btn-three-incense')?.setAttribute('disabled', 'true');
        // ★ 启动视觉动画（本地立即启动）
        this._startIncenseAnimation(count, durationSec);
        // 显示进度
        const progressEl = document.getElementById('altar-progress');
        const updateProgress = () => {
            if (!this.worshipBurning || this.worshipBurnSeq !== seq) return;
            const elapsed = Date.now() - startTime;
            const percent = Math.min(100, (elapsed / duration) * 100);
            if (progressEl) progressEl.textContent = `香燃进度 ${Math.round(percent)}% · 时长${Math.round(elapsed / 1000)}秒`;
            if (percent < 100) requestAnimationFrame(updateProgress);
        };
        updateProgress();
        // 异步调API（动画已启动，后台调用）
        let allSuccess = true;
        let totalMeritGained = 0;
        let totalMeritCost = 0;
        let lastMeritPoints = 0;
        let lastTotalIncense = 0;
        for (let i = 0; i < count; i++) {
            try {
                const res = await api.offerIncense(ancestorId);
                if (res.status === 'success' && res.data) {
                    totalMeritGained += res.data.merit_gained || 0;
                    totalMeritCost += res.data.merit_cost || 0;
                    lastMeritPoints = res.data.merit_points || 0;
                    lastTotalIncense = res.data.total_incense || 0;
                } else { allSuccess = false; break; }
            } catch (e) { allSuccess = false; break; }
        }
        // API失败则停止动画
        if (!allSuccess) {
            this._stopIncenseAnimation();
            this.worshipBurning = false;
            document.getElementById('btn-one-incense')?.removeAttribute('disabled');
            document.getElementById('btn-three-incense')?.removeAttribute('disabled');
            if (progressEl) progressEl.textContent = '';
            showToast('上香失败，请重试', 'error');
            return;
        }
        // 等待燃烧时间
        await new Promise(resolve => setTimeout(resolve, Math.max(0, duration - (Date.now() - startTime))));
        if (this.worshipBurnSeq !== seq) return;
        this.worshipBurning = false;
        // ★ 停止动画
        this._stopIncenseAnimation();
        document.getElementById('btn-one-incense')?.removeAttribute('disabled');
        document.getElementById('btn-three-incense')?.removeAttribute('disabled');
        if (progressEl) progressEl.textContent = '';
        // 功德弹窗
        this.showDynamicModal('🙏 祭拜功德圆满', `
            <div style="text-align:center;padding:20px;">
                <div style="font-size:20px;margin-bottom:12px;">获得功德 <span style="color:#27ae60;font-weight:bold;">+${totalMeritGained}</span></div>
                ${totalMeritCost > 0 ? `<div style="font-size:14px;color:var(--text-secondary);margin-bottom:8px;">消耗积分 <span style="color:#e74c3c;">-${totalMeritCost}</span></div>` : ''}
                <div style="font-size:14px;color:var(--text-secondary);">当前功德 <strong>${lastMeritPoints}</strong> | 累计上香 <strong>${lastTotalIncense}</strong>次</div>
            </div>
        `, () => this.closeDynamicModal());
        setTimeout(() => { if (document.getElementById('dynamic-modal')?.classList.contains('hidden') === false) this.closeDynamicModal(); }, 3500);
        const info = document.getElementById('altar-merit-info');
        if (info) info.textContent = `当前功德: ${lastMeritPoints} | 累计上香: ${lastTotalIncense}次`;
    }

    // ═══ 祭拜设置（超管） ═══
    async loadWorshipAdmin() {
        showLoading();
        try {
            const configRes = await api.getWorshipConfig();
            const meritRes = await api.adminGetMeritList();
            this._worshipAdminConfig = configRes.status === 'success' ? configRes.data : {};
            this._worshipAdminMeritList = meritRes.status === 'success' ? (meritRes.data || []) : [];
            this.renderWorshipAdmin();
            this.loadAnnouncementsForPage('worship', 'worship-admin-announcement-bar', 'worship-admin-ann-scroll-area', 'worship-admin-ann-text');
        } catch (e) { showToast('加载失败', 'error'); }
        finally { hideLoading(); }
    }

    renderWorshipAdmin() {
        const container = document.getElementById('worship-admin-content');
        if (!container) return;
        const c = this._worshipAdminConfig || {};
        const merits = this._worshipAdminMeritList || [];
        container.innerHTML = `
        <div class="card">
            <h3><i class="fas fa-fire"></i> 🔥 上香燃烧时长</h3>
            <div class="form-group"><input type="number" id="wa-duration" min="5" max="600" value="${c.worship_incense_duration || 60}"> 秒</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
                <button class="btn btn-small btn-outline" onclick="document.getElementById('wa-duration').value=15">15秒(演示)</button>
                <button class="btn btn-small btn-outline" onclick="document.getElementById('wa-duration').value=30">30秒</button>
                <button class="btn btn-small btn-outline" onclick="document.getElementById('wa-duration').value=60">60秒(默认)</button>
                <button class="btn btn-small btn-outline" onclick="document.getElementById('wa-duration').value=120">2分钟</button>
                <button class="btn btn-small btn-outline" onclick="document.getElementById('wa-duration').value=300">5分钟</button>
            </div>
            <div class="form-group"><label><input type="checkbox" id="wa-unlimited" ${c.worship_unlimited_mode !== 0 ? 'checked' : ''}> 无限上香模式</label></div>
            <div class="form-group"><label><input type="checkbox" id="wa-daily-limit-enabled" ${c.worship_daily_limit_enabled == 1 ? 'checked' : ''}> 每日上香次数上限</label> <input type="number" id="wa-daily-limit-count" min="1" max="999" value="${c.worship_daily_limit_count || 10}" style="width:60px;"></div>
            <div class="form-group"><label><input type="checkbox" id="wa-merit-cost-enabled" ${c.worship_merit_cost_enabled == 1 ? 'checked' : ''}> 上香消耗积分模式</label> 每次消耗 <input type="number" id="wa-merit-cost-amount" min="1" max="999" value="${c.worship_merit_cost_amount || 1}" style="width:60px;"></div>
            <div class="form-group">每次上香获得功德 <input type="number" id="wa-merit-gain-amount" min="1" max="999" value="${c.worship_merit_gain_amount || 10}" style="width:60px;"></div>
            <button class="btn btn-primary btn-block" onclick="app.saveWorshipConfig()"><i class="fas fa-save"></i> 保存配置</button>
        </div>
        <div class="card mt-20">
            <h3><i class="fas fa-trophy"></i> 积分总览 (${merits.length}人)</h3>
            ${merits.length === 0 ? '<p style="color:var(--text-muted);text-align:center;padding:20px;">暂无数据</p>' :
            merits.slice(0, 20).map(m => `
            <div class="merit-row">
                <span class="merit-name">${m.nickname || m.name || '匿名'}</span>
                <span class="merit-points">${m.merit_points || 0} 功德</span>
                <button class="btn btn-small btn-outline" onclick="app.adjustWorshipMerit(${m.id})">调整</button>
            </div>`).join('')}
        </div>`;
    }

    async saveWorshipConfig() {
        const data = {
            worship_incense_duration: parseInt(document.getElementById('wa-duration')?.value) || 60,
            worship_unlimited_mode: document.getElementById('wa-unlimited')?.checked ? 1 : 0,
            worship_daily_limit_enabled: document.getElementById('wa-daily-limit-enabled')?.checked ? 1 : 0,
            worship_daily_limit_count: parseInt(document.getElementById('wa-daily-limit-count')?.value) || 10,
            worship_merit_cost_enabled: document.getElementById('wa-merit-cost-enabled')?.checked ? 1 : 0,
            worship_merit_cost_amount: parseInt(document.getElementById('wa-merit-cost-amount')?.value) || 1,
            worship_merit_gain_amount: parseInt(document.getElementById('wa-merit-gain-amount')?.value) || 10,
        };
        showLoading();
        try {
            const res = await api.updateWorshipConfig(data);
            if (res.status === 'success') { showToast('配置已保存', 'success'); this._worshipConfig = data; }
            else showToast(res.message || '保存失败', 'error');
        } catch (e) { showToast('保存失败', 'error'); }
        finally { hideLoading(); }
    }

    adjustWorshipMerit(meritId) {
        const body = `
            <div class="form-group"><label>操作类型</label><select id="wa-adjust-action"><option value="add">增加</option><option value="subtract">扣除</option><option value="set">设为</option><option value="clear">清零</option></select></div>
            <div class="form-group"><label>数量</label><input type="number" id="wa-adjust-amount" min="1" value="10"></div>
            <div class="form-group"><label>备注</label><input type="text" id="wa-adjust-reason" placeholder="调整原因"></div>
        `;
        this.showDynamicModal('调整功德', body, () => this._doAdjustMerit(meritId));
    }

    async _doAdjustMerit(meritId) {
        const action = document.getElementById('wa-adjust-action')?.value;
        const amount = parseInt(document.getElementById('wa-adjust-amount')?.value) || 0;
        const reason = document.getElementById('wa-adjust-reason')?.value || '';
        showLoading();
        try {
            const res = await api.adminAdjustMerit(meritId, action, amount, reason);
            if (res.status === 'success') { showToast('调整成功', 'success'); this.closeDynamicModal(); this.loadWorshipAdmin(); }
            else showToast(res.message || '调整失败', 'error');
        } catch (e) { showToast('调整失败', 'error'); }
        finally { hideLoading(); }
    }

    // ═══ 祭拜实时排行 ═══
    async loadWorshipLiveRank() {
        showLoading();
        try {
            const [recordsRes, boardRes] = await Promise.all([api.getWorshipRecentRecords(50), api.getWorshipMeritBoard(50)]);
            this.renderWorshipLiveRank(recordsRes.status === 'success' ? (recordsRes.data || []) : [], boardRes.status === 'success' ? (boardRes.data || []) : []);
            // ★ 10秒自动刷新
            if (this.worshipLiveRankTimer) clearInterval(this.worshipLiveRankTimer);
            this.worshipLiveRankTimer = setInterval(() => this._refreshLiveRank(), 10000);
        } catch (e) { showToast('加载失败', 'error'); }
        finally { hideLoading(); }
    }

    async _refreshLiveRank() {
        try {
            const [recordsRes, boardRes] = await Promise.all([api.getWorshipRecentRecords(50), api.getWorshipMeritBoard(50)]);
            this.renderWorshipLiveRank(recordsRes.status === 'success' ? (recordsRes.data || []) : [], boardRes.status === 'success' ? (boardRes.data || []) : []);
        } catch (e) { /* 静默 */ }
    }

    stopLiveRankTimer() {
        if (this.worshipLiveRankTimer) { clearInterval(this.worshipLiveRankTimer); this.worshipLiveRankTimer = null; }
    }

    renderWorshipLiveRank(records, board) {
        const container = document.getElementById('worship-live-rank-content');
        if (!container) return;
        container.innerHTML = `
        <div class="card">
            <h3><i class="fas fa-chart-line"></i> 最近上香记录</h3>
            ${records.length === 0 ? '<p style="color:var(--text-muted);text-align:center;">暂无记录</p>' :
            records.map(r => `<div class="rank-item"><span class="rank-name">${r.operator_name || '匿名'}</span><span class="rank-action">为 <strong>${r.ancestor_name || '先祖'}</strong> 上香</span><span class="rank-time">${timeAgo(r.created_at)}</span></div>`).join('')}
        </div>
        <div class="card mt-20">
            <h3><i class="fas fa-trophy"></i> 总柱数排行</h3>
            ${board.length === 0 ? '<p style="color:var(--text-muted);text-align:center;">暂无数据</p>' :
            board.map((b, i) => `<div class="rank-item"><span class="rank-num">${i + 1}</span><span class="rank-name">${b.nickname || b.name || '匿名'}</span><span class="rank-count">${b.total_incense || 0}柱</span><span class="rank-merit">${b.merit_points || 0}功德</span></div>`).join('')}
        </div>`;
    }

    // ═══ 祭拜功德排行 ═══
    async loadWorshipMeritRank() {
        showLoading();
        try {
            const res = await api.getWorshipMeritBoard(100);
            if (res.status === 'success') this.renderWorshipMeritRank(res.data || []);
        } catch (e) { showToast('加载失败', 'error'); }
        finally { hideLoading(); }
    }

    renderWorshipMeritRank(list) {
        const container = document.getElementById('worship-merit-rank-content');
        if (!container) return;
        if (list.length === 0) { container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">暂无数据</p>'; return; }
        container.innerHTML = `<div class="card">${list.map((m, i) => `
            <div class="rank-item">
                <span class="rank-num ${i < 3 ? 'top3' : ''}">${i + 1}</span>
                <span class="rank-name">${m.nickname || m.name || '匿名'}${m.generation ? '(' + m.generation + ')' : ''}${m.shi_xi ? ' · 第' + m.shi_xi + '世' : ''}</span>
                <span class="rank-merit">${m.merit_points || 0} 功德</span>
            </div>`).join('')}</div>`;
    }

    // ═══ 世系图 ═══
    _treeState = { viewMode: 'hierarchy', pureLineageId: '', showAll: false, searchKeyword: '', searchResults: [] };

    async loadTree() {
        showLoading();
        try {
            if (this.peopleData.length === 0) {
                const res = await api.getPeople();
                if (res.status === 'success') { this.peopleData = res.data || []; this.buildPeopleDict(); }
            }
            this.loadAnnouncementsForPage('tree', 'tree-announcement-bar', 'tree-ann-scroll-area', 'tree-ann-text');
            this.renderTree();
            this._initDrag('tree-container');
        } catch (e) { showToast('加载失败', 'error'); }
        finally { hideLoading(); }
    }

    renderTree() {
        const canvas = document.getElementById('tree-canvas');
        if (!canvas) return;
        const st = this._treeState;
        const people = this.peopleData.filter(p => !this.isSpouse(p));
        const allPeople = this.peopleData;

        // ★ 构建层级列表数据
        const childrenMap = {}; // fatherId -> [children]
        const rootPeople = [];
        people.forEach(p => {
            const fid = p.father_id ? String(p.father_id) : '';
            if (fid && fid !== '0') {
                if (!childrenMap[fid]) childrenMap[fid] = [];
                childrenMap[fid].push(p);
            } else {
                rootPeople.push(p);
            }
        });

        // ★★★ 过继逻辑：解析 adopt_father_ids，继子加入继父的 childrenMap ★★★
        people.forEach(p => {
            const rawIds = p.adopt_father_ids;
            if (!rawIds) return;
            try {
                const ids = JSON.parse(rawIds);
                ids.forEach(aid => {
                    if (!aid || aid === '0') return;
                    if (!childrenMap[aid]) childrenMap[aid] = [];
                    if (!childrenMap[aid].find(x => String(x.id) === String(p.id) && x._isAdoptedBy)) {
                        childrenMap[aid].push({ ...p, _isAdoptedBy: aid });
                    }
                });
            } catch (e) { /* ignore */ }
        });

        // ★ 纯脉展示过滤
        let displayPeople = people;
        if (st.pureLineageId) {
            const pureSet = this._calcPureLineage(st.pureLineageId, people);
            displayPeople = people.filter(p => pureSet.has(String(p.id)));
            // 重新计算根节点
            const pureRoots = displayPeople.filter(p => {
                const fid = p.father_id ? String(p.father_id) : '';
                return !fid || fid === '0' || !pureSet.has(fid);
            });
            rootPeople.length = 0;
            rootPeople.push(...pureRoots);
        }

        // ★ 搜索高亮
        const keyword = st.searchKeyword.toLowerCase();
        const searchMatchIds = new Set();
        if (keyword) {
            allPeople.forEach(p => {
                if ((p.name && p.name.toLowerCase().includes(keyword)) ||
                    (p.generation && p.generation.toLowerCase().includes(keyword)) ||
                    (p.alias && p.alias.toLowerCase().includes(keyword))) {
                    searchMatchIds.add(String(p.id));
                }
            });
        }

        // ★ 渲染层级列表
        const role = getCurrentRole();
        const renderNode = (person, level = 0) => {
            const id = String(person.id);
            const isMatch = searchMatchIds.has(id);
            const children = (childrenMap[id] || []).filter(c => displayPeople.find(dp => String(dp.id) === String(c.id)));
            const spouse = allPeople.find(p => String(p.spouse_of_id) === id);
            const expandClass = st.showAll || isMatch ? 'tree-node-expanded' : (level < 2 ? 'tree-node-expanded' : '');
            const isAdopted = !!person._isAdoptedBy;
            const displayName = getDisplayName(person);
            const spouseName = spouse ? getDisplayName(spouse) : '';

            let html = `
            <div class="tree-node ${expandClass} ${isMatch ? 'tree-node-highlight' : ''} ${isAdopted ? 'tree-node-adopted' : ''}" data-id="${id}" onclick="app.selectTreePerson(${person.id})">
                <div class="tree-node-content" style="padding-left:${level * 24}px;">
                    ${children.length > 0 ? `<span class="tree-toggle" onclick="event.stopPropagation();app.toggleTreeNode(this)"><i class="fas fa-chevron-right"></i></span>` : '<span class="tree-toggle-placeholder"></span>'}
                    ${this.renderGenderAvatar(person, 'tree-node-avatar')}
                    <div class="tree-node-info">
                        <span class="tree-node-name">${displayName}${isAdopted ? ' <small class="adopt-tag">继</small>' : ''}</span>
                        <span class="tree-node-meta">${person.generation || ''} 第${person.shi_xi || '?'}世 ${spouseName ? '· 配偶:' + spouseName : ''}</span>
                    </div>
                    <span class="alive-dot ${this.isAlive(person) ? 'alive' : 'dead'}"></span>
                </div>
            </div>`;
            if (children.length > 0) {
                html += `<div class="tree-children ${expandClass ? '' : 'hidden'}">`;
                children.forEach(c => { html += renderNode(c, level + 1); });
                html += '</div>';
            }
            return html;
        };

        let treeHtml = '';
        // ★ 搜索结果下拉
        if (keyword && st.searchResults.length > 0) {
            treeHtml += `<div class="tree-search-dropdown">
                ${st.searchResults.slice(0, 10).map(p => `
                <div class="tree-search-item" onclick="app.treeSearchSelect(${p.id})">
                    ${this.renderGenderAvatar(p, 'tree-search-avatar')} 
                    <span>${getDisplayName(p)}</span>
                    <small>第${p.shi_xi || '?'}世</small>
                </div>`).join('')}
            </div>`;
        }

        if (st.pureLineageId) {
            treeHtml += `<div class="tree-pure-lineage-bar">
                <span>🔗 纯脉展示模式</span>
                <button class="btn btn-small btn-outline" onclick="app.exitPureLineage()">退出纯脉</button>
            </div>`;
        }

        if (rootPeople.length === 0) {
            treeHtml += '<p style="color:var(--text-muted);text-align:center;padding:40px;">暂无世系数据</p>';
        } else {
            rootPeople.forEach(p => { treeHtml += renderNode(p, 0); });
        }

        canvas.innerHTML = treeHtml;
        canvas.style.transform = `scale(${this.treeZoom / 100})`;
        canvas.style.transformOrigin = 'top left';
        // 触发懒加载
        this._observeLazyImages();
    }

    /** 计算纯脉展示的人员ID集合（BFS向下+向上回溯） */
    _calcPureLineage(personId, people) {
        const id = String(personId);
        const childrenMap = {};
        people.forEach(p => {
            const fid = p.father_id ? String(p.father_id) : '';
            if (fid && fid !== '0') {
                if (!childrenMap[fid]) childrenMap[fid] = [];
                childrenMap[fid].push(String(p.id));
            }
        });
        const result = new Set();
        // 向下BFS
        const queue = [id];
        while (queue.length) {
            const cur = queue.shift();
            if (result.has(cur)) continue;
            result.add(cur);
            (childrenMap[cur] || []).forEach(cid => queue.push(cid));
        }
        // 向上回溯
        const peopleMap = {};
        people.forEach(p => { peopleMap[String(p.id)] = p; });
        let curId = id;
        while (curId) {
            const person = peopleMap[curId];
            if (!person) break;
            result.add(curId);
            const fid = person.father_id ? String(person.father_id) : '';
            if (fid && fid !== '0' && peopleMap[fid]) { curId = fid; }
            else break;
        }
        // 保留纯脉中人员的配偶
        this.peopleData.forEach(p => {
            if (this.isSpouse(p) && result.has(String(p.spouse_of_id))) {
                result.add(String(p.id));
            }
        });
        return result;
    }

    toggleTreeNode(el) {
        const node = el.closest('.tree-node');
        const children = node?.nextElementSibling;
        if (children && children.classList.contains('tree-children')) {
            children.classList.toggle('hidden');
            const icon = el.querySelector('i');
            if (icon) icon.style.transform = children.classList.contains('hidden') ? '' : 'rotate(90deg)';
        }
    }

    selectTreePerson(id) {
        const person = this.peopleDict[id];
        if (!person) return;
        this.selectedTreePerson = person;
        // 显示侧边面板
        const panel = document.getElementById('tree-side-panel');
        const nameEl = document.getElementById('selected-name');
        const infoEl = document.getElementById('selected-info');
        if (panel) panel.classList.remove('hidden');
        if (nameEl) nameEl.textContent = getDisplayName(person);
        if (infoEl) {
            const spouse = this.peopleData.find(p => String(p.spouse_of_id) === String(person.id));
            const hasFather = !!(person.father_id && String(person.father_id) !== '0');
            const children = this.peopleData.filter(c => String(c.father_id) === String(person.id));
            infoEl.innerHTML = `
                <div class="side-person-avatar">${this.renderGenderAvatar(person, '', 60)}</div>
                <div class="side-person-name">${getDisplayName(person)}</div>
                <div class="side-person-meta">${person.generation ? '字辈:' + person.generation + ' ' : ''}第${person.shi_xi || '?'}世 ${person.ranking ? '· ' + person.ranking : ''}</div>
                <div class="side-person-status">${this.isAlive(person) ? '🟢 健在' : '🔴 已逝'}</div>
                ${spouse ? `<div class="side-person-spouse">配偶: ${getDisplayName(spouse)}</div>` : ''}
                ${hasFather ? '' : '<div class="side-person-hint" style="color:var(--warning);">⚠️ 无父亲记录</div>'}
                <div class="side-person-children">子女: ${children.length}人</div>
                <div class="side-person-actions">
                    <button class="btn btn-action" onclick="app.addRelative('father')" ${hasFather ? 'disabled' : ''}><i class="fas fa-arrow-up"></i> 添加父亲</button>
                    <button class="btn btn-action" onclick="app.addRelative('son')"><i class="fas fa-child"></i> 添加儿子</button>
                    <button class="btn btn-action" onclick="app.addRelative('spouse')" ${spouse ? 'disabled' : ''}><i class="fas fa-heart"></i> 添加配偶</button>
                    <button class="btn btn-action" onclick="app.addRelative('sibling')"><i class="fas fa-arrows-alt-h"></i> 添加兄弟</button>
                    <button class="btn btn-action" onclick="app.showPureLineage(${person.id})"><i class="fas fa-project-diagram"></i> 纯脉展示</button>
                </div>
            `;
            // 启用/禁用操作按钮
            const btnEdit = document.getElementById('btn-edit-person');
            const btnView = document.getElementById('btn-view-person');
            if (btnEdit) btnEdit.disabled = false;
            if (btnView) btnView.disabled = false;
        }
    }

    /** 纯脉展示 */
    showPureLineage(personId) {
        this._treeState.pureLineageId = String(personId);
        this.renderTree();
        showToast('已进入纯脉展示模式', 'info');
    }

    exitPureLineage() {
        this._treeState.pureLineageId = '';
        this.renderTree();
    }

    /** 世系图搜索 */
    treeSearch(keyword) {
        this._treeState.searchKeyword = keyword;
        if (!keyword) { this._treeState.searchResults = []; this.renderTree(); return; }
        const kw = keyword.toLowerCase();
        this._treeState.searchResults = this.peopleData.filter(p =>
            (p.name && p.name.toLowerCase().includes(kw)) ||
            (p.generation && p.generation.toLowerCase().includes(kw)) ||
            (p.alias && p.alias.toLowerCase().includes(kw))
        );
        this.renderTree();
    }

    treeSearchSelect(id) {
        this._treeState.searchKeyword = '';
        this._treeState.searchResults = [];
        this.showPureLineage(id);
        this.selectTreePerson(id);
        // 延迟滚动到选中节点
        setTimeout(() => {
            const nodeEl = document.querySelector(`.tree-node[data-id="${id}"]`);
            if (nodeEl) nodeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }

    addRelative(type) {
        if (!this.selectedTreePerson) return;
        const p = this.selectedTreePerson;
        if (type === 'father') this.navigateTo('person-edit', { relation: 'father', targetId: p.id, targetName: encodeURIComponent(p.name), gender: '男' });
        else if (type === 'son') this.navigateTo('person-edit', { relation: 'child', targetId: p.id, targetName: encodeURIComponent(p.name), father_id: p.id, shi_xi: String(parseInt(p.shi_xi || 1) + 1), gender: '男' });
        else if (type === 'spouse') this.navigateTo('person-edit', { relation: 'spouse', targetId: p.id, targetName: encodeURIComponent(p.name) });
        else if (type === 'sibling') this.navigateTo('person-edit', { relation: 'sibling', targetId: p.id, targetName: encodeURIComponent(p.name), father_id: p.father_id, shi_xi: p.shi_xi, gender: '男' });
    }

    // ═══ 宝塔树 ═══
    _baotaState = { pureLineageId: '', searchKeyword: '', bindMode: false, adminBindLiShiId: '' };

    async loadBaota(showBefore17) {
        showLoading();
        try {
            if (this.peopleData.length === 0) {
                const res = await api.getPeople();
                if (res.status === 'success') { this.peopleData = res.data || []; this.buildPeopleDict(); }
            }
            // 检查绑定模式
            const params = this._navParams || {};
            this._baotaState.bindMode = !!params.bind_mode;
            this._baotaState.adminBindLiShiId = params.admin_bind_li_shi_id || '';
            if (this._baotaState.bindMode) {
                const bindBtn = document.getElementById('baota-btn-bind-person');
                if (bindBtn) { bindBtn.classList.remove('hidden'); bindBtn.disabled = false; }
            }
            this.renderBaota();
            this._initDrag('baota-container');
        } catch (e) { showToast('加载失败', 'error'); }
        finally { hideLoading(); }
    }

    renderBaota() {
        const canvas = document.getElementById('baota-canvas');
        if (!canvas) return;
        const st = this._baotaState;
        const showBefore17 = document.getElementById('show-before-17')?.checked ?? true;
        let people = this.peopleData.filter(p => !this.isSpouse(p));
        if (!showBefore17) people = people.filter(p => parseInt(p.shi_xi) >= 17);

        // 纯脉过滤
        if (st.pureLineageId) {
            const pureSet = this._calcPureLineage(st.pureLineageId, this.peopleData.filter(p => !this.isSpouse(p)));
            people = people.filter(p => pureSet.has(String(p.id)));
        }

        // 构建世代分组
        const genMap = {};
        people.forEach(p => {
            const g = parseInt(p.shi_xi) || 0;
            if (g <= 0) return;
            if (!genMap[g]) genMap[g] = [];
            genMap[g].push(p);
        });

        // ★★★ 过继逻辑：继子也出现在继父的世代行中 ★★★
        this.peopleData.filter(p => !this.isSpouse(p)).forEach(p => {
            const rawIds = p.adopt_father_ids;
            if (!rawIds) return;
            try {
                const ids = JSON.parse(rawIds);
                ids.forEach(aid => {
                    const adoptFather = this.peopleDict[aid];
                    if (!adoptFather) return;
                    const g = parseInt(adoptFather.shi_xi) + 1;
                    if (g <= 0) return;
                    if (!genMap[g]) genMap[g] = [];
                    // 避免重复
                    if (!genMap[g].find(x => String(x.id) === String(p.id) && x._isAdoptedBy)) {
                        genMap[g].push({ ...p, _isAdoptedBy: aid, shi_xi: String(g) });
                    }
                });
            } catch (e) { /* ignore */ }
        });
        const sortedGens = Object.keys(genMap).map(Number).sort((a, b) => a - b);

        const role = getCurrentRole();
        const keyword = st.searchKeyword.toLowerCase();

        let html = '';
        // 纯脉提示
        if (st.pureLineageId) {
            html += `<div class="tree-pure-lineage-bar">
                <span>🔗 纯脉展示模式</span>
                <button class="btn btn-small btn-outline" onclick="app.exitBaotaPureLineage()">退出纯脉</button>
            </div>`;
        }
        // 绑定模式提示
        if (st.bindMode) {
            html += `<div class="tree-pure-lineage-bar" style="background:linear-gradient(135deg,#e0e7ff,#c7d2fe);">
                <span>🔗 绑定人物模式 — 点击人物节点完成绑定</span>
            </div>`;
        }

        sortedGens.forEach(g => {
            const genPeople = genMap[g];
            html += `<div class="baota-gen-row">
                <div class="baota-gen-label">第${g}世</div>
                <div class="baota-gen-nodes">`;
            genPeople.forEach(p => {
                const isMatch = keyword && ((p.name && p.name.toLowerCase().includes(keyword)) || (p.generation && p.generation.toLowerCase().includes(keyword)));
                const spouse = this.peopleData.find(sp => String(sp.spouse_of_id) === String(p.id));
                const isAdopted = !!p._isAdoptedBy;
                html += `
                <div class="baota-node ${isMatch ? 'baota-node-highlight' : ''} ${isAdopted ? 'baota-node-adopted' : ''}" data-id="${p.id}" onclick="app.selectBaotaPerson(${p.id})">
                    ${this.renderGenderAvatar(p, 'baota-node-avatar')}
                    <div class="baota-node-name">${getDisplayName(p)}${isAdopted ? ' <small class="adopt-tag">继</small>' : ''}</div>
                    ${p.generation ? `<div class="baota-node-gen">${p.generation}</div>` : ''}
                    ${spouse ? `<div class="baota-node-spouse">配偶:${getDisplayName(spouse)}</div>` : ''}
                    <span class="alive-dot ${this.isAlive(p) ? 'alive' : 'dead'}" style="position:absolute;top:4px;right:4px;"></span>
                </div>`;
            });
            html += '</div></div>';
        });

        canvas.innerHTML = html;
        canvas.style.transform = `scale(${this.baotaZoom / 100})`;
        canvas.style.transformOrigin = 'top center';
        // 触发懒加载
        this._observeLazyImages();
    }

    selectBaotaPerson(id) {
        const person = this.peopleDict[id];
        if (!person) return;
        this.selectedBaotaPerson = person;
        const st = this._baotaState;

        // 绑定模式：直接绑定
        if (st.bindMode && !st.adminBindLiShiId) {
            this.showConfirm('绑定人物', `确定绑定"${getDisplayName(person)}"吗？`, async () => {
                await this.bindPerson(person.id);
            });
            return;
        }
        // 管理员帮绑定模式
        if (st.bindMode && st.adminBindLiShiId) {
            this.showConfirm('管理员帮绑定', `确定将该人物绑定给帐号 ${st.adminBindLiShiId} 吗？`, async () => {
                // 需要调用绑定API
                try {
                    showLoading();
                    // 先获取该帐号的wx_account信息，再绑定
                    const res = await api.bindWechatPerson(person.id);
                    if (res.status === 'success') { showToast('绑定成功', 'success'); this.navigateTo('admin-accounts'); }
                    else showToast(res.message || '绑定失败', 'error');
                } catch (e) { showToast('绑定失败', 'error'); }
                finally { hideLoading(); }
            });
            return;
        }

        // 正常选择：显示侧边面板
        const panel = document.getElementById('baota-side-panel');
        const nameEl = document.getElementById('baota-selected-name');
        const infoEl = document.getElementById('baota-selected-info');
        if (panel) panel.classList.remove('hidden');
        if (nameEl) nameEl.textContent = getDisplayName(person);
        if (infoEl) {
            const spouse = this.peopleData.find(p => String(p.spouse_of_id) === String(person.id));
            const children = this.peopleData.filter(c => String(c.father_id) === String(person.id));
            infoEl.innerHTML = `
                <div class="side-person-avatar">${this.renderGenderAvatar(person, '', 60)}</div>
                <div class="side-person-name">${getDisplayName(person)}</div>
                <div class="side-person-meta">${person.generation ? '字辈:' + person.generation + ' ' : ''}第${person.shi_xi || '?'}世 ${person.ranking ? '· ' + person.ranking : ''}</div>
                <div class="side-person-status">${this.isAlive(person) ? '🟢 健在' : '🔴 已逝'}</div>
                ${spouse ? `<div class="side-person-spouse">配偶: ${getDisplayName(spouse)}</div>` : ''}
                <div class="side-person-children">子女: ${children.length}人</div>
                <div class="side-person-actions">
                    <button class="btn btn-action" onclick="app.showBaotaPureLineage(${person.id})"><i class="fas fa-project-diagram"></i> 纯脉展示</button>
                </div>
            `;
            // 启用按钮
            document.getElementById('baota-btn-add-son')?.removeAttribute('disabled');
            document.getElementById('baota-btn-edit-person')?.removeAttribute('disabled');
            document.getElementById('baota-btn-view-person')?.removeAttribute('disabled');
        }
    }

    showBaotaPureLineage(personId) {
        this._baotaState.pureLineageId = String(personId);
        this.renderBaota();
    }

    exitBaotaPureLineage() {
        this._baotaState.pureLineageId = '';
        this.renderBaota();
    }

    // 世系图缩放（同步更新canvas transform）
    zoomTree(delta) {
        this.treeZoom = Math.max(50, Math.min(200, this.treeZoom + delta));
        document.getElementById('tree-zoom-level').textContent = this.treeZoom + '%';
        const canvas = document.getElementById('tree-canvas');
        if (canvas) canvas.style.transform = `scale(${this.treeZoom / 100})`;
    }
    resetTreeZoom() {
        this.treeZoom = 100;
        document.getElementById('tree-zoom-level').textContent = '100%';
        const canvas = document.getElementById('tree-canvas');
        if (canvas) { canvas.style.transform = 'scale(1)'; canvas.style.transformOrigin = 'top left'; }
    }
    setTreeMode(mode) { this.treeMode = mode; this.renderTree(); }

    // 宝塔树缩放（同步更新canvas transform）
    zoomBaota(delta) {
        this.baotaZoom = Math.max(50, Math.min(300, this.baotaZoom + delta));
        document.getElementById('baota-zoom-level').textContent = this.baotaZoom + '%';
        const canvas = document.getElementById('baota-canvas');
        if (canvas) canvas.style.transform = `scale(${this.baotaZoom / 100})`;
    }
    resetBaotaZoom() {
        this.baotaZoom = 100;
        document.getElementById('baota-zoom-level').textContent = '100%';
        const canvas = document.getElementById('baota-canvas');
        if (canvas) { canvas.style.transform = 'scale(1)'; canvas.style.transformOrigin = 'top center'; }
    }

    // 世系图/宝塔树 拖拽功能
    _initDrag(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        let isDragging = false, startX = 0, startY = 0, scrollStartX = 0, scrollStartY = 0;
        container.addEventListener('mousedown', e => {
            if (e.target.closest('.tree-node, .baota-node, .tree-toggle, button, a')) return;
            isDragging = true; startX = e.clientX; startY = e.clientY;
            scrollStartX = container.scrollLeft; scrollStartY = container.scrollTop;
            container.style.cursor = 'grabbing';
        });
        document.addEventListener('mousemove', e => {
            if (!isDragging) return;
            container.scrollLeft = scrollStartX - (e.clientX - startX);
            container.scrollTop = scrollStartY - (e.clientY - startY);
        });
        document.addEventListener('mouseup', () => {
            if (isDragging) { isDragging = false; container.style.cursor = ''; }
        });
        // Ctrl+滚轮缩放
        container.addEventListener('wheel', e => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const isTree = containerId === 'tree-container';
                if (isTree) this.zoomTree(e.deltaY < 0 ? 10 : -10);
                else this.zoomBaota(e.deltaY < 0 ? 10 : -10);
            }
        }, { passive: false });
    }

    // 全部展开/收起
    toggleExpandAll() {
        this._treeState.showAll = !this._treeState.showAll;
        this.renderTree();
    }

    // 世系图选中人员操作（addRelative在3105行已完整实现，此处不可重复定义）
    editSelectedTreePerson() { if (this.selectedTreePerson) this.navigateTo('person-edit', { id: this.selectedTreePerson.id }); }
    viewSelectedTreePerson() { if (this.selectedTreePerson) this.navigateTo('person-detail', { id: this.selectedTreePerson.id }); }

    // 宝塔树选中人员操作
    addBaotaRelative(type) {
        if (!this.selectedBaotaPerson) return;
        const p = this.selectedBaotaPerson;
        if (type === 'son') this.navigateTo('person-edit', { relation: 'child', targetId: p.id, targetName: encodeURIComponent(p.name), father_id: p.id, shi_xi: String(parseInt(p.shi_xi || 1) + 1), gender: '男' });
        else if (type === 'spouse') this.navigateTo('person-edit', { relation: 'spouse', targetId: p.id, targetName: encodeURIComponent(p.name) });
    }
    editSelectedBaotaPerson() { if (this.selectedBaotaPerson) this.navigateTo('person-edit', { id: this.selectedBaotaPerson.id }); }
    viewSelectedBaotaPerson() { if (this.selectedBaotaPerson) this.navigateTo('person-detail', { id: this.selectedBaotaPerson.id }); }
    async bindSelectedBaotaPerson() {
        if (!this.selectedBaotaPerson || !this.currentUser?.personId) return;
        this.showConfirm('绑定人物', `确定绑定"${this.selectedBaotaPerson.name}"吗？`, async () => {
            await this.bindPerson(this.selectedBaotaPerson.id);
        });
    }

    closeTreePanel() { document.getElementById('tree-side-panel')?.classList.add('hidden'); this.selectedTreePerson = null; }
    closeBaotaPanel() { document.getElementById('baota-side-panel')?.classList.add('hidden'); this.selectedBaotaPerson = null; }
}

// ═══ 全局实例 ═══
const app = new ZupuApp();