// app.js - 主应用模块，负责初始化和协调其他模块

// 全局错误捕获
window.onerror = function(message, source, lineno, colno, error) {
    console.error("全局错误:", message, "在", source, "行:", lineno, "列:", colno);
    console.error("错误详情:", error);
    
    // 显示错误通知
    try {
        const errorDiv = document.createElement('div');
        errorDiv.style.backgroundColor = '#ffebee';
        errorDiv.style.color = '#b71c1c';
        errorDiv.style.padding = '15px';
        errorDiv.style.margin = '15px 0';
        errorDiv.style.borderRadius = '5px';
        errorDiv.style.border = '1px solid #ef9a9a';
        errorDiv.style.fontFamily = 'monospace';
        errorDiv.style.whiteSpace = 'pre-wrap';
        errorDiv.innerHTML = `<strong>运行时错误:</strong><br>${message}<br>文件: ${source}<br>行号: ${lineno}, 列号: ${colno}<br>${error ? error.stack : ''}`;
        
        const chatContainer = document.getElementById('chat-container');
        if (chatContainer) {
            chatContainer.prepend(errorDiv);
        } else {
            document.body.prepend(errorDiv);
        }
    } catch (e) {
        console.error("无法显示错误:", e);
    }
    
    return true; // 阻止默认错误处理
};

// 检查模块是否已加载
function checkModulesLoaded() {
    const requiredModules = [
        { name: 'StorageUtil', path: 'storage.js' },
        { name: 'loadSettings', path: 'settings.js' },
        { name: 'initializeAgents', path: 'agents.js' },
        { name: 'displayMessage', path: 'chat.js' },
        { name: 'callAPI', path: 'api.js' },
        { name: 'markdownToWord', path: 'word-export.js' },
        { name: 'initUI', path: 'ui.js' }
    ];
    
    const missingModules = requiredModules.filter(module => 
        typeof window[module.name] === 'undefined'
    );
    
    if (missingModules.length > 0) {
        console.error("缺少必要模块:", missingModules.map(m => m.name).join(', '));
        
        // 尝试重新加载缺失的模块
        missingModules.forEach(module => {
            console.log(`尝试重新加载模块: ${module.path}`);
            loadScript(module.path);
        });
        
        return false;
    }
    
    return true;
}

// 当页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp);

// 应用程序入口
async function initApp() {
    console.log("开始初始化应用...");
    
    // 检查模块是否完全加载
    if (!checkModulesLoaded()) {
        console.error("模块加载不完整，等待1秒后重试");
        // 延迟重试
        setTimeout(initApp, 1000);
        return;
    }
    
    // 显示加载提示
    let loadingElement = null;
    try {
        loadingElement = window.showLoading ? 
            window.showLoading(document.body, '初始化应用中...') : 
            createLoadingIndicator(document.body, '初始化应用中...');
    } catch (error) {
        console.error("无法创建加载指示器:", error);
    }
    
    try {
        // 1. 初始化存储系统
        if (window.StorageUtil && typeof window.StorageUtil.init === 'function') {
            window.StorageUtil.init();
            console.log("存储系统初始化完成");
        } else {
            console.error("StorageUtil.init 未定义");
        }
        
        // 2. 加载和应用用户设置
        if (typeof window.loadSettings === 'function') {
            window.loadSettings();
            console.log("设置加载完成");
        } else {
            console.error("loadSettings 未定义");
        }
        
        // 3. 初始化智能体列表
        if (typeof window.initializeAgents === 'function') {
            await window.initializeAgents();
            console.log("智能体初始化完成");
        } else {
            console.error("initializeAgents 未定义");
        }
        
        // 4. 初始化UI
        if (typeof window.initUI === 'function') {
            window.initUI();
            console.log("UI初始化完成");
        } else {
            console.error("initUI 未定义");
        }
        
        // 5. 应用主题和UI偏好
        if (typeof window.applySettings === 'function') {
            window.applySettings();
            console.log("应用设置完成");
        } else {
            console.error("applySettings 未定义");
        }
        
        // 6. 初始化工具和插件
        initTools();
        
        // 7. 注册事件监听器
        registerEventListeners();
        
        // 初始化完成
        console.log("应用初始化成功");
        
        // 自动聚焦到输入框
        setTimeout(() => {
            const userInput = document.getElementById('user-input');
            if (userInput) userInput.focus();
        }, 500);
        
    } catch (error) {
        console.error("应用初始化出错:", error);
        if (typeof window.displayMessage === 'function') {
            window.displayMessage('错误', `初始化失败: ${error.message}`, 'system-message');
        } else {
            console.error("displayMessage 未定义");
            alert(`初始化失败: ${error.message}`);
        }
    } finally {
        // 隐藏加载提示
        if (loadingElement) {
            if (typeof window.hideLoading === 'function') {
                window.hideLoading(loadingElement);
            } else if (loadingElement.parentElement) {
                loadingElement.parentElement.removeChild(loadingElement);
            }
        }
    }
}

