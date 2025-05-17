# Markdown 转 Word 导出工具

这是一个简单而强大的工具，可以将 Markdown 格式的文本转换为 Word 文档(.docx)并下载，无需修改原有代码。

## 功能特性

* 完整支持常用 Markdown 语法：
  * 多级标题（H1-H4）
  * 粗体、斜体等内联样式
  * 无序列表
  * 代码块（支持语法高亮）
  * 行内代码
* 生成格式精美的 Word 文档，自动应用合适的样式
* 文件名支持自动添加时间戳，方便管理多个导出文件
* 轻量级实现，仅依赖 docx.js 和 FileSaver.min.js
* 可以独立使用，不影响现有代码

## 如何使用

### 1. 引入必要的文件

在HTML文件的`<head>`部分引入以下脚本文件：

```html
<!-- 添加docx.js用于生成Word文档 -->
<script src="js/docx.js"></script>
<!-- 添加FileSaver.js用于保存文件 -->
<script src="js/FileSaver.min.js"></script>
<!-- 引入我们的Markdown转Word工具 -->
<script src="js/markdown-to-word.js"></script>
```

### 2. 使用导出功能

有两种方式可以使用这个工具：

#### 方法一：直接调用转换函数

```javascript
// 转换Markdown为Word并下载
window.MarkdownToWord.convert(markdownText, '文件名');
```

#### 方法二：创建导出按钮

```javascript
// 创建一个导出按钮并添加到指定容器
const button = window.MarkdownToWord.createButton(
    containerElement,  // 按钮将被添加到这个容器元素
    markdownText,      // 要转换的Markdown文本
    '文件名'           // 导出文件的名称（不含扩展名）
);
```

## 演示示例

我们提供了一个完整的演示页面 `markdown-to-word-demo.html`，展示了如何使用这个工具。您可以：

1. 在左侧输入框中输入或粘贴Markdown文本
2. 右侧会实时预览渲染效果
3. 点击"导出为Word文档"按钮生成并下载Word文件

## 技术说明

* 该工具使用 docx.js 生成 Word 文档
* 使用 FileSaver.min.js 实现浏览器端的文件下载
* 文档解析和格式转换完全在浏览器中进行，不需要服务器支持
* 导出的文件名会自动添加日期和时间，格式为：`文件名_YYYYMMDD_HHMM.docx`

## 支持的样式

当前版本支持以下Markdown样式：

| Markdown语法 | Word中的效果 |
|-------------|-------------|
| # 标题1     | 大标题，36磅，粗体 |
| ## 标题2    | 中标题，32磅，粗体 |
| ### 标题3   | 小标题，28磅，粗体 |
| #### 标题4  | 迷你标题，26磅，粗体 |
| **粗体文本** | 粗体文本 |
| *斜体文本*   | 斜体文本 |
| `行内代码`   | 等宽字体，灰色背景 |
| ```代码块``` | 等宽字体，灰色背景，前后有间距 |
| - 列表项     | 项目符号列表 |

## 设计思路

为了不修改原有代码，这个工具采用了以下设计策略：

1. 将所有功能封装在一个独立的JS文件中
2. 通过window对象导出API，便于在其他脚本中调用
3. 检测环境中是否存在displayMessage等函数，实现优雅降级
4. 提供了一个高级API，允许自定义按钮和功能

## 常见问题

**Q: 是否支持有序列表？**  
A: 当前版本暂不支持有序列表，将在未来版本中添加。

**Q: 是否支持表格？**  
A: 当前版本暂不支持Markdown表格，将在未来版本中添加。

**Q: 导出的Word文档可以编辑吗？**  
A: 是的，导出的是标准.docx格式，可以使用Microsoft Word或其他兼容软件编辑。 