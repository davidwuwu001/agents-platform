/**
 * chat-service.js
 * 聊天服务模块 - 负责聊天历史管理和消息交互
 */

// 聊天服务对象
const ChatService = {
    // 存储对话历史 - 以智能体ID为键
    messageHistories: {},
    
    // 初始化
    init: function() {
        this.loadMessageHistories();
        
        // 设置定期保存
        setInterval(() => this.saveMessageHistories(), 60000); // 每分钟保存一次
        
        return this.messageHistories;
    },
    
    // 加载聊天记录
    loadMessageHistories: function() {
        try {
            let saved = null;
            
            // 使用StorageService加载
            if (window.StorageService) {
                saved = window.StorageService.getItem('messageHistories');
            } else {
                // 兼容模式
                saved = localStorage.getItem('messageHistories');
            }
            
            if (saved) {
                try {
                    this.messageHistories = JSON.parse(saved);
                    console.log("成功加载聊天记录");
                    
                    // 设置全局引用以便兼容性
                    window.messageHistories = this.messageHistories;
                } catch (parseError) {
                    console.error("聊天记录解析失败:", parseError);
                    this.messageHistories = {};
                    window.messageHistories = {};
                }
            } else {
                console.log("未找到聊天记录，使用空对象");
                this.messageHistories = {};
                window.messageHistories = {};
            }
        } catch (error) {
            console.error("加载聊天记录出错:", error);
            this.messageHistories = {};
            window.messageHistories = {};
        }
    },
    
    // 保存聊天记录
    saveMessageHistories: function() {
        try {
            const historyString = JSON.stringify(this.messageHistories);
            
            // 使用StorageService保存
            if (window.StorageService) {
                const result = window.StorageService.setItem('messageHistories', historyString);
                
                if (!result) {
                    console.warn("聊天记录保存可能失败，尝试清理后重新保存");
                    this.pruneMessageHistories();
                    window.StorageService.setItem('messageHistories', JSON.stringify(this.messageHistories));
                }
            } else {
                // 兼容模式
                try {
                    localStorage.setItem('messageHistories', historyString);
                } catch (e) {
                    console.warn("聊天记录保存失败，尝试清理后重新保存");
                    this.pruneMessageHistories();
                    localStorage.setItem('messageHistories', JSON.stringify(this.messageHistories));
                }
            }
        } catch (error) {
            console.error("保存聊天记录出错:", error);
            
            // 如果存储空间不足，清理一些旧消息
            if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                this.pruneMessageHistories();
                try {
                    if (window.StorageService) {
                        window.StorageService.setItem('messageHistories', JSON.stringify(this.messageHistories));
                    } else {
                        localStorage.setItem('messageHistories', JSON.stringify(this.messageHistories));
                    }
                } catch (e) {
                    console.error("即使清理后仍无法保存聊天记录:", e);
                }
            }
        }
    },
    
    // 清理过长的聊天记录以节省空间
    pruneMessageHistories: function() {
        const MAX_MESSAGES_PER_AGENT = 50;
        
        for (const agentId in this.messageHistories) {
            if (this.messageHistories[agentId].length > MAX_MESSAGES_PER_AGENT) {
                // 保留最近的消息
                this.messageHistories[agentId] = this.messageHistories[agentId].slice(-MAX_MESSAGES_PER_AGENT);
            }
        }
        
        // 更新全局引用
        window.messageHistories = this.messageHistories;
    },
    
    // 添加用户消息
    addUserMessage: function(agentId, message) {
        if (!agentId) {
            console.error("没有指定智能体ID");
            return false;
        }
        
        // 初始化历史记录（如果不存在）
        if (!this.messageHistories[agentId]) {
            this.messageHistories[agentId] = [];
        }
        
        // 添加消息
        this.messageHistories[agentId].push({ role: 'user', content: message });
        
        // 更新全局引用
        window.messageHistories = this.messageHistories;
        
        // 保存到本地存储
        this.saveMessageHistories();
        
        return true;
    },
    
    // 添加AI回复
    addAIMessage: function(agentId, message) {
        if (!agentId) {
            console.error("没有指定智能体ID");
            return false;
        }
        
        // 初始化历史记录（如果不存在）
        if (!this.messageHistories[agentId]) {
            this.messageHistories[agentId] = [];
        }
        
        // 添加消息
        this.messageHistories[agentId].push({ role: 'assistant', content: message });
        
        // 更新全局引用
        window.messageHistories = this.messageHistories;
        
        // 保存到本地存储
        this.saveMessageHistories();
        
        return true;
    },
    
    // 获取智能体的聊天历史
    getAgentHistory: function(agentId) {
        return this.messageHistories[agentId] || [];
    },
    
    // 清除智能体的聊天历史
    clearAgentHistory: function(agentId) {
        if (this.messageHistories[agentId]) {
            this.messageHistories[agentId] = [];
            
            // 更新全局引用
            window.messageHistories = this.messageHistories;
            
            // 保存到本地存储
            this.saveMessageHistories();
            return true;
        }
        return false;
    },
    
    // 发送消息到API并处理响应
    sendMessage: async function(message, currentAgent) {
        if (!message || !currentAgent) {
            if (window.MessageHandler) {
                window.MessageHandler.displaySystemMessage(!currentAgent ? '请先选择一个智能体' : '请输入消息');
            }
            return false;
        }
        
        // 显示用户消息
        if (window.MessageHandler) {
            window.MessageHandler.displayMessage('你', message, 'user-message');
        } else if (typeof displayMessage === 'function') {
            displayMessage('你', message, 'user-message');
        }
        
        // 添加到消息历史
        this.addUserMessage(currentAgent.id, message);
        
        // 预创建AI消息元素
        const chatContainer = document.getElementById('chat-container');
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
        if (chatContainer) {
            chatContainer.appendChild(aiMessageElement);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
        
        // 调用API
        if (window.ApiService) {
            try {
                await window.ApiService.callAI(
                    currentAgent, 
                    message,
                    // 接收数据块回调
                    (content) => {
                        // 更新内容
                        this.updateAIMessageContent(aiContent, content);
                        
                        // 滚动到底部
                        if (chatContainer) {
                            chatContainer.scrollTop = chatContainer.scrollHeight;
                        }
                    },
                    // 完成回调
                    (finalContent) => {
                        // 添加到消息历史
                        this.addAIMessage(currentAgent.id, finalContent);
                        
                        // 添加复制和导出按钮
                        this.addMessageControls(aiContent, finalContent);
                        
                        // 确保滚动到底部
                        if (chatContainer) {
                            chatContainer.scrollTop = chatContainer.scrollHeight;
                        }
                    },
                    // 错误回调
                    (error) => {
                        // 移除预创建的AI消息元素
                        if (chatContainer && chatContainer.contains(aiMessageElement)) {
                            chatContainer.removeChild(aiMessageElement);
                        }
                        
                        // 处理错误
                        if (window.ApiService.handleError) {
                            window.ApiService.handleError(error);
                        } else {
                            console.error("API调用失败:", error);
                            
                            if (window.MessageHandler) {
                                window.MessageHandler.displaySystemMessage(`API调用失败: ${error.message || '未知错误'}`);
                            }
                        }
                    }
                );
                
                return true;
            } catch (error) {
                console.error("发送消息时出错:", error);
                
                // 移除预创建的AI消息元素
                if (chatContainer && chatContainer.contains(aiMessageElement)) {
                    chatContainer.removeChild(aiMessageElement);
                }
                
                return false;
            }
        } else {
            // 如果没有ApiService，使用旧的callAPI函数
            if (typeof callAPI === 'function') {
                callAPI(message);
                return true;
            } else {
                console.error("API服务不可用");
                
                // 移除预创建的AI消息元素
                if (chatContainer && chatContainer.contains(aiMessageElement)) {
                    chatContainer.removeChild(aiMessageElement);
                }
                
                if (window.MessageHandler) {
                    window.MessageHandler.displaySystemMessage("API服务不可用，无法发送消息");
                }
                
                return false;
            }
        }
    },
    
    // 更新AI消息内容（根据设置使用Markdown）
    updateAIMessageContent: function(contentElement, message) {
        // 根据设置决定是否使用Markdown渲染
        const settings = this.getSettings();
        
        if (settings.markdownEnabled) {
            contentElement.innerHTML = marked.parse(message);
            
            // 根据设置决定是否应用代码高亮
            if (settings.codeHighlightEnabled) {
                contentElement.querySelectorAll('pre code').forEach((block) => {
                    hljs.highlightElement(block);
                });
            }
        } else {
            // 纯文本显示，保留换行
            contentElement.textContent = message;
        }
    },
    
    // 获取设置
    getSettings: function() {
        try {
            return JSON.parse(localStorage.getItem('settings')) || {
                markdownEnabled: true,
                codeHighlightEnabled: true
            };
        } catch (e) {
            return {
                markdownEnabled: true,
                codeHighlightEnabled: true
            };
        }
    },
    
    // 添加消息控制按钮（复制和导出）
    addMessageControls: function(contentElement, message) {
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
                console.error("导出服务不可用");
                
                if (window.MessageHandler) {
                    window.MessageHandler.displaySystemMessage("导出服务不可用，无法导出Word文档");
                }
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
        
        // 将Word导出按钮添加到内容元素
        contentElement.appendChild(wordBtn);
        contentElement.appendChild(copyBtn);
        
        // 清理可能因为浮动按钮导致的布局问题
        const clearer = document.createElement('div');
        clearer.style.clear = 'both';
        contentElement.appendChild(clearer);
    }
};

// 导出对象到全局作用域
window.ChatService = ChatService; 