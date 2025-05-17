// DOM 元素
const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const clearButton = document.getElementById('clear-button');
const agentSelector = document.getElementById('agent-selector');
const adminModeCheckbox = document.getElementById('admin-mode');
const adminPanel = document.getElementById('admin-panel');
const agentList = document.getElementById('agent-list');
const addAgentBtn = document.getElementById('add-agent-btn');
const agentFormContainer = document.getElementById('agent-form-container');
const agentForm = document.getElementById('agent-form');
const cancelBtn = document.getElementById('cancel-btn');
const formTitle = document.getElementById('form-title');
const tangzaiButton = document.getElementById('tangzai-button');

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
                    pruneMessageHistories();
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

// 存储对话历史 - 修改为对象，以智能体ID为键
let messageHistories = {};

// 当前选中的智能体
let currentAgent = null;

// 所有可用智能体列表
let agents = [];

// 从agents.json加载智能体列表
let agentsLoadPromise = null; // 全局Promise对象，用于防止重复请求
let lastLoadTime = 0; // 上次加载时间

async function loadAgentsFromJSON() {
    try {
        // 如果已有缓存，直接返回缓存
        if (window.cachedAgentsJSON) {
            console.log("使用缓存的agents.json数据");
            return window.cachedAgentsJSON;
        }
        
        // 如果已有待处理的请求，直接返回该Promise
        if (agentsLoadPromise) {
            console.log("agents.json已在加载中，等待结果");
            return agentsLoadPromise;
        }
        
        // 强制限制请求频率 - 至少间隔5秒
        const now = Date.now();
        if (now - lastLoadTime < 5000) {
            console.log("请求过于频繁，使用空结果");
            return [];
        }
        
        console.log("开始加载agents.json");
        lastLoadTime = now;
        
        // 创建新的Promise并保存引用
        agentsLoadPromise = new Promise(async (resolve, reject) => {
            try {
                const response = await fetch('agents.json?t=' + Date.now(), {
                    // 添加缓存控制头，避免浏览器缓存问题
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    },
                    // 添加随机查询参数，避免缓存
                    cache: 'no-store'
                });
                
        if (!response.ok) {
                    console.warn(`无法加载agents.json: ${response.status}`);
                    resolve([]); // 加载失败时返回空数组，不抛出错误
                    return;
        }
                
                const data = await response.json();
                console.log("成功加载agents.json");
                
                // 缓存请求结果
                window.cachedAgentsJSON = data;
                resolve(data);
            } catch (error) {
                console.error("加载agents.json失败:", error);
                resolve([]); // 错误时返回空数组，不中断初始化流程
            } finally {
                // 允许再次请求（但依然会受到上面时间间隔的限制）
                setTimeout(() => {
                    agentsLoadPromise = null;
                }, 1000);
            }
        });
        
        return await agentsLoadPromise;
    } catch (error) {
        console.error("Could not load agents.json:", error);
        displayMessage('提示', `无法加载智能体配置文件: ${error.message}`, 'system-message');
        return [];
    }
}

