// DOM 元素
const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const agentSelector = document.getElementById('agent-selector');
const adminModeCheckbox = document.getElementById('admin-mode');
const adminPanel = document.getElementById('admin-panel');
const agentList = document.getElementById('agent-list');
const addAgentBtn = document.getElementById('add-agent-btn');
const agentFormContainer = document.getElementById('agent-form-container');
const agentForm = document.getElementById('agent-form');
const cancelBtn = document.getElementById('cancel-btn');
const formTitle = document.getElementById('form-title');

// 存储对话历史
let messageHistory = [];

// 当前选中的智能体
let currentAgent = null;

// 所有可用智能体列表
let agents = [];

// 从agents.json加载智能体列表
async function loadAgentsFromJSON() {
    try {
        const response = await fetch('agents.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Could not load agents.json:", error);
        displayMessage('系统', `无法加载智能体配置文件: ${error.message}`, 'system-message');
        return [];
    }
}

// 初始化智能体列表，首先尝试从agents.json加载，如果失败则使用本地存储的默认配置
async function initializeAgents() {
    try {
        const agentsFromJSON = await loadAgentsFromJSON();
        
        // 如果成功加载了agents.json，转换格式并使用它
        if (agentsFromJSON && agentsFromJSON.length > 0) {
            agents = agentsFromJSON.map(agent => ({
                id: agent.id,
                name: agent.name,
                apiUrl: agent.apiUrl,
                apiKey: agent.apiKeyVariableName,
                model: agent.model,
                systemPrompt: agent.systemPrompt || '',
                temperature: agent.temperature || 0.7,
                maxTokens: agent.max_tokens || 2048
            }));
            console.log("Loaded agents from JSON:", agents);
        } else {
            // 如果无法从JSON加载，从localStorage加载或使用默认配置
            agents = JSON.parse(localStorage.getItem('agents')) || [
                {
                    id: '1',
                    name: '默认智能体',
                    apiUrl: 'https://aihubmix.com/v1/chat/completions',
                    apiKey: 'sk-tHOx8uUaar3ob9x69e6323DaD2B6497b90E56077B2FcC96b',
                    model: 'gemini-2.0-flash',
                    systemPrompt: '',
                    temperature: 0.8,
                    maxTokens: 1024
                }
            ];
        }
        
        // 加载选择器和列表
        loadAgentSelector();
        loadAgentList();
        
        // 显示欢迎消息
        displayMessage('系统', '欢迎使用智能体聚合平台！请选择一个智能体开始对话。', 'system-message');
    } catch (error) {
        console.error("Error initializing agents:", error);
        displayMessage('系统', `初始化智能体时出错: ${error.message}`, 'system-message');
    }
}

// 保存智能体配置到本地存储
function saveAgents() {
    localStorage.setItem('agents', JSON.stringify(agents));
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
        agentInfo.textContent = agent.name;
        
        const agentActions = document.createElement('div');
        agentActions.className = 'agent-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.textContent = '编辑';
        editBtn.onclick = () => editAgent(agent.id);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '删除';
        deleteBtn.onclick = () => deleteAgent(agent.id);
        
        agentActions.appendChild(editBtn);
        agentActions.appendChild(deleteBtn);
        
        agentItem.appendChild(agentInfo);
        agentItem.appendChild(agentActions);
        
        agentList.appendChild(agentItem);
    });
}

// 编辑智能体
function editAgent(agentId) {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;
    
    // 填充表单
    document.getElementById('agent-id').value = agent.id;
    document.getElementById('agent-name').value = agent.name;
    document.getElementById('api-url').value = agent.apiUrl;
    document.getElementById('api-key').value = agent.apiKey;
    document.getElementById('model').value = agent.model;
    document.getElementById('system-prompt').value = agent.systemPrompt || '';
    document.getElementById('temperature').value = agent.temperature;
    document.getElementById('max-tokens').value = agent.maxTokens;
    
    // 显示表单
    formTitle.textContent = '编辑智能体';
    agentFormContainer.style.display = 'block';
}

// 删除智能体
function deleteAgent(agentId) {
    if (confirm('确定要删除此智能体吗？')) {
        agents = agents.filter(agent => agent.id !== agentId);
        saveAgents();
        loadAgentList();
        loadAgentSelector();
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
    const newAgent = {
        id: agentId || Date.now().toString(),
        name: document.getElementById('agent-name').value,
        apiUrl: document.getElementById('api-url').value,
        apiKey: document.getElementById('api-key').value,
        model: document.getElementById('model').value,
        systemPrompt: document.getElementById('system-prompt').value,
        temperature: parseFloat(document.getElementById('temperature').value),
        maxTokens: parseInt(document.getElementById('max-tokens').value)
    };
    
    if (agentId) {
        // 编辑现有智能体
        const index = agents.findIndex(a => a.id === agentId);
        if (index !== -1) {
            agents[index] = newAgent;
        }
    } else {
        // 添加新智能体
        agents.push(newAgent);
    }
    
    saveAgents();
    loadAgentList();
    loadAgentSelector();
    cancelForm();
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
    
    // 清空聊天记录
    chatContainer.innerHTML = '';
    messageHistory = [];
    
    if (currentAgent) {
        displayMessage('系统', `已选择智能体：${currentAgent.name}`, 'system-message');
    }
}

// 发送消息
function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    
    if (!currentAgent) {
        displayMessage('系统', '请先选择一个智能体', 'system-message');
        return;
    }
    
    // 显示用户消息
    displayMessage('你', message, 'user-message');
    
    // 添加到消息历史
    messageHistory.push({ role: 'user', content: message });
    
    // 清空输入框
    userInput.value = '';
    
    // 调用API
    callAPI(message);
}

// 调用API
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
    
    const messages = [...messageHistory];
    
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
        const response = await fetch(currentAgent.apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentAgent.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
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
                    }
                }
            }
        }
        
        // 添加到消息历史
        if (fullResponse) {
            messageHistory.push({ role: 'assistant', content: fullResponse });
            
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
            
            // 将复制按钮添加到 aiContent 元素的末尾
            aiContent.appendChild(copyBtn);
            // 清理可能因为浮动按钮导致的布局问题
            const clearer = document.createElement('div');
            clearer.style.clear = 'both';
            aiContent.appendChild(clearer);
            
            // 确保滚动到底部以显示按钮
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
        
    } catch (error) {
        displayMessage('系统', `API调用失败: ${error.message}`, 'system-message');
    }
    
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// 显示消息
function displayMessage(sender, message, className) {
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

// 事件监听器
sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
agentSelector.addEventListener('change', selectAgent);
adminModeCheckbox.addEventListener('change', toggleAdminMode);
addAgentBtn.addEventListener('click', addAgent);
cancelBtn.addEventListener('click', cancelForm);
agentForm.addEventListener('submit', saveAgent);
settingsButton.addEventListener('click', toggleSettingsPanel);
closeSettings.addEventListener('click', closeSettingsPanel);
settingsOverlay.addEventListener('click', closeSettingsPanel);
markdownEnabled.addEventListener('change', saveSettings);
codeHighlightEnabled.addEventListener('change', saveSettings);

// 初始化页面
initializeAgents(); 