/**
 * agent-service.js
 * 智能体服务模块 - 负责智能体的管理、加载和保存
 */

// 智能体服务对象
const AgentService = {
    // 当前选中的智能体
    currentAgent: null,
    
    // 所有可用智能体列表
    agents: [],
    
    // 从agents.json加载智能体列表
    agentsLoadPromise: null,
    lastLoadTime: 0,
    
    // 初始化智能体列表
    init: async function() {
        console.log("开始初始化智能体服务...");
        
        // 显示平台横幅
        this.showPlatformBanner();
        
        try {
            // 从本地存储加载智能体
            await this.loadAgentsFromStorage();
            
            // 从JSON加载内置智能体并合并
            await this.mergeBuiltInAgents();
            
            // 保存合并后的智能体
            this.saveAgents();
            
            // 更新UI
            this.updateUI();
            
            console.log("智能体服务初始化完成:", this.agents.length, "个智能体可用");
            
            // 显示欢迎消息
            if (window.MessageHandler) {
                window.MessageHandler.displaySystemMessage('欢迎使用智能体聚合平台！请选择一个智能体开始对话。');
            }
            
            // 设置自动保存
            this.setupAutoSave();
            
            return this.agents;
        } catch (error) {
            console.error("初始化智能体服务失败:", error);
            this.handleInitError(error);
            return [];
        }
    },
    
    // 显示平台介绍横幅
    showPlatformBanner: function() {
        const platformBanner = document.querySelector('.platform-banner');
        if (platformBanner) {
            platformBanner.style.display = 'block';
        }
    },
    
    // 隐藏平台介绍横幅
    hidePlatformBanner: function() {
        const platformBanner = document.querySelector('.platform-banner');
        if (platformBanner) {
            platformBanner.style.display = 'none';
        }
    },
    
    // 从本地存储加载智能体
    loadAgentsFromStorage: async function() {
        try {
            // 使用StorageService恢复智能体数据
            let agents = [];
            
            if (window.StorageService) {
                const recoveredAgents = window.StorageService.recoverAgentsData();
                if (recoveredAgents) {
                    agents = recoveredAgents;
                    console.log("成功恢复智能体数据，找到", agents.length, "个智能体");
                } else {
                    const stored = window.StorageService.getItem('agents');
                    if (stored) {
                        try {
                            agents = JSON.parse(stored);
                            console.log("从本地存储加载了", agents.length, "个智能体");
                        } catch (e) {
                            console.error("解析智能体数据失败:", e);
                        }
                    }
                }
            } else {
                // 兼容模式
                const stored = localStorage.getItem('agents');
                if (stored) {
                    agents = JSON.parse(stored);
                    console.log("兼容模式：从localStorage加载了", agents.length, "个智能体");
                }
            }
            
            // 确保标记正确
            this.agents = (agents || []).map(agent => ({
                ...agent,
                isBuiltIn: agent.isBuiltIn || false,
                source: agent.source || 'local'
            }));
            
            return this.agents;
        } catch (error) {
            console.error("加载智能体失败:", error);
            return [];
        }
    },
    
    // 从JSON加载内置智能体并合并
    mergeBuiltInAgents: async function() {
        try {
            // 尝试从agents.json加载内置智能体
            const builtInAgents = await this.loadAgentsFromJSON();
            
            if (!builtInAgents || builtInAgents.length === 0) {
                console.log("没有从JSON加载到内置智能体");
                return this.agents;
            }
            
            // 创建ID映射，用于快速检索
            const localAgentIds = {};
            this.agents.forEach(agent => {
                if (agent && agent.id) {
                    localAgentIds[agent.id] = true;
                }
            });
            
            // 转换格式 - 🔧 确保API密钥字段正确映射
            const formattedBuiltInAgents = builtInAgents.map(agent => {
                const formattedAgent = {
                    id: agent.id,
                    name: agent.name,
                    apiUrl: agent.apiUrl,
                    apiKey: agent.apiKeyVariableName || agent.apiKey, // 优先使用apiKeyVariableName
                    model: agent.model,
                    systemPrompt: agent.systemPrompt || '',
                    temperature: agent.temperature || 0.7,
                    maxTokens: agent.max_tokens || 2048,
                    welcomeMessage: agent.welcomeMessage || '',
                    isBuiltIn: false, // 🔧 修复：设置为用户可编辑
                    source: 'json'
                };
                
                // 🔧 调试信息：检查API密钥映射
                if (!formattedAgent.apiKey || formattedAgent.apiKey === 'YOUR_API_KEY_HERE') {
                    console.warn('智能体API密钥配置问题:', {
                        agentId: agent.id,
                        agentName: agent.name,
                        originalApiKeyVariableName: agent.apiKeyVariableName,
                        originalApiKey: agent.apiKey,
                        mappedApiKey: formattedAgent.apiKey
                    });
                }
                
                return formattedAgent;
            });
            
            // 添加不与本地智能体ID冲突的内置智能体
            formattedBuiltInAgents.forEach(builtInAgent => {
                if (builtInAgent && builtInAgent.id && !localAgentIds[builtInAgent.id]) {
                    this.agents.push(builtInAgent);
                }
            });
            
            console.log("合并后总共有", this.agents.length, "个智能体");
            
            // 过滤掉无效智能体
            this.agents = this.agents.filter(agent => agent && agent.id);
            
            // 如果没有任何智能体，添加一个默认的
            if (this.agents.length === 0) {
                this.createDefaultAgent();
            }
            
            return this.agents;
        } catch (error) {
            console.error("合并智能体失败:", error);
            
            // 如果出错，确保至少有一个智能体
            if (this.agents.length === 0) {
                this.createDefaultAgent();
            }
            
            return this.agents;
        }
    },
    
    // 创建默认智能体
    createDefaultAgent: function() {
        const defaultId = 'default-' + Date.now();
        console.log("创建默认智能体:", defaultId);
        
        this.agents = [{
            id: defaultId,
            name: '默认智能体（用户可编辑）',
            apiUrl: 'https://aihubmix.com/v1/chat/completions',
            apiKey: 'YOUR_API_KEY_HERE',
            model: 'gemini-2.0-flash',
            systemPrompt: '',
            temperature: 0.8,
            maxTokens: 1024,
            welcomeMessage: '直接输入任何问题，我会简明扼要地回答。',
            isBuiltIn: false,
            source: 'default'
        }];
    },
    
    // 从agents.json加载内置智能体
    loadAgentsFromJSON: async function() {
        try {
            // 如果已有缓存，直接返回缓存
            if (window.cachedAgentsJSON) {
                console.log("使用缓存的agents.json数据");
                return window.cachedAgentsJSON;
            }
            
            // 如果已有待处理的请求，直接返回该Promise
            if (this.agentsLoadPromise) {
                console.log("agents.json已在加载中，等待结果");
                return this.agentsLoadPromise;
            }
            
            // 强制限制请求频率 - 至少间隔5秒
            const now = Date.now();
            if (now - this.lastLoadTime < 5000) {
                console.log("请求过于频繁，使用空结果");
                return [];
            }
            
            console.log("开始加载agents.json");
            this.lastLoadTime = now;
            
            // 创建新的Promise并保存引用
            this.agentsLoadPromise = new Promise(async (resolve) => {
                try {
                    const response = await fetch('agents.json?t=' + Date.now(), {
                        headers: {
                            'Cache-Control': 'no-cache, no-store, must-revalidate',
                            'Pragma': 'no-cache',
                            'Expires': '0'
                        },
                        cache: 'no-store'
                    });
                    
                    if (!response.ok) {
                        console.warn(`无法加载agents.json: ${response.status}`);
                        resolve([]);
                        return;
                    }
                    
                    const data = await response.json();
                    console.log("成功加载agents.json");
                    
                    // 缓存请求结果
                    window.cachedAgentsJSON = data;
                    resolve(data);
                } catch (error) {
                    console.error("加载agents.json失败:", error);
                    resolve([]);
                } finally {
                    // 允许再次请求
                    setTimeout(() => {
                        this.agentsLoadPromise = null;
                    }, 1000);
                }
            });
            
            return await this.agentsLoadPromise;
        } catch (error) {
            console.error("Could not load agents.json:", error);
            return [];
        }
    },
    
    // 保存智能体到本地存储
    saveAgents: function() {
        try {
            // 防止保存空数据
            if (!this.agents || !Array.isArray(this.agents)) {
                console.error("尝试保存无效的智能体数据");
                return false;
            }
            
            // 过滤掉无效智能体
            const validAgents = this.agents.filter(agent => agent && agent.id);
            if (validAgents.length === 0) {
                console.warn("没有有效的智能体可保存");
                return false;
            }
            
            // 设置一个全局引用
            window.agents = validAgents;
            
            // 序列化
            const agentsJson = JSON.stringify(validAgents);
            
            // 使用存储服务保存
            if (window.StorageService) {
                return window.StorageService.setItem('agents', agentsJson);
            } else {
                // 兼容模式
                localStorage.setItem('agents', agentsJson);
                return true;
            }
        } catch (error) {
            console.error("保存智能体失败:", error);
            return false;
        }
    },
    
    // 更新UI
    updateUI: function() {
        // 更新选择器
        this.loadAgentSelector();
        
        // 更新管理列表
        this.loadAgentList();
    },
    
    // 加载智能体选择器
    loadAgentSelector: function() {
        const agentSelector = document.getElementById('agent-selector');
        if (!agentSelector) return;
        
        // 清空现有选项
        agentSelector.innerHTML = '<option value="" disabled selected>请选择智能体</option>';
        
        // 添加智能体选项
        this.agents.forEach(agent => {
            const option = document.createElement('option');
            option.value = agent.id;
            option.textContent = agent.name;
            agentSelector.appendChild(option);
        });
    },
    
    // 加载智能体列表（管理员面板）
    loadAgentList: function() {
        const agentList = document.getElementById('agent-list');
        if (!agentList) return;
        
        agentList.innerHTML = '';
        
        this.agents.forEach(agent => {
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
                editBtn.onclick = () => {
                    // 🔧 修复：调用App的editAgent方法来显示编辑表单
                    if (window.App && window.App.editAgent) {
                        window.App.editAgent(agent.id);
                    } else {
                        // 兼容模式：直接调用editAgent函数
                        if (typeof editAgent === 'function') {
                            editAgent(agent.id);
                        }
                    }
                };
            }
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '删除';
            if (agent.isBuiltIn) {
                deleteBtn.disabled = true;
                deleteBtn.title = '内置智能体不可删除';
            } else {
                deleteBtn.onclick = () => {
                    // 🔧 修复：调用App的deleteAgent方法
                    if (window.App && window.App.deleteAgent) {
                        window.App.deleteAgent(agent.id);
                    } else {
                        // 兼容模式：直接调用本地deleteAgent方法
                        this.deleteAgent(agent.id);
                    }
                };
            }
            
            agentActions.appendChild(editBtn);
            agentActions.appendChild(deleteBtn);
            
            agentItem.appendChild(agentInfo);
            agentItem.appendChild(agentActions);
            
            agentList.appendChild(agentItem);
        });
    },
    
    // 选择智能体
    selectAgent: function(agentId) {
        this.currentAgent = this.agents.find(agent => agent.id === agentId);
        
        if (this.currentAgent) {
            // 隐藏横幅
            this.hidePlatformBanner();
            
            // 清空聊天界面，但不清除历史记录
            const chatContainer = document.getElementById('chat-container');
            if (chatContainer) {
                chatContainer.innerHTML = '';
            }
            
            // 如果没有这个智能体的聊天记录，初始化
            if (!window.messageHistories[this.currentAgent.id]) {
                window.messageHistories[this.currentAgent.id] = [];
            }
            
            // 显示欢迎消息
            if (this.currentAgent.welcomeMessage && window.messageHistories[this.currentAgent.id].length === 0) {
                if (window.MessageHandler) {
                    window.MessageHandler.displayMessage(this.currentAgent.name, 
                                                        this.currentAgent.welcomeMessage, 
                                                        'ai-message');
                } else if (typeof displayMessage === 'function') {
                    displayMessage(this.currentAgent.name, 
                                  this.currentAgent.welcomeMessage, 
                                  'ai-message');
                }
            }
            
            // 恢复聊天记录
            this.renderChatHistory();
            
            // 重新计算布局
            if (window.LayoutManager) {
                setTimeout(window.LayoutManager.adjustLayout, 200);
            }
            
            return this.currentAgent;
        }
        
        return null;
    },
    
    // 渲染聊天历史
    renderChatHistory: function() {
        if (!this.currentAgent || !window.messageHistories) return;
        
        const history = window.messageHistories[this.currentAgent.id] || [];
        
        // 限制显示的消息数量
        const MAX_DISPLAYED_MESSAGES = 50;
        const messagesToShow = history.length > MAX_DISPLAYED_MESSAGES 
            ? history.slice(-MAX_DISPLAYED_MESSAGES) 
            : history;
        
        if (messagesToShow.length === 0) return;
        
        // 如果有太多消息被省略，显示提示
        if (history.length > MAX_DISPLAYED_MESSAGES) {
            const omittedCount = history.length - MAX_DISPLAYED_MESSAGES;
            if (window.MessageHandler) {
                window.MessageHandler.displaySystemMessage(`已省略 ${omittedCount} 条较早的消息以提高性能`);
            } else if (typeof displayMessage === 'function') {
                displayMessage('提示', `已省略 ${omittedCount} 条较早的消息以提高性能`, 'system-message');
            }
        }
        
        // 渲染历史消息
        for (const message of messagesToShow) {
            if (message.role === 'user') {
                if (window.MessageHandler) {
                    window.MessageHandler.displayMessage('你', message.content, 'user-message', false);
                } else if (typeof displayMessage === 'function') {
                    displayMessage('你', message.content, 'user-message', false);
                }
            } else if (message.role === 'assistant') {
                if (window.MessageHandler) {
                    window.MessageHandler.displayAIMessage(this.currentAgent.name, message.content, false);
                } else if (typeof displayAIMessage === 'function') {
                    displayAIMessage(this.currentAgent.name, message.content, false);
                }
            }
        }
    },
    
    // 处理初始化错误
    handleInitError: function(error) {
        console.error("初始化失败:", error);
        
        // 显示错误消息
        if (window.MessageHandler) {
            window.MessageHandler.displaySystemMessage(`初始化智能体时出错: ${error.message}，正在尝试恢复...`);
        }
        
        // 尝试恢复
        try {
            // 恢复智能体数据
            if (window.StorageService) {
                const recoveredAgents = window.StorageService.recoverAgentsData();
                if (recoveredAgents && recoveredAgents.length > 0) {
                    this.agents = recoveredAgents;
                    console.log("通过增强恢复功能找回了", this.agents.length, "个智能体");
                    
                    if (window.MessageHandler) {
                        window.MessageHandler.displaySystemMessage(`已恢复 ${this.agents.length} 个智能体配置。`);
                    }
                } else {
                    // 创建恢复模式智能体
                    this.createRecoveryAgent();
                }
            } else {
                this.createRecoveryAgent();
            }
            
            // 更新UI
            this.updateUI();
        } catch (recoveryError) {
            console.error("恢复失败:", recoveryError);
            
            if (window.MessageHandler) {
                window.MessageHandler.displaySystemMessage('无法恢复任何智能体配置，请手动添加新智能体。');
            }
            
            // 创建空智能体列表
            this.agents = [];
            this.updateUI();
        }
    },
    
    // 创建恢复模式智能体
    createRecoveryAgent: function() {
        this.agents = [{
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
        }];
        
        console.log("创建了恢复模式智能体");
        
        if (window.MessageHandler) {
            window.MessageHandler.displaySystemMessage('无法恢复任何智能体配置，已创建一个恢复模式智能体。');
        }
    },
    
    // 设置自动保存
    setupAutoSave: function() {
        const isMobile = window.StorageService && window.StorageService.isMobileDevice;
        
        setInterval(() => {
            if (this.agents && this.agents.length > 0) {
                this.saveAgents();
            }
        }, isMobile ? 60000 : 300000); // 移动设备1分钟，桌面设备5分钟
    },
    
    // 添加智能体
    addAgent: function(agentData) {
        // 生成新ID
        const newId = agentData.id || 'custom-' + Date.now();
        
        const newAgent = {
            ...agentData,
            id: newId,
            isBuiltIn: false,
            source: 'local'
        };
        
        // 添加到列表
        this.agents.push(newAgent);
        
        // 保存更改
        this.saveAgents();
        
        // 更新UI
        this.updateUI();
        
        return newAgent;
    },
    
    // 编辑智能体
    editAgent: function(agentId) {
        const agent = this.agents.find(a => a.id === agentId);
        if (!agent) {
            console.error('未找到智能体:', agentId);
            return null;
        }
        
        if (agent.isBuiltIn) {
            if (window.MessageHandler) {
                window.MessageHandler.displaySystemMessage('内置智能体不可编辑。');
            }
            console.warn('尝试编辑内置智能体:', agent.name);
            return null;
        }
        
        return agent;
    },
    
    // 更新智能体
    updateAgent: function(agentId, agentData) {
        // 查找智能体
        const agentIndex = this.agents.findIndex(a => a.id === agentId);
        if (agentIndex === -1) return false;
        
        const agent = this.agents[agentIndex];
        
        // 内置智能体不可修改
        if (agent.isBuiltIn) {
            // 创建副本
            const editedBuiltIn = {
                ...agentData, 
                id: 'custom-' + Date.now(),
                source: 'local',
                isBuiltIn: false
            };
            
            this.agents.push(editedBuiltIn);
            
            if (window.MessageHandler) {
                window.MessageHandler.displaySystemMessage(`已创建内置智能体"${agentData.name}"的自定义副本。`);
            }
            
            // 保存和更新UI
            this.saveAgents();
            this.updateUI();
            
            return editedBuiltIn;
        } else {
            // 保留原始来源
            const originalSource = agent.source || 'local';
            this.agents[agentIndex] = {
                ...agentData,
                source: originalSource,
                isBuiltIn: false
            };
            
            // 保存和更新UI
            this.saveAgents();
            this.updateUI();
            
            return this.agents[agentIndex];
        }
    },
    
    // 删除智能体
    deleteAgent: function(agentId) {
        const agent = this.agents.find(a => a.id === agentId);
        if (!agent) {
            if (window.MessageHandler) {
                window.MessageHandler.displaySystemMessage('未找到要删除的智能体。');
            }
            return false;
        }
        
        // 内置智能体不可删除 (仅限真正的内置智能体)
        if (agent.isBuiltIn) {
            if (window.MessageHandler) {
                window.MessageHandler.displaySystemMessage('内置智能体不可删除。');
            }
            console.warn("尝试删除内置智能体:", agent.name);
            return false;
        }
        
        // 删除智能体
        this.agents = this.agents.filter(a => a.id !== agentId);
        
        // 保存更改
        this.saveAgents();
        
        // 更新UI
        this.updateUI();
        
        // 如果当前正在使用被删除的智能体，清空当前选择
        if (this.currentAgent && this.currentAgent.id === agentId) {
            this.currentAgent = null;
            
            const chatContainer = document.getElementById('chat-container');
            if (chatContainer) {
                chatContainer.innerHTML = '';
            }
            
            if (window.MessageHandler) {
                window.MessageHandler.displaySystemMessage('当前智能体已被删除，请选择其他智能体继续对话。');
            }
        }
        
        // 显示成功消息
        if (window.MessageHandler) {
            window.MessageHandler.displaySystemMessage(`智能体"${agent.name}"已被删除。`);
        }
        
        return true;
    },
    
    // 获取当前智能体
    getCurrentAgent: function() {
        return this.currentAgent;
    },
    
    // 获取所有智能体
    getAllAgents: function() {
        return this.agents;
    }
};

// 导出AgentService对象到全局作用域
window.AgentService = AgentService; 