// 初始化智能体列表，首先尝试从agents.json加载，如果失败则使用本地存储的默认配置
async function initializeAgents() {
    try {
        console.log("开始初始化智能体...");
        
        // 确保平台介绍横幅在初始状态下显示
        const platformBanner = document.querySelector('.platform-banner');
        if (platformBanner) {
            platformBanner.style.display = 'block';
        }
        
        // 先从本地存储加载用户自定义的智能体
        let localAgents = [];
        try {
            // 使用增强版的StorageUtil工具尝试恢复智能体数据
            const recoveredAgents = StorageUtil.recoverAgentsData();
            if (recoveredAgents) {
                localAgents = recoveredAgents;
                console.log("成功恢复智能体数据，找到", localAgents.length, "个智能体");
            } else {
                // 如果恢复函数未找到数据，使用常规方法尝试
                const storedAgents = StorageUtil.getItem('agents');
                if (storedAgents) {
                    try {
                        localAgents = JSON.parse(storedAgents);
                        console.log("从本地存储成功加载了", localAgents.length, "个智能体");
                    } catch (parseError) {
                        console.error("解析本地智能体数据失败:", parseError);
                    }
                } else {
                    console.log("本地存储中未找到智能体数据");
                }
            }
        } catch (storageError) {
            console.error("读取本地智能体数据出错:", storageError);
        }
        
        // 确保从localStorage加载的有正确的标记
        localAgents = (localAgents || []).map(agent => ({
            ...agent,
            isBuiltIn: agent.isBuiltIn || false,
            source: agent.source || 'local' // 标记为本地存储来源
        }));
        
        // 显示调试信息
        if (localAgents.length > 0) {
            console.log("本地智能体:", localAgents.map(a => a.name));
        }
        
        // 尝试从agents.json加载内置智能体
        let agentsFromJSON = [];
        try {
            agentsFromJSON = await loadAgentsFromJSON();
        if (agentsFromJSON && agentsFromJSON.length > 0) {
                console.log("从JSON文件成功加载了", agentsFromJSON.length, "个内置智能体");
            } else {
                console.log("JSON文件中未找到智能体或加载失败");
            }
        } catch (jsonError) {
            console.error("加载JSON智能体失败:", jsonError);
        }
        
        // 如果成功加载了agents.json，转换格式
        let mergedAgents = [];
        
        // 创建ID映射，用于快速检索
        const localAgentIds = {};
        localAgents.forEach(agent => {
            if (agent && agent.id) {
                localAgentIds[agent.id] = true;
            }
        });
        
        if (agentsFromJSON && agentsFromJSON.length > 0) {
            try {
                const builtInAgents = agentsFromJSON.map(agent => ({
                id: agent.id,
                name: agent.name,
                apiUrl: agent.apiUrl,
                apiKey: agent.apiKeyVariableName,
                model: agent.model,
                systemPrompt: agent.systemPrompt || '',
                temperature: agent.temperature || 0.7,
                maxTokens: agent.max_tokens || 2048,
                welcomeMessage: agent.welcomeMessage || '',
                    isBuiltIn: true,
                    source: 'json' // 标记为JSON文件来源
                }));
                
                // 先添加所有本地智能体
                mergedAgents = [...localAgents];
                
                // 然后添加不与本地智能体ID冲突的内置智能体
                builtInAgents.forEach(builtInAgent => {
                    if (builtInAgent && builtInAgent.id && !localAgentIds[builtInAgent.id]) {
                        mergedAgents.push(builtInAgent);
                    }
                });
                
                console.log("合并后总共有", mergedAgents.length, "个智能体");
            } catch (mergeError) {
                console.error("合并智能体时出错:", mergeError);
                
                // 出错时，优先使用本地智能体
                mergedAgents = [...localAgents];
                console.log("回退到仅使用本地智能体:", mergedAgents.length, "个");
            }
        } else {
            // 如果无法从JSON加载，只使用localStorage中的智能体
            mergedAgents = localAgents;
            console.log("仅使用本地智能体:", mergedAgents.length, "个");
        }
        
        // 过滤掉无效智能体（可能有null或undefined）
        mergedAgents = mergedAgents.filter(agent => agent && agent.id);
        
        // 如果没有任何智能体，添加一个默认的
        if (mergedAgents.length === 0) {
            const defaultId = 'default-' + Date.now();
            console.log("没有找到任何智能体，创建默认智能体:", defaultId);
            
            mergedAgents = [
                    {
                    id: defaultId,
                        name: '默认智能体（用户可编辑）',
                        apiUrl: 'https://aihubmix.com/v1/chat/completions',
                        apiKey: 'YOUR_API_KEY_HERE', // 提醒用户填写
                        model: 'gemini-2.0-flash',
                        systemPrompt: '',
                        temperature: 0.8,
                        maxTokens: 1024,
                        welcomeMessage: '直接输入任何问题，我会简明扼要地回答。',
                    isBuiltIn: false,
                    source: 'default'
                    }
                ];
            }
        
        // 更新全局智能体列表
        agents = mergedAgents;
        
        // 保存合并后的智能体列表到本地存储
        saveAgents();
        
        // 加载选择器和列表
        loadAgentSelector();
        loadAgentList();
        
        // 从localStorage加载聊天记录
        loadMessageHistories();
        
        // 显示欢迎消息
        displayMessage('提示', '欢迎使用智能体聚合平台！请选择一个智能体开始对话。', 'system-message');
        
        // 显示提示消息，告诉用户智能体已保存在本地
        const customAgentsCount = agents.filter(a => !a.isBuiltIn).length;
        if (customAgentsCount > 0) {
            displayMessage('提示', `您有 ${customAgentsCount} 个自定义智能体已保存在本地，刷新页面不会丢失。`, 'system-message');
            
            // 在移动设备上额外显示提示
            if (StorageUtil.isMobileDevice) {
                displayMessage('提示', '检测到您正在使用移动设备，已启用特殊存储保护模式，提高数据持久性。', 'system-message');
            }
        }
        
        // 设置自动保存间隔
        setInterval(() => {
            if (agents && agents.length > 0) {
                saveAgents();
            }
        }, StorageUtil.isMobileDevice ? 60000 : 300000); // 移动设备1分钟，桌面设备5分钟
        
        console.log("智能体初始化完成:", agents.length, "个智能体可用");
    } catch (error) {
        console.error("初始化智能体时出错:", error);
        displayMessage('提示', `初始化智能体时出错: ${error.message}，正在尝试恢复...`, 'system-message');
        
        // 尝试恢复
        try {
            // 使用增强版的StorageUtil工具尝试恢复智能体数据
            const recoveredAgents = StorageUtil.recoverAgentsData();
            
            if (recoveredAgents && recoveredAgents.length > 0) {
                agents = recoveredAgents;
                console.log("通过增强恢复功能找回了", agents.length, "个智能体");
                displayMessage('提示', `已恢复 ${agents.length} 个智能体配置。`, 'system-message');
            } else {
                // 创建一个恢复模式智能体
                agents = [
                    {
                        id: 'recovery-' + Date.now(),
                        name: '恢复模式智能体',
                        apiUrl: 'https://aihubmix.com/v1/chat/completions',
                        apiKey: 'YOUR_API_KEY_HERE',
                        model: 'gemini-2.0-flash',
                        systemPrompt: '',
                        temperature: 0.8,
                        maxTokens: 1024,
                        welcomeMessage: '系统恢复中，请重新配置您的API密钥。',
                        isBuiltIn: false,
                        source: 'recovery'
                    }
                ];
                console.log("创建了恢复模式智能体");
                displayMessage('提示', '无法恢复任何智能体配置，已创建一个恢复模式智能体。', 'system-message');
            }
            
            // 使用恢复的智能体更新UI
            loadAgentSelector();
            loadAgentList();
        } catch (recoveryError) {
            console.error("恢复失败:", recoveryError);
            displayMessage('提示', '无法恢复任何智能体配置，请手动添加新智能体。', 'system-message');
            
            // 创建空智能体列表
            agents = [];
            loadAgentSelector();
            loadAgentList();
        }
    }
}

