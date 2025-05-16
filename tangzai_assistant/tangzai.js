// 汤仔助手 - 知识库服务实现
document.addEventListener('DOMContentLoaded', function() {
    // DOM元素
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const clearButton = document.getElementById('clear-button');
    const settingsButton = document.getElementById('settings-button');
    const settingsPanel = document.getElementById('settings-panel');
    const settingsOverlay = document.getElementById('settings-overlay');
    const closeSettingsButton = document.getElementById('close-settings');
    const saveSettingsButton = document.getElementById('save-settings');
    const apiKeyInput = document.getElementById('api-key-input');
    const serviceIdInput = document.getElementById('service-id-input');
    const streamEnabledToggle = document.getElementById('stream-enabled');
    const markdownEnabledToggle = document.getElementById('markdown-enabled');

    // 聊天历史记录
    let chatHistory = [];
    
    // 默认设置
    const defaultSettings = {
        apiKey: '', // 默认为空，需要用户在设置中填写
        serviceId: '', // 默认为空，需要用户在设置中填写
        apiDomain: 'api-knowledgebase.mlp.cn-beijing.volces.com', // 火山引擎知识库API域名
        corsProxy: 'https://cors-anywhere.herokuapp.com/', // 默认CORS代理
        streamEnabled: true,
        markdownEnabled: true
    };
    
    // 当前设置
    let currentSettings = JSON.parse(localStorage.getItem('tangzaiSettings')) || defaultSettings;
    
    // 初始化设置表单
    function initSettings() {
        apiKeyInput.value = currentSettings.apiKey || '';
        serviceIdInput.value = currentSettings.serviceId || '';
        
        // 如果设置面板中存在API域名输入框，则填充值
        const apiDomainInput = document.getElementById('api-domain-input');
        if (apiDomainInput) {
            apiDomainInput.value = currentSettings.apiDomain || defaultSettings.apiDomain;
        } else {
            console.warn('未找到API域名输入框');
        }
        
        // 如果设置面板中存在CORS代理输入框，则填充值
        const corsProxyInput = document.getElementById('cors-proxy-input');
        if (corsProxyInput) {
            corsProxyInput.value = currentSettings.corsProxy || defaultSettings.corsProxy;
        }
        
        streamEnabledToggle.checked = currentSettings.streamEnabled;
        markdownEnabledToggle.checked = currentSettings.markdownEnabled;
    }
    
    // 保存设置
    function saveSettings() {
        // 获取API域名输入框的值
        const apiDomainInput = document.getElementById('api-domain-input');
        const apiDomain = apiDomainInput ? apiDomainInput.value.trim() : currentSettings.apiDomain;
        
        // 获取CORS代理输入框的值
        const corsProxyInput = document.getElementById('cors-proxy-input');
        const corsProxy = corsProxyInput ? corsProxyInput.value.trim() : currentSettings.corsProxy;
        
        currentSettings = {
            apiKey: apiKeyInput.value.trim(),
            serviceId: serviceIdInput.value.trim(),
            apiDomain: apiDomain, // 保存API域名
            corsProxy: corsProxy, // 保存CORS代理URL
            streamEnabled: streamEnabledToggle.checked,
            markdownEnabled: markdownEnabledToggle.checked
        };
        
        localStorage.setItem('tangzaiSettings', JSON.stringify(currentSettings));
        closeSettings();
        showSystemMessage('设置已保存');
        
        // 测试新的设置是否能成功连接
        setTimeout(testConnection, 1000);
    }
    
    // 打开设置面板
    function openSettings() {
        settingsPanel.style.display = 'block';
        settingsOverlay.style.display = 'block';
        initSettings();
    }
    
    // 关闭设置面板
    function closeSettings() {
        settingsPanel.style.display = 'none';
        settingsOverlay.style.display = 'none';
    }
    
    // 添加用户消息到聊天界面
    function addUserMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message user-message';
        messageElement.textContent = message;
        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        // 添加到聊天历史
        chatHistory.push({ role: 'user', content: message });
        saveChatHistory();
    }
    
    // 添加AI消息到聊天界面
    function addAIMessage(message, isStreaming = false) {
        // 如果是流式消息，查找是否已有一个正在流式更新的消息元素
        let messageElement;
        if (isStreaming) {
            messageElement = document.querySelector('.ai-message.streaming');
            
            if (!messageElement) {
                messageElement = document.createElement('div');
                messageElement.className = 'message ai-message streaming';
                chatContainer.appendChild(messageElement);
            }
        } else {
            messageElement = document.createElement('div');
            messageElement.className = 'message ai-message';
            chatContainer.appendChild(messageElement);
            
            // 添加到聊天历史
            chatHistory.push({ role: 'assistant', content: message });
            saveChatHistory();
        }
        
        // 根据是否启用Markdown来渲染内容
        if (currentSettings.markdownEnabled) {
            // 使用marked.js解析Markdown
            messageElement.innerHTML = marked.parse(message);
            
            // 如果启用了代码高亮，初始化highlight.js
            document.querySelectorAll('.ai-message pre code').forEach((block) => {
                hljs.highlightBlock(block);
            });
        } else {
            messageElement.textContent = message;
        }
        
        // 如果是流式消息，添加光标效果
        if (isStreaming) {
            const cursor = document.createElement('span');
            cursor.className = 'streaming-cursor';
            messageElement.appendChild(cursor);
        } else {
            // 移除streaming类
            messageElement.classList.remove('streaming');
        }
        
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    // 添加系统消息到聊天界面
    function showSystemMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message system-message';
        messageElement.textContent = message;
        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    // 保存聊天历史到本地存储
    function saveChatHistory() {
        localStorage.setItem('tangzaiChatHistory', JSON.stringify(chatHistory));
    }
    
    // 从本地存储加载聊天历史
    function loadChatHistory() {
        const savedHistory = localStorage.getItem('tangzaiChatHistory');
        if (savedHistory) {
            try {
                chatHistory = JSON.parse(savedHistory);
                
                // 渲染历史消息
                chatHistory.forEach(msg => {
                    if (msg.role === 'user') {
                        const messageElement = document.createElement('div');
                        messageElement.className = 'message user-message';
                        messageElement.textContent = msg.content;
                        chatContainer.appendChild(messageElement);
                    } else if (msg.role === 'assistant') {
                        const messageElement = document.createElement('div');
                        messageElement.className = 'message ai-message';
                        
                        if (currentSettings.markdownEnabled) {
                            messageElement.innerHTML = marked.parse(msg.content);
                        } else {
                            messageElement.textContent = msg.content;
                        }
                        
                        chatContainer.appendChild(messageElement);
                    }
                });
                
                chatContainer.scrollTop = chatContainer.scrollHeight;
            } catch (e) {
                console.error('Failed to load chat history:', e);
                chatHistory = [];
            }
        }
    }
    
    // 清除聊天历史
    function clearChat() {
        chatContainer.innerHTML = '';
        chatHistory = [];
        localStorage.removeItem('tangzaiChatHistory');
        showSystemMessage('聊天记录已清除');
    }
    
    // 使用非流式API调用知识库服务
    async function callKnowledgeBaseAPI(query) {
        if (!currentSettings.apiKey || !currentSettings.serviceId) {
            showSystemMessage('请先在设置中配置API密钥和服务ID');
            return;
        }
        
        try {
            showSystemMessage('正在查询知识库...');
            
            // 构建请求参数（根据火山引擎知识库API格式）
            const requestData = {
                service_resource_id: currentSettings.serviceId,
                stream: false,
                messages: [
                    {
                        role: "user",
                        content: query
                    }
                ]
            };
            
            // 构建历史消息
            if (chatHistory.length > 1) {
                // 清空默认消息，只使用历史聊天记录
                requestData.messages = [];
                
                // 只取最近的10条消息(5轮对话)，避免上下文过长
                const recentHistory = chatHistory.slice(-10);
                
                recentHistory.forEach(msg => {
                    requestData.messages.push({
                        role: msg.role,
                        content: msg.content
                    });
                });
            }
            
            // 使用CORS代理服务器解决跨域问题
            // 这里使用CORS Anywhere公共代理演示，实际使用时请替换为您自己的代理服务器
            const corsProxy = currentSettings.corsProxy || defaultSettings.corsProxy;
            // 使用用户设置的 API 域名
            const apiDomain = currentSettings.apiDomain || defaultSettings.apiDomain;
            const targetUrl = `https://${apiDomain}/api/knowledge/service/chat`;
            const response = await fetch(`${corsProxy}${targetUrl}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentSettings.apiKey}`,
                    // 添加CORS代理所需的来源头部
                    'Origin': window.location.origin,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                throw new Error(`服务器响应错误: ${response.status}`);
            }
            
            const responseData = await response.json();
            
            // 火山引擎知识库API返回格式处理
            if (responseData.code !== 0) {
                throw new Error(`API错误: ${responseData.message}`);
            }
            
            // 添加AI回复到聊天界面（使用生成的答案）
            const answer = responseData.data.generated_answer || '抱歉，知识库中没有找到相关信息。';
            addAIMessage(answer);
            
        } catch (error) {
            console.error('API调用失败:', error);
            
            // 提供更详细的错误信息
            let errorMessage = `请求失败: ${error.message}`;
            
            // 检测是否是CORS错误
            if (error.message.includes('Failed to fetch') || 
                error.message.includes('NetworkError') || 
                error.message.includes('CORS') || 
                error.message.includes('Access-Control')) {
                
                errorMessage = '跨域请求被阻止，无法连接到知识库API。请联系您的系统管理员部署代理服务器或添加CORS头部。';
                showSystemMessage(errorMessage);
                
                // 提供额外的建议方案
                showSystemMessage('解决方案：1. 使用代理服务器 2. 配置服务器允许跨域 3. 使用浏览器插件如CORS Unblock');
            } else if (error.message.includes('401') || error.message.includes('403')) {
                errorMessage = 'API密钥无效或没有权限访问此资源。请检查您的API密钥设置。';
                showSystemMessage(errorMessage);
            } else {
                showSystemMessage(errorMessage);
            }
            
            // 移除流式消息占位符
            const streamingMsg = document.querySelector('.ai-message.streaming');
            if (streamingMsg) {
                streamingMsg.remove();
            }
        }
    }
    
    // 使用流式API调用知识库服务
    async function callKnowledgeBaseStreamAPI(query) {
        if (!currentSettings.apiKey || !currentSettings.serviceId) {
            showSystemMessage('请先在设置中配置API密钥和服务ID');
            return;
        }
        
        try {
            showSystemMessage('正在查询知识库...');
            
            // 构建请求参数（根据火山引擎知识库API格式）
            const requestData = {
                service_resource_id: currentSettings.serviceId,
                stream: true,
                messages: [
                    {
                        role: "user",
                        content: query
                    }
                ]
            };
            
            // 构建历史消息
            if (chatHistory.length > 1) {
                // 清空默认消息，只使用历史聊天记录
                requestData.messages = [];
                
                // 只取最近的10条消息(5轮对话)，避免上下文过长
                const recentHistory = chatHistory.slice(-10);
                
                recentHistory.forEach(msg => {
                    requestData.messages.push({
                        role: msg.role,
                        content: msg.content
                    });
                });
            }
            
            // 创建一个空的AI消息用于流式更新
            addAIMessage('', true);
            let accumulatedResponse = '';
            
            // 使用CORS代理服务器解决跨域问题
            // 这里使用CORS Anywhere公共代理演示，实际使用时请替换为您自己的代理服务器
            const corsProxy = currentSettings.corsProxy || defaultSettings.corsProxy;
            // 使用用户设置的 API 域名
            const apiDomain = currentSettings.apiDomain || defaultSettings.apiDomain;
            const targetUrl = `https://${apiDomain}/api/knowledge/service/chat`;
            const response = await fetch(`${corsProxy}${targetUrl}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentSettings.apiKey}`,
                    // 添加CORS代理所需的来源头部
                    'Origin': window.location.origin,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                throw new Error(`服务器响应错误: ${response.status}`);
            }
            
            // 处理流式响应
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    break;
                }
                
                // 解码响应数据
                const chunk = decoder.decode(value, { stream: true });
                
                // 处理SSE格式数据
                const lines = chunk.split('\n\n');
                
                for (const line of lines) {
                    if (line.startsWith('data:') && line.length > 5) {
                        try {
                            const content = line.substring(5);
                            const data = JSON.parse(content);
                            
                            // 适配火山引擎知识库API的流式响应结构
                            if (data.code === 0 && data.data && data.data.generated_answer) {
                                const newText = data.data.generated_answer;
                                accumulatedResponse = newText;
                                addAIMessage(accumulatedResponse, true);
                                
                                // 检查是否有end标志
                                if (data.data.end === true) {
                                    // 最后一次更新，去掉streaming标记
                                    addAIMessage(accumulatedResponse, false);
                                }
                            }
                        } catch (e) {
                            console.error('解析流式数据出错:', e);
                        }
                    }
                }
            }
            
            // 确保最后有一个完整的消息添加到历史
            if (accumulatedResponse) {
                // 如果有有效响应，确保在聊天历史中有一个完整的回复
                chatHistory.push({ role: 'assistant', content: accumulatedResponse });
                saveChatHistory();
            } else {
                // 如果没有有效响应，显示错误消息
                showSystemMessage('未收到有效的回复');
                
                // 移除流式消息占位符
                const streamingMsg = document.querySelector('.ai-message.streaming');
                if (streamingMsg) {
                    streamingMsg.remove();
                }
            }
            
        } catch (error) {
            console.error('API调用失败:', error);
            
            // 提供更详细的错误信息
            let errorMessage = `请求失败: ${error.message}`;
            
            // 检测是否是CORS错误
            if (error.message.includes('Failed to fetch') || 
                error.message.includes('NetworkError') || 
                error.message.includes('CORS') || 
                error.message.includes('Access-Control')) {
                
                errorMessage = '跨域请求被阻止，无法连接到知识库API。请联系您的系统管理员部署代理服务器或添加CORS头部。';
                showSystemMessage(errorMessage);
                
                // 提供额外的建议方案
                showSystemMessage('解决方案：1. 使用代理服务器 2. 配置服务器允许跨域 3. 使用浏览器插件如CORS Unblock');
            } else if (error.message.includes('401') || error.message.includes('403')) {
                errorMessage = 'API密钥无效或没有权限访问此资源。请检查您的API密钥设置。';
                showSystemMessage(errorMessage);
            } else {
                showSystemMessage(errorMessage);
            }
            
            // 移除流式消息占位符
            const streamingMsg = document.querySelector('.ai-message.streaming');
            if (streamingMsg) {
                streamingMsg.remove();
            }
        }
    }
    
    // 发送消息处理函数
    function sendMessage() {
        const message = userInput.value.trim();
        
        if (message.length === 0) {
            return;
        }
        
        // 添加用户消息到界面
        addUserMessage(message);
        
        // 清空输入框
        userInput.value = '';
        
        // 根据设置选择调用普通API或流式API
        if (currentSettings.streamEnabled) {
            callKnowledgeBaseStreamAPI(message);
        } else {
            callKnowledgeBaseAPI(message);
        }
    }
    
    // 事件监听器
    sendButton.addEventListener('click', sendMessage);
    
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    clearButton.addEventListener('click', clearChat);
    
    settingsButton.addEventListener('click', openSettings);
    closeSettingsButton.addEventListener('click', closeSettings);
    settingsOverlay.addEventListener('click', closeSettings);
    saveSettingsButton.addEventListener('click', saveSettings);
    
    // 添加测试连接按钮事件监听
    const testConnectionButton = document.getElementById('test-connection');
    if (testConnectionButton) {
        testConnectionButton.addEventListener('click', testConnection);
    }
    
    // 初始化
    initSettings();
    loadChatHistory();
    
    // 显示欢迎消息
    if (chatHistory.length === 0) {
        showSystemMessage('欢迎使用汤仔知识库助手！请在下方输入您的问题。');
        showSystemMessage('本助手需连接到火山引擎知识库API服务。请点击设置按钮，配置您的API密钥和服务资源ID。');
        showSystemMessage('API服务地址已默认设置为: api-knowledgebase.mlp.cn-beijing.volces.com');
        showSystemMessage('提示：如果遇到CORS跨域问题，请在设置中配置CORS代理。');
    }
    
    // 添加测试代理连接功能
    async function testConnection() {
        if (!currentSettings.apiKey || !currentSettings.serviceId) {
            showSystemMessage('请先在设置中配置API密钥和服务ID');
            return;
        }
        
        try {
            showSystemMessage('正在测试API连接...');
            
            const corsProxy = currentSettings.corsProxy || defaultSettings.corsProxy;
            const apiDomain = currentSettings.apiDomain || defaultSettings.apiDomain;
            const targetUrl = `https://${apiDomain}/api/knowledge/service/chat`;
            
            const response = await fetch(`${corsProxy}${targetUrl}`, {
                method: 'HEAD',
                headers: {
                    'Authorization': `Bearer ${currentSettings.apiKey}`,
                    'Origin': window.location.origin,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (response.ok || response.status === 405) {
                // 405表示Method Not Allowed，但说明服务器是可达的
                showSystemMessage('✅ 连接测试成功！API服务器可以访问。');
                return true;
            } else {
                showSystemMessage(`❌ 连接测试失败。服务器返回状态码: ${response.status}`);
                return false;
            }
        } catch (error) {
            console.error('连接测试失败:', error);
            
            if (error.message.includes('Failed to fetch') || 
                error.message.includes('NetworkError') || 
                error.message.includes('CORS') || 
                error.message.includes('Access-Control')) {
                showSystemMessage('❌ 连接测试失败: 跨域请求被阻止，无法连接到知识库API。');
                showSystemMessage('建议：1. 检查代理服务器URL 2. 尝试不同的代理服务 3. 联系API提供方添加CORS支持');
            } else {
                showSystemMessage(`❌ 连接测试失败: ${error.message}`);
            }
            
            return false;
        }
    }
});