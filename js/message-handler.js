/**
 * message-handler.js
 * 消息处理模块 - 负责所有消息的显示与处理
 */

// 消息处理对象
const MessageHandler = {
    // 初始化
    init: function() {
        // 获取聊天容器
        this.chatContainer = document.getElementById('chat-container');
        
        // 加载设置
        this.loadSettings();
        
        console.log("消息处理模块已初始化");
    },
    
    // 加载设置
    loadSettings: function() {
        try {
            this.settings = JSON.parse(localStorage.getItem('settings')) || {
                markdownEnabled: true,
                codeHighlightEnabled: true
            };
        } catch (e) {
            console.warn("加载设置失败，使用默认设置", e);
            this.settings = {
                markdownEnabled: true,
                codeHighlightEnabled: true
            };
        }
    },
    
    // 显示系统消息
    displaySystemMessage: function(message) {
        return this.displayMessage('系统提示', message, 'system-message', false);
    },
    
    // 显示普通消息
    displayMessage: function(sender, message, className, saveToHistory = true) {
        if (!this.chatContainer) {
            this.chatContainer = document.getElementById('chat-container');
            if (!this.chatContainer) {
                console.error("找不到聊天容器元素");
                return false;
            }
        }
        
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
            if (saveToHistory && window.AgentService && window.AgentService.currentAgent) {
                if (window.ChatService) {
                    window.ChatService.addUserMessage(window.AgentService.currentAgent.id, message);
                } else if (window.messageHistories && window.currentAgent) {
                    // 兼容模式
                    if (!window.messageHistories[window.currentAgent.id]) {
                        window.messageHistories[window.currentAgent.id] = [];
                    }
                    window.messageHistories[window.currentAgent.id].push({ role: 'user', content: message });
                    if (typeof saveMessageHistories === 'function') {
                        saveMessageHistories();
                    }
                }
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
        
        this.chatContainer.appendChild(messageElement);
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
        
        return true;
    },
    
    // 显示AI消息（支持Markdown和代码高亮）
    displayAIMessage: function(sender, message, saveToHistory = true) {
        if (!this.chatContainer) {
            this.chatContainer = document.getElementById('chat-container');
            if (!this.chatContainer) {
                console.error("找不到聊天容器元素");
                return false;
            }
        }
        
        // 加载最新设置
        this.loadSettings();
        
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
        if (this.settings.markdownEnabled) {
            aiContent.innerHTML = marked.parse(message);
            
            // 根据设置决定是否应用代码高亮
            if (this.settings.codeHighlightEnabled) {
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
            } else if (typeof markdownToWord === 'function') {
                markdownToWord(message, suggestedFilename);
            } else {
                console.error('找不到Word导出功能');
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
        this.chatContainer.appendChild(aiMessageElement);
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
        
        // 保存到历史记录
        if (saveToHistory) {
            if (window.ChatService && window.AgentService && window.AgentService.currentAgent) {
                window.ChatService.addAIMessage(window.AgentService.currentAgent.id, message);
            } else if (window.messageHistories && window.currentAgent) {
                // 兼容模式
                if (!window.messageHistories[window.currentAgent.id]) {
                    window.messageHistories[window.currentAgent.id] = [];
                }
                window.messageHistories[window.currentAgent.id].push({ role: 'assistant', content: message });
                if (typeof saveMessageHistories === 'function') {
                    saveMessageHistories();
                }
            }
        }
        
        return true;
    }
};

// 暴露给全局作用域
window.MessageHandler = MessageHandler; 