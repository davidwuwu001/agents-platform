/**
 * markdown-to-word.js
 * 将Markdown文本转换为Word文档并下载
 * 需要依赖docx.js和FileSaver.min.js
 */

/**
 * 将Markdown文本转换为Word文档并下载
 * @param {string} markdown - Markdown格式的文本
 * @param {string} filename - 下载的文件名（不含扩展名）
 * @returns {Promise<void>}
 */
async function markdownToWord(markdown, filename = 'AI回复文档') {
    try {
        // 添加时间戳到文件名
        const now = new Date();
        const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
        filename = `${filename}_${timestamp}`;
        
        console.log('开始转换Markdown为Word...');
        
        // 解析Markdown为Word段落
        const paragraphs = parseMarkdownForWord(markdown);
        
        // 定义一些文档样式
        const styles = {
            heading1: {
                run: {
                    size: 36,
                    bold: true,
                    color: "000000",
                },
                paragraph: {
                    spacing: {
                        after: 200,
                    },
                },
            },
            heading2: {
                run: {
                    size: 32,
                    bold: true,
                    color: "000000",
                },
                paragraph: {
                    spacing: {
                        after: 120,
                    },
                },
            },
            heading3: {
                run: {
                    size: 28,
                    bold: true,
                    color: "000000",
                },
                paragraph: {
                    spacing: {
                        after: 100,
                    },
                },
            },
            heading4: {
                run: {
                    size: 26,
                    bold: true,
                    color: "000000",
                },
                paragraph: {
                    spacing: {
                        after: 80,
                    },
                },
            },
            codeBlock: {
                run: {
                    font: "Courier New",
                    size: 24,
                },
                paragraph: {
                    spacing: {
                        before: 120,
                        after: 120,
                    },
                    shading: {
                        type: docx.ShadingType.SOLID,
                        color: "F0F0F0",
                    },
                },
            },
        };
        
        // 创建Word文档
        const doc = new docx.Document({
            styles: {
                paragraphStyles: [
                    styles.heading1,
                    styles.heading2,
                    styles.heading3,
                    styles.heading4,
                    styles.codeBlock,
                ],
            },
            sections: [
                {
                    properties: {},
                    children: paragraphs,
                },
            ],
        });
        
        // 生成Word文档的二进制数据
        const blob = await docx.Packer.toBlob(doc);
        
        // 下载Word文档
        saveAs(blob, `${filename}.docx`);
        
        console.log('Word文档已生成并下载');
        
        // 如果外部环境有displayMessage函数，则调用它显示提示
        if (typeof displayMessage === 'function') {
            displayMessage('提示', 'Word文档已生成并下载', 'system-message');
        }
    } catch (error) {
        console.error('生成Word文档时出错:', error);
        
        // 如果外部环境有displayMessage函数，则调用它显示错误
        if (typeof displayMessage === 'function') {
            displayMessage('提示', `生成Word文档失败: ${error.message}`, 'system-message');
        }
    }
}

/**
 * 解析Markdown文本为Word段落
 * @param {string} markdown - Markdown格式的文本
 * @returns {Array} Word段落数组
 */
