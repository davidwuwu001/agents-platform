// api.js - API调用模块

// 调用API
async function callAPI(userMessage) {
    if (!window.currentAgent) {
        window.displayMessage('提示', '请先选择一个智能体', 'system-message');
        return;
    }
    
    // 预先显示AI回复的标记
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
    senderLabel.textContent = `${window.currentAgent.name}: `;
    
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
    const messages = [...window.messageHistories[window.currentAgent.id]];
    
    // 如果有系统提示词，添加到消息历史开头
    if (window.currentAgent.systemPrompt) {
        messages.unshift({ role: 'system', content: window.currentAgent.systemPrompt });
    }
    
    const requestData = {
        model: window.currentAgent.model,
        messages: messages,
        temperature: window.currentAgent.temperature,
        max_tokens: window.currentAgent.maxTokens,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        stream: true
    };
    
    try {
        // 创建请求的AbortController，设置30秒超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(window.currentAgent.apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${window.currentAgent.apiKey}`,
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
                            if (window.settings && window.settings.markdownEnabled) {
                                aiContent.innerHTML = marked.parse(fullResponse);
                                
                                // 根据设置决定是否应用代码高亮
                                if (window.settings.codeHighlightEnabled) {
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
            window.messageHistories[window.currentAgent.id].push({ role: 'assistant', content: fullResponse });
            window.saveMessageHistories();
            
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
                window.markdownToWord(fullResponse, suggestedFilename);
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
    
    window.displayMessage('错误', errorMessage, 'system-message');
    
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

// 检测是否为移动设备
function isMobileDevice() {
    return (window.innerWidth <= 768) || 
           (navigator.userAgent.match(/Android/i) ||
            navigator.userAgent.match(/webOS/i) ||
            navigator.userAgent.match(/iPhone/i) ||
            navigator.userAgent.match(/iPad/i) ||
            navigator.userAgent.match(/iPod/i) ||
            navigator.userAgent.match(/BlackBerry/i) ||
            navigator.userAgent.match(/Windows Phone/i));
}

// 导出模块
window.callAPI = callAPI;
window.handleAPIError = handleAPIError;
window.isMobileDevice = isMobileDevice; 