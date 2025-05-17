/**
 * export-service.js
 * 文档导出服务模块 - 负责Word文档导出的所有功能
 */

// 导出服务对象
const ExportService = {
    // 将Markdown转换为Word文档并导出
    markdownToWord: async function(markdown, defaultFilename = 'AI回复文档') {
        try {
            // 如果没有内容，提示用户
            if (!markdown || markdown.trim() === '') {
                if (window.MessageHandler) {
                    window.MessageHandler.displaySystemMessage('没有内容可以保存');
                } else if (typeof displayMessage === 'function') {
                    displayMessage('提示', '没有内容可以保存', 'system-message');
                } else {
                    console.error('无法显示提示消息：没有内容可以保存');
                }
                return;
            }

            // 打开导出选项弹窗
            const options = await this.showExportOptionsDialog(defaultFilename);
            
            // 如果用户取消了导出，则返回
            if (!options) return;
            
            // 显示导出进度提示
            const progressMessage = document.createElement('div');
            progressMessage.className = 'message system-message';
            progressMessage.innerHTML = '<span class="message-sender">系统提示: </span>正在准备Word文档，请稍候...';
            
            const chatContainer = document.getElementById('chat-container');
            if (chatContainer) {
                chatContainer.appendChild(progressMessage);
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }
            
            console.log('开始转换Markdown为Word...');
            console.log('原始Markdown内容长度:', markdown.length);
            
            // 添加标题（如果用户选择了）
            let finalMarkdown = markdown;
            if (options.includeTitle && options.title) {
                finalMarkdown = `# ${options.title}\n\n${markdown}`;
            }
            
            // 添加时间戳（如果用户选择了）
            if (options.includeTimestamp) {
                const now = new Date();
                const timestamp = `*导出时间: ${now.toLocaleString()}*\n\n`;
                finalMarkdown = timestamp + finalMarkdown;
            }
            
            // 解析Markdown
            const paragraphs = this.parseMarkdownForWord(finalMarkdown);
            
            console.log('生成的段落数量:', paragraphs.length);
            
            // 确认样式设置
            const styles = {
                paragraphStyles: [
                    {
                        id: "Heading1",
                        name: "Heading 1",
                        basedOn: "Normal",
                        next: "Normal",
                        quickFormat: true,
                        run: {
                            size: 36,
                            bold: true,
                            color: "2F5496",
                        },
                        paragraph: {
                            spacing: {
                                before: 400,
                                after: 120,
                            },
                        },
                    },
                    {
                        id: "Heading2",
                        name: "Heading 2",
                        basedOn: "Normal",
                        next: "Normal",
                        quickFormat: true,
                        run: {
                            size: 32,
                            bold: true,
                            color: "2F5496",
                        },
                        paragraph: {
                            spacing: {
                                before: 320,
                                after: 120,
                            },
                        },
                    },
                    {
                        id: "Heading3",
                        name: "Heading 3",
                        basedOn: "Normal",
                        next: "Normal",
                        quickFormat: true,
                        run: {
                            size: 28,
                            bold: true,
                            color: "2F5496",
                        },
                        paragraph: {
                            spacing: {
                                before: 240,
                                after: 100,
                            },
                        },
                    },
                    {
                        id: "Code",
                        name: "Code",
                        basedOn: "Normal",
                        next: "Normal",
                        quickFormat: true,
                        run: {
                            font: "Courier New",
                        },
                        paragraph: {
                            spacing: {
                                before: 200,
                                after: 200,
                            },
                            shading: {
                                type: docx.ShadingType.SOLID,
                                color: "E5E5E5",
                            },
                        },
                    }
                ],
            };
            
            // 创建新的文档对象，直接在创建文档时添加sections
            const doc = new docx.Document({
                creator: "智能体聚合平台",
                title: options.filename,
                description: "由智能体生成的文档",
                sections: [{
                    properties: {},
                    children: paragraphs
                }],
                styles: styles,
            });

            // 更新进度提示
            progressMessage.innerHTML = '<span class="message-sender">系统提示: </span>正在生成Word文档，即将完成...';
            
            // 生成blob
            const blob = await docx.Packer.toBlob(doc);
            
            // 使用FileSaver保存文件
            saveAs(blob, `${options.filename}.docx`);
            
            // 更新为成功消息
            progressMessage.innerHTML = `<span class="message-sender">系统提示: </span>Word文档 <strong>${options.filename}.docx</strong> 已生成并下载成功！`;
            
            console.log('Word文档已生成并下载');
        } catch (error) {
            console.error('生成Word文档时出错:', error);
            if (window.MessageHandler) {
                window.MessageHandler.displaySystemMessage(`生成Word文档失败: ${error.message}`);
            } else if (typeof displayMessage === 'function') {
                displayMessage('提示', `生成Word文档失败: ${error.message}`, 'system-message');
            } else {
                console.error(`生成Word文档失败: ${error.message}`);
            }
        }
    },

    // 显示Word导出选项对话框
    showExportOptionsDialog: function(defaultFilename) {
        return new Promise((resolve) => {
            // 创建对话框元素
            const dialogOverlay = document.createElement('div');
            dialogOverlay.className = 'dialog-overlay';
            
            const dialogBox = document.createElement('div');
            dialogBox.className = 'dialog-box';
            
            // 设置对话框内容
            dialogBox.innerHTML = `
                <div class="dialog-header">
                    <h3>导出Word文档</h3>
                    <button class="dialog-close-btn">&times;</button>
                </div>
                <div class="dialog-content">
                    <div class="dialog-form-group">
                        <label for="export-filename">文件名：</label>
                        <input type="text" id="export-filename" value="${defaultFilename}" class="dialog-input">
                    </div>
                    <div class="dialog-form-group">
                        <label>
                            <input type="checkbox" id="export-include-title" checked> 
                            添加标题
                        </label>
                    </div>
                    <div class="dialog-form-group">
                        <label for="export-title">文档标题：</label>
                        <input type="text" id="export-title" value="AI助手回复" class="dialog-input">
                    </div>
                    <div class="dialog-form-group">
                        <label>
                            <input type="checkbox" id="export-include-timestamp" checked> 
                            添加导出时间戳
                        </label>
                    </div>
                </div>
                <div class="dialog-footer">
                    <button id="dialog-cancel-btn" class="dialog-btn dialog-btn-secondary">取消</button>
                    <button id="dialog-export-btn" class="dialog-btn dialog-btn-primary">导出</button>
                </div>
            `;
            
            // 添加对话框到页面
            dialogOverlay.appendChild(dialogBox);
            document.body.appendChild(dialogOverlay);
            
            // 获取表单元素
            const filenameInput = document.getElementById('export-filename');
            const includeTitleCheckbox = document.getElementById('export-include-title');
            const titleInput = document.getElementById('export-title');
            const includeTimestampCheckbox = document.getElementById('export-include-timestamp');
            
            // 添加事件监听器
            document.querySelector('.dialog-close-btn').addEventListener('click', () => {
                document.body.removeChild(dialogOverlay);
                resolve(null);
            });
            
            document.getElementById('dialog-cancel-btn').addEventListener('click', () => {
                document.body.removeChild(dialogOverlay);
                resolve(null);
            });
            
            document.getElementById('dialog-export-btn').addEventListener('click', () => {
                const options = {
                    filename: filenameInput.value || defaultFilename,
                    includeTitle: includeTitleCheckbox.checked,
                    title: titleInput.value || 'AI助手回复',
                    includeTimestamp: includeTimestampCheckbox.checked
                };
                
                document.body.removeChild(dialogOverlay);
                resolve(options);
            });
            
            // 点击对话框外部关闭
            dialogOverlay.addEventListener('click', (e) => {
                if (e.target === dialogOverlay) {
                    document.body.removeChild(dialogOverlay);
                    resolve(null);
                }
            });
            
            // 自动聚焦到文件名输入框
            filenameInput.focus();
            filenameInput.select();
        });
    },

    // 解析Markdown为Word段落
    parseMarkdownForWord: function(markdown) {
        const lines = markdown.split('\n');
        const paragraphs = [];
        let inCodeBlock = false;
        let codeContent = [];
        
        // 调试信息
        console.log('开始解析Markdown为Word段落，共', lines.length, '行');
        
        // 解析每一行
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // 处理代码块
            if (line.trim().startsWith('```')) {
                if (inCodeBlock) {
                    // 结束代码块
                    inCodeBlock = false;
                    console.log('结束代码块，代码块内容行数:', codeContent.length);
                    if (codeContent.length > 0) {
                        paragraphs.push(new docx.Paragraph({
                            style: "Code",
                            children: [
                                new docx.TextRun({
                                    text: codeContent.join('\n'),
                                    font: "Courier New"
                                })
                            ]
                        }));
                        codeContent = [];
                    }
                } else {
                    // 开始代码块
                    inCodeBlock = true;
                    console.log('开始代码块');
                }
                continue;
            }
            
            if (inCodeBlock) {
                // 在代码块内，收集内容
                codeContent.push(line);
                continue;
            }
            
            // 非代码块内容处理
            
            // 标题处理 - 增强版本，检查更多标题格式
            const h1Regex = /^#\s+(.+)$/;
            const h2Regex = /^##\s+(.+)$/;
            const h3Regex = /^###\s+(.+)$/;
            const specialHeadingRegex = /^([A-Za-z0-9\u4e00-\u9fa5].*?[：:])$/;
            
            let match;
            
            if ((match = h1Regex.exec(line)) !== null) {
                // 标准格式: "# 标题"
                console.log('检测到一级标题:', line);
                paragraphs.push(new docx.Paragraph({
                    style: "Heading1",
                    children: [new docx.TextRun(match[1])]
                }));
            } else if ((match = h2Regex.exec(line)) !== null) {
                // 标准格式: "## 标题"
                console.log('检测到二级标题:', line);
                paragraphs.push(new docx.Paragraph({
                    style: "Heading2",
                    children: [new docx.TextRun(match[1])]
                }));
            } else if ((match = h3Regex.exec(line)) !== null) {
                // 标准格式: "### 标题"
                console.log('检测到三级标题:', line);
                paragraphs.push(new docx.Paragraph({
                    style: "Heading3",
                    children: [new docx.TextRun(match[1])]
                }));
            } else if ((match = specialHeadingRegex.exec(line)) !== null) {
                // 特殊格式: "标题项目:"
                console.log('检测到特殊格式标题:', line);
                // 这种格式当作二级标题处理
                paragraphs.push(new docx.Paragraph({
                    style: "Heading2",
                    children: [new docx.TextRun(match[1])]
                }));
            } else if (line.trim() === '') {
                // 空行
                paragraphs.push(new docx.Paragraph({}));
            } else {
                // 检查是否是列表项
                const listItemRegex = /^[\*\-]\s+(.+)$/;
                if ((match = listItemRegex.exec(line)) !== null) {
                    console.log('检测到列表项:', line);
                    // 处理列表项，缩进处理
                    paragraphs.push(new docx.Paragraph({
                        children: this.parseInlineStyles(match[1]),
                        indent: {
                            left: 720, // 缩进量，单位为twip (1/20点)
                        },
                        bullet: {
                            level: 0, // 列表级别
                        }
                    }));
                } else {
                    // 处理行内样式 (粗体、斜体等)
                    const textRuns = this.parseInlineStyles(line);
                    paragraphs.push(new docx.Paragraph({
                        children: textRuns
                    }));
                }
            }
        }
        
        console.log('Markdown解析完成，生成段落数:', paragraphs.length);
        
        return paragraphs;
    },

    // 解析行内样式 (粗体、斜体等)
    parseInlineStyles: function(text) {
        // 创建一个更高级的解析器来处理内联标记
        const segments = [];
        let currentPos = 0;
        
        // 定义正则表达式匹配不同的内联样式
        const boldRegex = /\*\*(.*?)\*\*|__(.*?)__/g;
        const italicRegex = /\*(.*?)\*|_(.*?)_/g;
        const codeRegex = /`(.*?)`/g;
        const linkRegex = /\[(.*?)\]\((.*?)\)/g;
        
        // 使用一个Map来存储匹配的位置和类型
        const styleMap = new Map();
        
        // 函数：添加样式匹配到Map
        const addToMap = (regex, styleType) => {
            let match;
            while ((match = regex.exec(text)) !== null) {
                const content = match[1] || match[2]; // 匹配组1或2包含内容
                styleMap.set(match.index, {
                    type: styleType,
                    start: match.index,
                    end: match.index + match[0].length,
                    content: content,
                    originalMatch: match[0]
                });
            }
        };
        
        // 添加各种样式到Map
        addToMap(boldRegex, 'bold');
        addToMap(italicRegex, 'italic');
        addToMap(codeRegex, 'code');
        addToMap(linkRegex, 'link');
        
        // 将Map转换为数组，并按开始位置排序
        const stylePoints = Array.from(styleMap.values()).sort((a, b) => a.start - b.start);
        
        // 检查样式是否有重叠
        for (let i = 0; i < stylePoints.length - 1; i++) {
            if (stylePoints[i].end > stylePoints[i+1].start) {
                // 有重叠，移除后面的样式点
                stylePoints.splice(i+1, 1);
                i--; // 重新检查当前位置
            }
        }
        
        // 如果没有任何样式匹配，直接返回原文本
        if (stylePoints.length === 0) {
            return [new docx.TextRun(text)];
        }
        
        // 处理文本的各部分
        const runs = [];
        
        // 添加样式前的文本
        if (stylePoints[0].start > 0) {
            runs.push(new docx.TextRun(text.substring(0, stylePoints[0].start)));
        }
        
        // 处理每个样式点
        for (let i = 0; i < stylePoints.length; i++) {
            const point = stylePoints[i];
            
            // 应用样式
            if (point.type === 'bold') {
                runs.push(new docx.TextRun({
                    text: point.content,
                    bold: true
                }));
            } else if (point.type === 'italic') {
                runs.push(new docx.TextRun({
                    text: point.content,
                    italics: true
                }));
            } else if (point.type === 'code') {
                runs.push(new docx.TextRun({
                    text: point.content,
                    font: "Courier New",
                    shading: {
                        type: docx.ShadingType.SOLID,
                        color: "E5E5E5",
                    }
                }));
            } else if (point.type === 'link') {
                // 链接暂时只能显示文本，不能真的点击
                runs.push(new docx.TextRun({
                    text: point.content,
                    color: "0000FF",
                    underline: {}
                }));
            }
            
            // 添加本样式点和下一个样式点之间的文本
            if (i < stylePoints.length - 1) {
                const nextPoint = stylePoints[i + 1];
                if (point.end < nextPoint.start) {
                    runs.push(new docx.TextRun(text.substring(point.end, nextPoint.start)));
                }
            } else {
                // 添加最后一个样式点之后的文本
                if (point.end < text.length) {
                    runs.push(new docx.TextRun(text.substring(point.end)));
                }
            }
        }
        
        // 如果最终没有产生任何runs，返回原始文本
        if (runs.length === 0) {
            console.log('没有解析出任何样式，返回原始文本');
            return [new docx.TextRun(text)];
        }
        
        return runs;
    }
};

// 全局导出
window.ExportService = ExportService; 