function parseMarkdownForWord(markdown) {
    // 将Markdown文本拆分为行
    const lines = markdown.split('\n');
    const paragraphs = [];
    
    console.log('开始解析Markdown为Word段落，共', lines.length, '行');
    
    let inCodeBlock = false;
    let codeContent = [];
    
    // 遍历每一行
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // 处理代码块
        if (line.startsWith('```')) {
            if (!inCodeBlock) {
                inCodeBlock = true;
                codeContent = [];
            } else {
                // 结束代码块
                inCodeBlock = false;
                if (codeContent.length > 0) {
                    paragraphs.push(new docx.Paragraph({
                        style: "codeBlock",
                        children: [
                            new docx.TextRun({
                                text: codeContent.join('\n'),
                                font: "Courier New",
                                size: 22,
                            })
                        ]
                    }));
                }
            }
            continue;
        }
        
        // 收集代码块内容
        if (inCodeBlock) {
            codeContent.push(line);
            continue;
        }
        
        // 处理标题
        let match;
        if (match = line.match(/^# (.*)/)) {
            paragraphs.push(new docx.Paragraph({
                style: "heading1",
                children: [new docx.TextRun(match[1])]
            }));
        } else if (match = line.match(/^## (.*)/)) {
            paragraphs.push(new docx.Paragraph({
                style: "heading2",
                children: [new docx.TextRun(match[1])]
            }));
        } else if (match = line.match(/^### (.*)/)) {
            paragraphs.push(new docx.Paragraph({
                style: "heading3",
                children: [new docx.TextRun(match[1])]
            }));
        } else if (match = line.match(/^#### (.*)/)) {
            paragraphs.push(new docx.Paragraph({
                style: "heading4",
                children: [new docx.TextRun(match[1])]
            }));
        } else if (line === '') {
            paragraphs.push(new docx.Paragraph({}));
        } else if (match = line.match(/^- (.*)/)) {
            // 处理无序列表
            paragraphs.push(new docx.Paragraph({
                bullet: {
                    level: 0
                },
                children: parseInlineStyles(match[1]),
            }));
        } else {
            // 处理普通段落，包括内联样式（加粗、斜体等）
            const textRuns = parseInlineStyles(line);
            paragraphs.push(new docx.Paragraph({
                children: textRuns
            }));
        }
    }
    
    return paragraphs;
}

/**
 * 解析Markdown内联样式（加粗、斜体、代码等）
 * @param {string} text - 包含内联样式的文本
 * @returns {Array} Word TextRun对象数组
 */
function parseInlineStyles(text) {
    const styleMap = [];
    
    // 添加样式匹配到映射
    const addToMap = (regex, styleType) => {
        let match;
        // 使用正则表达式的exec方法反复查找所有匹配项
        while ((match = regex.exec(text)) !== null) {
            const fullMatch = match[0];
            const content = match[1];
            const start = match.index;
            const end = start + fullMatch.length;
            
            // 添加样式点到映射
            styleMap.push({
                start,
                end,
                content,
                styleType,
                fullMatch
            });
        }
    };
    
    // 查找加粗文本 **text** 或 __text__
    addToMap(/\*\*(.*?)\*\*|__(.*?)__/g, 'bold');
    
    // 查找斜体文本 *text* 或 _text_
    addToMap(/\*(.*?)\*|_(.*?)_/g, 'italic');
    
    // 查找行内代码 `code`
    addToMap(/`([^`]+)`/g, 'code');
    
    // 没有样式点，直接返回原文本
    if (styleMap.length === 0) {
        return [new docx.TextRun(text)];
    }
    
    // 按照起始位置排序样式点
    styleMap.sort((a, b) => a.start - b.start);
    
    // 检查重叠，并移除嵌套的样式点
    for (let i = 0; i < styleMap.length - 1; i++) {
        for (let j = i + 1; j < styleMap.length; j++) {
            if (styleMap[i].start < styleMap[j].start && styleMap[i].end > styleMap[j].start) {
                // 存在重叠，移除第二个样式点
                styleMap.splice(j, 1);
                j--;
            }
        }
    }
    
    const runs = [];
    
    // 处理文本的第一部分（如果有样式点的话）
    if (styleMap[0].start > 0) {
        runs.push(new docx.TextRun(text.substring(0, styleMap[0].start)));
    }
    
    // 处理所有样式点
    for (let i = 0; i < styleMap.length; i++) {
        const point = styleMap[i];
        
        // 根据样式类型创建TextRun
        if (point.styleType === 'bold') {
            runs.push(new docx.TextRun({
                text: point.content,
                bold: true
            }));
        } else if (point.styleType === 'italic') {
            runs.push(new docx.TextRun({
                text: point.content,
                italics: true
            }));
        } else if (point.styleType === 'code') {
            runs.push(new docx.TextRun({
                text: point.content,
                font: "Courier New",
                shading: {
                    type: docx.ShadingType.SOLID,
                    color: "F0F0F0",
                }
            }));
        }
        
        // 处理样式点之间的文本
        if (i < styleMap.length - 1) {
            const nextPoint = styleMap[i + 1];
            if (point.end < nextPoint.start) {
                runs.push(new docx.TextRun(text.substring(point.end, nextPoint.start)));
            }
        }
        
        // 处理最后一个样式点之后的文本
        if (i === styleMap.length - 1 && point.end < text.length) {
            runs.push(new docx.TextRun(text.substring(point.end)));
        }
    }
    
    // 如果没有生成任何runs，返回原始文本
    if (runs.length === 0) {
        return [new docx.TextRun(text)];
    }
    
    return runs;
}

/**
 * 创建导出Word按钮并附加到指定元素
 * @param {HTMLElement} container - 要附加按钮的容器元素
 * @param {string} markdownText - 要导出的Markdown文本
 * @param {string} filename - 导出文件的文件名（不含扩展名）
 * @returns {HTMLButtonElement} 创建的按钮元素
 */
function createWordExportButton(container, markdownText, filename = 'AI回复文档') {
    // 创建导出按钮
    const wordBtn = document.createElement('button');
    wordBtn.className = 'word-btn';
    wordBtn.textContent = '导出Word';
    wordBtn.title = '导出为Word文档';
    
    // 添加点击事件
    wordBtn.onclick = () => {
        markdownToWord(markdownText, filename);
    };
    
    // 添加到容器
    if (container) {
        container.appendChild(wordBtn);
    }
    
    return wordBtn;
}

// 导出功能
window.MarkdownToWord = {
    convert: markdownToWord,
    createButton: createWordExportButton
}; 