// 保存智能体配置到本地存储
function saveAgents() {
    try {
        // 防止保存空数据
        if (!agents || !Array.isArray(agents)) {
            console.error("尝试保存无效的智能体数据：", agents);
            return false;
        }
        
        // 过滤掉无效智能体
        const validAgents = agents.filter(agent => agent && agent.id);
        if (validAgents.length === 0) {
            console.warn("没有有效的智能体可保存");
            return false;
        }
        
        // 设置一个全局引用，便于自动保存
        window.agents = validAgents; 
        
        // 序列化前进行一次数据验证
        const agentsJson = JSON.stringify(validAgents);
        try {
            // 确保数据是可以解析的
            const testParse = JSON.parse(agentsJson);
            if (!Array.isArray(testParse) || testParse.length !== validAgents.length) {
                throw new Error("序列化/反序列化测试失败");
            }
        } catch (parseError) {
            console.error("智能体数据序列化检查失败:", parseError);
            return false;
        }
        
        // 使用安全存储工具保存所有智能体
        const result = StorageUtil.setItem('agents', agentsJson);
        
        // 创建额外备份（不同的键名，降低冲突风险）
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').substring(0, 14);
        StorageUtil.setItem(`agents_backup_${timestamp.substring(0, 8)}`, agentsJson, true);
        
        if (StorageUtil.isMobileDevice) {
            // 在移动设备上创建更多备份，使用不同的键名
            StorageUtil.setItem('agents_mobile_backup', agentsJson, true);
        }
        
        console.log("所有智能体已保存:", validAgents.length, "保存结果:", result ? "成功" : "失败");
        
        // 显示成功提示
        setTimeout(() => {
            const customAgentsCount = validAgents.filter(a => !a.isBuiltIn).length;
            console.log(`${customAgentsCount} 个自定义智能体已保存在本地`);
        }, 500);
        
        return result;
    } catch (error) {
        console.error("保存智能体配置失败:", error);
        
        // 捕获特定的错误类型
        let errorMessage = `无法保存智能体配置: ${error.message}`;
        
        // 对不同错误类型给予更具体的提示
        if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            errorMessage = "存储空间已满，请删除一些智能体或清理浏览器存储空间后再试。";
        } else if (error.name === 'SecurityError') {
            errorMessage = "由于浏览器安全限制，无法保存数据。请检查您的浏览器设置。";
        } else if (error.message.includes('private browsing')) {
            errorMessage = "您正在使用隐私浏览模式，无法保存数据。请切换到正常浏览模式。";
        }
        
        // 只在非静默模式下显示错误消息
        if (!document.hidden) {
            displayMessage('提示', errorMessage, 'system-message');
        }
        
        // 即使出错也尝试使用备份方案
        try {
            // 尝试多种备份方案
            try {
                localStorage.setItem('agents_emergency_backup', JSON.stringify(agents));
            } catch (e) {}
            
            try {
                sessionStorage.setItem('agents_session_backup', JSON.stringify(agents));
            } catch (e) {}
            
            // 确保内存备份
            StorageUtil.memoryStorage['agents'] = JSON.stringify(agents);
            
            console.log("已创建智能体紧急备份");
            return true;
        } catch (e) {
            console.error("所有备份智能体方案都失败:", e);
            return false;
        }
    }
}

// 加载聊天记录
function loadMessageHistories() {
    try {
        const saved = StorageUtil.getItem('messageHistories');
        if (saved) {
            try {
            messageHistories = JSON.parse(saved);
                console.log("成功加载聊天记录");
            } catch (parseError) {
                console.error("聊天记录解析失败:", parseError);
                messageHistories = {};
            }
        } else {
            console.log("未找到聊天记录，使用空对象");
            messageHistories = {};
        }
    } catch (error) {
        console.error("加载聊天记录出错:", error);
        messageHistories = {};
    }
}

// 保存聊天记录
function saveMessageHistories() {
    try {
        const historyString = JSON.stringify(messageHistories);
        const result = StorageUtil.setItem('messageHistories', historyString);
        
        if (!result) {
            console.warn("聊天记录保存可能失败，尝试清理后重新保存");
            pruneMessageHistories();
            StorageUtil.setItem('messageHistories', JSON.stringify(messageHistories));
        }
    } catch (error) {
        console.error("保存聊天记录出错:", error);
        
        // 如果消息太多导致存储失败，可以考虑清理一些旧消息
        if (error.name === 'QuotaExceededError') {
            pruneMessageHistories();
            try {
                StorageUtil.setItem('messageHistories', JSON.stringify(messageHistories));
            } catch (e) {
                console.error("即使清理后仍无法保存聊天记录:", e);
            }
        }
    }
}

// 清理过长的聊天记录以节省空间
function pruneMessageHistories() {
    const MAX_MESSAGES_PER_AGENT = 50;
    
    for (const agentId in messageHistories) {
        if (messageHistories[agentId].length > MAX_MESSAGES_PER_AGENT) {
            // 保留最近的消息
            messageHistories[agentId] = messageHistories[agentId].slice(-MAX_MESSAGES_PER_AGENT);
        }
    }
}

// 加载智能体选择器
function loadAgentSelector() {
    // 清空现有选项
    agentSelector.innerHTML = '<option value="" disabled selected>请选择智能体</option>';
    
    // 添加智能体选项
    agents.forEach(agent => {
        const option = document.createElement('option');
        option.value = agent.id;
        option.textContent = agent.name;
        agentSelector.appendChild(option);
    });
}

