/**
 * 布局管理器 - 负责处理页面容器的动态布局调整
 * 从主脚本分离出来以减小文件体积
 */

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

// 处理移动设备上的布局调整
function handleLayoutForMobile() {
    // 获取关键元素
    const chatContainer = document.getElementById('chat-container');
    const platformBanner = document.querySelector('.platform-banner');
    const helpLink = document.querySelector('.help-link');
    const inputContainer = document.getElementById('input-container');
    const mobileControls = document.querySelector('.mobile-controls');
    const hasSelectedAgent = window.currentAgent != null;
    const bannerHidden = platformBanner && platformBanner.style.display === 'none';
    
    // 计算可用高度 (视口高度减去顶部和底部元素的高度)
    const viewportHeight = window.innerHeight;
    const bannerHeight = platformBanner ? platformBanner.offsetHeight : 0;
    const helpLinkHeight = helpLink ? helpLink.offsetHeight : 0;
    const inputHeight = inputContainer ? inputContainer.offsetHeight : 0;
    const controlsHeight = mobileControls ? mobileControls.offsetHeight : 0;
    
    // 计算额外元素占用的总高度（加上更多间距确保底部元素完全可见）
    const reservedHeight = bannerHeight + helpLinkHeight + inputHeight + controlsHeight + 60;
    
    // 计算聊天容器的理想高度（视口高度减去保留的高度）
    let idealHeight = viewportHeight - reservedHeight;
    let heightValue;
    
    // 根据设备宽度进行不同的处理，显著降低vh上限
    if (window.innerWidth <= 480) { // 手机设备
        // 手机上使用vh单位但限制最大高度，确保底部元素可见
        heightValue = `min(${idealHeight}px, 58vh)`;
    } else if (window.innerWidth <= 768) { // 平板设备
        heightValue = `min(${idealHeight}px, 62vh)`;
    } else { // 桌面设备
        heightValue = `min(${idealHeight}px, 65vh)`;
    }
    
    // 设置聊天容器高度
    if (chatContainer) {
        chatContainer.style.height = heightValue;
        
        // 如果有滚动条，确保滚动到底部
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    // 在控制台输出计算信息，方便调试
    console.log(`设备宽度: ${window.innerWidth}px, 视口高度: ${viewportHeight}px`);
    console.log(`计算的理想高度: ${idealHeight}px, 设置的高度: ${heightValue}`);
}

// 设置MutationObserver来监听DOM变化并自动调整布局
function setupMutationObserver() {
    // 创建观察器
    const layoutObserver = new MutationObserver(function(mutations) {
        // DOM变化可能影响布局，延迟调用布局调整
        clearTimeout(window.domChangeTimer);
        window.domChangeTimer = setTimeout(handleLayoutForMobile, 300);
    });
    
    // 选择要观察的目标元素
    const chatContainer = document.getElementById('chat-container');
    const platformBanner = document.querySelector('.platform-banner');
    
    // 配置观察选项
    const config = { 
        childList: true,     // 观察目标子节点的变化
        subtree: true,       // 观察所有后代节点
        attributes: true,    // 观察属性变化
        attributeFilter: ['style', 'class'] // 只关注样式和类变化
    };
    
    // 开始观察
    if (chatContainer) {
        layoutObserver.observe(chatContainer, config);
        console.log("已设置聊天容器的MutationObserver");
    }
    
    if (platformBanner) {
        layoutObserver.observe(platformBanner, config);
        console.log("已设置平台横幅的MutationObserver");
    }
    
    // 观察整个body的显示/隐藏变化
    layoutObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['style', 'class'],
        childList: false
    });
    
    console.log("DOM变化监听器已设置完成");
}

// 初始化布局管理器
function initLayoutManager() {
    console.log("初始化布局管理器...");
    
    // 窗口大小变化时重新计算布局
    window.addEventListener('resize', function() {
        // 使用节流函数避免频繁触发
        clearTimeout(window.resizeTimer);
        window.resizeTimer = setTimeout(handleLayoutForMobile, 250);
    });
    
    // 页面完全加载后调整布局
    window.addEventListener('load', function() {
        // 初始布局调整
        handleLayoutForMobile();
        
        // 浏览器可能会在加载完成后进行额外布局调整，再次延迟调用
        setTimeout(handleLayoutForMobile, 500);
    });
    
    // 初始布局调整，确保首次访问时就有合适的高度
    handleLayoutForMobile();
    
    // 设置MutationObserver监听DOM变化
    setupMutationObserver();
}

// 导出公共函数
window.LayoutManager = {
    init: initLayoutManager,
    adjustLayout: handleLayoutForMobile,
    isMobileDevice: isMobileDevice
}; 