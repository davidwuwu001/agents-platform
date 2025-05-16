// app.js - 主应用模块，负责初始化和协调其他模块

// 当页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp);

// 应用程序入口
async function initApp() {
    console.log("开始初始化应用...");
    
    // 显示加载提示
    const loadingElement = window.showLoading(document.body, '初始化应用中...');
    
    try {
        // 1. 加载和应用用户设置
        window.loadSettings();
        console.log("设置加载完成");
        
        // 2. 初始化智能体列表
        await window.initializeAgents();
        console.log("智能体初始化完成");
        
        // 3. 初始化UI
        window.initUI();
        console.log("UI初始化完成");
        
        // 4. 设置知识库查询模块（如果存在）
        if (window.initKnowledgeBase) {
            window.initKnowledgeBase();
            console.log("知识库模块初始化完成");
        }
        
        // 5. 应用主题和UI偏好
        window.applySettings();
        
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
        window.displayMessage('错误', `初始化失败: ${error.message}`, 'system-message');
    } finally {
        // 隐藏加载提示
        window.hideLoading(loadingElement);
    }
}

// 初始化工具和插件
function initTools() {
    // 检查是否需要加载Markdown库
    if (window.settings.markdownEnabled) {
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
    
    // 添加PWA支持
    registerServiceWorker();
}

// 加载JavaScript
function loadScript(url, callback) {
    const script = document.createElement('script');
    script.src = url;
    script.onload = callback;
    script.onerror = () => {
        console.error(`加载脚本失败: ${url}`);
    };
    document.head.appendChild(script);
}

// 加载CSS
function loadStylesheet(url) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.onerror = () => {
        console.error(`加载样式表失败: ${url}`);
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
        window.displayMessage('提示', '网络连接已恢复', 'system-message');
    });
    
    window.addEventListener('offline', () => {
        console.log("网络连接已断开");
        window.displayMessage('提示', '网络连接已断开，部分功能可能不可用', 'system-message');
    });
    
    // 页面关闭前保存数据
    window.addEventListener('beforeunload', () => {
        // 如果启用了自动保存，保存聊天记录
        if (window.settings.autoSaveEnabled) {
            window.saveMessageHistories();
        }
        
        // 保存设置
        window.saveSettings();
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

// 导出模块
window.initApp = initApp; 