// 加载智能体列表（管理员面板）
function loadAgentList() {
    agentList.innerHTML = '';
    
    agents.forEach(agent => {
        const agentItem = document.createElement('div');
        agentItem.className = 'agent-item';
        
        const agentInfo = document.createElement('div');
        agentInfo.className = 'agent-info';
        agentInfo.textContent = agent.name + (agent.isBuiltIn ? ' (内置)' : '');
        
        const agentActions = document.createElement('div');
        agentActions.className = 'agent-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.textContent = '编辑';
        if (agent.isBuiltIn) {
            editBtn.disabled = true;
            editBtn.title = '内置智能体不可编辑';
        } else {
            editBtn.onclick = () => editAgent(agent.id);
        }
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '删除';
        if (agent.isBuiltIn) {
            deleteBtn.disabled = true;
            deleteBtn.title = '内置智能体不可删除';
        } else {
            deleteBtn.onclick = () => deleteAgent(agent.id);
        }
        
        agentActions.appendChild(editBtn);
        agentActions.appendChild(deleteBtn);
        
        agentItem.appendChild(agentInfo);
        agentItem.appendChild(agentActions);
        
        agentList.appendChild(agentItem);
    });
}

// 编辑智能体
function editAgent(agentId) {
    console.log('编辑智能体ID:', agentId);
    const agent = agents.find(a => a.id === agentId);
    if (!agent) {
        console.error('未找到智能体:', agentId);
        return;
    }
    
    if (agent.isBuiltIn) {
        displayMessage('提示', '内置智能体不可编辑。', 'system-message');
        console.warn('尝试编辑内置智能体:', agent.name);
        return;
    }
    
    // 查找表单容器
    const formContainer = document.querySelector('#agent-form-container');
    if (!formContainer) {
        console.error('未找到表单容器 #agent-form-container');
        alert('未找到编辑表单，请检查页面结构');
        return;
    }
    
    // 查找并设置表单标题
    const titleElement = document.querySelector('#form-title');
    if (titleElement) {
        titleElement.textContent = '编辑智能体';
    } else {
        console.warn('未找到表单标题元素 #form-title');
    }
    
    // 填充表单字段值
    const fields = [
        { id: 'agent-id', value: agent.id },
        { id: 'agent-name', value: agent.name },
        { id: 'api-url', value: agent.apiUrl },
        { id: 'api-key', value: agent.apiKey },
        { id: 'model', value: agent.model },
        { id: 'system-prompt', value: agent.systemPrompt || '' },
        { id: 'temperature', value: agent.temperature || 0.7 },
        { id: 'max-tokens', value: agent.maxTokens || 2048 },
        { id: 'welcome-message', value: agent.welcomeMessage || '' }
    ];
    
    fields.forEach(field => {
        const element = document.querySelector('#' + field.id);
        if (element) {
            element.value = field.value;
        } else {
            console.warn('未找到表单字段元素:', field.id);
        }
    });
    
    // 显示表单
    formContainer.style.display = 'block';
}

// 删除智能体
function deleteAgent(agentId) {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) {
        displayMessage('提示', '未找到要删除的智能体。', 'system-message');
        return;
    }
    
    // 内置智能体不可删除
    if (agent.isBuiltIn || agent.source === 'json') {
        displayMessage('提示', '内置智能体不可删除。', 'system-message');
        console.warn("尝试删除内置智能体:", agent.name);
        return;
    }

    if (confirm(`确定要删除"${agent.name}"智能体吗？`)) {
        // 过滤掉要删除的智能体
        agents = agents.filter(a => a.id !== agentId);
        
        // 保存更改到本地存储
        saveAgents();
        
        // 更新UI
        loadAgentList();
        loadAgentSelector();
        
        // 如果当前正在使用被删除的智能体，清空当前选择
        if (currentAgent && currentAgent.id === agentId) {
            currentAgent = null;
            chatContainer.innerHTML = '';
            displayMessage('提示', '当前智能体已被删除，请选择其他智能体继续对话。', 'system-message');
        }
        
        // 显示成功消息
        displayMessage('提示', `智能体"${agent.name}"已被删除。`, 'system-message');
    }
}

// 添加新智能体
function addAgent() {
    // 重置表单
    agentForm.reset();
    document.getElementById('agent-id').value = '';
    
    // 显示表单
    formTitle.textContent = '添加智能体';
    agentFormContainer.style.display = 'block';
}

// 取消编辑/添加
function cancelForm() {
    agentFormContainer.style.display = 'none';
}

