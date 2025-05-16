// chat.js - 聊天功能模块

// 加载聊天记录
function loadMessageHistories() {
    try {
        const saved = StorageUtil.getItem('messageHistories');
        if (saved) {
            try {
                window.messageHistories = JSON.parse(saved);
                console.log("成功加载聊天记录");
            } catch (parseError) {
                console.error("聊天记录解析失败:", parseError);
                window.messageHistories = {};
            }
        } else {
            console.log("未找到聊天记录，使用空对象");
            window.messageHistories = {};
        }
    } catch (error) {
        console.error("加载聊天记录出错:", error);
        window.messageHistories = {};
    }
}

// 保存聊天记录
function saveMessageHistories() {
    try {
        const historyString = JSON.stringify(window.messageHistories);
        const result = StorageUtil.setItem('messageHistories', historyString);
        
        if (!result) {
            console.warn("聊天记录保存可能失败，尝试清理后重新保存");
            pruneMessageHistories();
            StorageUtil.setItem('messageHistories', JSON.stringify(window.messageHistories));
        }
    } catch (error) {
        console.error("保存聊天记录出错:", error);
        
        // 如果消息太多导致存储失败，可以考虑清理一些旧消息
        if (error.name === 'QuotaExceededError') {
            pruneMessageHistories();
            try {
                StorageUtil.setItem('messageHistories', JSON.stringify(window.messageHistories));
            } catch (e) {
                console.error("即使清理后仍无法保存聊天记录:", e);
            }
        }
    }
}

// 清理过长的聊天记录以节省空间
function pruneMessageHistories() {
    const MAX_MESSAGES_PER_AGENT = 50;
    
    for (const agentId in window.messageHistories) {
        if (window.messageHistories[agentId].length > MAX_MESSAGES_PER_AGENT) {
            // 保留最近的消息
            window.messageHistories[agentId] = window.messageHistories[agentId].slice(-MAX_MESSAGES_PER_AGENT);
        }
    }
}

// 渲染聊天历史
function renderChatHistory() {
    if (!window.currentAgent) return;
    
    const chatContainer = document.getElementById('chat-container');
    if (!chatContainer) return;
    
    const history = window.messageHistories[window.currentAgent.id] || [];
    
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
            displayAIMessage(window.currentAgent.name, message.content, false);
        }
    }
}

// 显示消息
function displayMessage(sender, message, className, saveToHistory = true) {
    const chatContainer = document.getElementById('chat-container');
    if (!chatContainer) return;
    
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
        if (saveToHistory && window.currentAgent) {
            if (!window.messageHistories[window.currentAgent.id]) {
                window.messageHistories[window.currentAgent.id] = [];
            }
            window.messageHistories[window.currentAgent.id].push({ role: 'user', content: message });
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

// 显示AI消息的特殊函数 (包含导出Word按钮)
function displayAIMessage(sender, message, saveToHistory = true) {
    const chatContainer = document.getElementById('chat-container');
    if (!chatContainer) return;
    
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
    if (window.settings && window.settings.markdownEnabled) {
        aiContent.innerHTML = marked.parse(message);
        
        // 根据设置决定是否应用代码高亮
        if (window.settings.codeHighlightEnabled) {
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
        window.markdownToWord(message, suggestedFilename);
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
    if (saveToHistory && window.currentAgent) {
        if (!window.messageHistories[window.currentAgent.id]) {
            window.messageHistories[window.currentAgent.id] = [];
        }
        window.messageHistories[window.currentAgent.id].push({ role: 'assistant', content: message });
        saveMessageHistories();
    }
}

// 发送消息
function sendMessage() {
    const userInput = document.getElementById('user-input');
    if (!userInput) return;
    
    const message = userInput.value.trim();
    if (!message) return;
    
    if (!window.currentAgent) {
        displayMessage('提示', '请先选择一个智能体', 'system-message');
        return;
    }
    
    // 显示用户消息
    displayMessage('你', message, 'user-message');
    
    // 添加到消息历史
    if (!window.messageHistories[window.currentAgent.id]) {
        window.messageHistories[window.currentAgent.id] = [];
    }
    window.messageHistories[window.currentAgent.id].push({ role: 'user', content: message });
    saveMessageHistories();
    
    // 清空输入框
    userInput.value = '';
    
    // 调用API
    window.callAPI(message);
}

// 清除当前智能体的聊天记录
function clearChatHistory() {
    if (!window.currentAgent) {
        displayMessage('提示', '请先选择一个智能体', 'system-message');
        return;
    }
    
    // 弹出确认对话框
    if (confirm('确定要清除当前智能体的聊天记录吗？')) {
        const chatContainer = document.getElementById('chat-container');
        if (!chatContainer) return;
        
        // 清空界面
        chatContainer.innerHTML = '';
        
        // 清空当前智能体的历史记录
        window.messageHistories[window.currentAgent.id] = [];
        saveMessageHistories();
        
        // 显示提示
        displayMessage('提示', '聊天记录已清除', 'system-message');
        
        // 重新显示欢迎消息
        if (window.currentAgent.welcomeMessage) {
            displayMessage(window.currentAgent.name, window.currentAgent.welcomeMessage, 'ai-message');
        }
    }
}

// 导出模块
window.loadMessageHistories = loadMessageHistories;
window.saveMessageHistories = saveMessageHistories;
window.pruneMessageHistories = pruneMessageHistories;
window.renderChatHistory = renderChatHistory;
window.displayMessage = displayMessage;
window.displayAIMessage = displayAIMessage;
window.sendMessage = sendMessage;
window.clearChatHistory = clearChatHistory; 