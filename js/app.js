/**
 * 上院李十七世族谱 - 网页端应用
 * PC + H5 响应式设计
 */

class ZupuApp {
    constructor() {
        this.currentUser = null;
        this.currentPage = 'overview';
        this.peopleData = [];
        this.peopleDict = {};
        this.treeZoomLevel = 100;
        this.baotaZoomLevel = 100;
        
        this.treePinchState = { active: false, initialDistance: 0, initialZoom: 100 };
        this.baotaPinchState = { active: false, initialDistance: 0, initialZoom: 100 };
        
        this.treeDragState = { active: false, startX: 0, startY: 0, translateX: 0, translateY: 0 };
        this.baotaDragState = { active: false, startX: 0, startY: 0, translateX: 0, translateY: 0 };
        
        this.init();
    }

    /**
     * 初始化应用
     */
    init() {
        this.bindEvents();
        this.checkLogin();
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 等待DOM完全加载
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.bindEvents());
            return;
        }

        // 登录按钮事件
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.onclick = (e) => {
                e.preventDefault();
                this.login();
                return false;
            };
        }

        // 游客预览按钮事件
        const guestBtn = document.getElementById('guest-btn');
        if (guestBtn) {
            guestBtn.onclick = (e) => {
                e.preventDefault();
                this.guestLogin();
                return false;
            };
        }

        // 密码框回车事件
        const passwordInput = document.getElementById('login-password');
        if (passwordInput) {
            passwordInput.onkeypress = (e) => {
                if (e.key === 'Enter') this.login();
            };
        }

        // 退出
        document.getElementById('logout-btn')?.addEventListener('click', () => this.logout());

        // 菜单切换
        document.getElementById('menu-toggle')?.addEventListener('click', () => this.toggleSidebar());
        document.getElementById('overlay')?.addEventListener('click', () => this.closeSidebar());

        // 菜单项点击
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                if (page) this.navigateTo(page);
            });
        });

        // 人员搜索
        document.getElementById('people-search')?.addEventListener('input', (e) => {
            this.searchPeople(e.target.value);
        });

        // 刷新人员列表
        document.getElementById('refresh-people')?.addEventListener('click', () => {
            this.loadPeople();
        });

        // 添加人员按钮
        document.getElementById('add-person-btn')?.addEventListener('click', () => {
            this.openAddPersonModal();
        });

        // 世系图缩放
        document.getElementById('tree-zoom-in')?.addEventListener('click', () => this.zoomTree(10));
        document.getElementById('tree-zoom-out')?.addEventListener('click', () => this.zoomTree(-10));
        document.getElementById('tree-reset')?.addEventListener('click', () => this.resetTreeZoom());

        // 宝塔树缩放
        document.getElementById('baota-zoom-in')?.addEventListener('click', () => this.zoomBaota(10));
        document.getElementById('baota-zoom-out')?.addEventListener('click', () => this.zoomBaota(-10));
        document.getElementById('baota-reset')?.addEventListener('click', () => this.resetBaotaZoom());

        // 世系图双指缩放
        const treeContainer = document.getElementById('tree-container');
        if (treeContainer) {
            treeContainer.addEventListener('touchstart', (e) => this.handleTreeTouchStart(e), { passive: false });
            treeContainer.addEventListener('touchmove', (e) => this.handleTreeTouchMove(e), { passive: false });
            treeContainer.addEventListener('touchend', () => this.handleTreeTouchEnd());
        }

        // 宝塔树双指缩放
        const baotaContainer = document.getElementById('baota-container');
        if (baotaContainer) {
            baotaContainer.addEventListener('touchstart', (e) => this.handleBaotaTouchStart(e), { passive: false });
            baotaContainer.addEventListener('touchmove', (e) => this.handleBaotaTouchMove(e), { passive: false });
            baotaContainer.addEventListener('touchend', () => this.handleBaotaTouchEnd());
        }

        // 弹窗关闭
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').classList.add('hidden');
            });
        });

        // 保存人员
        document.getElementById('save-person-btn')?.addEventListener('click', () => this.savePerson());

        // 选择头像
        document.getElementById('select-avatar-btn')?.addEventListener('click', () => this.selectAvatar());

        // 本人健在复选框事件
        document.getElementById('person-alive')?.addEventListener('change', (e) => {
            this.onAliveChanged(e.target.checked);
        });

        // 配偶健在复选框事件
        document.getElementById('person-spouse-alive')?.addEventListener('change', (e) => {
            this.onSpouseAliveChanged(e.target.checked);
        });

        // 导出
        document.getElementById('export-btn')?.addEventListener('click', () => this.exportData());

        // 导入
        document.getElementById('import-btn')?.addEventListener('click', () => {
            document.getElementById('import-file')?.click();
        });
        document.getElementById('import-file')?.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.importData(e.target.files[0]);
            }
        });
    }

    /**
     * 检查登录状态
     */
    async checkLogin() {
        const token = localStorage.getItem('token');
        const userInfo = localStorage.getItem('userInfo');
        
        if (!token) {
            this.showLoginPage();
            return;
        }

        // 从本地存储恢复用户信息
        if (userInfo) {
            try {
                this.currentUser = JSON.parse(userInfo);
                api.setToken(token);
                this.showMainPage();
                this.updateUI();
                return;
            } catch (e) {
                console.error('解析用户信息失败:', e);
            }
        }
        
        this.showLoginPage();
    }

    /**
     * 显示登录页面
     */
    showLoginPage() {
        document.getElementById('login-page').classList.remove('hidden');
        document.getElementById('main-page').classList.add('hidden');
    }

    /**
     * 显示主页面
     */
    showMainPage() {
        document.getElementById('login-page').classList.add('hidden');
        document.getElementById('main-page').classList.remove('hidden');
        
        const treeZoomControls = document.getElementById('tree-zoom-controls');
        const baotaZoomControls = document.getElementById('baota-zoom-controls');
        if (treeZoomControls) treeZoomControls.style.display = 'none';
        if (baotaZoomControls) baotaZoomControls.style.display = 'none';
    }

    /**
     * 更新UI（根据用户角色）
     */
    async updateUI() {
        if (!this.currentUser) return;

        // 检查是否是游客
        const isGuest = this.currentUser.role === 'guest';
        let displayName = this.currentUser.username;
        const isAdmin = this.currentUser.role === 'admin' || this.currentUser.role === 'super_admin';
        
        if (!isAdmin && !isGuest) {
            // 普通用户，尝试从人员列表中找到对应的姓名
            try {
                const peopleResult = await api.getPeople();
                if (peopleResult.status === 'success' && peopleResult.data) {
                    const person = peopleResult.data.find((p) => p.phone === this.currentUser.username);
                    if (person && person.name) {
                        displayName = `(${person.name})兄弟`;
                    }
                }
            } catch (e) {
                console.error('获取用户姓名失败:', e);
            }
        }

        // 更新用户信息（普通用户不显示角色，管理员显示角色）
        const userInfo = document.getElementById('user-info');
        if (userInfo) {
            const roleText = isGuest ? ' (游客)' : (isAdmin ? ` (${this.getRoleName(this.currentUser.role)})` : '');
            userInfo.textContent = `${displayName}${roleText}`;
        }

        // 根据角色显示/隐藏菜单
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = isAdmin ? 'flex' : 'none';
        });

        // 修改人员管理菜单文字：普通用户显示"我的"，管理员显示"人员管理"，游客显示"成员列表"
        const peopleMenuItem = document.querySelector('.menu-item[data-page="people"] span');
        if (peopleMenuItem) {
            if (isGuest) {
                peopleMenuItem.textContent = '成员列表';
            } else {
                peopleMenuItem.textContent = isAdmin ? '人员管理' : '我的';
            }
        }
        // 同步修改页面标题
        const peopleSectionTitle = document.querySelector('#people-section h2');
        if (peopleSectionTitle) {
            if (isGuest) {
                peopleSectionTitle.innerHTML = '<i class="fas fa-users"></i> 成员列表';
            } else {
                peopleSectionTitle.innerHTML = isAdmin ? '<i class="fas fa-users"></i> 人员管理' : '<i class="fas fa-user"></i> 我的信息';
            }
        }

        // 普通用户只能看到自己的人员信息，游客可以看所有
        if (!isAdmin && !isGuest) {
            this.loadOwnPersonInfo();
        } else {
            this.loadOverview();
        }
    }

    /**
     * 获取角色名称
     */
    getRoleName(role) {
        const roleNames = {
            'super_admin': '超级管理员',
            'admin': '管理员',
            'user': '普通用户'
        };
        return roleNames[role] || '普通用户';
    }

    /**
     * 登录
     */
    async login() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        if (!username || !password) {
            this.showToast('请输入账号和密码');
            return;
        }

        try {
            const result = await api.login(username, password);
            if (result.status === 'success') {
                // 后端返回的是 username 和 role，不是 user 对象
                this.currentUser = {
                    username: result.username,
                    role: result.role,
                    token: result.token
                };
                // 保存用户信息到本地存储
                localStorage.setItem('userInfo', JSON.stringify(this.currentUser));
                this.showMainPage();
                this.updateUI();
                this.showToast('登录成功');
            } else {
                this.showToast(result.message || '登录失败');
            }
        } catch (error) {
            this.showToast('登录失败: ' + error.message);
        }
    }

    /**
     * 游客登录
     */
    guestLogin() {
        this.currentUser = {
            username: '游客',
            role: 'guest',
            token: null
        };
        // 保存用户信息到本地存储
        localStorage.setItem('userInfo', JSON.stringify(this.currentUser));
        this.showMainPage();
        this.updateUI();
        this.showToast('游客模式已开启');
    }

    /**
     * 退出
     */
    logout() {
        api.clearToken();
        this.currentUser = null;
        localStorage.removeItem('userInfo');
        this.showLoginPage();
        this.showToast('已退出登录');
    }

    /**
     * 切换侧边栏
     */
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
    }

    /**
     * 关闭侧边栏
     */
    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
    }

    /**
     * 页面导航
     */
    navigateTo(page) {
        this.currentPage = page;

        // 更新菜单激活状态
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === page) {
                item.classList.add('active');
            }
        });

        // 显示对应内容
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        const targetSection = document.getElementById(`${page}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // 显示/隐藏缩放按钮
        const treeZoomControls = document.getElementById('tree-zoom-controls');
        const baotaZoomControls = document.getElementById('baota-zoom-controls');
        
        if (treeZoomControls) treeZoomControls.style.display = page === 'tree' ? 'flex' : 'none';
        if (baotaZoomControls) baotaZoomControls.style.display = page === 'baota' ? 'flex' : 'none';

        // 关闭侧边栏（移动端）
        this.closeSidebar();

        // 加载页面数据
        switch (page) {
            case 'overview':
                this.loadOverview();
                break;
            case 'people':
                this.loadPeople();
                break;
            case 'tree':
                this.loadTree();
                break;
            case 'baota':
                this.loadBaota();
                break;
            case 'photos':
                this.loadPhotos();
                break;
            case 'permission':
                this.loadUsers();
                break;
        }
    }

    /**
     * 加载概览数据
     */
    async loadOverview() {
        try {
            const result = await api.getPeople();
            if (result.status === 'success') {
                const people = result.data || [];
                
                // 统计数据
                document.getElementById('total-people').textContent = people.length;
                document.getElementById('male-count').textContent = people.filter(p => p.gender === '男').length;
                document.getElementById('female-count').textContent = people.filter(p => p.gender === '女').length;
                
                // 计算世代数
                const shiXis = people.map(p => parseInt(p.shi_xi)).filter(x => !isNaN(x));
                const minGen = shiXis.length > 0 ? Math.min(...shiXis) : 0;
                const maxGen = shiXis.length > 0 ? Math.max(...shiXis) : 0;
                document.getElementById('generation-count').textContent = maxGen - minGen + 1;

                // 最近更新（取前5个）
                const recentList = document.getElementById('recent-list');
                const recent = people.slice(-5).reverse();
                recentList.innerHTML = recent.map(p => `
                    <div class="recent-item">
                        <span>${p.name}</span>
                        <span class="text-muted">${p.generation || ''}</span>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('加载概览失败:', error);
        }
    }

    /**
     * 加载人员列表
     */
    async loadPeople() {
        try {
            const result = await api.getPeople();
            if (result.status === 'success') {
                this.peopleData = result.data || [];
                this.peopleDict = {};
                this.peopleData.forEach(p => {
                    this.peopleDict[p.id] = p;
                });
                this.renderPeopleTable(this.peopleData);
            }
        } catch (error) {
            this.showToast('加载人员失败: ' + error.message);
        }
    }

    /**
     * 渲染人员表格
     */
    renderPeopleTable(people) {
        const tbody = document.getElementById('people-tbody');
        if (!tbody) return;

        const isAdmin = this.currentUser?.role === 'admin' || this.currentUser?.role === 'super_admin';
        const currentPersonId = this.currentUser?.person_id;
        const currentUserPhone = this.currentUser?.username;

        tbody.innerHTML = people.map(person => {
            // 普通用户只能看到自己的信息
            if (!isAdmin && person.id !== currentPersonId && person.phone !== currentUserPhone) {
                return '';
            }

            const father = this.peopleDict[person.father_id];
            const fatherName = father ? father.name : '';
            const firstChar = person.name ? person.name[0] : '?';
            const defaultAvatar = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22><rect width=%2240%22 height=%2240%22 fill=%22%23ddd%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22>${firstChar}</text></svg>`;
            const errorAvatar = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22><rect width=%2240%22 height=%2240%22 fill=%22%23ddd%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22>?</text></svg>`;
            
            // 判断是否是自己
            const isSelf = person.id === currentPersonId || person.phone === currentUserPhone;
            const nameDisplay = isSelf ? `${person.name}(我)` : person.name;

            return `
                <tr>
                    <td>${person.id}</td>
                    <td class="avatar-cell">
                        <img src="${person.avatar || defaultAvatar}" 
                             alt="${person.name}" 
                             onerror="this.src='${errorAvatar}'">
                    </td>
                    <td>${nameDisplay}</td>
                    <td>${person.gender}</td>
                    <td>${person.generation || ''}</td>
                    <td>${person.shi_xi ? '第' + person.shi_xi + '世' : ''}</td>
                    <td>${person.birth_date || ''}</td>
                    <td>${person.death_date ? '已逝' : '健在'}</td>
                    <td>${fatherName}</td>
                    <td class="actions">
                        <button class="btn btn-small btn-secondary" onclick="app.viewPerson(${person.id})">查看</button>
                        ${isAdmin ? `
                            <button class="btn btn-small btn-primary" onclick="app.editPerson(${person.id})">编辑</button>
                            <button class="btn btn-small btn-danger" onclick="app.deletePerson(${person.id})">删除</button>
                        ` : (isSelf ? `
                            <button class="btn btn-small btn-primary" onclick="app.editPerson(${person.id})">编辑</button>
                        ` : '')}
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * 搜索人员
     */
    searchPeople(keyword) {
        if (!keyword) {
            this.renderPeopleTable(this.peopleData);
            return;
        }
        
        const filtered = this.peopleData.filter(p => 
            p.name.includes(keyword) || 
            (p.generation && p.generation.includes(keyword))
        );
        this.renderPeopleTable(filtered);
    }

    /**
     * 加载普通用户自己的信息
     */
    async loadOwnPersonInfo() {
        if (!this.currentUser?.person_id) return;
        
        try {
            const result = await api.getPerson(this.currentUser.person_id);
            if (result.status === 'success') {
                // 在概览页面显示自己的信息
                this.renderPeopleTable([result.data]);
            }
        } catch (error) {
            console.error('加载个人信息失败:', error);
        }
    }

    /**
     * 查看人员详情
     */
    viewPerson(id) {
        const person = this.peopleDict[id];
        if (!person) return;

        this.openPersonModal(person, false);
    }

    /**
     * 打开添加人员弹窗
     */
    openAddPersonModal() {
        const modal = document.getElementById('person-modal');
        const title = document.getElementById('person-modal-title');
        
        title.textContent = '添加人员';
        
        // 清空表单
        document.getElementById('person-id').value = '';
        document.getElementById('person-name').value = '';
        document.getElementById('person-alias').value = '';
        document.getElementById('person-gender').value = '男';
        document.getElementById('person-phone').value = '';
        document.getElementById('person-alive').checked = true;
        document.getElementById('person-married').checked = true;
        document.getElementById('person-adopted').checked = false;
        document.getElementById('person-death-date').value = '';
        document.getElementById('person-generation').value = '';
        document.getElementById('person-shi-xi').value = '';
        document.getElementById('person-birth-date').value = '';
        document.getElementById('person-birth-calendar').value = '公历';
        document.getElementById('person-ranking').value = '';
        document.getElementById('person-birth-place').value = '';
        document.getElementById('person-live-place').value = '';
        document.getElementById('person-move-info').value = '';
        document.getElementById('person-remark').value = '';
        document.getElementById('person-sort').value = '';
        document.getElementById('person-bio').value = '';
        document.getElementById('person-avatar').value = '';
        
        // 清空配偶字段
        document.getElementById('person-spouse-name').value = '';
        document.getElementById('person-spouse-phone').value = '';
        document.getElementById('person-spouse-birth-date').value = '';
        document.getElementById('person-spouse-birth-calendar').value = '公历';
        document.getElementById('person-spouse-alive').checked = true;
        document.getElementById('person-spouse-death-date').value = '';
        document.getElementById('person-spouse-bio').value = '';
        document.getElementById('spouse-death-group').style.display = 'none';
        
        // 头像预览重置
        const avatarPreview = document.getElementById('person-avatar-preview');
        avatarPreview.src = '';
        avatarPreview.onerror = function() {
            this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="%23ddd"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999">?</text></svg>';
        };

        // 填充父亲选择框
        this.fillFatherSelect(null);

        // 启用表单
        const form = document.getElementById('person-form');
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.disabled = false;
        });

        // 显示保存按钮和选择头像按钮
        document.getElementById('save-person-btn').style.display = 'inline-flex';
        document.getElementById('select-avatar-btn').style.display = 'inline-flex';

        modal.classList.remove('hidden');
    }

    /**
     * 编辑人员
     */
    editPerson(id) {
        const person = this.peopleDict[id];
        if (!person) return;

        this.openPersonModal(person, true);
    }

    /**
     * 打开人员弹窗
     */
    openPersonModal(person, editable) {
        const modal = document.getElementById('person-modal');
        const title = document.getElementById('person-modal-title');
        
        title.textContent = editable ? '编辑人员' : '人员详情';
        
        // 填充表单
        document.getElementById('person-id').value = person.id || '';
        document.getElementById('person-name').value = person.name || '';
        document.getElementById('person-alias').value = person.alias || '';
        document.getElementById('person-gender').value = person.gender || '男';
        document.getElementById('person-phone').value = person.phone || '';
        document.getElementById('person-alive').checked = person.death_date ? false : (person.is_alive !== undefined ? person.is_alive : true);
        document.getElementById('person-married').checked = person.is_married !== undefined ? person.is_married : true;
        document.getElementById('person-adopted').checked = person.is_adopted !== undefined ? person.is_adopted : false;
        document.getElementById('person-death-date').value = person.death_date || '';
        document.getElementById('person-generation').value = person.generation || '';
        document.getElementById('person-shi-xi').value = person.shi_xi || '';
        document.getElementById('person-birth-date').value = person.birth_date || '';
        document.getElementById('person-birth-calendar').value = person.birth_calendar || '公历';
        document.getElementById('person-ranking').value = person.ranking || '';
        document.getElementById('person-birth-place').value = person.birth_place || '';
        document.getElementById('person-live-place').value = person.live_place || '';
        document.getElementById('person-move-info').value = person.move_info || '';
        document.getElementById('person-remark').value = person.remark || '';
        document.getElementById('person-sort').value = person.sort || '';
        document.getElementById('person-bio').value = person.bio || '';
        document.getElementById('person-avatar').value = person.avatar || '';
        
        // 填充配偶字段
        document.getElementById('person-spouse-name').value = person.spouse_name || '';
        document.getElementById('person-spouse-phone').value = person.spouse_phone || '';
        document.getElementById('person-spouse-birth-date').value = person.spouse_birth_date || '';
        document.getElementById('person-spouse-birth-calendar').value = person.spouse_birth_calendar || '公历';
        const spouseAlive = person.spouse_alive !== undefined ? (person.spouse_alive === 1) : true;
        document.getElementById('person-spouse-alive').checked = spouseAlive;
        document.getElementById('person-spouse-death-date').value = person.spouse_death_date || '';
        document.getElementById('person-spouse-bio').value = person.spouse_bio || '';
        document.getElementById('spouse-death-group').style.display = spouseAlive ? 'none' : 'block';
        
        // 头像预览
        const avatarPreview = document.getElementById('person-avatar-preview');
        avatarPreview.src = person.avatar || '';
        avatarPreview.onerror = function() {
            this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="%23ddd"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999">?</text></svg>';
        };

        // 填充父亲选择框
        this.fillFatherSelect(person.father_id);
        
        // 加载过继父亲选择框
        this.loadAdoptFatherSelect(person.adopt_father_id || '');
        
        // 设置过继选择框显示状态
        const adoptedChecked = person.is_adopted !== undefined ? person.is_adopted : false;
        document.getElementById('person-adopted').checked = adoptedChecked;
        document.getElementById('adopt-father-select').style.display = adoptedChecked ? 'flex' : 'none';

        // 设置表单只读状态
        const form = document.getElementById('person-form');
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.disabled = !editable;
        });

        // 显示/隐藏保存按钮
        document.getElementById('save-person-btn').style.display = editable ? 'inline-flex' : 'none';
        document.getElementById('select-avatar-btn').style.display = editable ? 'inline-flex' : 'none';

        modal.classList.remove('hidden');
    }

    /**
     * 填充父亲选择框
     */
    fillFatherSelect(selectedFatherId) {
        const select = document.getElementById('person-father');
        select.innerHTML = '<option value="">无</option>';
        
        this.peopleData.forEach(person => {
            if (person.gender === '男') {
                const option = document.createElement('option');
                option.value = person.id;
                option.textContent = person.name;
                if (person.id == selectedFatherId) {
                    option.selected = true;
                }
                select.appendChild(option);
            }
        });
    }

    /**
     * 保存人员（新增或编辑）
     */
    async savePerson() {
        const id = document.getElementById('person-id').value;
        const isAlive = document.getElementById('person-alive').checked;
        const data = {
            name: document.getElementById('person-name').value,
            alias: document.getElementById('person-alias').value,
            phone: document.getElementById('person-phone').value,
            gender: document.getElementById('person-gender').value,
            is_alive: isAlive ? 1 : 0,
            death_date: isAlive ? '' : document.getElementById('person-death-date').value,
            is_married: document.getElementById('person-married').checked ? 1 : 0,
            is_adopted: document.getElementById('person-adopted').checked ? 1 : 0,
            adopt_father_id: document.getElementById('adopt-father-combo').value || '',
            generation: document.getElementById('person-generation').value,
            shi_xi: document.getElementById('person-shi-xi').value,
            birth_date: document.getElementById('person-birth-date').value,
            birth_calendar: document.getElementById('person-birth-calendar').value,
            father_id: document.getElementById('person-father').value || null,
            ranking: document.getElementById('person-ranking').value,
            birth_place: document.getElementById('person-birth-place').value,
            live_place: document.getElementById('person-live-place').value,
            move_info: document.getElementById('person-move-info').value,
            remark: document.getElementById('person-remark').value,
            sort: document.getElementById('person-sort').value,
            bio: document.getElementById('person-bio').value,
            avatar: document.getElementById('person-avatar').value,
            spouse_name: document.getElementById('person-spouse-name').value,
            spouse_phone: document.getElementById('person-spouse-phone').value,
            spouse_birth_date: document.getElementById('person-spouse-birth-date').value,
            spouse_birth_calendar: document.getElementById('person-spouse-birth-calendar').value,
            spouse_alive: document.getElementById('person-spouse-alive').checked ? 1 : 0,
            spouse_death_date: document.getElementById('person-spouse-death-date').value,
            spouse_bio: document.getElementById('person-spouse-bio').value
        };

        // 验证必填字段
        if (!data.name) {
            this.showToast('请输入姓名');
            return;
        }

        try {
            let result;
            if (id) {
                // 编辑现有人员
                result = await api.updatePerson(id, data);
            } else {
                // 添加新人员
                result = await api.addPerson(data);
            }
            
            if (result.status === 'success') {
                this.showToast(id ? '保存成功' : '添加成功');
                document.getElementById('person-modal').classList.add('hidden');
                this.loadPeople();
            } else {
                this.showToast(result.message || (id ? '保存失败' : '添加失败'));
            }
        } catch (error) {
            this.showToast((id ? '保存' : '添加') + '失败: ' + error.message);
        }
    }

    /**
     * 删除人员
     */
    async deletePerson(id) {
        if (!confirm('确定要删除此人吗？')) return;

        try {
            const result = await api.deletePerson(id);
            if (result.status === 'success') {
                this.showToast('删除成功');
                this.loadPeople();
            } else {
                this.showToast(result.message || '删除失败');
            }
        } catch (error) {
            this.showToast('删除失败: ' + error.message);
        }
    }

    /**
     * 本人健在状态改变
     */
    onAliveChanged(checked) {
        const deathDateInput = document.getElementById('person-death-date');
        if (deathDateInput) {
            const formGroup = deathDateInput.closest('.form-group');
            if (formGroup) {
                formGroup.style.display = checked ? 'block' : 'block';
            }
            deathDateInput.disabled = checked;
            if (checked) {
                deathDateInput.value = '';
            }
        }
    }

    /**
     * 配偶健在状态改变
     */
    onSpouseAliveChanged(checked) {
        const deathDateGroup = document.getElementById('spouse-death-group');
        deathDateGroup.style.display = checked ? 'none' : 'block';
    }

    /**
     * 是否健在状态改变
     */
    onAliveChanged() {
        const isAlive = document.getElementById('person-alive').checked;
        const deathDateInput = document.getElementById('person-death-date');
        deathDateInput.disabled = isAlive;
        if (isAlive) {
            deathDateInput.value = '';
        }
    }

    /**
     * 是否过继状态改变
     */
    onAdoptedChanged() {
        const adopted = document.getElementById('person-adopted').checked;
        const adoptFatherSelect = document.getElementById('adopt-father-select');
        adoptFatherSelect.style.display = adopted ? 'flex' : 'none';
        
        // 如果选中过继，加载父亲列表
        if (adopted && !document.getElementById('adopt-father-combo').options.length > 1) {
            this.loadAdoptFatherSelect('');
        }
    }

    /**
     * 加载过继父亲选择框
     */
    async loadAdoptFatherSelect(selectedId = '') {
        try {
            const response = await api.getPerson();
            if (response.status === 'success') {
                const people = response.data || [];
                const select = document.getElementById('adopt-father-combo');
                select.innerHTML = '<option value="">-- 请选择父亲 --</option>';
                
                people.forEach(person => {
                    if (person.gender === '男') {
                        const option = document.createElement('option');
                        option.value = person.id;
                        option.text = `${person.name}(${person.generation || '?'}世)`;
                        if (person.id == selectedId) {
                            option.selected = true;
                        }
                        select.appendChild(option);
                    }
                });
            }
        } catch (error) {
            console.error('加载过继父亲列表失败:', error);
        }
    }

    /**
     * 选择头像
     */
    async selectAvatar() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                this.showToast('正在上传...');
                const result = await api.uploadFile(file, 'avatars');
                if (result.status === 'success') {
                    document.getElementById('person-avatar').value = result.url;
                    document.getElementById('person-avatar-preview').src = result.url;
                    this.showToast('上传成功');
                } else {
                    this.showToast(result.message || '上传失败');
                }
            } catch (error) {
                this.showToast('上传失败: ' + error.message);
            }
        };
        input.click();
    }

    /**
     * 加载世系图
     */
    async loadTree() {
        try {
            const result = await api.getPeople();
            if (result.status === 'success') {
                this.renderTree(result.data);
            }
        } catch (error) {
            console.error('加载世系图失败:', error);
        }
    }

    /**
     * 渲染世系图 — 可视化递归树形布局（与小程序端算法一致）
     */
    renderTree(people) {
        const canvas = document.getElementById('tree-canvas');
        if (!canvas) return;

        const peopleDict = {};
        people.forEach(p => { peopleDict[p.id] = p; });

        // 找根节点
        let roots = people.filter(p => !p.father_id || !peopleDict[p.father_id]);
        if (roots.length === 0 && people.length > 0) {
            roots = [people[0]];
        }

        // ═══ 布局常量（px）═══
        const CARD_W = 110;
        const CARD_H = 140;
        const SIBLING_GAP = 70;
        const SUBTREE_GAP = 35;
        const V_PARENT_TO_LINE = 45;
        const V_LINE_TO_CHILD = 45;
        const LINE_W = 3;

        const allNodes = [];
        const allLines = [];

        // ═══ 递归布局函数 ═══
        function layoutSubtree(personId, startX, startY) {
            const person = peopleDict[personId];
            if (!person) return { nextX: startX };

            const children = people.filter(p => p.father_id === personId);
            children.sort((a, b) => (parseInt(a.ranking) || 99) - (parseInt(b.ranking) || 99));

            // 叶子节点
            if (children.length === 0) {
                const node = { id: personId, person, x: startX, y: startY, cx: startX + CARD_W / 2, bottomY: startY + CARD_H, topY: startY };
                allNodes.push(node);
                return { nextX: startX + CARD_W };
            }

            // 先递归布局孩子
            const childStartY = startY + CARD_H + V_PARENT_TO_LINE + V_LINE_TO_CHILD;
            let childX = startX;
            const childLayouts = [];

            children.forEach(child => {
                const beforeCount = allNodes.length;
                const result = layoutSubtree(child.id, childX, childStartY);
                for (let i = beforeCount; i < allNodes.length; i++) {
                    childLayouts.push(allNodes[i]);
                }
                childX = result.nextX + SIBLING_GAP;
            });

            // 父居中于孩子中间
            const firstChild = childLayouts[0];
            const lastChild = childLayouts[childLayouts.length - 1];
            const parentCx = (firstChild.cx + lastChild.cx) / 2;
            const parentX = parentCx - CARD_W / 2;
            const parentY = startY;

            const parentNode = { id: personId, person, x: parentX, y: parentY, cx: parentCx, bottomY: parentY + CARD_H, topY: parentY };

            // 连线
            const lineY = parentY + CARD_H + V_PARENT_TO_LINE;

            // ① 父→横线竖线
            allLines.push({ type: 'v-main', x1: parentCx, y1: parentY + CARD_H, x2: parentCx, y2: lineY });

            if (children.length >= 2) {
                // ② 横线（长兄↔幼子）
                allLines.push({ type: 'h-main', x1: firstChild.cx, y1: lineY, x2: lastChild.cx, y2: lineY });
                // ③ 孩子→横线细线
                childLayouts.forEach(child => {
                    allLines.push({ type: 'v-thin', x1: child.cx, y1: lineY, x2: child.cx, y2: child.topY });
                });
            } else if (children.length === 1) {
                // 独生子：替换为一根完整竖线
                allLines.pop();
                allLines.push({ type: 'v-main', x1: parentCx, y1: parentY + CARD_H, x2: childLayouts[0].cx, y2: childLayouts[0].topY });
            }

            allNodes.push(parentNode);
            const treeLeft = Math.min(parentX, firstChild.x);
            const treeRight = Math.max(parentX + CARD_W, lastChild.x + CARD_W);
            return { nextX: treeRight };
        }

        // 布局所有根节点
        let currentX = 20;
        roots.sort((a, b) => (parseInt(a.ranking) || 99) - (parseInt(b.ranking) || 99));
        roots.forEach(root => {
            const result = layoutSubtree(root.id, currentX, 20);
            currentX = result.nextX + SUBTREE_GAP;
        });

        // 计算画布尺寸
        let maxX = 20, maxY = 20;
        allNodes.forEach(n => {
            if (n.x + CARD_W > maxX) maxX = n.x + CARD_W;
            if (n.y + CARD_H > maxY) maxY = n.y + CARD_H;
        });

        const PADDING = 30;
        const canvasW = maxX + PADDING;
        const canvasH = maxY + PADDING;
        const currentPersonId = this.currentUser?.person_id;
        const currentUserPhone = this.currentUser?.username;

        // ═══ 生成 SVG 连线 ═══
        let svgLines = '';
        allLines.forEach(L => {
            const color = L.type === 'v-thin' ? '#999' : '#667eea';
            const sw = L.type === 'v-thin' ? 1.5 : LINE_W;
            svgLines += `<line x1="${L.x1}" y1="${L.y1}" x2="${L.x2}" y2="${L.y2}" stroke="${color}" stroke-width="${sw}"/>`;
        });

        // ═══ 生成节点卡片 HTML ═══
        let nodesHtml = '';
        allNodes.forEach(n => {
            const p = n.person;
            const isSelf = p.id === currentPersonId || p.phone === currentUserPhone;
            const nameDisplay = isSelf ? `${p.name}(我)` : p.name;
            const children = peopleDict[p.id] ? people.filter(c => c.father_id === p.id) : [];
            const hasChildren = children.length > 0;
            const isMarried = p.is_married === 1;
            const hasSpouse = p.spouse_name && p.spouse_name.trim() !== '';

            nodesHtml += `
            <div class="tree-card ${hasChildren ? 'has-children' : ''}"
                 style="left:${n.x}px;top:${n.y}px;width:${CARD_W}px;height:${CARD_H}px;"
                 onclick="app.viewPerson(${p.id})">
                ${isMarried ? `
                    <div class="tree-avatar-split">
                        <div class="tree-av-half tree-av-self" onclick="event.stopPropagation();app.viewPerson(${p.id})">
                            <img src="${p.avatar||''}" onerror="this.parentElement.innerHTML='<span class=\\'av-ph\\'>${p.name[0]||'?'}</span>'">
                        </div>
                        <div class="tree-av-half tree-av-spouse" onclick="event.stopPropagation();${hasSpouse?`app.viewSpouse(${JSON.stringify(p).replace(/"/g,'&quot;')})`:''}">
                            ${hasSpouse?`<img src="${p.spouse_avatar||''}" onerror="this.parentElement.innerHTML='<span class=\\'av-ph\\'>${p.spouse_name[0]||'配'}</span>'">`:'<span class="av-ph">-</span>'}
                        </div>
                    </div>
                    <div class="tree-name-row">
                        <span class="tree-vname">${nameDisplay}</span>
                        ${hasSpouse ? `<span class="tree-vname spouse">${p.spouse_name}</span>` : ''}
                    </div>
                ` : `
                    <div class="tree-avatar-single">
                        <img src="${p.avatar||''}" onerror="this.parentElement.innerHTML='<span class=\\'av-ph\\'>${p.name[0]||'?'}</span>'">
                    </div>
                    <div class="tree-name-single"><span class="tree-vname">${nameDisplay}</span></div>
                `}
                ${hasChildren ? `<div class="tree-badge">${children.length}</div>` : ''}
            </div>`;
        });

        canvas.innerHTML = `
            <div class="tree-svg-container" style="position:relative;width:${canvasW}px;height:${canvasH}px;">
                <svg style="position:absolute;left:0;top:0;width:${canvasW}px;height:${canvasH}px;overflow:visible;">
                    ${svgLines}
                </svg>
                ${nodesHtml}
            </div>`;
    },

    /**
     * 显示配偶弹窗
     */
    viewSpouse(personData) {
        if (!personData.spouse_name) {
            this.showToast('暂无配偶信息');
            return;
        }
        // 构造一个伪人员对象用于弹窗展示
        const spouseObj = {
            displayName: personData.spouse_name,
            name: personData.spouse_name,
            avatar: personData.spouse_avatar || '',
            gender: '女',
            spouse_of: personData.name
        };
        this.openPersonModal(spouseObj, false);
    },

    /**
     * 世系图缩放
     */
    zoomTree(delta) {
        this.treeZoomLevel = Math.max(50, Math.min(300, this.treeZoomLevel + delta));
        const canvas = document.getElementById('tree-canvas');
        if (canvas) {
            canvas.style.transform = `translate(${this.treeDragState.translateX}px, ${this.treeDragState.translateY}px) scale(${this.treeZoomLevel / 100})`;
        }
    }

    resetTreeZoom() {
        this.treeZoomLevel = 100;
        this.treeDragState.translateX = 0;
        this.treeDragState.translateY = 0;
        const canvas = document.getElementById('tree-canvas');
        if (canvas) {
            canvas.style.transform = 'scale(1)';
        }
    }

    /**
     * 世系图双指触摸事件
     */
    getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    handleTreeTouchStart(e) {
        if (e.touches.length === 2) {
            e.preventDefault();
            this.treePinchState.active = true;
            this.treePinchState.initialDistance = this.getTouchDistance(e.touches);
            this.treePinchState.initialZoom = this.treeZoomLevel;
        } else if (e.touches.length === 1) {
            this.treeDragState.active = true;
            this.treeDragState.startX = e.touches[0].clientX;
            this.treeDragState.startY = e.touches[0].clientY;
        }
    }

    handleTreeTouchMove(e) {
        if (this.treePinchState.active && e.touches.length === 2) {
            e.preventDefault();
            const currentDistance = this.getTouchDistance(e.touches);
            const scale = currentDistance / this.treePinchState.initialDistance;
            const newZoom = this.treePinchState.initialZoom * scale;
            this.treeZoomLevel = Math.max(50, Math.min(300, newZoom));
            const canvas = document.getElementById('tree-canvas');
            if (canvas) {
                canvas.style.transform = `translate(${this.treeDragState.translateX}px, ${this.treeDragState.translateY}px) scale(${this.treeZoomLevel / 100})`;
            }
        } else if (this.treeDragState.active && e.touches.length === 1) {
            e.preventDefault();
            const dx = e.touches[0].clientX - this.treeDragState.startX;
            const dy = e.touches[0].clientY - this.treeDragState.startY;
            this.treeDragState.translateX += dx;
            this.treeDragState.translateY += dy;
            this.treeDragState.startX = e.touches[0].clientX;
            this.treeDragState.startY = e.touches[0].clientY;
            const canvas = document.getElementById('tree-canvas');
            if (canvas) {
                canvas.style.transform = `translate(${this.treeDragState.translateX}px, ${this.treeDragState.translateY}px) scale(${this.treeZoomLevel / 100})`;
            }
        }
    }

    handleTreeTouchEnd() {
        this.treePinchState.active = false;
        this.treeDragState.active = false;
    }

    /**
     * 加载宝塔树
     */
    async loadBaota() {
        try {
            const result = await api.getPeople();
            if (result.status === 'success') {
                this.renderBaota(result.data);
            }
        } catch (error) {
            console.error('加载宝塔树失败:', error);
        }
    }

    /**
     * 渲染宝塔树 - 经典递归树形布局（与小程序算法一致）
     *
     * 改进：
     * 1. 检测 is_married → 已婚双头像 / 未婚单头像
     * 2. 本人/配偶各自独立点击
     * 3. 显示子节点数量徽章
     */
    renderBaota(people) {
        const canvas = document.getElementById('baota-canvas');
        if (!canvas) return;

        // 创建人员字典
        const peopleDict = {};
        people.forEach(p => { peopleDict[p.id] = p; });

        // 为每个人员计算子节点
        people.forEach(p => { p.children = people.filter(child => child.father_id === p.id); });

        // 找出根节点
        const rootNodes = people.filter(p => !p.father_id || !peopleDict[p.father_id]);
        if (rootNodes.length === 0 && people.length > 0) rootNodes.push(people[0]);

        // ═══ 布局常量（px）═══
        const CARD_W = 100;
        const CARD_H = 130;
        const SIBLING_GAP = 65;
        const SUBTREE_GAP = 35;
        const V_PARENT_TO_LINE = 45;
        const V_LINE_TO_CHILD = 45;
        const LINE_W = 3;
        const PADDING = 30;

        const allNodes = [];
        const allLines = [];

        // ═══ 递归布局函数 ═══
        function layoutSubtree(personId, startX, startY) {
            const person = peopleDict[personId];
            if (!person) return { nextX: startX };

            const children = (person.children || []).slice();
            children.sort((a, b) => (parseInt(a.ranking) || 99) - (parseInt(b.ranking) || 99));

            if (children.length === 0) {
                const node = { id: personId, person, x: startX, y: startY, cx: startX + CARD_W / 2, bottomY: startY + CARD_H, topY: startY };
                allNodes.push(node);
                return { nextX: startX + CARD_W };
            }

            const childStartY = startY + CARD_H + V_PARENT_TO_LINE + V_LINE_TO_CHILD;
            let childX = startX;
            const childLayouts = [];

            children.forEach(child => {
                const beforeCount = allNodes.length;
                const result = layoutSubtree(child.id, childX, childStartY);
                for (let i = beforeCount; i < allNodes.length; i++) {
                    childLayouts.push(allNodes[i]);
                }
                childX = result.nextX + SIBLING_GAP;
            });

            const firstChild = childLayouts[0];
            const lastChild = childLayouts[childLayouts.length - 1];
            const parentCx = (firstChild.cx + lastChild.cx) / 2;
            const parentX = parentCx - CARD_W / 2;
            const parentY = startY;

            const parentNode = { id: personId, person, x: parentX, y: parentY, cx: parentCx, bottomY: parentY + CARD_H, topY: parentY };

            // 连线（同小程序逻辑）
            const lineY = parentY + CARD_H + V_PARENT_TO_LINE;

            allLines.push({ type: 'v-main', x1: parentCx, y1: parentY + CARD_H, x2: parentCx, y2: lineY });

            if (children.length >= 2) {
                allLines.push({ type: 'h-main', x1: firstChild.cx, y1: lineY, x2: lastChild.cx, y2: lineY });
                childLayouts.forEach(child => {
                    allLines.push({ type: 'v-thin', x1: child.cx, y1: lineY, x2: child.cx, y2: child.topY });
                });
            } else if (children.length === 1) {
                allLines.pop();
                allLines.push({ type: 'v-main', x1: parentCx, y1: parentY + CARD_H, x2: childLayouts[0].cx, y2: childLayouts[0].topY });
            }

            allNodes.push(parentNode);
            const treeLeft = Math.min(parentX, firstChild.x);
            const treeRight = Math.max(parentX + CARD_W, lastChild.x + CARD_W);
            return { nextX: treeRight };
        }

        // 布局所有根节点
        let startX = PADDING;
        rootNodes.sort((a, b) => (parseInt(a.ranking) || 99) - (parseInt(b.ranking) || 99));
        rootNodes.forEach(root => {
            const result = layoutSubtree(root.id, startX, PADDING);
            startX = result.nextX + SUBTREE_GAP;
        });

        // 计算画布大小
        let maxX = 20, maxY = 20;
        allNodes.forEach(n => {
            if (n.x + CARD_W > maxX) maxX = n.x + CARD_W;
            if (n.y + CARD_H > maxY) maxY = n.y + CARD_H;
        });

        const canvasW = maxX + PADDING;
        const canvasH = maxY + PADDING;

        const currentPersonId = this.currentUser?.person_id;
        const currentUserPhone = this.currentUser?.username;

        // ═══ 生成 SVG 连线 ═══
        let svgLines = '';
        allLines.forEach(L => {
            const color = L.type === 'v-thin' ? '#aaa' : '#667eea';
            const sw = L.type === 'v-thin' ? 1.5 : LINE_W;
            svgLines += `<line x1="${L.x1}" y1="${L.y1}" x2="${L.x2}" y2="${L.y2}" stroke="${color}" stroke-width="${sw}"/>`;
        });

        // ═══ 生成节点卡片 HTML（智能卡片：is_married判断 + 独立点击） ═══
        let nodesHtml = '';
        allNodes.forEach(n => {
            const p = n.person;
            const isSelf = p.id === currentPersonId || p.phone === currentUserPhone;
            const nameDisplay = isSelf ? `${p.name}(我)` : p.name;
            const hasChildren = p.children && p.children.length > 0;
            const isMarried = p.is_married === 1;
            const hasSpouse = p.spouse_name && p.spouse_name.trim() !== '';

            nodesHtml += `
            <div class="baota-card ${hasChildren ? 'has-children' : ''}"
                 style="left:${n.x}px;top:${n.y}px;width:${CARD_W}px;height:${CARD_H}px;">
                ${isMarried ? `
                    <!-- 已婚：双头像 -->
                    <div class="baota-avatar-split">
                        <div class="baota-av-half baota-av-self clickable-area" onclick="app.viewPerson(${p.id})">
                            <img src="${p.avatar||''}" onerror="this.parentElement.innerHTML='<span class=\\'av-ph\\'>${p.name[0]||'?'}</span>'">
                        </div>
                        <div class="baota-av-half baota-av-spouse clickable-area"
                             onclick="${hasSpouse?`app.viewSpouse(${JSON.stringify(p).replace(/"/g,'&quot;')})`:'void(0)'}">
                            ${hasSpouse?
                                `<img src="${p.spouse_avatar||''}" onerror="this.parentElement.innerHTML='<span class=\\'av-ph\\'>${p.spouse_name[0]||'配'}</span>'">`
                                :'<span class="av-ph">-</span>'
                            }
                        </div>
                    </div>
                    <!-- 双列垂直名字 -->
                    <div class="baota-name-row">
                        <span class="baota-vname clickable-area" onclick="app.viewPerson(${p.id})">${nameDisplay}</span>
                        ${hasSpouse ? `<span class="baota-vname spouse clickable-area" onclick="app.viewSpouse(${JSON.stringify(p).replace(/"/g,'&quot;')})">${p.spouse_name}</span>` : '<span class="baota-vname spouse"></span>'}
                    </div>
                ` : `
                    <!-- 未婚：单头像 -->
                    <div class="baota-avatar-single">
                        <div class="baota-av-single-inner clickable-area" onclick="app.viewPerson(${p.id})">
                            <img src="${p.avatar||''}" onerror="this.parentElement.innerHTML='<span class=\\'av-ph\\'>${p.name[0]||'?'}</span>'">
                        </div>
                    </div>
                    <!-- 单列名字 -->
                    <div class="baota-name-single clickable-area" onclick="app.viewPerson(${p.id})">
                        <span class="baota-vname">${nameDisplay}</span>
                    </div>
                `}
                ${hasChildren ? `<div class="baota-badge">${p.children.length}</div>` : ''}
            </div>`;
        });

        canvas.innerHTML = `
            <div class="baota-tree-container" style="position:relative;width:${canvasW}px;height:${canvasH}px;">
                <svg style="position:absolute;left:0;top:0;width:${canvasW}px;height:${canvasH}px;overflow:visible;">
                    ${svgLines}
                </svg>
                ${nodesHtml}
            </div>`;
    }

    /**
     * 宝塔树缩放
     */
    zoomBaota(delta) {
        this.baotaZoomLevel = Math.max(50, Math.min(300, this.baotaZoomLevel + delta));
        const canvas = document.getElementById('baota-canvas');
        if (canvas) {
            canvas.style.transform = `translate(${this.baotaDragState.translateX}px, ${this.baotaDragState.translateY}px) scale(${this.baotaZoomLevel / 100})`;
        }
    }

    resetBaotaZoom() {
        this.baotaZoomLevel = 100;
        this.baotaDragState.translateX = 0;
        this.baotaDragState.translateY = 0;
        const canvas = document.getElementById('baota-canvas');
        if (canvas) {
            canvas.style.transform = 'scale(1)';
        }
    }

    /**
     * 宝塔树双指触摸事件
     */
    handleBaotaTouchStart(e) {
        if (e.touches.length === 2) {
            e.preventDefault();
            this.baotaPinchState.active = true;
            this.baotaPinchState.initialDistance = this.getTouchDistance(e.touches);
            this.baotaPinchState.initialZoom = this.baotaZoomLevel;
        } else if (e.touches.length === 1) {
            this.baotaDragState.active = true;
            this.baotaDragState.startX = e.touches[0].clientX;
            this.baotaDragState.startY = e.touches[0].clientY;
        }
    }

    handleBaotaTouchMove(e) {
        if (this.baotaPinchState.active && e.touches.length === 2) {
            e.preventDefault();
            const currentDistance = this.getTouchDistance(e.touches);
            const scale = currentDistance / this.baotaPinchState.initialDistance;
            const newZoom = this.baotaPinchState.initialZoom * scale;
            this.baotaZoomLevel = Math.max(50, Math.min(300, newZoom));
            const canvas = document.getElementById('baota-canvas');
            if (canvas) {
                canvas.style.transform = `translate(${this.baotaDragState.translateX}px, ${this.baotaDragState.translateY}px) scale(${this.baotaZoomLevel / 100})`;
            }
        } else if (this.baotaDragState.active && e.touches.length === 1) {
            e.preventDefault();
            const dx = e.touches[0].clientX - this.baotaDragState.startX;
            const dy = e.touches[0].clientY - this.baotaDragState.startY;
            this.baotaDragState.translateX += dx;
            this.baotaDragState.translateY += dy;
            this.baotaDragState.startX = e.touches[0].clientX;
            this.baotaDragState.startY = e.touches[0].clientY;
            const canvas = document.getElementById('baota-canvas');
            if (canvas) {
                canvas.style.transform = `translate(${this.baotaDragState.translateX}px, ${this.baotaDragState.translateY}px) scale(${this.baotaZoomLevel / 100})`;
            }
        }
    }

    handleBaotaTouchEnd() {
        this.baotaPinchState.active = false;
        this.baotaDragState.active = false;
    }

    /**
     * 加载照片
     */
    async loadPhotos() {
        try {
            const result = await api.getR2Files();
            if (result.status === 'success') {
                this.renderPhotos(result.data);
            }
        } catch (error) {
            console.error('加载照片失败:', error);
        }
    }

    /**
     * 渲染照片
     */
    renderPhotos(files) {
        const grid = document.getElementById('photos-grid');
        if (!grid) return;

        grid.innerHTML = files.map(file => `
            <div class="photo-item">
                <img src="${file.url}" alt="${file.key}" loading="lazy">
                <div class="photo-overlay">${file.key}</div>
            </div>
        `).join('');
    }

    /**
     * 加载用户列表
     */
    async loadUsers() {
        try {
            const result = await api.getUsers();
            if (result.status === 'success') {
                this.renderUsers(result.data);
            }
        } catch (error) {
            console.error('加载用户失败:', error);
        }
    }

    /**
     * 渲染用户列表
     */
    renderUsers(users) {
        const tbody = document.getElementById('users-tbody');
        if (!tbody) return;

        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.username}</td>
                <td>${this.getRoleName(user.role)}</td>
                <td>${user.status || '正常'}</td>
                <td class="actions">
                    <button class="btn btn-small btn-danger" onclick="app.deleteUser('${user.username}')">删除</button>
                </td>
            </tr>
        `).join('');
    }

    /**
     * 删除用户
     */
    async deleteUser(username) {
        if (!confirm('确定要删除此用户吗？')) return;

        try {
            const result = await api.deleteUser(username);
            if (result.status === 'success') {
                this.showToast('删除成功');
                this.loadUsers();
            } else {
                this.showToast(result.message || '删除失败');
            }
        } catch (error) {
            this.showToast('删除失败: ' + error.message);
        }
    }

    /**
     * 导出数据
     */
    async exportData() {
        try {
            this.showToast('正在导出...');
            await api.exportData();
            this.showToast('导出成功');
        } catch (error) {
            this.showToast('导出失败: ' + error.message);
        }
    }

    /**
     * 导入数据
     */
    async importData(file) {
        try {
            this.showToast('正在导入...');
            const result = await api.importData(file);
            if (result.status === 'success') {
                this.showToast('导入成功');
                this.loadPeople();
            } else {
                this.showToast(result.message || '导入失败');
            }
        } catch (error) {
            this.showToast('导入失败: ' + error.message);
        }
    }

    /**
     * 显示提示消息
     */
    showToast(message) {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');
        
        toastMessage.textContent = message;
        toast.classList.remove('hidden');
        
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
}

// 初始化应用
const app = new ZupuApp();
window.app = app;