// 保存智能体
function saveAgent(e) {
    e.preventDefault();
    
    const agentId = document.getElementById('agent-id').value;
    const isEditing = Boolean(agentId);

    const newAgentData = {
        id: agentId || 'custom-' + Date.now().toString(),
        name: document.getElementById('agent-name').value,
        apiUrl: document.getElementById('api-url').value,
        apiKey: document.getElementById('api-key').value,
        model: document.getElementById('model').value,
        systemPrompt: document.getElementById('system-prompt').value,
        temperature: parseFloat(document.getElementById('temperature').value),
        maxTokens: parseInt(document.getElementById('max-tokens').value),
        welcomeMessage: document.getElementById('welcome-message') ? document.getElementById('welcome-message').value : '直接输入问题，我会回答。',
        isBuiltIn: false,  // 用户添加的智能体永远不是内置的
        source: 'local'    // 标记为本地存储来源
    };
    
    if (isEditing) {
        const existingAgentIndex = agents.findIndex(a => a.id === agentId);
        if (existingAgentIndex !== -1) {
            if (agents[existingAgentIndex].isBuiltIn) {
                // 如果是编辑内置智能体，创建一个新的副本而不是修改原来的
                // 确保新ID有明确的前缀，避免与内置ID冲突
                const editedBuiltIn = {
                    ...newAgentData, 
                    id: 'custom-' + Date.now().toString(),
                    source: 'local',
                    isBuiltIn: false
                };
                agents.push(editedBuiltIn);
                displayMessage('提示', `已创建内置智能体"${newAgentData.name}"的自定义副本。`, 'system-message');
                
                // 自动选择新创建的副本
                newAgentData.id = editedBuiltIn.id;
            } else {
                // 如果是编辑用户自定义的智能体，直接修改但保留source标记
                const originalSource = agents[existingAgentIndex].source || 'local';
                agents[existingAgentIndex] = {
                    ...newAgentData,
                    source: originalSource
                };
            }
        }
    } else {
        // 添加新智能体
        agents.push(newAgentData);
    }
    
    // 保存到本地存储
    saveAgents();
    
    // 刷新界面
    loadAgentList();
    loadAgentSelector();
    
    // 自动选择刚刚添加或编辑的智能体
    agentSelector.value = newAgentData.id;
    selectAgent();
    
    // 关闭表单
    cancelForm();
    
    // 显示成功消息
    displayMessage('提示', `智能体"${newAgentData.name}"已保存，并将永久保存在本地。`, 'system-message');
}

// 切换管理员模式
function toggleAdminMode() {
    if (adminModeCheckbox.checked) {
        adminPanel.style.display = 'block';
        loadAgentList();
    } else {
        adminPanel.style.display = 'none';
    }
}

// 选择智能体
function selectAgent() {
    const agentId = agentSelector.value;
    currentAgent = agents.find(agent => agent.id === agentId);
    
    if (currentAgent) {
        // 隐藏平台介绍横幅
        const platformBanner = document.querySelector('.platform-banner');
        if (platformBanner) {
            platformBanner.style.display = 'none';
        }
        
        // 清空聊天界面，但不清除历史记录
        chatContainer.innerHTML = '';
        
        // 如果没有这个智能体的聊天记录，初始化一个空数组
        if (!messageHistories[currentAgent.id]) {
            messageHistories[currentAgent.id] = [];
        }
        
        // 显示欢迎消息
        if (currentAgent.welcomeMessage && messageHistories[currentAgent.id].length === 0) {
            displayMessage(currentAgent.name, currentAgent.welcomeMessage, 'ai-message');
            // 不把欢迎消息加入到历史记录中，避免重复显示
        }
        
        // 恢复之前的聊天记录
        renderChatHistory();
        
        // 选择智能体后立即重新计算布局
        if (window.LayoutManager) {
            setTimeout(window.LayoutManager.adjustLayout, 200);
        }
    }
}

// 渲染聊天历史
function renderChatHistory() {
    if (!currentAgent) return;
    
    const history = messageHistories[currentAgent.id] || [];
    
    // 限制显示的消息数量，避免渲染太多消息导致性能问题
    const MAX_DISPLAYED_MESSAGES = 50;
    const messagesToShow = history.length > MAX_DISPLAYED_MESSAGES 
        ? history.slice(-MAX_DISPLAYED_MESSAGES) 
        : history;
    
    if (messagesToShow.length === 0) return;
    
    // 如果有太多消息被省略，显示提示
    if (history.length > MAX_DISPLAYED_MESSAGES) {
        const omittedCount = history.length - MAX_DISPLAYED_MESSAGES;
        displayMessage('提示', `已省略 ${omittedCount} 条较早的消息以提高性能`, 'system-message');
    }
    
    // 渲染历史消息
    for (const message of messagesToShow) {
        if (message.role === 'user') {
            displayMessage('你', message.content, 'user-message', false);
        } else if (message.role === 'assistant') {
            // 对于AI消息，需要创建特殊的消息元素以支持复制功能等
            displayAIMessage(currentAgent.name, message.content, false);
        }
    }
}

// 导出Word文档 - 使用导出服务模块
async function markdownToWord(markdown, defaultFilename = 'AI回复文档') {
    // 委托给ExportService处理
    if (window.ExportService) {
        return window.ExportService.markdownToWord(markdown, defaultFilename);
    } else {
        console.error('导出服务模块未加载');
        displayMessage('提示', '导出服务模块未加载，无法导出文档', 'system-message');
    }
}

