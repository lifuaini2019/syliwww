/**
 * API 接口封装
 * 与电脑端使用相同的接口
 */

const API_CONFIG = {
    // Cloudflare Workers API 地址
    baseURL: 'https://zupu-api.your-subdomain.workers.dev',
    
    // 本地开发测试时可以修改
    // baseURL: 'http://localhost:8787'
};

class ZupuAPI {
    constructor() {
        this.baseURL = API_CONFIG.baseURL;
        this.token = localStorage.getItem('token');
    }

    /**
     * 设置认证Token
     */
    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }

    /**
     * 清除认证Token
     */
    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
    }

    /**
     * 获取请求头
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }

    /**
     * 发送请求
     */
    async request(method, endpoint, data = null) {
        const url = `${this.baseURL}${endpoint}`;
        const options = {
            method: method,
            headers: this.getHeaders()
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || '请求失败');
            }
            
            return result;
        } catch (error) {
            console.error('API请求错误:', error);
            throw error;
        }
    }

    // ==================== 认证相关 ====================

    /**
     * 用户登录
     */
    async login(username, password) {
        const result = await this.request('POST', '/api/login', { username, password });
        if (result.token) {
            this.setToken(result.token);
        }
        return result;
    }

    /**
     * 获取当前用户信息
     */
    async getCurrentUser() {
        return await this.request('GET', '/api/user/me');
    }

    // ==================== 人员管理 ====================

    /**
     * 获取所有人员
     */
    async getPeople() {
        return await this.request('GET', '/api/people');
    }

    /**
     * 获取单个人员
     */
    async getPerson(id) {
        return await this.request('GET', `/api/people/${id}`);
    }

    /**
     * 添加人员
     */
    async addPerson(data) {
        return await this.request('POST', '/api/people', data);
    }

    /**
     * 更新人员
     */
    async updatePerson(id, data) {
        return await this.request('PUT', `/api/people/${id}`, data);
    }

    /**
     * 删除人员
     */
    async deletePerson(id) {
        return await this.request('DELETE', `/api/people/${id}`);
    }

    // ==================== 用户管理 ====================

    /**
     * 获取所有用户
     */
    async getUsers() {
        return await this.request('GET', '/api/users');
    }

    /**
     * 添加用户
     */
    async addUser(data) {
        return await this.request('POST', '/api/users', data);
    }

    /**
     * 删除用户
     */
    async deleteUser(username) {
        return await this.request('DELETE', `/api/users/${username}`);
    }

    // ==================== 文件上传 ====================

    /**
     * 上传文件
     */
    async uploadFile(file, type = 'images') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);

        const url = `${this.baseURL}/api/upload`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': this.token ? `Bearer ${this.token}` : ''
            },
            body: formData
        });

        return await response.json();
    }

    /**
     * 获取R2文件列表
     */
    async getR2Files() {
        return await this.request('GET', '/api/r2-files');
    }

    /**
     * 删除R2文件
     */
    async deleteR2File(key) {
        return await this.request('DELETE', `/api/r2-files/${encodeURIComponent(key)}`);
    }

    // ==================== 统计信息 ====================

    /**
     * 获取统计数据
     */
    async getStats() {
        return await this.request('GET', '/api/stats');
    }

    // ==================== 导入导出 ====================

    /**
     * 导出数据
     */
    async exportData() {
        const url = `${this.baseURL}/api/export`;
        const response = await fetch(url, {
            method: 'GET',
            headers: this.getHeaders()
        });
        
        if (!response.ok) {
            throw new Error('导出失败');
        }
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `族谱数据_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
        
        return { status: 'success' };
    }

    /**
     * 导入数据
     */
    async importData(file) {
        const formData = new FormData();
        formData.append('file', file);

        const url = `${this.baseURL}/api/import`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': this.token ? `Bearer ${this.token}` : ''
            },
            body: formData
        });

        return await response.json();
    }

    // ==================== 备份 ====================

    /**
     * 创建备份
     */
    async createBackup() {
        return await this.request('POST', '/api/backup');
    }

    /**
     * 获取备份列表
     */
    async getBackups() {
        return await this.request('GET', '/api/backups');
    }

    /**
     * 恢复备份
     */
    async restoreBackup(id) {
        return await this.request('POST', `/api/backup/${id}/restore`);
    }
}

// 创建全局API实例
const api = new ZupuAPI();
