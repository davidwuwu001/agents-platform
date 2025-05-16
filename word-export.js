// word-export.js - Word导出模块

// 将Markdown转换为Word文档并下载
function markdownToWord(markdownText, suggestedFilename = 'AI回复') {
    try {
        // 标准化文件名，确保有.docx后缀
        if (!suggestedFilename.endsWith('.docx')) {
            suggestedFilename += '.docx';
        }
        
        // 将Markdown转换为HTML
        let htmlContent = '';
        if (typeof marked !== 'undefined') {
            try {
                htmlContent = marked.parse(markdownText);
                console.log('使用marked将Markdown转换为HTML');
            } catch (e) {
                console.error('使用marked转换Markdown时出错:', e);
                // 简单的替代方案
                htmlContent = '<p>' + markdownText.replace(/\n/g, '</p><p>') + '</p>';
            }
        } else {
            // 如果marked库不可用，简单替换换行
            htmlContent = '<p>' + markdownText.replace(/\n/g, '</p><p>') + '</p>';
            console.warn('marked库不可用，使用简单替换创建HTML');
        }
        
        // 创建一个完整的HTML文档，设置样式使其类似Word文档
        const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${suggestedFilename}</title>
            <style>
                body {
                    font-family: 'Calibri', Arial, sans-serif;
                    line-height: 1.5;
                    margin: 2cm;
                    font-size: 11pt;
                }
                h1 { font-size: 18pt; }
                h2 { font-size: 16pt; }
                h3 { font-size: 14pt; }
                h4 { font-size: 12pt; }
                code {
                    font-family: 'Courier New', Courier, monospace;
                    background-color: #f5f5f5;
                    padding: 2px 4px;
                    border-radius: 3px;
                }
                pre {
                    background-color: #f5f5f5;
                    padding: 10px;
                    border-radius: 5px;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    font-family: 'Courier New', Courier, monospace;
                }
                table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 10px 0;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                }
                th {
                    background-color: #f2f2f2;
                    font-weight: bold;
                    text-align: left;
                }
                blockquote {
                    margin: 10px 0;
                    padding-left: 20px;
                    border-left: 4px solid #ddd;
                    color: #666;
                }
                img {
                    max-width: 100%;
                }
                .page-break {
                    page-break-after: always;
                }
                a {
                    color: #0563C1;
                    text-decoration: underline;
                }
                @media print {
                    body {
                        margin: 0;
                    }
                }
            </style>
        </head>
        <body>
            ${htmlContent}
        </body>
        </html>
        `;
        
        // 使用原生方法或Blob创建下载
        try {
            // 现代浏览器方法：创建Blob对象
            const blob = new Blob([fullHtml], { type: 'application/msword;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            // 创建下载链接
            const link = document.createElement('a');
            link.href = url;
            link.download = suggestedFilename;
            
            // 模拟点击触发下载
            document.body.appendChild(link);
            link.click();
            
            // 清理
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);
            
            // 显示成功消息
            window.displayMessage('系统', `文档已导出为 ${suggestedFilename}`, 'system-message');
            
        } catch (e) {
            console.error('创建下载链接时出错:', e);
            window.displayMessage('错误', '导出Word文档时出错: ' + e.message, 'system-message');
        }
    } catch (error) {
        console.error('导出Word文档时出错:', error);
        window.displayMessage('错误', '导出Word文档时出错: ' + error.message, 'system-message');
    }
}

// 导出模块
window.markdownToWord = markdownToWord; 