// 显示AI消息的特殊函数 - 兼容层，使用模块化的MessageHandler
function displayAIMessage(sender, message, saveToHistory = true) {
    // 如果可用，使用MessageHandler模块
    if (window.MessageHandler) {
        return window.MessageHandler.displayAIMessage(sender, message, saveToHistory);
    }
    
    // 兼容模式 - 以前的实现留作备份
    console.warn('MessageHandler模块不可用，使用兼容模式显示AI消息');
    
    const aiMessageElement = document.createElement('div');
    aiMessageElement.className = 'message ai-message';
    
    // 创建消息头部
    const messageHeader = document.createElement('div');
    messageHeader.className = 'message-header';
    
    // 创建发送者标签
    const senderLabel = document.createElement('span');
    senderLabel.className = 'message-sender';
    senderLabel.textContent = `${sender}: `;
    
    // 添加到消息头部
    messageHeader.appendChild(senderLabel);
    
    // 创建内容容器
    const aiContent = document.createElement('div');
    aiContent.className = 'ai-content';
    
    // 根据设置决定是否使用Markdown渲染
    if (settings.markdownEnabled) {
        aiContent.innerHTML = marked.parse(message);
        
        // 根据设置决定是否应用代码高亮
        if (settings.codeHighlightEnabled) {
            aiContent.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        }
    } else {
        // 纯文本显示，保留换行
        aiContent.textContent = message;
    }
    
    // 添加Word导出按钮
    const wordBtn = document.createElement('button');
    wordBtn.className = 'word-btn';
    wordBtn.textContent = '导出Word';
    wordBtn.title = '导出为Word文档';
    wordBtn.onclick = () => {
        // 获取当前的日期时间作为建议文件名
        const now = new Date();
        const dateStr = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}`;
        const timeStr = `${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}`;
        const suggestedFilename = `AI回复_${dateStr}_${timeStr}`;
        
        // 调用转换函数
        if (window.ExportService && window.ExportService.markdownToWord) {
            window.ExportService.markdownToWord(message, suggestedFilename);
        } else {
            markdownToWord(message, suggestedFilename);
        }
    };
    
    // 添加复制按钮
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = '复制';
    copyBtn.onclick = () => {
        navigator.clipboard.writeText(message).then(() => {
            copyBtn.textContent = '已复制';
            copyBtn.classList.add('copied');
            
            setTimeout(() => {
                copyBtn.textContent = '复制';
                copyBtn.classList.remove('copied');
            }, 2000);
        });
    };
    
    // 组装消息元素
    aiMessageElement.appendChild(messageHeader);
    aiMessageElement.appendChild(aiContent);
    
    // 将Word导出按钮添加到 aiContent 元素，位于复制按钮的左边
    aiContent.appendChild(wordBtn);
    aiContent.appendChild(copyBtn);
    // 清理可能因为浮动按钮导致的布局问题
    const clearer = document.createElement('div');
    clearer.style.clear = 'both';
    aiContent.appendChild(clearer);
    
    // 添加到聊天容器
    chatContainer.appendChild(aiMessageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    // 保存到历史记录
    if (saveToHistory && currentAgent) {
        if (!messageHistories[currentAgent.id]) {
            messageHistories[currentAgent.id] = [];
        }
        messageHistories[currentAgent.id].push({ role: 'assistant', content: message });
        saveMessageHistories();
    }
}

// 发送消息
function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    
    if (!currentAgent) {
        displayMessage('提示', '请先选择一个智能体', 'system-message');
        return;
    }
    
    // 显示用户消息
    displayMessage('你', message, 'user-message');
    
    // 添加到消息历史
    if (!messageHistories[currentAgent.id]) {
        messageHistories[currentAgent.id] = [];
    }
    messageHistories[currentAgent.id].push({ role: 'user', content: message });
    saveMessageHistories();
    
    // 清空输入框
    userInput.value = '';
    
    // 调用API
    callAPI(message);
}

// 调用API（修改以添加Word导出按钮）
async function callAPI(userMessage) {
    // 预先显示AI回复的标记
    const aiMessageElement = document.createElement('div');
    aiMessageElement.className = 'message ai-message';
    
    // 创建消息头部
    const messageHeader = document.createElement('div');
    messageHeader.className = 'message-header';
    
    // 创建发送者标签
    const senderLabel = document.createElement('span');
    senderLabel.className = 'message-sender';
    senderLabel.textContent = `${currentAgent.name}: `;
    
    // 添加到消息头部
    messageHeader.appendChild(senderLabel);
    
    // 创建内容容器
    const aiContent = document.createElement('div');
    aiContent.className = 'ai-content';
    
    // 组装消息元素
    aiMessageElement.appendChild(messageHeader);
    aiMessageElement.appendChild(aiContent);
    
    // 添加到聊天容器
    chatContainer.appendChild(aiMessageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    // 使用当前智能体的历史记录构建请求
    const messages = [...messageHistories[currentAgent.id]];
    
    // 如果有系统提示词，添加到消息历史开头
    if (currentAgent.systemPrompt) {
        messages.unshift({ role: 'system', content: currentAgent.systemPrompt });
    }
    
    const requestData = {
        model: currentAgent.model,
        messages: messages,
        temperature: currentAgent.temperature,
        max_tokens: currentAgent.maxTokens,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        stream: true
    };
    
    try {
        // 创建请求的AbortController，设置30秒超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(currentAgent.apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentAgent.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData),
            signal: controller.signal
        });
        
        // 清除超时
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw {
                response: {
                    status: response.status,
                    message: errorData.error?.message || `HTTP错误: ${response.status}`
                }
            };
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const jsonStr = line.substring(6); // 移除 'data: ' 前缀
                        const data = JSON.parse(jsonStr);
                        
                        let content = "";
                        // OpenAI 格式响应处理
                        if (data.choices && data.choices.length > 0) {
                            if (data.choices[0].delta && data.choices[0].delta.content) {
                                content = data.choices[0].delta.content;
                            }
                        }
                        // Gemini 格式响应处理
                        else if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                            if (data.candidates[0].content.parts && data.candidates[0].content.parts[0].text) {
                                content = data.candidates[0].content.parts[0].text;
                            }
                        }
                        
                        // 更新响应
                        if (content) {
                            fullResponse += content;
                            
                            // 根据设置决定是否使用Markdown渲染
                            if (settings.markdownEnabled) {
                                aiContent.innerHTML = marked.parse(fullResponse);
                                
                                // 根据设置决定是否应用代码高亮
                                if (settings.codeHighlightEnabled) {
                                    aiContent.querySelectorAll('pre code').forEach((block) => {
                                        hljs.highlightElement(block);
                                    });
                                }
                            } else {
                                // 纯文本显示，保留换行
                                aiContent.textContent = fullResponse;
                            }
                            
                            chatContainer.scrollTop = chatContainer.scrollHeight;
                        }
                    } catch (error) {
                        // JSON解析错误，忽略
                        console.log('JSON解析错误，忽略:', error);
                    }
                }
            }
        }
        
        // 添加到消息历史
        if (fullResponse) {
            messageHistories[currentAgent.id].push({ role: 'assistant', content: fullResponse });
            saveMessageHistories();
            
            // 添加Word导出按钮
            const wordBtn = document.createElement('button');
            wordBtn.className = 'word-btn';
            wordBtn.textContent = '导出Word';
            wordBtn.title = '导出为Word文档';
            wordBtn.onclick = () => {
                // 获取当前的日期时间作为建议文件名
                const now = new Date();
                const dateStr = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}`;
                const timeStr = `${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}`;
                const suggestedFilename = `AI回复_${dateStr}_${timeStr}`;
                
                // 调用改进的转换函数
                markdownToWord(fullResponse, suggestedFilename);
            };
            
            // 流式响应结束后添加复制按钮到内容末尾
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn';
            copyBtn.textContent = '复制';
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(fullResponse).then(() => {
                    copyBtn.textContent = '已复制';
                    copyBtn.classList.add('copied');
                    
                    setTimeout(() => {
                        copyBtn.textContent = '复制';
                        copyBtn.classList.remove('copied');
                    }, 2000);
                });
            };
            
            // 将Word导出按钮添加到 aiContent 元素，位于复制按钮的左边
            aiContent.appendChild(wordBtn);
            aiContent.appendChild(copyBtn);
            // 清理可能因为浮动按钮导致的布局问题
            const clearer = document.createElement('div');
            clearer.style.clear = 'both';
            aiContent.appendChild(clearer);
            
            // 确保滚动到底部以显示按钮
            chatContainer.scrollTop = chatContainer.scrollHeight;
        } else {
            // 如果响应为空，移除预先创建的空AI消息
            chatContainer.removeChild(aiMessageElement);
            handleAPIError({ message: "AI返回了空响应，请重试" });
        }
        
    } catch (error) {
        // 移除预先创建的空AI消息
        chatContainer.removeChild(aiMessageElement);
        
        // 使用改进的错误处理
        handleAPIError(error);
    }
    
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// 显示消息 - 兼容层，使用模块化的MessageHandler
function displayMessage(sender, message, className, saveToHistory = true) {
    // 如果可用，使用MessageHandler模块
    if (window.MessageHandler) {
        return window.MessageHandler.displayMessage(sender, message, className, saveToHistory);
    }
    
    // 兼容模式 - 以前的实现留作备份
    console.warn('MessageHandler模块不可用，使用兼容模式显示消息');
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${className}`;
    
    if (className === 'system-message') {
        // 系统消息使用简单布局
        messageElement.innerHTML = `<span class="message-sender">${sender}: </span>${message}`;
    } else if (className === 'user-message') {
        // 用户消息
        const messageHeader = document.createElement('div');
        messageHeader.className = 'message-header';
        
        const senderLabel = document.createElement('span');
        senderLabel.className = 'message-sender';
        senderLabel.textContent = `${sender}: `;
        
        const messageContent = document.createElement('div');
        messageContent.textContent = message;
        
        messageHeader.appendChild(senderLabel);
        messageElement.appendChild(messageHeader);
        messageElement.appendChild(messageContent);
        
        // 保存到历史记录
        if (saveToHistory && currentAgent) {
            if (!messageHistories[currentAgent.id]) {
                messageHistories[currentAgent.id] = [];
            }
            messageHistories[currentAgent.id].push({ role: 'user', content: message });
            saveMessageHistories();
        }
    } else if (className === 'ai-message') {
        // AI消息
        const messageHeader = document.createElement('div');
        messageHeader.className = 'message-header';
        
        const senderLabel = document.createElement('span');
        senderLabel.className = 'message-sender';
        senderLabel.textContent = `${sender}: `;
        
        messageHeader.appendChild(senderLabel);
        
        const messageContent = document.createElement('div');
        messageContent.textContent = message;
        
        messageElement.appendChild(messageHeader);
        messageElement.appendChild(messageContent);
    }
    
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// DOM元素 - 设置相关
const settingsButton = document.getElementById('settings-button');
const settingsPanel = document.getElementById('settings-panel');
const settingsOverlay = document.getElementById('settings-overlay');
const closeSettings = document.getElementById('close-settings');
const markdownEnabled = document.getElementById('markdown-enabled');
const codeHighlightEnabled = document.getElementById('code-highlight-enabled');

// 设置状态
let settings = JSON.parse(localStorage.getItem('settings')) || {
    markdownEnabled: true,
    codeHighlightEnabled: true
};

// 初始化设置开关状态
markdownEnabled.checked = settings.markdownEnabled;
codeHighlightEnabled.checked = settings.codeHighlightEnabled;

// 显示和隐藏设置面板
function toggleSettingsPanel() {
    settingsPanel.style.display = settingsPanel.style.display === 'block' ? 'none' : 'block';
    settingsOverlay.style.display = settingsPanel.style.display;
}

// 保存设置
function saveSettings() {
    settings.markdownEnabled = markdownEnabled.checked;
    settings.codeHighlightEnabled = codeHighlightEnabled.checked;
    localStorage.setItem('settings', JSON.stringify(settings));
}

// 关闭设置面板
function closeSettingsPanel() {
    settingsPanel.style.display = 'none';
    settingsOverlay.style.display = 'none';
}

// 清除当前智能体的聊天记录
function clearChatHistory() {
    if (!currentAgent) {
        displayMessage('提示', '请先选择一个智能体', 'system-message');
        return;
    }
    
    // 弹出确认对话框
    if (confirm(`确定要清除当前智能体的聊天记录吗？`)) {
        // 清空界面
        chatContainer.innerHTML = '';
        
        // 清空当前智能体的历史记录
        messageHistories[currentAgent.id] = [];
        saveMessageHistories();
        
        // 显示提示
        displayMessage('提示', '聊天记录已清除', 'system-message');
        
        // 重新显示欢迎消息
        if (currentAgent.welcomeMessage) {
            displayMessage(currentAgent.name, currentAgent.welcomeMessage, 'ai-message');
        }
        
        // 确保平台介绍横幅保持隐藏状态
        const platformBanner = document.querySelector('.platform-banner');
        if (platformBanner) {
            platformBanner.style.display = 'none';
        }
        
        // 清除聊天记录后重新计算布局高度
        if (window.LayoutManager) {
            setTimeout(window.LayoutManager.adjustLayout, 200);
        }
    }
}

// DOM元素加载和初始化 - 只在首次加载时执行
window.addEventListener('load', function() {
    // 防止重复初始化
    if (window.hasInitialized) {
        console.log("应用已初始化，跳过");
        return;
    }
    
    // 标记已初始化
    window.hasInitialized = true;
    console.log("首次初始化应用");
    
    // 初始化智能体
    initializeAgents().catch(error => {
        console.error("初始化失败:", error);
    });
    
    // 注册事件监听器
    registerEventListeners();
});

// 注: setupMutationObserver 功能已移至 layout-manager.js

// 注册所有事件监听器
function registerEventListeners() {
    // 发送按钮点击事件
    sendButton.addEventListener('click', sendMessage);

    // 输入框按Enter键发送消息
    userInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // 智能体选择
    agentSelector.addEventListener('change', selectAgent);

    // 管理员模式切换
    adminModeCheckbox.addEventListener('change', toggleAdminMode);

    // 添加智能体按钮
    document.getElementById('add-agent-btn').addEventListener('click', addAgent);

    // 取消表单按钮
    document.getElementById('cancel-btn').addEventListener('click', cancelForm);

    // 保存智能体表单
    document.getElementById('agent-form').addEventListener('submit', saveAgent);

    // 清除聊天记录按钮
    document.getElementById('clear-button').addEventListener('click', clearChatHistory);

    // 设置按钮
    document.getElementById('settings-button').addEventListener('click', toggleSettingsPanel);

    // 关闭设置面板按钮
    document.getElementById('close-settings').addEventListener('click', closeSettingsPanel);

    // 设置面板的背景遮罩
    document.getElementById('settings-overlay').addEventListener('click', closeSettingsPanel);

    // 设置选项保存
    document.getElementById('markdown-enabled').addEventListener('change', saveSettings);
    document.getElementById('code-highlight-enabled').addEventListener('change', saveSettings);

    // 汤仔助手按钮点击事件
    if (tangzaiButton) {
        tangzaiButton.addEventListener('click', function() {
            window.location.href = 'tangzai.html';
        });
    }
    
    // 初始化布局管理器
    if (window.LayoutManager) {
        window.LayoutManager.init();
    }
}

// 注：布局管理相关功能已移至layout-manager.js
// 保留旧函数名以确保兼容性，实际调用LayoutManager中的方法
function isMobileDevice() {
    return window.LayoutManager.isMobileDevice();
}

function handleLayoutForMobile() {
    return window.LayoutManager.adjustLayout();
}

// 改进错误处理
function handleAPIError(error) {
    console.error('API调用出错:', error);
    
    let errorMessage = '与AI服务连接出错';
    
    // 根据错误类型提供更具体的错误消息
    if (error.name === 'AbortError') {
        errorMessage = '请求超时，请检查您的网络连接并重试';
    } else if (error.response) {
        // 服务器返回了错误状态码
        if (error.response.status === 401) {
            errorMessage = 'API密钥无效或已过期，请检查您的API密钥设置';
        } else if (error.response.status === 403) {
            errorMessage = '无权访问API，请确认API密钥权限';
        } else if (error.response.status === 429) {
            errorMessage = 'API请求频率超限，请稍后再试';
        } else {
            errorMessage = `服务器返回错误: ${error.response.status}`;
        }
    } else if (error.request) {
        // 请求已发送，但没有收到响应
        errorMessage = '未收到API响应，请检查网络连接或API地址';
    } else if (error.message) {
        errorMessage = `调用AI服务出错: ${error.message}`;
    }
    
    displayMessage('错误', errorMessage, 'system-message');
    
    // 如果在移动设备上，提供更友好的错误反馈
    if (isMobileDevice()) {
        // 震动反馈（如果支持）
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }
        
        // 显示在聊天框上方的错误提示
        const errorElement = document.createElement('div');
        errorElement.classList.add('mobile-error-notification');
        errorElement.textContent = errorMessage;
        document.body.appendChild(errorElement);
        
        // 3秒后移除错误提示
        setTimeout(() => {
            document.body.removeChild(errorElement);
        }, 3000);
    }
}

// 在适当的位置替换原来的错误处理
// 例如在callAPI函数中:
// 原来的代码：
// catch (error) {
//     console.error('API调用出错:', error);
//     displayMessage('错误', `与AI服务连接出错: ${error.message}`, 'system-message');
// }
// 
// 替换为：
// catch (error) {
//     handleAPIError(error);
// }

// ... existing code ... 