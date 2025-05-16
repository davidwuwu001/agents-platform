// ui.js - UI模块，处理用户界面交互

// 初始化UI
function initUI() {
    // 初始化菜单图标点击事件
    initMenuIconClick();
    
    // 初始化设置图标点击事件
    initSettingsIconClick();
    
    // 初始化用户输入相关事件
    initUserInputEvents();
    
    // 初始化窗口大小调整事件
    initWindowResizeEvent();
    
    // 创建并加载工具提示
    initTooltips();
    
    console.log("UI初始化完成");
}

// 初始化菜单图标点击事件
function initMenuIconClick() {
    const menuIcon = document.getElementById('menu-icon');
    const sidebar = document.getElementById('sidebar');
    
    if (menuIcon && sidebar) {
        menuIcon.addEventListener('click', function() {
            sidebar.classList.toggle('show');
            // 在移动设备上添加遮罩
            if (window.isMobileDevice && sidebar.classList.contains('show')) {
                createOverlay(function() {
                    sidebar.classList.remove('show');
                    removeOverlay();
                });
            }
        });
    }
}

// 初始化设置图标点击事件
function initSettingsIconClick() {
    const settingsIcon = document.getElementById('settings-icon');
    const settingsPanel = document.getElementById('settings-panel');
    
    if (settingsIcon && settingsPanel) {
        settingsIcon.addEventListener('click', function() {
            settingsPanel.classList.toggle('show');
            // 在移动设备上添加遮罩
            if (window.isMobileDevice && settingsPanel.classList.contains('show')) {
                createOverlay(function() {
                    settingsPanel.classList.remove('show');
                    removeOverlay();
                });
            }
        });
    }
}

// 初始化用户输入相关事件
function initUserInputEvents() {
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    
    if (userInput) {
        // 处理输入框回车键
        userInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                window.sendMessage();
            }
        });
        
        // 自动调整输入框高度
        userInput.addEventListener('input', function() {
            autoResizeTextarea(userInput);
        });
    }
    
    if (sendButton) {
        sendButton.addEventListener('click', window.sendMessage);
    }
    
    // 阻止拖放到输入框以便支持内容粘贴
    document.addEventListener('dragover', function(e) {
        e.preventDefault();
    });
    
    document.addEventListener('drop', function(e) {
        if (e.target.id === 'user-input') {
            e.preventDefault();
            // 获取拖拽的文本
            const text = e.dataTransfer.getData('text/plain');
            if (text) {
                // 在当前光标位置插入文本
                const start = userInput.selectionStart;
                const end = userInput.selectionEnd;
                const value = userInput.value;
                userInput.value = value.substring(0, start) + text + value.substring(end);
                userInput.selectionStart = userInput.selectionEnd = start + text.length;
                
                // 触发输入事件以调整高度
                userInput.dispatchEvent(new Event('input'));
            }
        }
    });
}

// 初始化窗口大小调整事件
function initWindowResizeEvent() {
    window.addEventListener('resize', function() {
        // 调整聊天容器高度
        adjustChatContainerHeight();
        
        // 如果sidebar或settings-panel是打开的，并且是移动设备，关闭它们
        if (window.isMobileDevice()) {
            const sidebar = document.getElementById('sidebar');
            const settingsPanel = document.getElementById('settings-panel');
            
            if (sidebar && sidebar.classList.contains('show')) {
                sidebar.classList.remove('show');
            }
            
            if (settingsPanel && settingsPanel.classList.contains('show')) {
                settingsPanel.classList.remove('show');
            }
            
            // 清理遮罩
            removeOverlay();
        }
    });
}

// 调整聊天容器高度
function adjustChatContainerHeight() {
    const chatContainer = document.getElementById('chat-container');
    const header = document.querySelector('header');
    const inputContainer = document.querySelector('.input-container');
    
    if (chatContainer && header && inputContainer) {
        const windowHeight = window.innerHeight;
        const headerHeight = header.offsetHeight;
        const inputHeight = inputContainer.offsetHeight;
        
        const newHeight = windowHeight - headerHeight - inputHeight;
        chatContainer.style.height = `${newHeight}px`;
    }
}

// 创建遮罩层
function createOverlay(onClick) {
    let overlay = document.getElementById('page-overlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'page-overlay';
        overlay.className = 'overlay';
        document.body.appendChild(overlay);
    }
    
    if (onClick) {
        overlay.addEventListener('click', onClick);
    }
}

// 移除遮罩层
function removeOverlay() {
    const overlay = document.getElementById('page-overlay');
    if (overlay) {
        document.body.removeChild(overlay);
    }
}

// 自动调整文本框高度
function autoResizeTextarea(textarea) {
    if (!textarea) return;
    
    // 重置高度以获取正确的scrollHeight
    textarea.style.height = 'auto';
    
    // 设置新高度
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 40), 200);
    textarea.style.height = `${newHeight}px`;
    
    // 调整聊天容器高度
    adjustChatContainerHeight();
}

// 创建并加载工具提示
function initTooltips() {
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    
    tooltipElements.forEach(element => {
        const tooltipText = element.getAttribute('data-tooltip');
        
        // 悬停显示提示
        element.addEventListener('mouseenter', function() {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = tooltipText;
            
            // 计算位置
            const rect = element.getBoundingClientRect();
            tooltip.style.top = `${rect.bottom + 5}px`;
            tooltip.style.left = `${rect.left + rect.width / 2}px`;
            tooltip.style.transform = 'translateX(-50%)';
            
            document.body.appendChild(tooltip);
            element.tooltipElement = tooltip;
        });
        
        // 移出隐藏提示
        element.addEventListener('mouseleave', function() {
            if (element.tooltipElement) {
                document.body.removeChild(element.tooltipElement);
                element.tooltipElement = null;
            }
        });
    });
}

// 显示加载中状态
function showLoading(parentElement, message = '加载中...') {
    if (!parentElement) return null;
    
    const loadingElement = document.createElement('div');
    loadingElement.className = 'loading-indicator';
    loadingElement.innerHTML = `
        <div class="loading-spinner"></div>
        <div class="loading-message">${message}</div>
    `;
    
    parentElement.appendChild(loadingElement);
    return loadingElement;
}

// 隐藏加载中状态
function hideLoading(loadingElement) {
    if (loadingElement && loadingElement.parentElement) {
        loadingElement.parentElement.removeChild(loadingElement);
    }
}

// 显示通知
function showNotification(message, type = 'info', duration = 3000) {
    if (!window.settings.notificationsEnabled) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // 添加到页面
    const notificationsContainer = document.getElementById('notifications-container');
    if (!notificationsContainer) {
        const container = document.createElement('div');
        container.id = 'notifications-container';
        document.body.appendChild(container);
        container.appendChild(notification);
    } else {
        notificationsContainer.appendChild(notification);
    }
    
    // 淡入效果
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // 设置自动消失
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentElement) {
                notification.parentElement.removeChild(notification);
            }
        }, 300);
    }, duration);
}

// 导出模块
window.initUI = initUI;
window.adjustChatContainerHeight = adjustChatContainerHeight;
window.createOverlay = createOverlay;
window.removeOverlay = removeOverlay;
window.autoResizeTextarea = autoResizeTextarea;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.showNotification = showNotification; 