// 创建一个简单的加载指示器（当UI模块未加载时的备用方案）
function createLoadingIndicator(parent, message) {
    const loadingDiv = document.createElement('div');
    loadingDiv.style.position = 'fixed';
    loadingDiv.style.top = '50%';
    loadingDiv.style.left = '50%';
    loadingDiv.style.transform = 'translate(-50%, -50%)';
    loadingDiv.style.background = 'rgba(0,0,0,0.7)';
    loadingDiv.style.color = 'white';
    loadingDiv.style.padding = '20px';
    loadingDiv.style.borderRadius = '5px';
    loadingDiv.style.zIndex = '9999';
    loadingDiv.textContent = message || '加载中...';
    
    parent.appendChild(loadingDiv);
    return loadingDiv;
}

// 初始化工具和插件
function initTools() {
    // 检查是否需要加载Markdown库
    try {
        if (window.settings && window.settings.markdownEnabled) {
            // 检查marked是否已经加载
            if (typeof marked === 'undefined') {
                console.log("加载Markdown解析库...");
                loadScript('https://cdn.jsdelivr.net/npm/marked/marked.min.js', () => {
                    console.log("Markdown解析库加载完成");
                });
            }
            
            // 检查是否需要加载代码高亮库
            if (window.settings.codeHighlightEnabled && typeof hljs === 'undefined') {
                console.log("加载代码高亮库...");
                loadStylesheet('https://cdn.jsdelivr.net/npm/highlight.js@11.7.0/styles/github.min.css');
                loadScript('https://cdn.jsdelivr.net/npm/highlight.js@11.7.0/lib/highlight.min.js', () => {
                    console.log("代码高亮库加载完成");
                });
            }
        }
    } catch (error) {
        console.error("初始化工具时出错:", error);
    }
    
    // 添加PWA支持
    registerServiceWorker();
}

// 加载JavaScript
function loadScript(url, callback) {
    const script = document.createElement('script');
    script.src = url;
    script.onload = callback;
    script.onerror = (e) => {
        console.error(`加载脚本失败: ${url}`, e);
    };
    document.head.appendChild(script);
}

// 加载CSS
function loadStylesheet(url) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.onerror = (e) => {
        console.error(`加载样式表失败: ${url}`, e);
    };
    document.head.appendChild(link);
}

// 注册事件监听器
function registerEventListeners() {
    // 监听可见性变化，在返回页面时重新连接
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            console.log("页面重新获得焦点");
        }
    });
    
    // 监听在线状态变化
    window.addEventListener('online', () => {
        console.log("已恢复网络连接");
        if (typeof window.displayMessage === 'function') {
            window.displayMessage('提示', '网络连接已恢复', 'system-message');
        }
    });
    
    window.addEventListener('offline', () => {
        console.log("网络连接已断开");
        if (typeof window.displayMessage === 'function') {
            window.displayMessage('提示', '网络连接已断开，部分功能可能不可用', 'system-message');
        }
    });
    
    // 页面关闭前保存数据
    window.addEventListener('beforeunload', () => {
        // 如果启用了自动保存，保存聊天记录
        if (window.settings && window.settings.autoSaveEnabled && 
            typeof window.saveMessageHistories === 'function') {
            window.saveMessageHistories();
        }
        
        // 保存设置
        if (typeof window.saveSettings === 'function') {
            window.saveSettings();
        }
    });
    
    // 双击标题栏最大化窗口（PWA模式下）
    const header = document.querySelector('header');
    if (header) {
        header.addEventListener('dblclick', () => {
            if (window.matchMedia('(display-mode: standalone)').matches) {
                if (window.screen && window.screen.orientation) {
                    try {
                        if (document.fullscreenElement) {
                            document.exitFullscreen();
                        } else {
                            document.documentElement.requestFullscreen();
                        }
                    } catch (e) {
                        console.log("切换全屏失败:", e);
                    }
                }
            }
        });
    }
}

// 注册Service Worker支持PWA
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js').then(registration => {
                console.log('ServiceWorker注册成功:', registration.scope);
            }).catch(error => {
                console.log('ServiceWorker注册失败:', error);
            });
        });
    }
}

// 检测浏览器/设备类型
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// 暴露给全局
window.initApp = initApp;
window.isMobileDevice = isMobileDevice; 