// agents.js - 智能体管理模块

// 全局引用，确保模块间可以共享
let agents = []; // 所有可用智能体列表
let currentAgent = null; // 当前选中的智能体
let messageHistories = {}; // 存储对话历史

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

// 加载智能体选择器
function loadAgentSelector() {
    // 清空现有选项
    const agentSelector = document.getElementById('agent-selector');
    if (!agentSelector) return;
    
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
    const agentList = document.getElementById('agent-list');
    if (!agentList) return;
    
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
            const chatContainer = document.getElementById('chat-container');
            if (chatContainer) {
                chatContainer.innerHTML = '';
                displayMessage('提示', '当前智能体已被删除，请选择其他智能体继续对话。', 'system-message');
            }
        }
        
        // 显示成功消息
        displayMessage('提示', `智能体"${agent.name}"已被删除。`, 'system-message');
    }
}

// 添加新智能体
function addAgent() {
    // 重置表单
    const agentForm = document.getElementById('agent-form');
    if (!agentForm) return;
    
    agentForm.reset();
    document.getElementById('agent-id').value = '';
    
    // 显示表单
    const formTitle = document.getElementById('form-title');
    const agentFormContainer = document.getElementById('agent-form-container');
    
    if (formTitle) formTitle.textContent = '添加智能体';
    if (agentFormContainer) agentFormContainer.style.display = 'block';
}

// 取消编辑/添加
function cancelForm() {
    const agentFormContainer = document.getElementById('agent-form-container');
    if (agentFormContainer) agentFormContainer.style.display = 'none';
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
    const agentSelector = document.getElementById('agent-selector');
    if (agentSelector) {
        agentSelector.value = newAgentData.id;
        selectAgent();
    }
    
    // 关闭表单
    cancelForm();
    
    // 显示成功消息
    displayMessage('提示', `智能体"${newAgentData.name}"已保存，并将永久保存在本地。`, 'system-message');
}

// 选择智能体
function selectAgent() {
    const agentSelector = document.getElementById('agent-selector');
    const chatContainer = document.getElementById('chat-container');
    
    if (!agentSelector || !chatContainer) return;
    
    const agentId = agentSelector.value;
    currentAgent = agents.find(agent => agent.id === agentId);
    
    if (currentAgent) {
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
    }
}

// 导出模块
window.agents = agents;
window.currentAgent = currentAgent;
window.messageHistories = messageHistories;
window.initializeAgents = initializeAgents;
window.loadAgentSelector = loadAgentSelector;
window.loadAgentList = loadAgentList;
window.editAgent = editAgent;
window.deleteAgent = deleteAgent;
window.addAgent = addAgent;
window.cancelForm = cancelForm;
window.saveAgent = saveAgent;
window.selectAgent = selectAgent; 