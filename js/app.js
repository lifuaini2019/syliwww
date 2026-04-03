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
        this.zoomLevel = 100;
        
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

        // 世系图缩放
        document.getElementById('tree-zoom-in')?.addEventListener('click', () => this.zoomTree(10));
        document.getElementById('tree-zoom-out')?.addEventListener('click', () => this.zoomTree(-10));
        document.getElementById('tree-reset')?.addEventListener('click', () => this.resetTreeZoom());

        // 宝塔树缩放
        document.getElementById('baota-zoom-in')?.addEventListener('click', () => this.zoomBaota(10));
        document.getElementById('baota-zoom-out')?.addEventListener('click', () => this.zoomBaota(-10));
        document.getElementById('baota-reset')?.addEventListener('click', () => this.resetBaotaZoom());

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
    }

    /**
     * 更新UI（根据用户角色）
     */
    updateUI() {
        if (!this.currentUser) return;

        // 更新用户信息
        const userInfo = document.getElementById('user-info');
        if (userInfo) {
            userInfo.textContent = `${this.currentUser.username} (${this.getRoleName(this.currentUser.role)})`;
        }

        // 根据角色显示/隐藏菜单
        const isAdmin = this.currentUser.role === 'admin' || this.currentUser.role === 'super_admin';
        
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = isAdmin ? 'flex' : 'none';
        });

        // 普通用户只能看到自己的人员信息
        if (!isAdmin) {
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

        tbody.innerHTML = people.map(person => {
            // 普通用户只能看到自己的信息
            if (!isAdmin && person.id !== currentPersonId) {
                return '';
            }

            const father = this.peopleDict[person.father_id];
            const fatherName = father ? father.name : '';
            const firstChar = person.name ? person.name[0] : '?';
            const defaultAvatar = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22><rect width=%2240%22 height=%2240%22 fill=%22%23ddd%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22>${firstChar}</text></svg>`;
            const errorAvatar = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22><rect width=%2240%22 height=%2240%22 fill=%22%23ddd%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22>?</text></svg>`;

            return `
                <tr>
                    <td>${person.id}</td>
                    <td class="avatar-cell">
                        <img src="${person.avatar || defaultAvatar}" 
                             alt="${person.name}" 
                             onerror="this.src='${errorAvatar}'">
                    </td>
                    <td>${person.name}</td>
                    <td>${person.gender}</td>
                    <td>${person.generation || ''}</td>
                    <td>${person.shi_xi ? '第' + person.shi_xi + '世' : ''}</td>
                    <td>${person.birth_date || ''}</td>
                    <td>${person.death_date ? '已逝' : '健在'}</td>
                    <td>${fatherName}</td>
                    <td class="actions">
                        <button class="btn btn-small btn-secondary" onclick="app.viewPerson(${person.id})">查看</button>
                        ${isAdmin || person.id === currentPersonId ? `
                            <button class="btn btn-small btn-primary" onclick="app.editPerson(${person.id})">编辑</button>
                        ` : ''}
                        ${isAdmin ? `
                            <button class="btn btn-small btn-danger" onclick="app.deletePerson(${person.id})">删除</button>
                        ` : ''}
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
        document.getElementById('person-gender').value = person.gender || '男';
        document.getElementById('person-generation').value = person.generation || '';
        document.getElementById('person-shi-xi').value = person.shi_xi || '';
        document.getElementById('person-birth-date').value = person.birth_date || '';
        document.getElementById('person-birth-calendar').value = person.birth_calendar || '公历';
        document.getElementById('person-ranking').value = person.ranking || '';
        document.getElementById('person-bio').value = person.bio || '';
        document.getElementById('person-avatar').value = person.avatar || '';
        
        // 头像预览
        const avatarPreview = document.getElementById('person-avatar-preview');
        avatarPreview.src = person.avatar || '';
        avatarPreview.onerror = function() {
            this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="%23ddd"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999">?</text></svg>';
        };

        // 填充父亲选择框
        this.fillFatherSelect(person.father_id);

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
     * 保存人员
     */
    async savePerson() {
        const id = document.getElementById('person-id').value;
        const data = {
            name: document.getElementById('person-name').value,
            gender: document.getElementById('person-gender').value,
            generation: document.getElementById('person-generation').value,
            shi_xi: document.getElementById('person-shi-xi').value,
            birth_date: document.getElementById('person-birth-date').value,
            birth_calendar: document.getElementById('person-birth-calendar').value,
            father_id: document.getElementById('person-father').value || null,
            ranking: document.getElementById('person-ranking').value,
            bio: document.getElementById('person-bio').value,
            avatar: document.getElementById('person-avatar').value
        };

        try {
            const result = await api.updatePerson(id, data);
            if (result.status === 'success') {
                this.showToast('保存成功');
                document.getElementById('person-modal').classList.add('hidden');
                this.loadPeople();
            } else {
                this.showToast(result.message || '保存失败');
            }
        } catch (error) {
            this.showToast('保存失败: ' + error.message);
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
     * 渲染世系图
     */
    renderTree(people) {
        const canvas = document.getElementById('tree-canvas');
        if (!canvas) return;

        // 简化的树形展示
        const peopleDict = {};
        people.forEach(p => peopleDict[p.id] = p);

        const roots = people.filter(p => !p.father_id);
        
        const buildTreeHTML = (person, level = 0) => {
            const children = people.filter(p => p.father_id == person.id);
            const indent = level * 30;
            
            let html = `
                <div class="tree-node" style="margin-left: ${indent}px; padding: 10px; border-left: 2px solid #4a90d9; margin-bottom: 5px;">
                    <div class="tree-node-content" style="display: flex; align-items: center; gap: 10px; cursor: pointer;" onclick="app.viewPerson(${person.id})">
                        <img src="${person.avatar || ''}" alt="" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" onerror="this.style.display='none'">
                        <div>
                            <strong>${person.name}</strong>
                            <span style="color: #666; font-size: 12px;">${person.generation || ''} ${person.shi_xi ? '第' + person.shi_xi + '世' : ''}</span>
                        </div>
                    </div>
                </div>
            `;
            
            children.forEach(child => {
                html += buildTreeHTML(child, level + 1);
            });
            
            return html;
        };

        let html = '';
        roots.forEach(root => {
            html += buildTreeHTML(root);
        });
        
        canvas.innerHTML = html || '<p style="text-align: center; color: #999;">暂无数据</p>';
    }

    /**
     * 世系图缩放
     */
    zoomTree(delta) {
        this.zoomLevel = Math.max(50, Math.min(200, this.zoomLevel + delta));
        document.getElementById('tree-zoom-level').textContent = this.zoomLevel + '%';
        const canvas = document.getElementById('tree-canvas');
        if (canvas) {
            canvas.style.transform = `scale(${this.zoomLevel / 100})`;
            canvas.style.transformOrigin = 'top left';
        }
    }

    resetTreeZoom() {
        this.zoomLevel = 100;
        document.getElementById('tree-zoom-level').textContent = '100%';
        const canvas = document.getElementById('tree-canvas');
        if (canvas) {
            canvas.style.transform = 'scale(1)';
        }
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
     * 渲染宝塔树
     */
    renderBaota(people) {
        const canvas = document.getElementById('baota-canvas');
        if (!canvas) return;

        // 按世系分组
        const groups = {};
        people.forEach(p => {
            const shiXi = p.shi_xi || '未知';
            if (!groups[shiXi]) groups[shiXi] = [];
            groups[shiXi].push(p);
        });

        let html = '';
        const sortedShiXis = Object.keys(groups).sort((a, b) => parseInt(a) - parseInt(b));
        
        sortedShiXis.forEach(shiXi => {
            html += `
                <div class="baota-level" style="margin-bottom: 30px;">
                    <div class="baota-level-title" style="background: #4a90d9; color: white; padding: 8px 15px; border-radius: 20px; display: inline-block; margin-bottom: 15px; font-weight: bold;">
                        第${shiXi}世
                    </div>
                    <div class="baota-level-people" style="display: flex; flex-wrap: wrap; gap: 15px; padding-left: 20px;">
                        ${groups[shiXi].map(p => `
                            <div class="baota-person" style="text-align: center; cursor: pointer;" onclick="app.viewPerson(${p.id})">
                                <img src="${p.avatar || ''}" alt="" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid #4a90d9;" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22><rect width=%2260%22 height=%2260%22 fill=%22%23ddd%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22>${p.name[0]}</text></svg>'">
                                <div style="margin-top: 5px; font-size: 14px;">${p.name}</div>
                                <div style="font-size: 12px; color: #666;">${p.generation || ''}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });

        canvas.innerHTML = html || '<p style="text-align: center; color: #999;">暂无数据</p>';
    }

    /**
     * 宝塔树缩放
     */
    zoomBaota(delta) {
        this.zoomLevel = Math.max(50, Math.min(200, this.zoomLevel + delta));
        document.getElementById('baota-zoom-level').textContent = this.zoomLevel + '%';
        const canvas = document.getElementById('baota-canvas');
        if (canvas) {
            canvas.style.transform = `scale(${this.zoomLevel / 100})`;
            canvas.style.transformOrigin = 'top left';
        }
    }

    resetBaotaZoom() {
        this.zoomLevel = 100;
        document.getElementById('baota-zoom-level').textContent = '100%';
        const canvas = document.getElementById('baota-canvas');
        if (canvas) {
            canvas.style.transform = 'scale(1)';
        }
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
