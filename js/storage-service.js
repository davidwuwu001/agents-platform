/**
 * storage-service.js
 * 存储服务模块 - 负责本地存储与数据持久化
 */

// 存储服务对象
const StorageService = {
    // 存储可用性标志
    isLocalStorageAvailable: false,
    isSessionStorageAvailable: false,
    useMemoryFallback: false,
    
    // 内存备份存储 - 当LocalStorage不可用时使用
    memoryStorage: {},
    
    // 上次存储成功的时间戳
    lastSuccessfulSave: 0,
    
    // 是否为移动设备
    isMobileDevice: false,
    
    // 初始化存储系统
    init: function() {
        console.log("初始化存储服务...");
        
        this.checkLocalStorageAvailability();
        this.checkSessionStorageAvailability();
        
        // 如果浏览器存储都不可用，使用内存存储
        if (!this.isLocalStorageAvailable && !this.isSessionStorageAvailable) {
            this.useMemoryFallback = true;
            console.warn("浏览器存储不可用，将使用内存存储（刷新页面数据会丢失）");
            
            // 显示警告消息给用户
            setTimeout(() => {
                try {
                    if (window.MessageHandler) {
                        window.MessageHandler.displaySystemMessage('您的浏览器不支持本地存储或已被禁用。智能体配置和聊天记录在刷新页面后可能会丢失。');
                    } else {
                        const systemMessage = document.createElement('div');
                        systemMessage.className = 'message system-message';
                        systemMessage.innerHTML = '<span class="message-sender">系统提示: </span>您的浏览器不支持本地存储或已被禁用。智能体配置和聊天记录在刷新页面后可能会丢失。';
                        
                        const chatContainer = document.getElementById('chat-container');
                        if (chatContainer) {
                            chatContainer.appendChild(systemMessage);
                            chatContainer.scrollTop = chatContainer.scrollHeight;
                        }
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
        
        console.log("存储服务初始化完成，可用性状态:", {
            localStorage: this.isLocalStorageAvailable,
            sessionStorage: this.isSessionStorageAvailable,
            memoryFallback: this.useMemoryFallback
        });
        
        return this.isLocalStorageAvailable || this.isSessionStorageAvailable || this.useMemoryFallback;
    },
    
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
    
    // 从存储中获取数据
    getItem: function(key) {
        if (!key) {
            console.error("获取数据时键名为空");
            return null;
        }
        
        try {
            // 尝试从localStorage获取
            if (this.isLocalStorageAvailable) {
                const value = localStorage.getItem(key);
                if (value !== null) {
                    return value;
                }
            }
            
            // 如果localStorage不可用或未找到，尝试sessionStorage
            if (this.isSessionStorageAvailable) {
                const value = sessionStorage.getItem(key);
                if (value !== null) {
                    return value;
                }
                
                // 尝试从备份键获取
                const backupValue = sessionStorage.getItem('backup_' + key);
                if (backupValue !== null) {
                    return backupValue;
                }
            }
            
            // 如果都失败，从内存存储获取
            if (this.useMemoryFallback && this.memoryStorage[key]) {
                return this.memoryStorage[key];
            }
            
            // 未找到数据
            return null;
        } catch (e) {
            console.error(`获取数据[${key}]时出错:`, e);
            return null;
        }
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
                    
                    // 也保存到内存备份
                    this.memoryStorage[key] = value;
                    
                    return true;
                } else {
                    console.warn(`sessionStorage保存验证失败 [${key}]，尝试内存存储`);
                }
            }
            
            // 如果都失败，使用内存存储
            if (this.useMemoryFallback) {
                this.memoryStorage[key] = value;
                if (!silent) console.log(`数据 [${key}] 已保存到内存存储（注意：刷新页面将丢失）`);
                this.lastSuccessfulSave = Date.now();
                return true;
            }
            
            // 所有方法都失败
            console.error(`无法保存数据 [${key}]，所有存储方法都失败`);
            return false;
        } catch (error) {
            console.error(`保存数据 [${key}] 时出错:`, error);
            
            // 如果是存储空间不足错误，尝试清理一些数据
            if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                console.warn("存储空间不足，尝试清理...");
                this.cleanupStorage();
                
                // 重试一次
                try {
                    if (this.isLocalStorageAvailable) {
                        localStorage.setItem(key, value);
                        return true;
                    } else if (this.isSessionStorageAvailable) {
                        sessionStorage.setItem(key, value);
                        return true;
                    }
                } catch (e) {
                    console.error("重试保存失败:", e);
                }
            }
            
            // 所有方法都失败，尝试使用内存存储
            if (this.useMemoryFallback) {
                this.memoryStorage[key] = value;
                console.warn(`数据 [${key}] 已保存到内存存储（注意：刷新页面将丢失）`);
                return true;
            }
            
            return false;
        }
    },
    
    // 从存储中删除数据
    removeItem: function(key) {
        if (!key) {
            console.error("删除数据时键名为空");
            return false;
        }
        
        let success = false;
        
        try {
            // 从所有存储中删除
            if (this.isLocalStorageAvailable) {
                localStorage.removeItem(key);
                success = true;
            }
            
            if (this.isSessionStorageAvailable) {
                sessionStorage.removeItem(key);
                sessionStorage.removeItem('backup_' + key);
                success = true;
            }
            
            if (this.useMemoryFallback && this.memoryStorage[key]) {
                delete this.memoryStorage[key];
                success = true;
            }
            
            return success;
        } catch (e) {
            console.error(`删除数据[${key}]时出错:`, e);
            return false;
        }
    },
    
    // 清理存储空间
    cleanupStorage: function() {
        try {
            // 尝试删除一些不太重要的数据
            const lowPriorityKeys = ['settings'];
            
            for (const key of lowPriorityKeys) {
                if (this.isLocalStorageAvailable) {
                    localStorage.removeItem(key);
                }
                if (this.isSessionStorageAvailable) {
                    sessionStorage.removeItem(key);
                    sessionStorage.removeItem('backup_' + key);
                }
            }
            
            console.log("已清理低优先级存储项");
            
            // 如果还有问题，尝试清理消息历史
            if (this.getItem('messageHistories')) {
                const histories = JSON.parse(this.getItem('messageHistories'));
                const prunedHistories = {};
                
                // 对每个聊天历史只保留最近20条消息
                for (const agentId in histories) {
                    if (histories[agentId].length > 20) {
                        prunedHistories[agentId] = histories[agentId].slice(-20);
                    } else {
                        prunedHistories[agentId] = histories[agentId];
                    }
                }
                
                // 保存精简后的历史
                this.setItem('messageHistories', JSON.stringify(prunedHistories), true);
                console.log("已清理聊天历史");
            }
        } catch (e) {
            console.error("清理存储空间时出错:", e);
        }
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
                        let data = null;
                        
                        // 根据存储类型获取数据
                        if (source.storage === localStorage && this.isLocalStorageAvailable) {
                            data = localStorage.getItem(key);
                        } else if (source.storage === sessionStorage && this.isSessionStorageAvailable) {
                            data = sessionStorage.getItem(key);
                        } else if (source.storage === this.memoryStorage) {
                            data = this.memoryStorage[key];
                        }
                        
                        if (data) {
                            const parsed = JSON.parse(data);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                const storageType = source.storage === localStorage ? 'localStorage' : 
                                                    source.storage === sessionStorage ? 'sessionStorage' : '内存存储';
                                console.log(`从${storageType}的${key}恢复了${parsed.length}个智能体`);
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
    }
};

// 暴露给全局作用域
window.StorageService = StorageService; 