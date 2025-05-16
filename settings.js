// settings.js - 设置模块

// 默认设置
const defaultSettings = {
    markdownEnabled: true,  // 是否启用Markdown渲染
    codeHighlightEnabled: true,  // 是否启用代码高亮
    darkModeEnabled: false,  // 是否启用暗色模式
    fontSize: 'medium',  // 字体大小：small, medium, large
    messageHistoryLimit: 50,  // 每个智能体保存的消息历史数量限制
    autoSaveEnabled: true,  // 是否自动保存聊天记录
    displayMode: 'compact',  // 显示模式：compact, comfortable
    notificationsEnabled: true,  // 是否启用通知
    chatBackgroundColor: '#ffffff',  // 聊天背景颜色
    systemMessageColor: '#fff8e1',  // 系统消息颜色
    userMessageColor: '#e3f2fd',  // 用户消息颜色
    aiMessageColor: '#f1f8e9',  // AI消息颜色
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',  // 字体
};

// 加载设置
function loadSettings() {
    try {
        const savedSettings = StorageUtil.getItem('settings');
        if (savedSettings) {
            try {
                const parsedSettings = JSON.parse(savedSettings);
                // 将保存的设置与默认设置合并，确保新增的设置项也有默认值
                window.settings = { ...defaultSettings, ...parsedSettings };
                console.log("成功加载设置");
            } catch (parseError) {
                console.error("设置解析失败:", parseError);
                window.settings = { ...defaultSettings };
            }
        } else {
            console.log("未找到设置，使用默认设置");
            window.settings = { ...defaultSettings };
        }
        
        // 应用设置到UI
        applySettings();
        
    } catch (error) {
        console.error("加载设置出错:", error);
        window.settings = { ...defaultSettings };
    }
}

// 保存设置
function saveSettings() {
    try {
        const settingsString = JSON.stringify(window.settings);
        const result = StorageUtil.setItem('settings', settingsString);
        
        if (!result) {
            console.warn("设置保存可能失败");
        } else {
            console.log("设置已保存");
        }
    } catch (error) {
        console.error("保存设置出错:", error);
    }
}

// 应用设置到UI
function applySettings() {
    try {
        const htmlElement = document.documentElement;
        const bodyElement = document.body;
        
        // 应用暗色模式
        if (window.settings.darkModeEnabled) {
            htmlElement.classList.add('dark-mode');
            document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#121212');
        } else {
            htmlElement.classList.remove('dark-mode');
            document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#ffffff');
        }
        
        // 应用字体大小
        htmlElement.setAttribute('data-font-size', window.settings.fontSize);
        
        // 应用显示模式
        htmlElement.setAttribute('data-display-mode', window.settings.displayMode);
        
        // 应用字体
        bodyElement.style.fontFamily = window.settings.fontFamily;
        
        // 应用聊天背景颜色
        const chatContainer = document.getElementById('chat-container');
        if (chatContainer) {
            chatContainer.style.backgroundColor = window.settings.chatBackgroundColor;
        }
        
        // 应用消息颜色 - 通过CSS变量实现
        htmlElement.style.setProperty('--system-message-bg', window.settings.systemMessageColor);
        htmlElement.style.setProperty('--user-message-bg', window.settings.userMessageColor);
        htmlElement.style.setProperty('--ai-message-bg', window.settings.aiMessageColor);
        
        console.log("设置已应用到UI");
    } catch (error) {
        console.error("应用设置到UI时出错:", error);
    }
}

// 切换暗色模式
function toggleDarkMode() {
    window.settings.darkModeEnabled = !window.settings.darkModeEnabled;
    applySettings();
    saveSettings();
    
    // 显示提示
    window.displayMessage('设置', 
        window.settings.darkModeEnabled ? '暗色模式已开启' : '暗色模式已关闭', 
        'system-message');
}

// 切换Markdown渲染
function toggleMarkdown() {
    window.settings.markdownEnabled = !window.settings.markdownEnabled;
    saveSettings();
    
    // 显示提示
    window.displayMessage('设置', 
        window.settings.markdownEnabled ? 'Markdown渲染已开启' : 'Markdown渲染已关闭', 
        'system-message');
    
    // 需要刷新页面以应用更改
    window.displayMessage('提示', '请刷新页面以应用更改', 'system-message');
}

// 切换代码高亮
function toggleCodeHighlight() {
    window.settings.codeHighlightEnabled = !window.settings.codeHighlightEnabled;
    saveSettings();
    
    // 显示提示
    window.displayMessage('设置', 
        window.settings.codeHighlightEnabled ? '代码高亮已开启' : '代码高亮已关闭', 
        'system-message');
    
    // 需要刷新页面以应用更改
    window.displayMessage('提示', '请刷新页面以应用更改', 'system-message');
}

// 更改字体大小
function changeFontSize(size) {
    if (['small', 'medium', 'large'].includes(size)) {
        window.settings.fontSize = size;
        applySettings();
        saveSettings();
        
        // 显示提示
        window.displayMessage('设置', `字体大小已设置为 ${size}`, 'system-message');
    }
}

// 更改显示模式
function changeDisplayMode(mode) {
    if (['compact', 'comfortable'].includes(mode)) {
        window.settings.displayMode = mode;
        applySettings();
        saveSettings();
        
        // 显示提示
        window.displayMessage('设置', `显示模式已设置为 ${mode}`, 'system-message');
    }
}

// 导出设置
window.settings = { ...defaultSettings };
window.loadSettings = loadSettings;
window.saveSettings = saveSettings;
window.applySettings = applySettings;
window.toggleDarkMode = toggleDarkMode;
window.toggleMarkdown = toggleMarkdown;
window.toggleCodeHighlight = toggleCodeHighlight;
window.changeFontSize = changeFontSize;
window.changeDisplayMode = changeDisplayMode; 