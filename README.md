# ezlang_tools

`ezlang-copy.user.js` 是一个用于 `https://www.ezlang.net/zh-Hans/tool/kana` 的 Tampermonkey 用户脚本。

它会在页面原有的 **“转换”** 按钮右侧追加两个快捷按钮，方便直接复制假名转换结果。

## 功能说明

脚本注入后，会自动监听页面 DOM 变化，并在合适的位置挂载以下按钮：

- `复制源码`
	- 提取“转换结果”区域中的可见内容
	- 清洗节点，仅保留 `div`、`span`、`ruby`、`rt`、`rb`、`rp`、`br` 等安全标签
	- 将结果复制为 HTML 源码，适合保留 `ruby`/注音结构
	- 配合思源笔记 html块使用

- `复制格式`
	- 将结果转换为更适合二次处理的纯文本格式
	- 对 `ruby` 结构按 `汉字<假名>` 的形式输出
	- 同一行多个 `ruby` 片段之间使用 `|` 分隔
	- 多行内容使用换行符分隔
	- 配合obsidian拓展`https://github.com/k-quels/japanese-novel-ruby`使用

## 适用场景

- 复制带有 `ruby` 标记的 HTML 结果，方便粘贴到支持 HTML 的编辑器或网页中
- 将假名转换结果导出为结构化文本，便于：
	- 记忆卡片制作
	- 文本整理
	- 后续脚本处理
	- 导入其他学习工具

## 安装方式

1. 安装浏览器扩展：`Tampermonkey`
2. 【[安装此脚本_github源](https://github.com/glassywater/ezlang_tools/raw/refs/heads/main/ezlang-copy.user.js)】
   【[安装此脚本_Greasy Fork源](https://update.greasyfork.org/scripts/568962/EzLang%20%E5%81%87%E5%90%8D%E7%BB%93%E6%9E%9C%E5%A4%8D%E5%88%B6.user.js)】
3. 打开：`https://www.ezlang.net/zh-Hans/tool/kana`
4. 在页面点击“转换”后，即可使用右侧新增的复制按钮

## 输出示例

### 复制源码

输出类似：

`<div><ruby>日本語<rt>にほんご</rt></ruby></div>`

### 复制格式

输出类似：

`日本語<にほんご>`

若同一行有多个注音片段，则类似：

`私<わたし>|学生<がくせい>`

## 文件说明

- `ezlang-copy.user.js`：Tampermonkey 用户脚本主体
- `README.md`：项目说明文档

## 许可证

本仓库包含 `LICENSE` 文件，具体许可条款请查看对应内容。
