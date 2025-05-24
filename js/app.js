/**
 * app.js
 * 应用入口模块 - 负责初始化和协调各个服务模块
 */

// 应用对象
const App = {
    // 是否已初始化
    initialized: false,
    
    // DOM元素
    elements: {
        chatContainer: null,
        userInput: null,
        sendButton: null,
        clearButton: null,
        agentSelector: null,
        adminModeCheckbox: null,
        adminPanel: null,
        settingsButton: null,
        settingsPanel: null,
        settingsOverlay: null
    },
    
    // 初始化函数
    init: async function() {
        // 防止重复初始化
        if (this.initialized) {
            console.log("应用已初始化，跳过");
            return;
        }
        
        // 标记已初始化
        this.initialized = true;
        window.hasInitialized = true;
        console.log("初始化应用...");
        
        // 初始化缓存
        this.initCache();
        
        // 获取DOM元素
        this.getElements();
        
        // 初始化服务
        this.initServices();
        
        // 注册事件监听器
        this.registerEventListeners();
        
        console.log("应用初始化完成");
    },
    
    // 初始化全局缓存对象
    initCache: function() {
        // 清理可能存在的旧缓存数据，防止API密钥错误
        this.clearOldCache();
        
        // 全局缓存，用于存储共享数据
        window.cache = {
            agents: null,
            currentAgent: null,
            settings: null
        };
    },
    
    // 清理旧的缓存数据
    clearOldCache: function() {
        try {
            // 检查版本号，如果是旧版本则清除所有localStorage数据
            const currentVersion = "2025.01.24.1"; // 更新版本号
            const storedVersion = localStorage.getItem('app_version');
            
            if (storedVersion !== currentVersion) {
                console.log("检测到版本更新，清理旧缓存数据...");
                
                // 清除所有可能的旧数据
                const keysToRemove = [
                    'agents',
                    'currentAgent', 
                    'apiConfig',
                    'chatHistory',
                    'userSettings',
                    'agentData',
                    'apiKeys',
                    'selectedAgent'
                ];
                
                keysToRemove.forEach(key => {
                    localStorage.removeItem(key);
                    sessionStorage.removeItem(key);
                });
                
                // 更新版本号
                localStorage.setItem('app_version', currentVersion);
                console.log("缓存清理完成，版本已更新到:", currentVersion);
            }
        } catch (error) {
            console.warn("清理缓存时出错:", error);
        }
    },
    
    // 获取DOM元素
    getElements: function() {
        this.elements.chatContainer = document.getElementById('chat-container');
        this.elements.userInput = document.getElementById('user-input');
        this.elements.sendButton = document.getElementById('send-button');
        this.elements.clearButton = document.getElementById('clear-button');
        this.elements.agentSelector = document.getElementById('agent-selector');
        this.elements.adminModeCheckbox = document.getElementById('admin-mode');
        this.elements.adminPanel = document.getElementById('admin-panel');
        this.elements.settingsButton = document.getElementById('settings-button');
        this.elements.settingsPanel = document.getElementById('settings-panel');
        this.elements.settingsOverlay = document.getElementById('settings-overlay');
    },
    
    // 初始化各个服务模块
    initServices: async function() {
        try {
            console.log("初始化服务模块...");
            
            // 初始化布局管理器
            if (window.LayoutManager) {
                window.LayoutManager.init();
                console.log("布局管理器初始化完成");
            } else {
                console.warn("布局管理器不可用");
            }
            
            // 初始化存储服务
            if (window.StorageService) {
                window.StorageService.init();
                console.log("存储服务初始化完成");
            } else {
                console.warn("存储服务不可用");
            }
            
            // 初始化消息处理服务
            if (window.MessageHandler) {
                // MessageHandler 是静态的，不需要主动初始化
                console.log("消息处理服务就绪");
            } else {
                console.warn("消息处理服务不可用");
            }
            
            // 初始化聊天服务
            if (window.ChatService) {
                window.ChatService.init();
                console.log("聊天服务初始化完成");
            } else {
                console.warn("聊天服务不可用");
            }
            
            // 初始化智能体服务
            if (window.AgentService) {
                await window.AgentService.init();
                console.log("智能体服务初始化完成");
            } else {
                console.warn("智能体服务不可用");
                
                // 兼容模式 - 调用旧的初始化函数
                if (typeof initializeAgents === 'function') {
                    await initializeAgents();
                }
            }
            
            // 显示应用就绪
            if (window.MessageHandler) {
                window.MessageHandler.displaySystemMessage('应用初始化完成，请选择一个智能体开始对话');
            }
        } catch (error) {
            console.error("初始化服务失败:", error);
            
            // 显示错误消息
            if (window.MessageHandler) {
                window.MessageHandler.displaySystemMessage(`初始化服务失败: ${error.message}`);
            } else if (typeof displayMessage === 'function') {
                displayMessage('错误', `初始化服务失败: ${error.message}`, 'system-message');
            } else {
                alert(`初始化失败: ${error.message}`);
            }
        }
    },
    
    // 注册事件监听器
    registerEventListeners: function() {
        // 发送按钮点击事件
        if (this.elements.sendButton) {
            this.elements.sendButton.addEventListener('click', () => this.sendMessage());
        }

        // 输入框Enter键发送
        if (this.elements.userInput) {
            this.elements.userInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        // 智能体选择
        if (this.elements.agentSelector) {
            this.elements.agentSelector.addEventListener('change', () => this.selectAgent());
        }

        // 管理员模式切换
        if (this.elements.adminModeCheckbox) {
            this.elements.adminModeCheckbox.addEventListener('change', () => this.toggleAdminMode());
        }

        // 添加智能体按钮
        const addAgentBtn = document.getElementById('add-agent-btn');
        if (addAgentBtn) {
            addAgentBtn.addEventListener('click', () => this.addAgent());
        }

        // 取消表单按钮
        const cancelBtn = document.getElementById('cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.cancelForm());
        }

        // 保存智能体表单
        const agentForm = document.getElementById('agent-form');
        if (agentForm) {
            agentForm.addEventListener('submit', (e) => this.saveAgent(e));
        }

        // 清除聊天记录按钮
        if (this.elements.clearButton) {
            this.elements.clearButton.addEventListener('click', () => this.clearChatHistory());
        }

        // 设置按钮
        if (this.elements.settingsButton) {
            this.elements.settingsButton.addEventListener('click', () => this.toggleSettingsPanel());
        }

        // 关闭设置面板按钮
        const closeSettings = document.getElementById('close-settings');
        if (closeSettings) {
            closeSettings.addEventListener('click', () => this.closeSettingsPanel());
        }

        // 设置面板背景遮罩
        if (this.elements.settingsOverlay) {
            this.elements.settingsOverlay.addEventListener('click', () => this.closeSettingsPanel());
        }

        // 设置选项变更
        const markdownEnabled = document.getElementById('markdown-enabled');
        const codeHighlightEnabled = document.getElementById('code-highlight-enabled');
        
        if (markdownEnabled) {
            markdownEnabled.addEventListener('change', () => this.saveSettings());
        }
        
        if (codeHighlightEnabled) {
            codeHighlightEnabled.addEventListener('change', () => this.saveSettings());
        }
        
        // 汤仔助手按钮
        const tangzaiButton = document.getElementById('tangzai-button');
        if (tangzaiButton) {
            tangzaiButton.addEventListener('click', function() {
                window.location.href = 'tangzai.html';
            });
        }
        
        // 强制修复按钮
        const forceFixBtn = document.getElementById('force-fix-btn');
        if (forceFixBtn) {
            forceFixBtn.addEventListener('click', () => this.forceFixCache());
        }
    },
    
    // 发送消息
    sendMessage: async function() {
        const message = this.elements.userInput.value.trim();
        
        if (!message) {
            if (window.MessageHandler) {
                window.MessageHandler.displaySystemMessage('请输入消息');
            }
            return;
        }
        
        // 获取当前智能体
        const currentAgent = window.AgentService ? 
            window.AgentService.getCurrentAgent() : 
            window.currentAgent;
        
        if (!currentAgent) {
            if (window.MessageHandler) {
                window.MessageHandler.displaySystemMessage('请先选择一个智能体');
            }
            return;
        }
        
        // 清空输入框
        this.elements.userInput.value = '';
        
        // 发送消息
        if (window.ChatService) {
            await window.ChatService.sendMessage(message, currentAgent);
        } else {
            // 兼容模式 - 使用旧的发送函数
            if (typeof sendMessage === 'function') {
                sendMessage();
            }
        }
    },
    
    // 选择智能体
    selectAgent: function() {
        const agentId = this.elements.agentSelector.value;
        
        if (!agentId) return;
        
        if (window.AgentService) {
            window.AgentService.selectAgent(agentId);
        } else {
            // 兼容模式 - 使用旧的选择函数
            if (typeof selectAgent === 'function') {
                selectAgent();
            }
        }
    },
    
    // 切换管理员模式
    toggleAdminMode: function() {
        if (this.elements.adminModeCheckbox.checked) {
            this.elements.adminPanel.style.display = 'block';
            
            // 刷新智能体列表
            if (window.AgentService) {
                window.AgentService.loadAgentList();
            } else if (typeof loadAgentList === 'function') {
                loadAgentList();
            }
        } else {
            this.elements.adminPanel.style.display = 'none';
        }
    },
    
    // 添加智能体
    addAgent: function() {
        // 获取表单容器
        const formContainer = document.getElementById('agent-form-container');
        if (!formContainer) return;
        
        // 获取并设置表单标题
        const formTitle = document.getElementById('form-title');
        if (formTitle) {
            formTitle.textContent = '添加智能体';
        }
        
        // 重置表单
        const agentForm = document.getElementById('agent-form');
        if (agentForm) {
            agentForm.reset();
        }
        
        // 清空ID字段
        const agentIdField = document.getElementById('agent-id');
        if (agentIdField) {
            agentIdField.value = '';
        }
        
        // 显示表单
        formContainer.style.display = 'block';
    },
    
    // 编辑智能体
    editAgent: function(agentId) {
        if (window.AgentService) {
            const agent = window.AgentService.editAgent(agentId);
            
            if (agent) {
                // 获取表单容器
                const formContainer = document.getElementById('agent-form-container');
                if (!formContainer) return;
                
                // 获取并设置表单标题
                const formTitle = document.getElementById('form-title');
                if (formTitle) {
                    formTitle.textContent = '编辑智能体';
                }
                
                // 填充表单
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
                    const element = document.getElementById(field.id);
                    if (element) {
                        element.value = field.value;
                    }
                });
                
                // 显示表单
                formContainer.style.display = 'block';
            }
        } else if (typeof editAgent === 'function') {
            // 兼容模式
            editAgent(agentId);
        }
    },
    
    // 取消表单
    cancelForm: function() {
        const formContainer = document.getElementById('agent-form-container');
        if (formContainer) {
            formContainer.style.display = 'none';
        }
    },
    
    // 保存智能体
    saveAgent: function(e) {
        e.preventDefault();
        
        const agentId = document.getElementById('agent-id').value;
        const isEditing = Boolean(agentId);
        
        // 收集表单数据
        const agentData = {
            id: agentId || '',
            name: document.getElementById('agent-name').value,
            apiUrl: document.getElementById('api-url').value,
            apiKey: document.getElementById('api-key').value,
            model: document.getElementById('model').value,
            systemPrompt: document.getElementById('system-prompt').value,
            temperature: parseFloat(document.getElementById('temperature').value),
            maxTokens: parseInt(document.getElementById('max-tokens').value),
            welcomeMessage: document.getElementById('welcome-message') ? 
                document.getElementById('welcome-message').value : 
                '直接输入问题，我会回答。'
        };
        
        // 保存智能体
        if (window.AgentService) {
            if (isEditing) {
                const updatedAgent = window.AgentService.updateAgent(agentId, agentData);
                
                // 如果成功且当前没有选择智能体，自动选择这个智能体
                if (updatedAgent && this.elements.agentSelector && (!window.AgentService.currentAgent || window.AgentService.currentAgent.id === agentId)) {
                    this.elements.agentSelector.value = updatedAgent.id;
                    this.selectAgent();
                }
            } else {
                const newAgent = window.AgentService.addAgent(agentData);
                
                // 如果成功，自动选择新创建的智能体
                if (newAgent && this.elements.agentSelector) {
                    this.elements.agentSelector.value = newAgent.id;
                    this.selectAgent();
                }
            }
        } else if (typeof saveAgent === 'function') {
            // 兼容模式
            saveAgent(e);
        }
        
        // 关闭表单
        this.cancelForm();
    },
    
    // 删除智能体
    deleteAgent: function(agentId) {
        if (window.AgentService) {
            if (confirm(`确定要删除这个智能体吗？`)) {
                window.AgentService.deleteAgent(agentId);
            }
        } else if (typeof deleteAgent === 'function') {
            // 兼容模式
            deleteAgent(agentId);
        }
    },
    
    // 清除聊天历史
    clearChatHistory: function() {
        // 获取当前智能体
        const currentAgent = window.AgentService ? 
            window.AgentService.getCurrentAgent() : 
            window.currentAgent;
        
        if (!currentAgent) {
            if (window.MessageHandler) {
                window.MessageHandler.displaySystemMessage('请先选择一个智能体');
            }
            return;
        }
        
        // 确认对话框
        if (confirm(`确定要清除当前智能体的聊天记录吗？`)) {
            // 清空聊天界面
            if (this.elements.chatContainer) {
                this.elements.chatContainer.innerHTML = '';
            }
            
            // 清除历史记录
            if (window.ChatService) {
                window.ChatService.clearAgentHistory(currentAgent.id);
            } else if (typeof clearChatHistory === 'function') {
                // 兼容模式
                clearChatHistory();
                return;
            } else {
                // 最简单的兼容模式
                if (window.messageHistories && window.messageHistories[currentAgent.id]) {
                    window.messageHistories[currentAgent.id] = [];
                    
                    // 尝试保存
                    if (typeof saveMessageHistories === 'function') {
                        saveMessageHistories();
                    }
                }
            }
            
            // 显示提示
            if (window.MessageHandler) {
                window.MessageHandler.displaySystemMessage('聊天记录已清除');
            }
            
            // 如果有欢迎消息，重新显示
            if (currentAgent.welcomeMessage) {
                if (window.MessageHandler) {
                    window.MessageHandler.displayMessage(currentAgent.name, 
                                                        currentAgent.welcomeMessage, 
                                                        'ai-message');
                }
            }
            
            // 隐藏平台介绍横幅
            if (window.AgentService) {
                window.AgentService.hidePlatformBanner();
            } else {
                const platformBanner = document.querySelector('.platform-banner');
                if (platformBanner) {
                    platformBanner.style.display = 'none';
                }
            }
            
            // 调整布局
            if (window.LayoutManager) {
                setTimeout(window.LayoutManager.adjustLayout, 200);
            }
        }
    },
    
    // 显示/隐藏设置面板
    toggleSettingsPanel: function() {
        if (this.elements.settingsPanel) {
            this.elements.settingsPanel.style.display = 
                this.elements.settingsPanel.style.display === 'block' ? 'none' : 'block';
            
            if (this.elements.settingsOverlay) {
                this.elements.settingsOverlay.style.display = this.elements.settingsPanel.style.display;
            }
        }
    },
    
    // 关闭设置面板
    closeSettingsPanel: function() {
        if (this.elements.settingsPanel) {
            this.elements.settingsPanel.style.display = 'none';
        }
        
        if (this.elements.settingsOverlay) {
            this.elements.settingsOverlay.style.display = 'none';
        }
    },
    
    // 保存设置
    saveSettings: function() {
        const markdownEnabled = document.getElementById('markdown-enabled');
        const codeHighlightEnabled = document.getElementById('code-highlight-enabled');
        
        const settings = {
            markdownEnabled: markdownEnabled ? markdownEnabled.checked : true,
            codeHighlightEnabled: codeHighlightEnabled ? codeHighlightEnabled.checked : true
        };
        
        // 保存设置
        try {
            localStorage.setItem('settings', JSON.stringify(settings));
            console.log("设置已保存");
        } catch (e) {
            console.error("保存设置失败:", e);
        }
        
        // 更新缓存
        window.cache.settings = settings;
    },
    
    // 强制修复缓存
    forceFixCache: function() {
        const forceFixBtn = document.getElementById('force-fix-btn');
        
        // 显示确认对话框
        const confirmed = confirm(`🔧 强制修复功能\n\n即将执行以下操作：\n\n✓ 清除所有本地存储数据\n✓ 清除所有会话数据\n✓ 重置应用到初始状态\n✓ 强制刷新页面\n\n这将解决所有缓存相关的问题，但会丢失以下数据：\n• 聊天历史记录\n• 用户偏好设置\n• 临时保存的智能体配置\n\n确定要继续吗？`);
        
        if (!confirmed) {
            return;
        }
        
        try {
            // 禁用按钮并显示加载状态
            if (forceFixBtn) {
                forceFixBtn.disabled = true;
                forceFixBtn.innerHTML = '<span class="force-fix-loading"></span>修复中...';
            }
            
            console.log("开始强制修复缓存...");
            
            // 1. 清除所有localStorage数据
            const localStorageKeys = Object.keys(localStorage);
            localStorageKeys.forEach(key => {
                try {
                    localStorage.removeItem(key);
                    console.log(`已清除localStorage: ${key}`);
                } catch (e) {
                    console.warn(`清除localStorage失败: ${key}`, e);
                }
            });
            
            // 2. 清除所有sessionStorage数据
            const sessionStorageKeys = Object.keys(sessionStorage);
            sessionStorageKeys.forEach(key => {
                try {
                    sessionStorage.removeItem(key);
                    console.log(`已清除sessionStorage: ${key}`);
                } catch (e) {
                    console.warn(`清除sessionStorage失败: ${key}`, e);
                }
            });
            
            // 3. 清除全局缓存对象
            if (window.cache) {
                window.cache = {
                    agents: null,
                    currentAgent: null,
                    settings: null
                };
            }
            
            // 4. 清除可能的全局变量
            const globalVarsToReset = [
                'currentAgent',
                'messageHistories', 
                'agents',
                'selectedAgentId',
                'apiConfig'
            ];
            
            globalVarsToReset.forEach(varName => {
                if (window[varName]) {
                    window[varName] = null;
                    console.log(`已重置全局变量: ${varName}`);
                }
            });
            
            console.log("强制修复完成，即将刷新页面...");
            
            // 5. 显示成功消息
            alert("🎉 强制修复完成！\n\n已清除所有缓存数据，页面即将自动刷新。\n\n刷新后请重新选择智能体开始使用。");
            
            // 6. 延迟一秒后强制刷新页面（绕过缓存）
            setTimeout(() => {
                // 使用 location.reload(true) 强制从服务器重新加载
                window.location.reload(true);
            }, 1000);
            
        } catch (error) {
            console.error("强制修复过程中出错:", error);
            
            // 恢复按钮状态
            if (forceFixBtn) {
                forceFixBtn.disabled = false;
                forceFixBtn.innerHTML = '立即修复';
            }
            
            alert(`❌ 强制修复失败\n\n错误信息: ${error.message}\n\n请尝试手动清除浏览器缓存或联系技术支持。`);
        }
    }
};

// 当页面加载完成后初始化应用
window.addEventListener('load', function() {
    // 初始化应用
    App.init().catch(error => {
        console.error("应用初始化失败:", error);
    });
});

// 导出App对象到全局作用域
window.App = App; 