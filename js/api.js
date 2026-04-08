const API_BASE_URL = 'https://syliwoks.fekepj.com/api';
const TOKEN_KEY = 'token';
const USER_KEY = 'userInfo';

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

        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        } else if (data && method === 'GET') {
            const params = new URLSearchParams();
            for (const key in data) {
                if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
                    params.append(key, data[key]);
                }
            }
            const queryString = params.toString();
            if (queryString) url += '?' + queryString;
        }

        try {
            const res = await fetch(API_BASE_URL + url, options);
            const json = await res.json();
            return json;
        } catch (e) {
            console.error('API请求失败:', e);
            return { status: 'error', message: e.message || '网络请求失败' };
        }
    }

    async login(username, password) {
        return this.request('/login', 'POST', { username, password });
    }

    async getPeople(params = {}) {
        return this.request('/people', 'GET', params);
    }

    async getPerson(id) {
        return this.request(`/people/${id}`, 'GET');
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

    async getUsers() {
        return this.request('/users', 'GET');
    }

    async addUser(data) {
        return this.request('/users', 'POST', data);
    }

    async updateUser(id, data) {
        return this.request(`/users/${id}`, 'PUT', data);
    }

    async deleteUser(id) {
        return this.request(`/users/${id}`, 'DELETE');
    }

    async changePassword(id, password) {
        return this.request(`/users/${id}/password`, 'PUT', { password });
    }

    async exportData() {
        return this.request('/export', 'GET');
    }

    async importData(data) {
        return this.request('/import', 'POST', data);
    }

    async backup() {
        return this.request('/backup', 'POST');
    }

    async restore(backupId) {
        return this.request(`/backup/${backupId}/restore`, 'POST');
    }

    async getBackups() {
        return this.request('/backup', 'GET');
    }

    async uploadPhoto(formData) {
        const options = {
            method: 'POST',
            headers: {
                'Authorization': this.token ? `Bearer ${this.token}` : ''
            },
            body: formData
        };
        try {
            const res = await fetch(API_BASE_URL + '/photos', options);
            const json = await res.json();
            return json;
        } catch (e) {
            console.error('上传失败:', e);
            return { status: 'error', message: e.message };
        }
    }

    async getPhotos(params = {}) {
        return this.request('/photos', 'GET', params);
    }

    async deletePhoto(id) {
        return this.request(`/photos/${id}`, 'DELETE');
    }

    async getStats() {
        return this.request('/stats', 'GET');
    }
}

const api = new ZupuAPI();

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = 'toast ' + type;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

function showLoading() {
    document.getElementById('loading')?.classList.remove('hidden');
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

function getDisplayName(person) {
    return person.name || '未知';
}

function getAvatarText(person) {
    const name = getDisplayName(person);
    return name.length > 1 ? name.substring(0, 1) : name;
}

function getGenerationText(shiXi) {
    if (!shiXi && shiXi !== 0) return '';
    return `第${shiXi}世`;
}