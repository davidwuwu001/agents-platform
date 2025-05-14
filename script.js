document.addEventListener('DOMContentLoaded', () => {
    const chatbox = document.getElementById('chatbox');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const adminModeCheckbox = document.getElementById('adminMode');
    const adminSettings = document.getElementById('adminSettings');
    // const apiKeyInput = document.getElementById('apiKey'); // 不再需要
    const modelSelect = document.getElementById('modelSelector');
    // const saveConfigButton = document.getElementById('saveConfig'); // 不再需要
    const currentModelNameDisplay = document.getElementById('currentModelNameDisplay');

    let messages = [];
    let availableAgents = [];
    let currentAgentConfig = null;

    async function loadAgentsConfig() {
        try {
            const response = await fetch('agents.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}. Failed to load agents.json.`);
            }
            availableAgents = await response.json();
            if (!Array.isArray(availableAgents) || availableAgents.length === 0) {
                console.error("agents.json is not a valid array or is empty.");
                chatbox.innerHTML += `<div class="message bot-message error-message"><p>错误：智能体配置文件 (agents.json) 内容无效或为空。</p></div>`;
                currentModelNameDisplay.textContent = "配置错误";
                return;
            }
            populateAgentSelector();

            const savedAgentId = localStorage.getItem('selectedAgentId');
            let initialAgentId = null;
            if (savedAgentId && availableAgents.find(agent => agent.id === savedAgentId)) {
                initialAgentId = savedAgentId;
            } else if (availableAgents.length > 0) {
                initialAgentId = availableAgents[0].id;
            }

            if (initialAgentId) {
                modelSelect.value = initialAgentId;
                handleAgentSelectionChange(); // 会触发加载第一个 agent 的配置
            } else {
                 chatbox.innerHTML += `<div class="message bot-message"><p>提示：没有可用的智能体配置。请检查 agents.json 并确保至少有一个配置项。</p></div>`;
                 currentModelNameDisplay.textContent = "无可用智能体";
            }

        } catch (error) {
            console.error("Could not load or parse agents configuration:", error);
            chatbox.innerHTML += `<div class="message bot-message error-message"><p>错误：无法加载或解析智能体配置文件 (agents.json)。详情请查看控制台 (F12)。<br>${error.message}</p></div>`;
            currentModelNameDisplay.textContent = "配置加载失败";
        }
    }

    function populateAgentSelector() {
        modelSelect.innerHTML = ''; // 清空现有选项
        if (availableAgents.length === 0) {
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "未找到智能体";
            modelSelect.appendChild(option);
            modelSelect.disabled = true; // 禁用下拉框
            return;
        }
        modelSelect.disabled = false;
        availableAgents.forEach(agent => {
            const option = document.createElement('option');
            option.value = agent.id;
            option.textContent = agent.name;
            modelSelect.appendChild(option);
        });
    }

    function handleAgentSelectionChange() {
        const selectedAgentId = modelSelect.value;
        currentAgentConfig = availableAgents.find(agent => agent.id === selectedAgentId);

        if (currentAgentConfig) {
            // API Key 现在直接从 currentAgentConfig.apiKeyVariableName 读取，不再需要从 localStorage 或 input 获取
            currentModelNameDisplay.textContent = currentAgentConfig.name;
            messages = []; // 清空聊天记录
            // 更新欢迎语，可以包含一些配置信息用于调试
            let welcomeMsg = `已切换到：${currentAgentConfig.name}。你好！有什么可以帮你的吗？`;
            let paramsInfo = [];
            if (currentAgentConfig.temperature !== undefined) paramsInfo.push(`Temp: ${currentAgentConfig.temperature}`);
            if (currentAgentConfig.max_tokens !== undefined) paramsInfo.push(`MaxTokens: ${currentAgentConfig.max_tokens}`);
            if (paramsInfo.length > 0) welcomeMsg += ` (${paramsInfo.join(', ')})`;
            chatbox.innerHTML = `<div class="message bot-message"><p>${welcomeMsg}</p></div>`;

            localStorage.setItem('selectedAgentId', currentAgentConfig.id); // 保存用户选择，以便下次打开时默认选中

            // 检查 API Key 是否在 agents.json 中配置了
            if (!currentAgentConfig.apiKeyVariableName || currentAgentConfig.apiKeyVariableName.trim() === "" || currentAgentConfig.apiKeyVariableName.startsWith("YOUR_ACTUAL_API_KEY")) {
                 appendMessageToChatbox(`警告：智能体 "${currentAgentConfig.name}" 的 API 密钥似乎未在 agents.json 中正确配置。请检查文件。`, 'bot-message error-message');
            }

        } else {
            console.warn("No agent config found for ID:", selectedAgentId);
            currentModelNameDisplay.textContent = "选择智能体";
            // apiKeyInput.value = ''; // 不再需要
        }
    }

    function toggleAdminMode() {
        if (adminModeCheckbox.checked) {
            adminSettings.style.display = 'block';
            // 当打开管理员模式时，如果当前没有选中的智能体 (比如首次加载)，则默认选中列表中的第一个
            if (!modelSelect.value && availableAgents.length > 0) {
                modelSelect.value = availableAgents[0].id;
                handleAgentSelectionChange();
            }
        } else {
            adminSettings.style.display = 'none';
        }
    }

    // saveConfigButton 的事件监听器不再需要，可以删除
    // saveConfigButton.addEventListener('click', () => { ... });

    async function callAPI(userInputText) {
        if (!currentAgentConfig) {
            appendMessageToChatbox('错误：未选择有效的智能体。请在管理员模式下选择一个。', 'bot-message error-message');
            return;
        }

        // 直接从配置中获取 API Key
        const apiKey = currentAgentConfig.apiKeyVariableName;

        if (!apiKey || apiKey.trim() === "" || apiKey.startsWith("YOUR_ACTUAL_API_KEY")) {
            appendMessageToChatbox(`错误：智能体 "${currentAgentConfig.name}" 的 API 密钥未在 agents.json 文件中配置或配置不正确。请检查配置文件。`, 'bot-message error-message');
            return;
        }

        messages.push({ role: "user", content: userInputText });
        appendMessageToChatbox(userInputText, 'user-message');
        userInput.value = '';
        userInput.disabled = true;
        sendButton.disabled = true;
        appendMessageToChatbox('思考中...', 'bot-message thinking');

        let effectiveApiUrl = currentAgentConfig.apiUrl;
        const headers = { 'Content-Type': 'application/json' };

        // 根据 API URL 格式决定如何传递 API Key
        if (currentAgentConfig.apiUrl.includes('googleapis.com')) { // Gemini API
            effectiveApiUrl += `?key=${apiKey}`;
        } else if (currentAgentConfig.apiUrl.includes('api.deepseek.com') || currentAgentConfig.apiUrl.includes('api.openai.com')) { // OpenAI-like APIs
            headers['Authorization'] = `Bearer ${apiKey}`;
        } else { // 默认为 Bearer token，如果以后有其他类型的API，可能需要调整
            headers['Authorization'] = `Bearer ${apiKey}`;
            console.warn("Uncertain API type for key handling, defaulting to Bearer token. API URL:", currentAgentConfig.apiUrl);
        }
        
        const systemMessage = {
            role: "system",
            content: currentAgentConfig.systemPrompt || "你是一个乐于助人的AI助手。"
        };
        
        // 确保 messages 数组不会无限增长，这里可以根据需要设定一个历史消息的上限
        // 例如，只保留最近的 N 条消息，或者总 token 数不超过一定限制
        // 简单的实现：只取最后几条对话，加上系统消息
        const maxHistoryMessages = 10; // 保留最近10条消息 (5轮对话)
        const recentMessages = messages.slice(-maxHistoryMessages);
        const messagesForAPI = [systemMessage, ...recentMessages];


        const requestBody = {
            model: currentAgentConfig.model,
            messages: messagesForAPI,
            stream: true
        };

        if (currentAgentConfig.apiUrl.includes('googleapis.com')) {
            requestBody.generationConfig = {};
            if (typeof currentAgentConfig.temperature !== 'undefined') {
                requestBody.generationConfig.temperature = currentAgentConfig.temperature;
            }
            if (typeof currentAgentConfig.max_tokens !== 'undefined') {
                requestBody.generationConfig.maxOutputTokens = currentAgentConfig.max_tokens;
            }
        } else {
            if (typeof currentAgentConfig.temperature !== 'undefined') {
                requestBody.temperature = currentAgentConfig.temperature;
            }
            if (typeof currentAgentConfig.max_tokens !== 'undefined') {
                requestBody.max_tokens = currentAgentConfig.max_tokens;
            }
        }

        try {
            const response = await fetch(effectiveApiUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text(); // 获取原始错误文本
                let errorMessage = `API请求失败: ${response.status} - ${response.statusText}`;
                try {
                    const errorData = JSON.parse(errorText); // 尝试解析为JSON
                    if (errorData.error && errorData.error.message) {
                        errorMessage += `\n错误详情: ${errorData.error.message}`;
                    } else if (errorData.message) {
                         errorMessage += `\n错误详情: ${errorData.message}`;
                    } else {
                        errorMessage += `\n原始响应: ${errorText.substring(0, 200)}`; // 显示部分原始响应
                    }
                } catch (e) {
                     errorMessage += `\n无法解析错误响应: ${errorText.substring(0, 200)}`;
                }
                throw new Error(errorMessage);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let botMessageDiv = document.querySelector('.bot-message.thinking');
            if (botMessageDiv) {
                botMessageDiv.classList.remove('thinking');
                botMessageDiv.innerHTML = '<p></p>'; // 清空 "思考中..."
            } else {
                // 如果没有 thinking 消息，则创建一个新的 div
                botMessageDiv = appendMessageToChatbox('', 'bot-message', true);
            }
            
            let accumulatedContent = "";
            let firstChunk = true; // 用于处理 Gemini 可能的空首个 chunk

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n");

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const jsonStr = line.substring(6).trim();
                        if (jsonStr === "[DONE]") { // OpenAI specific stream end
                            break;
                        }
                        if (jsonStr) {
                            try {
                                const parsed = JSON.parse(jsonStr);
                                let content = "";
                                // OpenAI & DeepSeek format
                                if (parsed.choices && parsed.choices[0].delta && typeof parsed.choices[0].delta.content === 'string') {
                                    content = parsed.choices[0].delta.content;
                                } 
                                // Gemini format
                                else if (parsed.candidates && parsed.candidates[0].content && parsed.candidates[0].content.parts && parsed.candidates[0].content.parts[0].text) {
                                    content = parsed.candidates[0].content.parts[0].text;
                                    // Gemini 有时第一个 chunk 的 role 是 model 但 text 是空的，需要跳过
                                    if (firstChunk && parsed.candidates[0].content.role === "model" && !content.trim()) {
                                        // firstChunk = false; // 保持 firstChunk 为 true 直到收到实际内容
                                        continue;
                                    }
                                }

                                if (content) {
                                    accumulatedContent += content;
                                    // 使用 querySelector 在 botMessageDiv 内部查找 p 标签
                                    const pElement = botMessageDiv.querySelector('p');
                                    if (pElement) {
                                        pElement.innerHTML = marked.parse(accumulatedContent);
                                    }
                                    // 对新添加的代码块进行高亮
                                    botMessageDiv.querySelectorAll('pre code:not([data-highlighted="true"])').forEach((block) => {
                                        hljs.highlightElement(block);
                                        block.dataset.highlighted = 'true';
                                    });
                                    chatbox.scrollTop = chatbox.scrollHeight;
                                }
                                firstChunk = false; // 收到有效内容后，将 firstChunk 设为 false
                            } catch (e) {
                                console.warn("Error parsing stream JSON:", e, "Problematic JSON string:", jsonStr);
                            }
                        }
                    }
                }
            }
            if (accumulatedContent) {
                messages.push({ role: "assistant", content: accumulatedContent });
            } else {
                // 如果没有收到任何内容，可能是一个错误或者流提前结束
                console.warn("Stream finished without accumulating content.");
                 let thinkingMsg = document.querySelector('.bot-message.thinking');
                if (thinkingMsg) thinkingMsg.remove();
                // appendMessageToChatbox(`AI未返回有效内容。`, 'bot-message error-message'); // 可以选择是否提示用户
            }


        } catch (error) {
            console.error('API Call Error:', error);
            let thinkingMsg = document.querySelector('.bot-message.thinking');
            if (thinkingMsg) thinkingMsg.remove();
            appendMessageToChatbox(`与AI通信时发生错误: ${error.message}`, 'bot-message error-message');
        } finally {
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.focus();
        }
    }

    function appendMessageToChatbox(text, className, returnElement = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', className);
        
        const p = document.createElement('p');
        // 只有成功的机器人回复才进行 Markdown 解析
        if (className.includes('bot-message') && !className.includes('thinking') && !className.includes('error-message') && text) {
            p.innerHTML = marked.parse(text);
        } else {
            p.textContent = text; // 用户消息、思考中、错误消息直接显示文本
        }
        messageDiv.appendChild(p);
        chatbox.appendChild(messageDiv);
        chatbox.scrollTop = chatbox.scrollHeight; // 自动滚动到底部

        // 如果是机器人消息（非思考中、非错误），则高亮代码块
        if (className.includes('bot-message') && !className.includes('thinking') && !className.includes('error-message') && text) {
            messageDiv.querySelectorAll('pre code:not([data-highlighted="true"])').forEach((block) => {
                hljs.highlightElement(block);
                block.dataset.highlighted = 'true';
            });
        }
        if (returnElement) return messageDiv;
    }

    sendButton.addEventListener('click', () => {
        const text = userInput.value.trim();
        if (text && !userInput.disabled) { // 增加 !userInput.disabled 判断，防止重复发送
            callAPI(text);
        }
    });

    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!userInput.disabled) { // 增加 !userInput.disabled 判断
                sendButton.click();
            }
        }
    });

    adminModeCheckbox.addEventListener('change', toggleAdminMode);
    modelSelect.addEventListener('change', handleAgentSelectionChange);

    // 配置 marked.js
    marked.setOptions({
        breaks: true, // 将回车符（\n）渲染为 <br>
        gfm: true,    // 启用 GitHub Flavored Markdown
        highlight: function(code, lang) { // 自定义代码高亮函数
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language, ignoreIllegals: true }).value;
        }
    });

    // 初始化
    loadAgentsConfig(); // 加载智能体配置
    toggleAdminMode();  // 根据复选框初始状态（通常是未选中）设置管理员面板的显示
});
