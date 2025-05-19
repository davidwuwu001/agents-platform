/**
 * GitHub同步服务 - 用于一键同步代码到GitHub
 * 提供网页界面上的同步功能
 */

// 创建GitHub同步服务对象
window.GitHubSyncService = {
    /**
     * 初始化GitHub同步功能
     */
    init: function() {
        console.log("GitHub同步服务初始化...");
        this.createSyncButton();
    },

    /**
     * 创建同步按钮并添加到页面
     */
    createSyncButton: function() {
        // 创建一个浮动按钮
        const syncButton = document.createElement('button');
        syncButton.id = 'github-sync-button';
        syncButton.innerHTML = '同步到GitHub';
        syncButton.title = '一键同步代码到GitHub';
        
        // 设置按钮样式
        syncButton.style.position = 'fixed';
        syncButton.style.bottom = '20px';
        syncButton.style.right = '20px';
        syncButton.style.zIndex = '9999';
        syncButton.style.padding = '10px 15px';
        syncButton.style.backgroundColor = '#2ea44f';
        syncButton.style.color = 'white';
        syncButton.style.border = 'none';
        syncButton.style.borderRadius = '6px';
        syncButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        syncButton.style.cursor = 'pointer';
        syncButton.style.fontWeight = 'bold';
        syncButton.style.display = 'flex';
        syncButton.style.alignItems = 'center';
        syncButton.style.justifyContent = 'center';
        syncButton.style.gap = '8px';

        // 添加GitHub图标
        const githubIcon = document.createElement('span');
        githubIcon.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>';
        
        syncButton.prepend(githubIcon);
        
        // 添加点击事件
        syncButton.addEventListener('click', this.syncToGitHub);
        
        // 添加到body
        document.body.appendChild(syncButton);
    },

    /**
     * 显示同步状态的提示框
     */
    showStatusMessage: function(message, isSuccess = true) {
        // 创建或获取状态消息元素
        let statusEl = document.getElementById('github-sync-status');
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.id = 'github-sync-status';
            statusEl.style.position = 'fixed';
            statusEl.style.bottom = '80px';
            statusEl.style.right = '20px';
            statusEl.style.padding = '12px 20px';
            statusEl.style.borderRadius = '6px';
            statusEl.style.boxShadow = '0 3px 10px rgba(0,0,0,0.2)';
            statusEl.style.zIndex = '10000';
            statusEl.style.maxWidth = '300px';
            statusEl.style.wordBreak = 'break-word';
            document.body.appendChild(statusEl);
        }
        
        // 设置消息样式和内容
        statusEl.style.backgroundColor = isSuccess ? '#dff2e1' : '#ffeaea';
        statusEl.style.color = isSuccess ? '#216e39' : '#d73a49';
        statusEl.style.border = isSuccess ? '1px solid #b0dfc1' : '1px solid #f5c1c5';
        statusEl.innerHTML = message;
        
        // 自动隐藏消息
        setTimeout(() => {
            if (statusEl && statusEl.parentNode) {
                statusEl.parentNode.removeChild(statusEl);
            }
        }, 5000);
    },

    /**
     * 同步到GitHub的处理函数
     */
    syncToGitHub: function() {
        const service = window.GitHubSyncService;
        
        // 显示正在同步的消息
        service.showStatusMessage('正在打开系统同步工具...', true);
        
        // 使用fetch API调用我们的脚本
        // 注意：这需要在服务器端设置响应脚本
        setTimeout(() => {
            service.showStatusMessage('请查看命令行窗口，按照提示完成同步', true);
            
            // 在新窗口打开终端执行脚本的说明
            const instructions = `
                <div style="line-height:1.6;">
                    <strong>同步步骤：</strong><br>
                    1. 打开终端 (Terminal)<br>
                    2. 进入项目目录：<code>cd ${window.location.pathname.split('/').slice(0,-1).join('/') || '/'}</code><br>
                    3. 运行同步脚本：<code>./sync-to-github.sh</code><br>
                    4. 按照提示输入提交信息
                </div>
            `;
            
            // 创建模态对话框
            const modal = document.createElement('div');
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
            modal.style.display = 'flex';
            modal.style.justifyContent = 'center';
            modal.style.alignItems = 'center';
            modal.style.zIndex = '10001';
            
            const modalContent = document.createElement('div');
            modalContent.style.backgroundColor = 'white';
            modalContent.style.padding = '20px';
            modalContent.style.borderRadius = '8px';
            modalContent.style.width = '80%';
            modalContent.style.maxWidth = '500px';
            modalContent.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
            
            const title = document.createElement('h3');
            title.innerText = 'GitHub同步指南';
            title.style.marginTop = '0';
            title.style.color = '#24292e';
            
            const closeButton = document.createElement('button');
            closeButton.innerText = '关闭';
            closeButton.style.marginTop = '15px';
            closeButton.style.padding = '8px 16px';
            closeButton.style.backgroundColor = '#f6f8fa';
            closeButton.style.color = '#24292e';
            closeButton.style.border = '1px solid #e1e4e8';
            closeButton.style.borderRadius = '6px';
            closeButton.style.cursor = 'pointer';
            closeButton.onclick = function() {
                document.body.removeChild(modal);
            };
            
            modalContent.appendChild(title);
            modalContent.innerHTML += instructions;
            modalContent.appendChild(closeButton);
            modal.appendChild(modalContent);
            
            document.body.appendChild(modal);
        }, 1000);
    }
};

// 当页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    window.GitHubSyncService.init();
}); 