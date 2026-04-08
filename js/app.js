class ZupuApp {
    constructor() {
        this.currentUser = null;
        this.peopleData = [];
        this.peopleDict = {};
        this.selectedPerson = null;
        this.selectedTreePerson = null;
        this.selectedBaotaPerson = null;
        this.treeZoom = 100;
        this.baotaZoom = 100;
        this.currentGen = 17;
        this.treeMode = 'vertical';
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.scrollStartX = 0;
        this.scrollStartY = 0;
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkLogin();
    }

    bindEvents() {
        document.getElementById('login-btn')?.addEventListener('click', () => this.login());
        document.getElementById('guest-btn')?.addEventListener('click', () => this.guestLogin());
        document.getElementById('login-password')?.addEventListener('keypress', e => e.key === 'Enter' && this.login());
        document.getElementById('logout-btn')?.addEventListener('click', () => this.logout());
        document.getElementById('menu-toggle')?.addEventListener('click', () => this.toggleSidebar());
        document.getElementById('sidebar-close')?.addEventListener('click', () => this.closeSidebar());
        document.getElementById('overlay')?.addEventListener('click', () => this.closeSidebar());

        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                if (page) this.navigateTo(page);
            });
        });

        document.getElementById('people-search')?.addEventListener('input', e => this.filterPeople());
        document.getElementById('people-filter')?.addEventListener('change', () => this.filterPeople());
        document.getElementById('add-person-btn')?.addEventListener('click', () => this.openAddPersonModal());

        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeAllModals());
        });
        document.getElementById('person-cancel')?.addEventListener('click', () => this.closeModal('person-modal'));
        document.getElementById('person-save')?.addEventListener('click', () => this.savePerson());
        document.getElementById('user-cancel')?.addEventListener('click', () => this.closeModal('user-modal'));
        document.getElementById('user-save')?.addEventListener('click', () => this.saveUser());
        document.getElementById('add-user-btn')?.addEventListener('click', () => this.openAddUserModal());
        document.getElementById('detail-close-btn')?.addEventListener('click', () => this.closeModal('detail-modal'));
        document.getElementById('detail-edit-btn')?.addEventListener('click', () => this.editPersonFromDetail());
        document.getElementById('confirm-cancel')?.addEventListener('click', () => this.closeModal('confirm-modal'));

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', e => this.switchTab(e.target));
        });

        document.getElementById('tree-zoom-in')?.addEventListener('click', () => this.zoomTree(10));
        document.getElementById('tree-zoom-out')?.addEventListener('click', () => this.zoomTree(-10));
        document.getElementById('tree-reset')?.addEventListener('click', () => this.resetTreeZoom());
        document.getElementById('tree-mode-vertical')?.addEventListener('click', () => this.setTreeMode('vertical'));
        document.getElementById('tree-mode-horizontal')?.addEventListener('click', () => this.setTreeMode('horizontal'));
        document.getElementById('close-tree-panel')?.addEventListener('click', () => this.closeTreePanel());

        document.getElementById('baota-zoom-in')?.addEventListener('click', () => this.zoomBaota(10));
        document.getElementById('baota-zoom-out')?.addEventListener('click', () => this.zoomBaota(-10));
        document.getElementById('baota-reset')?.addEventListener('click', () => this.resetBaotaZoom());
        document.getElementById('show-before-17')?.addEventListener('change', e => this.loadBaota(e.target.checked));
        document.getElementById('close-baota-panel')?.addEventListener('click', () => this.closeBaotaPanel());

        document.getElementById('btn-add-father')?.addEventListener('click', () => this.addRelative('father'));
        document.getElementById('btn-add-son')?.addEventListener('click', () => this.addRelative('son'));
        document.getElementById('btn-add-spouse')?.addEventListener('click', () => this.addRelative('spouse'));
        document.getElementById('btn-add-sibling')?.addEventListener('click', () => this.addRelative('sibling'));
        document.getElementById('btn-edit-person')?.addEventListener('click', () => this.editSelectedPerson());

        document.getElementById('baota-btn-add-father')?.addEventListener('click', () => this.addRelative('father'));
        document.getElementById('baota-btn-add-son')?.addEventListener('click', () => this.addRelative('son'));
        document.getElementById('baota-btn-add-spouse')?.addEventListener('click', () => this.addRelative('spouse'));
        document.getElementById('baota-btn-add-sibling')?.addEventListener('click', () => this.addRelative('sibling'));
        document.getElementById('baota-btn-edit-person')?.addEventListener('click', () => this.editSelectedBaotaPerson());

        document.getElementById('gen-prev')?.addEventListener('click', () => this.prevGeneration());
        document.getElementById('gen-next')?.addEventListener('click', () => this.nextGeneration());
        document.getElementById('gen-select')?.addEventListener('change', e => this.loadGeneration(e.target.value));

        document.getElementById('import-btn')?.addEventListener('click', () => document.getElementById('import-file')?.click());
        document.getElementById('import-file')?.addEventListener('change', e => e.target.files[0] && this.importData(e.target.files[0]));
        document.getElementById('export-btn')?.addEventListener('click', () => this.exportData());
        document.getElementById('backup-btn')?.addEventListener('click', () => this.backup());
        document.getElementById('restore-btn')?.addEventListener('click', () => this.showRestoreConfirm());
    }

    checkLogin() {
        const token = localStorage.getItem('token');
        const userInfo = localStorage.getItem('userInfo');
        if (token && userInfo) {
            try {
                this.currentUser = JSON.parse(userInfo);
                api.setToken(token);
                this.showMainPage();
                this.updateUI();
            } catch (e) {
                this.showLoginPage();
            }
        } else {
            this.showLoginPage();
        }
    }

    showLoginPage() {
        document.getElementById('login-page')?.classList.remove('hidden');
        document.getElementById('main-page')?.classList.add('hidden');
    }

    showMainPage() {
        document.getElementById('login-page')?.classList.add('hidden');
        document.getElementById('main-page')?.classList.remove('hidden');
    }

    updateUI() {
        const isAdmin = this.currentUser?.role === 'admin' || this.currentUser?.role === 'super';
        document.getElementById('username-display').textContent = this.currentUser?.username || '';
        document.querySelectorAll('.admin-only').forEach(el => {
            el.classList.toggle('hidden', !isAdmin);
            el.classList.toggle('show', isAdmin);
        });
    }

    async login() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        if (!username || !password) {
            showToast('请输入用户名和密码', 'error');
            return;
        }
        showLoading();
        try {
            const res = await api.login(username, password);
            if (res.status === 'success') {
                this.currentUser = res.user;
                api.setToken(res.token);
                localStorage.setItem(USER_KEY, JSON.stringify(res.user));
                this.showMainPage();
                this.updateUI();
                showToast('登录成功', 'success');
            } else {
                showToast(res.message || '登录失败', 'error');
            }
        } catch (e) {
            showToast('登录失败: ' + e.message, 'error');
        } finally {
            hideLoading();
        }
    }

    async guestLogin() {
        this.currentUser = { username: '游客', role: 'guest' };
        localStorage.setItem(USER_KEY, JSON.stringify(this.currentUser));
        this.showMainPage();
        this.updateUI();
        showToast('以游客身份浏览', 'info');
    }

    logout() {
        api.clearToken();
        this.currentUser = null;
        this.peopleData = [];
        this.peopleDict = {};
        this.showLoginPage();
    }

    toggleSidebar() {
        document.getElementById('sidebar')?.classList.toggle('open');
        document.getElementById('overlay')?.classList.toggle('show');
    }

    closeSidebar() {
        document.getElementById('sidebar')?.classList.remove('open');
        document.getElementById('overlay')?.classList.remove('show');
    }

    navigateTo(page) {
        this.closeSidebar();
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.add('hidden');
        });
        const targetSection = document.getElementById(`${page}-section`);
        if (targetSection) targetSection.classList.remove('hidden');

        switch (page) {
            case 'overview': this.loadOverview(); break;
            case 'people': this.loadPeople(); break;
            case 'tree': this.loadTree(); break;
            case 'baota': this.loadBaota(true); break;
            case 'generation': this.loadGenerationView(); break;
            case 'stats': this.loadStats(); break;
            case 'users': this.loadUsers(); break;
            case 'import': break;
            case 'backup': this.loadBackups(); break;
            case 'photos': this.loadPhotos(); break;
        }
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    }

    closeModal(id) {
        document.getElementById(id)?.classList.add('hidden');
    }

    showModal(id) {
        this.closeAllModals();
        document.getElementById(id)?.classList.remove('hidden');
    }

    switchTab(btn) {
        const tabName = btn.dataset.tab;
        btn.parentElement.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        btn.closest('.modal').querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`tab-${tabName}`)?.classList.add('active');
    }

    async loadOverview() {
        showLoading();
        try {
            const res = await api.getPeople();
            if (res.status === 'success') {
                this.peopleData = res.data || [];
                this.buildPeopleDict();
                this.updateOverviewStats();
                this.renderRecentPeople();
            }
        } catch (e) {
            showToast('加载失败', 'error');
        } finally {
            hideLoading();
        }
    }

    buildPeopleDict() {
        this.peopleDict = {};
        this.peopleData.forEach(p => {
            this.peopleDict[p.id] = p;
        });
    }

    updateOverviewStats() {
        const total = this.peopleData.length;
        const male = this.peopleData.filter(p => p.gender === '男').length;
        const female = this.peopleData.filter(p => p.gender === '女').length;
        const gens = [...new Set(this.peopleData.map(p => p.shi_xi).filter(s => s))].sort((a, b) => a - b);
        
        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-male').textContent = male;
        document.getElementById('stat-female').textContent = female;
        document.getElementById('stat-gen').textContent = gens.length || 0;

        const after17 = this.peopleData.filter(p => p.shi_xi > 17);
        const after17Male = after17.filter(p => p.gender === '男').length;
        const after17Alive = after17.filter(p => p.is_alive == 1 || p.is_alive === true).length;
        const after17Unmarried = after17.filter(p => p.is_married == 0 || p.is_married === false).length;
        const aliveGens = [...new Set(after17.filter(p => p.is_alive == 1 || p.is_alive === true).map(p => p.shi_xi).filter(s => s))];

        document.getElementById('after17-male').textContent = after17Male;
        document.getElementById('after17-alive').textContent = after17Alive;
        document.getElementById('after17-unmarried').textContent = after17Unmarried;
        document.getElementById('after17-gens').textContent = aliveGens.length;
    }

    renderRecentPeople() {
        const container = document.getElementById('recent-people-list');
        if (!container) return;
        const recent = this.peopleData.slice(-8).reverse();
        if (recent.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">暂无数据</p>';
            return;
        }
        container.innerHTML = recent.map(p => `
            <div class="recent-item" onclick="app.showPersonDetail(${p.id})">
                <div class="recent-avatar ${p.gender === '女' ? 'female' : ''}">${getAvatarText(p)}</div>
                <div class="recent-info">
                    <div class="recent-name">${getDisplayName(p)}</div>
                    <div class="recent-meta">${getGenerationText(p.shi_xi)}${p.ranking ? ' · ' + p.ranking : ''}</div>
                </div>
            </div>
        `).join('');
    }

    async loadPeople() {
        showLoading();
        try {
            const res = await api.getPeople();
            if (res.status === 'success') {
                this.peopleData = res.data || [];
                this.buildPeopleDict();
                this.filterPeople();
            }
        } catch (e) {
            showToast('加载失败', 'error');
        } finally {
            hideLoading();
        }
    }

    filterPeople() {
        const search = document.getElementById('people-search')?.value.toLowerCase() || '';
        const filter = document.getElementById('people-filter')?.value || '';
        
        let filtered = this.peopleData.filter(p => {
            const matchSearch = !search || 
                p.name?.toLowerCase().includes(search) ||
                p.phone?.includes(search);
            const matchFilter = !filter || (
                filter === 'alive' && (p.is_alive == 1 || p.is_alive === true)) ||
                filter === 'deceased' && (p.is_alive == 0 || p.is_alive === false) ||
                filter === 'married' && (p.is_married == 1 || p.is_married === true) ||
                filter === 'unmarried' && (p.is_married == 0 || p.is_married === false);
            return matchSearch && matchFilter;
        });
        this.renderPeopleList(filtered);
    }

    renderPeopleList(people) {
        const container = document.getElementById('people-list');
        if (!container) return;
        if (people.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 40px;">暂无数据</p>';
            return;
        }
        container.innerHTML = people.map(p => this.renderPersonCard(p)).join('');
    }

    renderPersonCard(p) {
        const isAlive = p.is_alive == 1 || p.is_alive === true;
        const isMarried = p.is_married == 1 || p.is_married === true;
        return `
            <div class="person-card" onclick="app.showPersonDetail(${p.id})">
                <div class="card-header">
                    <div class="person-avatar ${p.gender === '女' ? 'female' : ''}">${getAvatarText(p)}</div>
                    <div class="person-main">
                        <div class="person-name">${getDisplayName(p)}</div>
                        <div class="person-meta">${getGenerationText(p.shi_xi)}${p.ranking ? ' · ' + p.ranking : ''}</div>
                    </div>
                </div>
                <div class="person-badges">
                    <span class="badge ${isAlive ? 'badge-alive' : 'badge-deceased'}">${isAlive ? '健在' : '去世'}</span>
                    <span class="badge ${isMarried ? 'badge-married' : 'badge-unmarried'}">${isMarried ? '已婚' : '未婚'}</span>
                    ${p.generation ? `<span class="badge" style="background: #e0e7ff; color: #4338ca;">${p.generation}</span>` : ''}
                </div>
                <div class="person-footer">
                    <span><i class="fas fa-phone"></i> ${p.phone || '-'}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${p.live_place || '-'}</span>
                </div>
            </div>
        `;
    }

    showPersonDetail(id) {
        const person = this.peopleDict[id];
        if (!person) return;
        this.selectedPerson = person;
        document.getElementById('detail-modal-title').textContent = person.name;
        document.getElementById('detail-content').innerHTML = this.renderPersonDetail(person);
        this.showModal('detail-modal');
    }

    renderPersonDetail(p) {
        const father = p.father_id ? this.peopleDict[p.father_id] : null;
        const spouse = p.spouse_name ? p.spouse_name : (p.spouse_of_id ? this.peopleDict[p.spouse_of_id]?.name : '');
        const children = this.peopleData.filter(child => child.father_id == p.id);
        const isAlive = p.is_alive == 1 || p.is_alive === true;
        return `
            <div class="detail-header">
                <div class="detail-avatar ${p.gender === '女' ? 'female' : ''}">${getAvatarText(p)}</div>
                <h2>${getDisplayName(p)}</h2>
                <p>${getGenerationText(p.shi_xi)}${p.ranking ? ' · ' + p.ranking : ''}</p>
                <div class="detail-badges">
                    <span class="badge ${p.gender === '男' ? 'badge-alive' : 'badge-deceased'}" style="background: ${p.gender === '男' ? '#dbeafe' : '#fce7f3'}; color: ${p.gender === '男' ? '#1e40af' : '#be185d'};">${p.gender}</span>
                    <span class="badge ${isAlive ? 'badge-alive' : 'badge-deceased'}">${isAlive ? '健在' : '去世'}</span>
                    <span class="badge ${p.is_married == 1 || p.is_married === true ? 'badge-married' : 'badge-unmarried'}">${p.is_married == 1 || p.is_married === true ? '已婚' : '未婚'}</span>
                </div>
            </div>
            <div class="detail-section">
                <h4><i class="fas fa-info-circle"></i> 基本信息</h4>
                <div class="detail-grid">
                    <div class="detail-item"><div class="detail-item-label">字辈</div><div class="detail-item-value">${p.generation || '-'}</div></div>
                    <div class="detail-item"><div class="detail-item-label">世系</div><div class="detail-item-value">${getGenerationText(p.shi_xi) || '-'}</div></div>
                    <div class="detail-item"><div class="detail-item-label">排行</div><div class="detail-item-value">${p.ranking || '-'}</div></div>
                    <div class="detail-item"><div class="detail-item-label">手机</div><div class="detail-item-value">${p.phone || '-'}</div></div>
                    <div class="detail-item"><div class="detail-item-label">出生日期</div><div class="detail-item-value">${formatDate(p.birth_date) || '-'}</div></div>
                    <div class="detail-item"><div class="detail-item-label">去世日期</div><div class="detail-item-value">${formatDate(p.death_date) || '-'}</div></div>
                </div>
            </div>
            <div class="detail-section">
                <h4><i class="fas fa-map-marker-alt"></i> 地点信息</h4>
                <div class="detail-grid">
                    <div class="detail-item"><div class="detail-item-label">籍贯</div><div class="detail-item-value">${p.birth_place || '-'}</div></div>
                    <div class="detail-item"><div class="detail-item-label">现居地</div><div class="detail-item-value">${p.live_place || '-'}</div></div>
                </div>
            </div>
            <div class="detail-section">
                <h4><i class="fas fa-users"></i> 家庭关系</h4>
                <div class="detail-grid">
                    <div class="detail-item"><div class="detail-item-label">父亲</div><div class="detail-item-value">${father ? `<a href="javascript:app.showPersonDetail(${father.id})">${father.name}</a>` : '-'}</div></div>
                    <div class="detail-item"><div class="detail-item-label">配偶</div><div class="detail-item-value">${spouse || '-'}</div></div>
                    <div class="detail-item"><div class="detail-item-label">子女</div><div class="detail-item-value">${children.length}人</div></div>
                </div>
                ${children.length > 0 ? `<div style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px;">${children.map(c => `<span class="badge badge-alive" style="cursor: pointer;" onclick="event.stopPropagation(); app.showPersonDetail(${c.id})">${c.name}</span>`).join('')}</div>` : ''}
            </div>
            ${p.bio ? `<div class="detail-section"><h4><i class="fas fa-file-alt"></i> 个人简介</h4><p style="font-size: 14px; color: var(--text-secondary);">${p.bio}</p></div>` : ''}
        `;
    }

    editPersonFromDetail() {
        if (this.selectedPerson) {
            this.closeModal('detail-modal');
            this.openEditPersonModal(this.selectedPerson);
        }
    }

    openAddPersonModal(relation = null, targetId = null) {
        document.getElementById('person-modal-title').textContent = '添加人员';
        document.getElementById('person-id').value = '';
        document.getElementById('person-relation').value = relation || '';
        document.getElementById('person-target-id').value = targetId || '';
        this.resetPersonForm();
        this.populateFatherSpouseSelects();
        this.showModal('person-modal');
    }

    openEditPersonModal(person) {
        document.getElementById('person-modal-title').textContent = '编辑人员';
        document.getElementById('person-id').value = person.id;
        document.getElementById('person-relation').value = '';
        document.getElementById('person-target-id').value = '';
        this.resetPersonForm();
        this.populateFatherSpouseSelects();
        this.fillPersonForm(person);
        this.showModal('person-modal');
    }

    resetPersonForm() {
        document.getElementById('person-name').value = '';
        document.getElementById('person-gender').value = '男';
        document.getElementById('person-phone').value = '';
        document.getElementById('person-generation').value = '';
        document.getElementById('person-shi-xi').value = '';
        document.getElementById('person-ranking').value = '';
        document.getElementById('person-birth-date').value = '';
        document.getElementById('person-death-date').value = '';
        document.getElementById('person-alive').checked = true;
        document.getElementById('person-married').checked = false;
        document.getElementById('person-birth-place').value = '';
        document.getElementById('person-live-place').value = '';
        document.getElementById('person-bio').value = '';
        document.getElementById('person-spouse-name').value = '';
        document.getElementById('person-spouse-phone').value = '';
        document.getElementById('person-spouse-birth-date').value = '';
        document.getElementById('person-spouse-birth-place').value = '';
        document.getElementById('person-spouse-live-place').value = '';
    }

    populateFatherSpouseSelects() {
        const fatherSelect = document.getElementById('person-father');
        const spouseSelect = document.getElementById('person-spouse');
        fatherSelect.innerHTML = '<option value="">-- 选择父亲 --</option>';
        spouseSelect.innerHTML = '<option value="">-- 选择配偶 --</option>';
        this.peopleData.forEach(p => {
            if (p.name) {
                fatherSelect.innerHTML += `<option value="${p.id}">${p.name} (${getGenerationText(p.shi_xi)})</option>`;
                if (p.gender === '女') {
                    spouseSelect.innerHTML += `<option value="${p.id}">${p.name}</option>`;
                }
            }
        });
    }

    fillPersonForm(p) {
        document.getElementById('person-name').value = p.name || '';
        document.getElementById('person-gender').value = p.gender || '男';
        document.getElementById('person-phone').value = p.phone || '';
        document.getElementById('person-generation').value = p.generation || '';
        document.getElementById('person-shi-xi').value = p.shi_xi || '';
        document.getElementById('person-ranking').value = p.ranking || '';
        document.getElementById('person-birth-date').value = p.birth_date || '';
        document.getElementById('person-death-date').value = p.death_date || '';
        document.getElementById('person-alive').checked = p.is_alive != 0 && p.is_alive !== false;
        document.getElementById('person-married').checked = p.is_married == 1 || p.is_married === true;
        document.getElementById('person-birth-place').value = p.birth_place || '';
        document.getElementById('person-live-place').value = p.live_place || '';
        document.getElementById('person-bio').value = p.bio || '';
        document.getElementById('person-spouse-name').value = p.spouse_name || '';
        document.getElementById('person-spouse-phone').value = p.spouse_phone || '';
        document.getElementById('person-spouse-birth-date').value = p.spouse_birth_date || '';
        document.getElementById('person-spouse-birth-place').value = p.spouse_birth_place || '';
        document.getElementById('person-spouse-live-place').value = p.spouse_live_place || '';
        if (p.father_id) {
            const fatherSelect = document.getElementById('person-father');
            for (let i = 0; i < fatherSelect.options.length; i++) {
                if (fatherSelect.options[i].value == p.father_id) {
                    fatherSelect.selectedIndex = i;
                    break;
                }
            }
        }
    }

    async savePerson() {
        const id = document.getElementById('person-id').value;
        const relation = document.getElementById('person-relation').value;
        const targetId = document.getElementById('person-target-id').value;
        const name = document.getElementById('person-name').value.trim();
        if (!name) {
            showToast('请输入姓名', 'error');
            return;
        }
        const data = {
            name,
            gender: document.getElementById('person-gender').value,
            phone: document.getElementById('person-phone').value.trim(),
            generation: document.getElementById('person-generation').value.trim(),
            shi_xi: document.getElementById('person-shi-xi').value || '',
            ranking: document.getElementById('person-ranking').value,
            father_id: document.getElementById('person-father').value || '',
            spouse_name: document.getElementById('person-spouse-name').value.trim(),
            spouse_phone: document.getElementById('person-spouse-phone').value.trim(),
            spouse_birth_date: document.getElementById('person-spouse-birth-date').value,
            spouse_birth_place: document.getElementById('person-spouse-birth-place').value.trim(),
            spouse_live_place: document.getElementById('person-spouse-live-place').value.trim(),
            birth_date: document.getElementById('person-birth-date').value,
            death_date: document.getElementById('person-death-date').value,
            is_alive: document.getElementById('person-alive').checked ? 1 : 0,
            is_married: document.getElementById('person-married').checked ? 1 : 0,
            birth_place: document.getElementById('person-birth-place').value.trim(),
            live_place: document.getElementById('person-live-place').value.trim(),
            bio: document.getElementById('person-bio').value.trim()
        };
        if (relation === 'father' && targetId) {
            data.father_id = targetId;
        } else if (relation === 'son' && targetId) {
            data.father_id = targetId;
        } else if (relation === 'spouse' && targetId) {
            data.spouse_of_id = targetId;
        }
        showLoading();
        try {
            let res;
            if (id) {
                res = await api.updatePerson(id, data);
            } else {
                res = await api.addPerson(data);
            }
            if (res.status === 'success') {
                showToast(id ? '更新成功' : '添加成功', 'success');
                this.closeModal('person-modal');
                this.refreshCurrentPage();
            } else {
                showToast(res.message || '操作失败', 'error');
            }
        } catch (e) {
            showToast('操作失败: ' + e.message, 'error');
        } finally {
            hideLoading();
        }
    }

    refreshCurrentPage() {
        const activeMenu = document.querySelector('.menu-item.active');
        const page = activeMenu?.dataset.page;
        if (page) this.navigateTo(page);
    }

    addRelative(type) {
        if (!this.selectedTreePerson) return;
        this.openAddPersonModal(type, this.selectedTreePerson.id);
    }

    editSelectedPerson() {
        if (this.selectedTreePerson) {
            this.openEditPersonModal(this.selectedTreePerson);
        }
    }

    async loadTree() {
        showLoading();
        try {
            const res = await api.getPeople();
            if (res.status === 'success') {
                this.peopleData = res.data || [];
                this.buildPeopleDict();
                this.buildTree();
            }
        } catch (e) {
            showToast('加载失败', 'error');
        } finally {
            hideLoading();
        }
    }

    buildTree() {
        const container = document.getElementById('tree-canvas');
        if (!container) return;
        const people = this.peopleData;
        if (people.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--text-muted);">暂无数据</p>';
            return;
        }
        const dict = {};
        people.forEach(p => dict[p.id] = p);
        const roots = people.filter(p => !p.father_id || !dict[p.father_id]);
        const canvas = document.createElement('div');
        canvas.style.position = 'relative';
        canvas.style.minWidth = '100%';
        canvas.style.minHeight = '100%';
        canvas.style.transform = `scale(${this.treeZoom / 100})`;
        canvas.style.transformOrigin = 'top left';
        if (this.treeMode === 'vertical') {
            this.buildVerticalTree(canvas, roots, dict, 50, 50);
        } else {
            this.buildHorizontalTree(canvas, roots, dict, 50, 50);
        }
        container.innerHTML = '';
        container.appendChild(canvas);
        this.setupTreeDrag(container);
    }

    buildVerticalTree(container, roots, dict, x, y) {
        roots.forEach((root, index) => {
            const subtree = this.buildSubtreeVertical(root, dict, x, y);
            container.appendChild(subtree);
            x += this.getSubtreeWidth(subtree) + 100;
        });
    }

    buildSubtreeVertical(person, dict, x, y) {
        const node = this.createTreeNode(person);
        node.style.position = 'absolute';
        node.style.left = x + 'px';
        node.style.top = y + 'px';
        const children = this.peopleData.filter(p => p.father_id == person.id);
        if (children.length > 0) {
            const childContainer = document.createElement('div');
            childContainer.className = 'tree-children';
            childContainer.style.display = 'flex';
            childContainer.style.gap = '20px';
            childContainer.style.marginTop = '40px';
            let childX = 0;
            const totalWidth = children.reduce((sum, c) => sum + this.getSubtreeWidthForPerson(c, dict, 0), 0) + (children.length - 1) * 20;
            let startX = x + 50 - totalWidth / 2;
            children.forEach((child, i) => {
                const childSubtree = this.buildSubtreeVertical(child, dict, startX + childX, y + 120);
                childContainer.appendChild(childSubtree);
                childX += this.getSubtreeWidth(childSubtree) + 20;
            });
            const parentNode = node.querySelector('.tree-node-card');
            if (parentNode) {
                const line = document.createElement('div');
                line.className = 'tree-connector';
                line.style.cssText = 'position: absolute; left: 50%; top: 100%; width: 2px; height: 20px; background: var(--border-color); transform: translateX(-50%);';
                parentNode.style.position = 'relative';
                parentNode.appendChild(line);
            }
            node.appendChild(childContainer);
        }
        return node;
    }

    getSubtreeWidth(node) {
        const card = node.querySelector('.tree-node-card');
        return card ? card.offsetWidth : 100;
    }

    getSubtreeWidthForPerson(person, dict, depth) {
        const children = this.peopleData.filter(p => p.father_id == person.id);
        if (children.length === 0) return 120;
        return children.reduce((sum, c) => sum + this.getSubtreeWidthForPerson(c, dict, depth + 1), 0) + (children.length - 1) * 20;
    }

    buildHorizontalTree(container, roots, dict, x, y) {
        roots.forEach((root, index) => {
            const subtree = this.buildSubtreeHorizontal(root, dict, x, y);
            container.appendChild(subtree);
            y += this.getSubtreeHeight(subtree) + 80;
        });
    }

    buildSubtreeHorizontal(person, dict, x, y) {
        const node = this.createTreeNode(person);
        node.style.position = 'absolute';
        node.style.left = x + 'px';
        node.style.top = y + 'px';
        const children = this.peopleData.filter(p => p.father_id == person.id);
        if (children.length > 0) {
            const childContainer = document.createElement('div');
            childContainer.className = 'tree-children';
            childContainer.style.cssText = 'display: flex; flex-direction: column; gap: 20px; margin-left: 40px;';
            children.forEach(child => {
                const childSubtree = this.buildSubtreeHorizontal(child, dict, x + 150, y);
                childContainer.appendChild(childSubtree);
                y += this.getSubtreeHeight(childSubtree) + 20;
            });
            node.appendChild(childContainer);
        }
        return node;
    }

    getSubtreeHeight(node) {
        const card = node.querySelector('.tree-node-card');
        return card ? card.offsetHeight : 60;
    }

    createTreeNode(person) {
        const div = document.createElement('div');
        div.className = 'tree-node';
        div.dataset.id = person.id;
        div.onclick = () => this.selectTreeNode(person.id);
        const hasChildren = this.peopleData.some(p => p.father_id == person.id);
        div.innerHTML = `
            <div class="tree-node-card ${hasChildren ? 'has-children' : ''}">
                <div class="tree-node-avatar ${person.gender === '女' ? 'female' : ''}">${getAvatarText(person)}</div>
                <div class="tree-node-name">${getDisplayName(person)}</div>
                <div class="tree-node-meta">${getGenerationText(person.shi_xi)}${person.ranking ? ' · ' + person.ranking : ''}</div>
            </div>
        `;
        return div;
    }

    selectTreeNode(id) {
        this.selectedTreePerson = this.peopleDict[id];
        if (!this.selectedTreePerson) return;
        document.querySelectorAll('.tree-node-card').forEach(card => card.classList.remove('selected'));
        document.querySelector(`.tree-node[data-id="${id}"] .tree-node-card`)?.classList.add('selected');
        document.getElementById('selected-name').textContent = this.selectedTreePerson.name;
        document.getElementById('selected-info').innerHTML = this.renderSelectedInfo(this.selectedTreePerson);
        this.enableTreeActions();
        document.getElementById('tree-side-panel')?.classList.remove('hidden');
    }

    renderSelectedInfo(p) {
        const father = p.father_id ? this.peopleDict[p.father_id] : null;
        const children = this.peopleData.filter(c => c.father_id == p.id);
        return `
            <div class="info-row"><span class="info-label">性别</span><span class="info-value">${p.gender || '-'}</span></div>
            <div class="info-row"><span class="info-label">字辈</span><span class="info-value">${p.generation || '-'}</span></div>
            <div class="info-row"><span class="info-label">世系</span><span class="info-value">${getGenerationText(p.shi_xi) || '-'}</span></div>
            <div class="info-row"><span class="info-label">排行</span><span class="info-value">${p.ranking || '-'}</span></div>
            <div class="info-row"><span class="info-label">手机</span><span class="info-value">${p.phone || '-'}</span></div>
            <div class="info-row"><span class="info-label">父亲</span><span class="info-value">${father ? father.name : '-'}</span></div>
            <div class="info-row"><span class="info-label">子女</span><span class="info-value">${children.length}人</span></div>
            <div class="info-row"><span class="info-label">状态</span><span class="info-value">${p.is_alive == 1 || p.is_alive === true ? '健在' : '去世'}</span></div>
        `;
    }

    enableTreeActions() {
        document.getElementById('btn-add-father')?.removeAttribute('disabled');
        document.getElementById('btn-add-son')?.removeAttribute('disabled');
        document.getElementById('btn-add-spouse')?.removeAttribute('disabled');
        document.getElementById('btn-add-sibling')?.removeAttribute('disabled');
        document.getElementById('btn-edit-person')?.removeAttribute('disabled');
    }

    closeTreePanel() {
        document.getElementById('tree-side-panel')?.classList.add('hidden');
        this.selectedTreePerson = null;
        document.querySelectorAll('.tree-node-card').forEach(card => card.classList.remove('selected'));
    }

    setupTreeDrag(container) {
        container.addEventListener('mousedown', e => {
            if (e.target.closest('.tree-node')) return;
            this.isDragging = true;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            this.scrollStartX = container.scrollLeft;
            this.scrollStartY = container.scrollTop;
            container.style.cursor = 'grabbing';
        });
        container.addEventListener('mousemove', e => {
            if (!this.isDragging) return;
            const dx = e.clientX - this.dragStartX;
            const dy = e.clientY - this.dragStartY;
            container.scrollLeft = this.scrollStartX - dx;
            container.scrollTop = this.scrollStartY - dy;
        });
        container.addEventListener('mouseup', () => {
            this.isDragging = false;
            container.style.cursor = 'default';
        });
        container.addEventListener('mouseleave', () => {
            this.isDragging = false;
            container.style.cursor = 'default';
        });
        container.addEventListener('wheel', e => {
            if (e.ctrlKey) {
                e.preventDefault();
                this.zoomTree(e.deltaY > 0 ? -10 : 10);
            }
        });
    }

    zoomTree(delta) {
        this.treeZoom = Math.max(30, Math.min(200, this.treeZoom + delta));
        document.getElementById('tree-zoom-level').textContent = this.treeZoom + '%';
        const canvas = document.querySelector('#tree-canvas > div');
        if (canvas) {
            canvas.style.transform = `scale(${this.treeZoom / 100})`;
        }
    }

    resetTreeZoom() {
        this.treeZoom = 100;
        document.getElementById('tree-zoom-level').textContent = '100%';
        const canvas = document.querySelector('#tree-canvas > div');
        if (canvas) {
            canvas.style.transform = 'scale(1)';
        }
    }

    setTreeMode(mode) {
        this.treeMode = mode;
        document.getElementById('tree-mode-vertical').classList.toggle('active', mode === 'vertical');
        document.getElementById('tree-mode-horizontal').classList.toggle('active', mode === 'horizontal');
        this.buildTree();
    }

    async loadBaota(showBefore17 = true) {
        showLoading();
        try {
            const res = await api.getPeople();
            if (res.status === 'success') {
                this.peopleData = res.data || [];
                this.buildPeopleDict();
                let people = this.peopleData;
                if (!showBefore17) {
                    people = people.filter(p => p.shi_xi >= 17);
                }
                this.buildBaotaTree(people);
            }
        } catch (e) {
            showToast('加载失败', 'error');
        } finally {
            hideLoading();
        }
    }

    buildBaotaTree(people) {
        const container = document.getElementById('baota-canvas');
        if (!container) return;
        if (people.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--text-muted);">暂无数据</p>';
            return;
        }
        const dict = {};
        people.forEach(p => dict[p.id] = p);
        const roots = people.filter(p => !p.father_id || !dict[p.father_id]);
        const canvas = document.createElement('div');
        canvas.style.position = 'relative';
        canvas.style.minWidth = '100%';
        canvas.style.minHeight = '100%';
        canvas.style.transform = `scale(${this.baotaZoom / 100})`;
        canvas.style.transformOrigin = 'top left';
        const spacing = { x: 160, y: 200 };
        this.layoutBaotaNode(canvas, roots, dict, 100, 100, spacing);
        container.innerHTML = '';
        container.appendChild(canvas);
        this.setupBaotaDrag(container);
    }

    layoutBaotaNode(container, nodes, dict, x, y, spacing) {
        let currentX = x;
        nodes.forEach(node => {
            const nodeEl = this.createBaotaNode(node);
            nodeEl.style.position = 'absolute';
            nodeEl.style.left = currentX + 'px';
            nodeEl.style.top = y + 'px';
            container.appendChild(nodeEl);
            const children = this.peopleData.filter(p => p.father_id == node.id);
            if (children.length > 0) {
                const childX = currentX + (spacing.x - 120) / 2;
                const childY = y + spacing.y;
                const childContainer = document.createElement('div');
                childContainer.className = 'baota-children';
                this.layoutBaotaNode(childContainer, children, dict, childX, childY, spacing);
                container.appendChild(childContainer);
            }
            currentX += spacing.x;
        });
    }

    createBaotaNode(person) {
        const div = document.createElement('div');
        div.className = 'tree-node';
        div.dataset.id = person.id;
        div.onclick = () => this.selectBaotaNode(person.id);
        const children = this.peopleData.filter(p => p.father_id == person.id);
        div.innerHTML = `
            <div class="tree-node-card ${children.length > 0 ? 'has-children' : ''}">
                <div class="tree-node-avatar ${person.gender === '女' ? 'female' : ''}">${getAvatarText(person)}</div>
                <div class="tree-node-name">${getDisplayName(person)}</div>
                <div class="tree-node-meta">${getGenerationText(person.shi_xi)}${person.ranking ? ' · ' + person.ranking : ''}</div>
                ${children.length > 0 ? `<span style="position: absolute; top: 5px; right: 5px; background: var(--success); color: white; font-size: 10px; padding: 2px 6px; border-radius: 10px;">${children.length}</span>` : ''}
            </div>
        `;
        return div;
    }

    selectBaotaNode(id) {
        this.selectedBaotaPerson = this.peopleDict[id];
        if (!this.selectedBaotaPerson) return;
        document.querySelectorAll('#baota-canvas .tree-node-card').forEach(card => card.classList.remove('selected'));
        document.querySelector(`#baota-canvas .tree-node[data-id="${id}"] .tree-node-card`)?.classList.add('selected');
        document.getElementById('baota-selected-name').textContent = this.selectedBaotaPerson.name;
        document.getElementById('baota-selected-info').innerHTML = this.renderSelectedInfo(this.selectedBaotaPerson);
        this.enableBaotaActions();
        document.getElementById('baota-side-panel')?.classList.remove('hidden');
    }

    enableBaotaActions() {
        document.getElementById('baota-btn-add-father')?.removeAttribute('disabled');
        document.getElementById('baota-btn-add-son')?.removeAttribute('disabled');
        document.getElementById('baota-btn-add-spouse')?.removeAttribute('disabled');
        document.getElementById('baota-btn-add-sibling')?.removeAttribute('disabled');
        document.getElementById('baota-btn-edit-person')?.removeAttribute('disabled');
    }

    closeBaotaPanel() {
        document.getElementById('baota-side-panel')?.classList.add('hidden');
        this.selectedBaotaPerson = null;
        document.querySelectorAll('#baota-canvas .tree-node-card').forEach(card => card.classList.remove('selected'));
    }

    editSelectedBaotaPerson() {
        if (this.selectedBaotaPerson) {
            this.openEditPersonModal(this.selectedBaotaPerson);
        }
    }

    setupBaotaDrag(container) {
        container.addEventListener('mousedown', e => {
            if (e.target.closest('.tree-node')) return;
            this.isDragging = true;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            this.scrollStartX = container.scrollLeft;
            this.scrollStartY = container.scrollTop;
            container.style.cursor = 'grabbing';
        });
        container.addEventListener('mousemove', e => {
            if (!this.isDragging) return;
            const dx = e.clientX - this.dragStartX;
            const dy = e.clientY - this.dragStartY;
            container.scrollLeft = this.scrollStartX - dx;
            container.scrollTop = this.scrollStartY - dy;
        });
        container.addEventListener('mouseup', () => {
            this.isDragging = false;
            container.style.cursor = 'default';
        });
        container.addEventListener('mouseleave', () => {
            this.isDragging = false;
            container.style.cursor = 'default';
        });
    }

    zoomBaota(delta) {
        this.baotaZoom = Math.max(30, Math.min(200, this.baotaZoom + delta));
        document.getElementById('baota-zoom-level').textContent = this.baotaZoom + '%';
        const canvas = document.querySelector('#baota-canvas > div');
        if (canvas) {
            canvas.style.transform = `scale(${this.baotaZoom / 100})`;
        }
    }

    resetBaotaZoom() {
        this.baotaZoom = 100;
        document.getElementById('baota-zoom-level').textContent = '100%';
        const canvas = document.querySelector('#baota-canvas > div');
        if (canvas) {
            canvas.style.transform = 'scale(1)';
        }
    }

    async loadGenerationView() {
        showLoading();
        try {
            const res = await api.getPeople();
            if (res.status === 'success') {
                this.peopleData = res.data || [];
                this.buildPeopleDict();
                const gens = [...new Set(this.peopleData.map(p => p.shi_xi).filter(s => s))].sort((a, b) => a - b);
                const genSelect = document.getElementById('gen-select');
                genSelect.innerHTML = gens.map(g => `<option value="${g}">第${g}世</option>`).join('');
                if (gens.length > 0) {
                    this.currentGen = gens[0];
                    genSelect.value = this.currentGen;
                    this.loadGeneration(this.currentGen);
                }
            }
        } catch (e) {
            showToast('加载失败', 'error');
        } finally {
            hideLoading();
        }
    }

    loadGeneration(gen) {
        this.currentGen = parseInt(gen);
        const people = this.peopleData.filter(p => p.shi_xi == this.currentGen);
        const container = document.getElementById('gen-grid');
        if (!container) return;
        if (people.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--text-muted);">该世系暂无数据</p>';
            return;
        }
        const sorted = people.sort((a, b) => {
            const rankOrder = ['老大', '老二', '老三', '老四', '老五', '老六', '老七', '老八', '老九'];
            const aIdx = rankOrder.indexOf(a.ranking);
            const bIdx = rankOrder.indexOf(b.ranking);
            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
            if (aIdx !== -1) return -1;
            if (bIdx !== -1) return 1;
            return a.name.localeCompare(b.name);
        });
        container.innerHTML = sorted.map(p => `
            <div class="gen-card" onclick="app.showPersonDetail(${p.id})">
                <div class="gen-card-header">
                    <span class="gen-card-title">${p.name}</span>
                    <span class="gen-card-count">${p.ranking || ''}</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--text-secondary);">
                    <div><i class="fas fa-venus-mars"></i> ${p.gender || '-'}</div>
                    <div><i class="fas fa-ring"></i> ${p.is_married == 1 || p.is_married === true ? '已婚' : '未婚'}</div>
                    <div><i class="fas fa-heart"></i> ${p.is_alive == 1 || p.is_alive === true ? '健在' : '去世'}</div>
                    <div><i class="fas fa-phone"></i> ${p.phone || '-'}</div>
                </div>
            </div>
        `).join('');
    }

    prevGeneration() {
        const gens = [...new Set(this.peopleData.map(p => p.shi_xi).filter(s => s))].sort((a, b) => a - b);
        const idx = gens.indexOf(this.currentGen);
        if (idx > 0) {
            this.currentGen = gens[idx - 1];
            document.getElementById('gen-select').value = this.currentGen;
            this.loadGeneration(this.currentGen);
        }
    }

    nextGeneration() {
        const gens = [...new Set(this.peopleData.map(p => p.shi_xi).filter(s => s))].sort((a, b) => a - b);
        const idx = gens.indexOf(this.currentGen);
        if (idx < gens.length - 1) {
            this.currentGen = gens[idx + 1];
            document.getElementById('gen-select').value = this.currentGen;
            this.loadGeneration(this.currentGen);
        }
    }

    async loadStats() {
        showLoading();
        try {
            const res = await api.getPeople();
            if (res.status === 'success') {
                this.peopleData = res.data || [];
                this.buildPeopleDict();
                this.renderStats();
            }
        } catch (e) {
            showToast('加载失败', 'error');
        } finally {
            hideLoading();
        }
    }

    renderStats() {
        const gens = {};
        this.peopleData.forEach(p => {
            const g = p.shi_xi || '未知';
            if (!gens[g]) gens[g] = { total: 0, male: 0, female: 0 };
            gens[g].total++;
            if (p.gender === '男') gens[g].male++;
            else if (p.gender === '女') gens[g].female++;
        });
        const container = document.getElementById('generation-stats');
        const sortedGens = Object.keys(gens).sort((a, b) => parseInt(a) - parseInt(b));
        container.innerHTML = sortedGens.map(g => `
            <div class="gen-stat-item">
                <div class="gen-stat-header">第${g}世</div>
                <div class="gen-stat-body">
                    <div class="gen-stat-total">${gens[g].total}人</div>
                    <div class="gen-stat-detail">
                        <span style="color: var(--primary);"><i class="fas fa-male"></i> ${gens[g].male}</span>
                        <span style="color: #ec4899;"><i class="fas fa-female"></i> ${gens[g].female}</span>
                    </div>
                </div>
            </div>
        `).join('');
        const totalMale = this.peopleData.filter(p => p.gender === '男').length;
        const totalFemale = this.peopleData.filter(p => p.gender === '女').length;
        const total = totalMale + totalFemale || 1;
        const malePercent = Math.round((totalMale / total) * 100);
        const femalePercent = 100 - malePercent;
        document.getElementById('ratio-male').style.width = malePercent + '%';
        document.getElementById('ratio-female').style.width = femalePercent + '%';
        document.getElementById('male-percent').textContent = malePercent + '%';
        document.getElementById('female-percent').textContent = femalePercent + '%';
        const married = this.peopleData.filter(p => p.is_married == 1 || p.is_married === true).length;
        const unmarried = this.peopleData.length - married;
        document.getElementById('married-count').textContent = married;
        document.getElementById('unmarried-count').textContent = unmarried;
        document.getElementById('widowed-count').textContent = 0;
    }

    async loadUsers() {
        if (this.currentUser?.role !== 'admin' && this.currentUser?.role !== 'super') {
            showToast('无权限', 'error');
            return;
        }
        showLoading();
        try {
            const res = await api.getUsers();
            if (res.status === 'success') {
                this.renderUsers(res.data || []);
            }
        } catch (e) {
            showToast('加载失败', 'error');
        } finally {
            hideLoading();
        }
    }

    renderUsers(users) {
        const container = document.getElementById('users-list');
        if (!container) return;
        container.innerHTML = users.map(u => `
            <div class="user-item">
                <div class="user-info">
                    <div class="user-avatar"><i class="fas fa-user"></i></div>
                    <div class="user-details">
                        <h4>${u.username || '-'}</h4>
                        <p>${u.phone || '-'}</p>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span class="user-role ${u.role === 'super' ? 'role-super' : u.role === 'admin' ? 'role-admin' : 'role-user'}">${u.role === 'super' ? '超级管理员' : u.role === 'admin' ? '管理员' : '普通用户'}</span>
                    <div class="user-actions">
                        <button class="btn btn-small btn-outline" onclick="app.editUser(${u.id})"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-small btn-outline" onclick="app.changeUserPassword(${u.id})"><i class="fas fa-key"></i></button>
                        <button class="btn btn-small btn-danger" onclick="app.deleteUser(${u.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    openAddUserModal() {
        document.getElementById('user-modal-title').textContent = '添加账号';
        document.getElementById('user-id').value = '';
        document.getElementById('user-username').value = '';
        document.getElementById('user-phone').value = '';
        document.getElementById('user-password').value = '';
        document.getElementById('user-role').value = 'admin';
        this.showModal('user-modal');
    }

    async editUser(id) {
        showToast('编辑功能开发中', 'info');
    }

    async changeUserPassword(id) {
        const newPassword = prompt('请输入新密码:');
        if (!newPassword) return;
        showLoading();
        try {
            const res = await api.changePassword(id, newPassword);
            if (res.status === 'success') {
                showToast('密码修改成功', 'success');
            } else {
                showToast(res.message || '修改失败', 'error');
            }
        } catch (e) {
            showToast('修改失败', 'error');
        } finally {
            hideLoading();
        }
    }

    async deleteUser(id) {
        document.getElementById('confirm-title').textContent = '确认删除';
        document.getElementById('confirm-message').textContent = '确定要删除这个账号吗？此操作不可恢复！';
        document.getElementById('confirm-ok').onclick = async () => {
            showLoading();
            try {
                const res = await api.deleteUser(id);
                if (res.status === 'success') {
                    showToast('删除成功', 'success');
                    this.closeModal('confirm-modal');
                    this.loadUsers();
                } else {
                    showToast(res.message || '删除失败', 'error');
                }
            } catch (e) {
                showToast('删除失败', 'error');
            } finally {
                hideLoading();
            }
        };
        this.showModal('confirm-modal');
    }

    async saveUser() {
        const id = document.getElementById('user-id').value;
        const username = document.getElementById('user-username').value.trim();
        const phone = document.getElementById('user-phone').value.trim();
        const password = document.getElementById('user-password').value;
        const role = document.getElementById('user-role').value;
        if (!username || !password) {
            showToast('请填写必填项', 'error');
            return;
        }
        const data = { username, phone, password, role };
        showLoading();
        try {
            let res;
            if (id) {
                res = await api.updateUser(id, data);
            } else {
                res = await api.addUser(data);
            }
            if (res.status === 'success') {
                showToast(id ? '更新成功' : '添加成功', 'success');
                this.closeModal('user-modal');
                this.loadUsers();
            } else {
                showToast(res.message || '操作失败', 'error');
            }
        } catch (e) {
            showToast('操作失败', 'error');
        } finally {
            hideLoading();
        }
    }

    async exportData() {
        showLoading();
        try {
            const res = await api.exportData();
            if (res.status === 'success' && res.url) {
                window.open(res.url, '_blank');
                showToast('导出成功', 'success');
            } else {
                showToast(res.message || '导出失败', 'error');
            }
        } catch (e) {
            showToast('导出失败', 'error');
        } finally {
            hideLoading();
        }
    }

    async importData(file) {
        showToast('导入功能开发中，需要后端支持', 'info');
    }

    async backup() {
        showLoading();
        try {
            const res = await api.backup();
            if (res.status === 'success') {
                showToast('备份成功', 'success');
                this.loadBackups();
            } else {
                showToast(res.message || '备份失败', 'error');
            }
        } catch (e) {
            showToast('备份失败', 'error');
        } finally {
            hideLoading();
        }
    }

    async loadBackups() {
        showLoading();
        try {
            const res = await api.getBackups();
            if (res.status === 'success') {
                this.renderBackups(res.data || []);
            }
        } catch (e) {
            showToast('加载失败', 'error');
        } finally {
            hideLoading();
        }
    }

    renderBackups(backups) {
        const container = document.getElementById('backup-list');
        if (!container) return;
        if (backups.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">暂无备份记录</p>';
            return;
        }
        container.innerHTML = backups.map(b => `
            <div class="backup-item">
                <span><i class="fas fa-database"></i> ${b.name || '备份'} - ${b.created_at || ''}</span>
                <button class="btn btn-small btn-outline" onclick="app.restoreBackup('${b.id}')"><i class="fas fa-upload"></i> 恢复</button>
            </div>
        `).join('');
    }

    showRestoreConfirm() {
        document.getElementById('confirm-title').textContent = '确认恢复';
        document.getElementById('confirm-message').textContent = '确定要恢复备份吗？当前数据将被覆盖！';
        document.getElementById('confirm-ok').onclick = () => {
            showToast('请选择要恢复的备份', 'info');
            this.closeModal('confirm-modal');
        };
        this.showModal('confirm-modal');
    }

    async restoreBackup(id) {
        showLoading();
        try {
            const res = await api.restore(id);
            if (res.status === 'success') {
                showToast('恢复成功', 'success');
                this.closeModal('confirm-modal');
            } else {
                showToast(res.message || '恢复失败', 'error');
            }
        } catch (e) {
            showToast('恢复失败', 'error');
        } finally {
            hideLoading();
        }
    }

    loadPhotos() {
        const container = document.getElementById('photos-grid');
        if (!container) return;
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--text-muted);">照片管理功能开发中</p>';
    }
}

const app = new ZupuApp();