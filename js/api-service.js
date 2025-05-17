/**
 * api-service.js
 * API服务模块 - 负责所有API调用和响应处理
 */

// API服务对象
const ApiService = {
    // 调用AI服务
    callAI: async function(agent, userMessage, onChunkReceived, onComplete, onError) {
        if (!agent) {
            if (typeof onError === 'function') {
                onError({ message: '没有选择智能体' });
            }
            return;
        }
        
        // 初始化响应文本
        let fullResponse = '';
        
        try {
            // 准备消息历史
            const messages = window.messageHistories && window.messageHistories[agent.id] 
                ? [...window.messageHistories[agent.id]] 
                : [{ role: 'user', content: userMessage }];
            
            // 添加系统提示词（如果有）
            if (agent.systemPrompt) {
                messages.unshift({ role: 'system', content: agent.systemPrompt });
            }
            
            // 准备请求数据
            const requestData = {
                model: agent.model,
                messages: messages,
                temperature: agent.temperature,
                max_tokens: agent.maxTokens,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0,
                stream: true
            };
            
            // 创建请求的AbortController，设置30秒超时
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            
            // 发起请求
            const response = await fetch(agent.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${agent.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData),
                signal: controller.signal
            });
            
            // 清除超时
            clearTimeout(timeoutId);
            
            // 处理错误响应
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw {
                    response: {
                        status: response.status,
                        message: errorData.error?.message || `HTTP错误: ${response.status}`
                    }
                };
            }
            
            // 处理流式响应
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            // 读取响应流
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
                                
                                // 回调通知新内容
                                if (typeof onChunkReceived === 'function') {
                                    onChunkReceived(fullResponse);
                                }
                            }
                        } catch (error) {
                            // JSON解析错误，忽略
                            console.log('JSON解析错误，忽略:', error);
                        }
                    }
                }
            }
            
            // 完成回调
            if (typeof onComplete === 'function' && fullResponse) {
                onComplete(fullResponse);
            } else if (fullResponse === '' && typeof onError === 'function') {
                onError({ message: "AI返回了空响应，请重试" });
            }
            
            return fullResponse;
        } catch (error) {
            console.error('API调用出错:', error);
            
            // 错误处理
            if (typeof onError === 'function') {
                onError(error);
            }
            
            return null;
        }
    },
    
    // 处理API错误
    handleError: function(error) {
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
                
                if (error.response.message) {
                    errorMessage += ` - ${error.response.message}`;
                }
            }
        } else if (error.request) {
            // 请求已发送，但没有收到响应
            errorMessage = '未收到API响应，请检查网络连接或API地址';
        } else if (error.message) {
            errorMessage = `调用AI服务出错: ${error.message}`;
        }
        
        // 显示错误消息
        if (window.MessageHandler) {
            window.MessageHandler.displaySystemMessage(errorMessage);
        } else {
            console.error(errorMessage);
            
            // 兼容模式
            if (typeof displayMessage === 'function') {
                displayMessage('错误', errorMessage, 'system-message');
            }
        }
        
        // 在移动设备上提供额外的错误反馈
        this.provideMobileErrorFeedback(errorMessage);
        
        return errorMessage;
    },
    
    // 在移动设备上提供额外的错误反馈
    provideMobileErrorFeedback: function(errorMessage) {
        const isMobile = typeof isMobileDevice === 'function' ? 
            isMobileDevice() : 
            (window.LayoutManager ? window.LayoutManager.isMobileDevice() : 
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
            
        if (isMobile) {
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
                if (document.body.contains(errorElement)) {
                    document.body.removeChild(errorElement);
                }
            }, 3000);
        }
    }
};

// 导出ApiService对象到全局作用域
window.ApiService = ApiService; 