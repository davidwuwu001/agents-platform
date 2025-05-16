// storage.js - 存储系统模块
// 安全存储工具库 - 处理各种存储相关问题
const StorageUtil = {
    // 存储可用性标志
    isLocalStorageAvailable: false,
    isSessionStorageAvailable: false,
    useMemoryFallback: false,
    
    // 内存备份存储 - 当LocalStorage不可用时使用
    memoryStorage: {},
    
    // 上次存储成功的时间戳
    lastSuccessfulSave: 0,
    
    // 检查 localStorage 是否可用
    checkLocalStorageAvailability: function() {
        try {
            const testKey = '_test_ls_available_';
            localStorage.setItem(testKey, '1');
            const result = localStorage.getItem(testKey) === '1';
            localStorage.removeItem(testKey);
            this.isLocalStorageAvailable = result;
            console.log("localStorage可用性检查:", result ? "可用" : "不可用");
            return result;
        } catch (e) {
            console.warn("localStorage不可用:", e.message);
            this.isLocalStorageAvailable = false;
            return false;
        }
    },
    
    // 检查 sessionStorage 是否可用
    checkSessionStorageAvailability: function() {
        try {
            const testKey = '_test_ss_available_';
            sessionStorage.setItem(testKey, '1');
            const result = sessionStorage.getItem(testKey) === '1';
            sessionStorage.removeItem(testKey);
            this.isSessionStorageAvailable = result;
            console.log("sessionStorage可用性检查:", result ? "可用" : "不可用");
            return result;
        } catch (e) {
            console.warn("sessionStorage不可用:", e.message);
            this.isSessionStorageAvailable = false;
            return false;
        }
    },
    
    // 初始化存储系统
    init: function() {
        this.checkLocalStorageAvailability();
        this.checkSessionStorageAvailability();
        
        // 如果浏览器存储都不可用，使用内存存储
        if (!this.isLocalStorageAvailable && !this.isSessionStorageAvailable) {
            this.useMemoryFallback = true;
            console.warn("浏览器存储不可用，将使用内存存储（刷新页面数据会丢失）");
            
            // 显示警告消息给用户
            setTimeout(() => {
                try {
                    const systemMessage = document.createElement('div');
                    systemMessage.className = 'message system-message';
                    systemMessage.innerHTML = '<span class="message-sender">系统提示: </span>您的浏览器不支持本地存储或已被禁用。智能体配置和聊天记录在刷新页面后可能会丢失。';
                    
                    const chatContainer = document.getElementById('chat-container');
                    if (chatContainer) {
                        chatContainer.appendChild(systemMessage);
                        chatContainer.scrollTop = chatContainer.scrollHeight;
                    }
                } catch (e) {
                    console.error("无法显示存储警告消息:", e);
                }
            }, 2000);
        }
        
        // 检测是否为移动设备
        this.isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (this.isMobileDevice) {
            console.log("检测到移动设备，启用特殊移动设备兼容性模式");
            // 更频繁地保存和验证数据
            setInterval(() => {
                if (window.agents && window.agents.length > 0) {
                    this.setItem('agents', JSON.stringify(window.agents), true);
                    // 添加额外的备份文件
                    this.setItem('agents_backup_mobile', JSON.stringify(window.agents), true);
                }
            }, 30000); // 每30秒自动备份一次
            
            // 立即尝试恢复数据
            this.recoverAgentsData();
        }
        
        return this.isLocalStorageAvailable || this.isSessionStorageAvailable || this.useMemoryFallback;
    },
    
    // 恢复智能体数据的方法
    recoverAgentsData: function() {
        try {
            // 尝试从所有可能的存储位置恢复
            const sources = [
                { storage: localStorage, keys: ['agents', 'agents_backup', 'agents_backup_mobile'] },
                { storage: sessionStorage, keys: ['agents', 'backup_agents', 'agents_backup_mobile'] },
                { storage: this.memoryStorage, keys: ['agents'] }
            ];
            
            for (const source of sources) {
                for (const key of source.keys) {
                    try {
                        const data = source.storage[key];
                        if (data) {
                            const parsed = JSON.parse(data);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                console.log(`从${source.storage === localStorage ? 'localStorage' : 
                                            source.storage === sessionStorage ? 'sessionStorage' : '内存存储'}
                                            的${key}恢复了${parsed.length}个智能体`);
                                return parsed;
                            }
                        }
                    } catch (e) {
                        console.warn(`尝试从${key}恢复失败:`, e);
                    }
                }
            }
        } catch (e) {
            console.error("恢复智能体数据失败:", e);
        }
        
        return null;
    },
    
    // 安全地保存数据
    setItem: function(key, value, silent = false) {
        if (!key || value === undefined) {
            console.error("无效的存储请求，key:", key, "value:", value);
            return false;
        }
        
        try {
            // 记录操作
            if (!silent) console.log(`正在保存数据 [${key}], 大小: ${value.length} 字符`);
            
            // 尝试使用localStorage
            if (this.isLocalStorageAvailable) {
                localStorage.setItem(key, value);
                
                // 验证数据是否成功保存
                const savedValue = localStorage.getItem(key);
                if (savedValue === value) {
                    if (!silent) console.log(`数据 [${key}] 已成功保存到localStorage`);
                    this.lastSuccessfulSave = Date.now();
                    
                    // 同时备份到sessionStorage
                    if (this.isSessionStorageAvailable) {
                        try {
                            sessionStorage.setItem('backup_' + key, value);
                        } catch (e) {
                            // 忽略sessionStorage备份失败
                        }
                    }
                    
                    // 创建第三重备份（特别是对于agents）
                    if (key === 'agents') {
                        try {
                            localStorage.setItem('agents_backup', value);
                            
                            // 在移动设备上创建额外备份
                            if (this.isMobileDevice) {
                                localStorage.setItem('agents_backup_mobile', value);
                                sessionStorage.setItem('agents_backup_mobile', value);
                            }
                        } catch (e) {
                            // 忽略额外备份失败
                        }
                    }
                    
                    return true;
                } else {
                    console.warn(`localStorage保存验证失败 [${key}]，尝试备用方案`);
                }
            }
            
            // 如果localStorage不可用或保存失败，尝试sessionStorage
            if (this.isSessionStorageAvailable) {
                sessionStorage.setItem(key, value);
                
                // 验证数据是否成功保存
                const savedValue = sessionStorage.getItem(key);
                if (savedValue === value) {
                    if (!silent) console.log(`数据 [${key}] 已成功保存到sessionStorage`);
                    this.lastSuccessfulSave = Date.now();
                    return true;
                } else {
                    console.warn(`sessionStorage保存验证失败 [${key}]，尝试备用方案`);
                }
            }
            
            // 如果浏览器存储都不可用，使用内存存储
            if (this.useMemoryFallback) {
                this.memoryStorage[key] = value;
                if (!silent) console.log(`数据 [${key}] 已保存到内存（临时）`);
                this.lastSuccessfulSave = Date.now();
                return true;
            }
            
            console.error(`无法保存数据 [${key}]，所有存储方式都失败`);
            return false;
        } catch (e) {
            console.error(`保存数据 [${key}] 时出错:`, e.message);
            
            // 如果出现配额错误，尝试清除老数据
            if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                if (key === 'messageHistories') {
                    window.pruneMessageHistories();
                    try {
                        // 递归调用一次，尝试重新保存
                        return this.setItem(key, value);
                    } catch (e2) {
                        console.error("即使清理后仍无法保存:", e2);
                    }
                }
            }
            
            // 如果常规存储失败，使用内存存储
            if (this.useMemoryFallback || true) { // 强制使用内存作为最后手段
                this.memoryStorage[key] = value;
                if (!silent) console.log(`数据 [${key}] 已保存到内存（临时备份）`);
                this.lastSuccessfulSave = Date.now();
                return true;
            }
            
            return false;
        }
    },
    
    // 安全地读取数据
    getItem: function(key, defaultValue = null) {
        if (!key) {
            console.error("无效的读取请求，key为空");
            return defaultValue;
        }
        
        try {
            let value = null;
            let recoverySource = '';
            
            // 多重恢复策略 - 尝试从所有可能的存储位置获取数据
            const sources = [
                // 主要来源
                { name: 'localStorage', fn: () => this.isLocalStorageAvailable ? localStorage.getItem(key) : null },
                { name: 'sessionStorage', fn: () => this.isSessionStorageAvailable ? sessionStorage.getItem(key) : null },
                { name: '内存存储', fn: () => this.memoryStorage[key] },
                
                // 备份来源 (特别是对于agents)
                { name: 'localStorage备份', fn: () => this.isLocalStorageAvailable && key === 'agents' ? localStorage.getItem('agents_backup') : null },
                { name: 'sessionStorage备份', fn: () => this.isSessionStorageAvailable && key === 'agents' ? sessionStorage.getItem('backup_agents') : null },
                
                // 移动设备专用备份
                { name: '移动端备份1', fn: () => this.isMobileDevice && key === 'agents' ? localStorage.getItem('agents_backup_mobile') : null },
                { name: '移动端备份2', fn: () => this.isMobileDevice && key === 'agents' ? sessionStorage.getItem('agents_backup_mobile') : null }
            ];
            
            // 尝试所有可能的来源
            for (const source of sources) {
                try {
                    const result = source.fn();
                    if (result) {
                        value = result;
                        recoverySource = source.name;
                        break;
                    }
                } catch (e) {
                    console.warn(`从${source.name}读取${key}失败:`, e.message);
                }
            }
            
            if (value) {
                console.log(`成功从${recoverySource}读取数据 [${key}]`);
                
                // 如果数据是从备份恢复的，重新保存到主要存储位置
                if (recoverySource !== 'localStorage' && recoverySource !== 'sessionStorage' && recoverySource !== '内存存储') {
                    console.log(`数据 [${key}] 是从备份恢复的，正在重新保存到主存储`);
                    this.setItem(key, value, true); // 静默保存
                }
                
                return value;
            }
            
            console.log(`未找到数据 [${key}]，返回默认值`);
            return defaultValue;
        } catch (e) {
            console.error(`读取数据 [${key}] 时出错:`, e.message);
            return defaultValue;
        }
    },
    
    // 安全地删除数据
    removeItem: function(key) {
        if (!key) return false;
        
        try {
            let removed = false;
            
            // 从localStorage删除
            if (this.isLocalStorageAvailable) {
                localStorage.removeItem(key);
                removed = true;
            }
            
            // 从sessionStorage删除
            if (this.isSessionStorageAvailable) {
                sessionStorage.removeItem(key);
                sessionStorage.removeItem('backup_' + key);
                removed = true;
            }
            
            // 从内存存储删除
            if (this.memoryStorage[key] !== undefined) {
                delete this.memoryStorage[key];
                removed = true;
            }
            
            console.log(`数据 [${key}] 已删除:`, removed ? "成功" : "无数据需要删除");
            return removed;
        } catch (e) {
            console.error(`删除数据 [${key}] 时出错:`, e.message);
            return false;
        }
    }
};

// 初始化存储系统
StorageUtil.init();

// 导出模块
window.StorageUtil = StorageUtil; 