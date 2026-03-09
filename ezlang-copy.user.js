// ==UserScript==
// @name         EzLang 假名结果复制
// @namespace    https://github.com/glassywater/ezlang_tools
// @version      1.0.0
// @author       glassywater
// @description  在转换按钮右侧添加复制按钮，复制转换结果的 HTML 源码
// @match        https://www.ezlang.net/zh-Hans/tool/kana
// @grant        GM_setClipboard
// @license      GPL-3.0-only
// ==/UserScript==

(function () {
    'use strict';

    const BUTTON_CONFIGS = {
        source: {
            id: 'tm-copy-kana-result-btn',
            text: '复制源码',
            color: '#16a34a',
        },
        format: {
            id: 'tm-copy-kana-format-btn',
            text: '复制格式',
            color: '#2563eb',
        },
    };
    const BUTTON_COPIED_TEXT = '已复制';
    const BUTTON_FAILED_TEXT = '失败';
    const RESET_DELAY = 1500;
    const DEBUG_PREFIX = '[EzLang Copy]';
    const ALLOWED_TAGS = new Set(['div', 'span', 'ruby', 'rt', 'rb', 'rp', 'br']);
    const CONVERT_BUTTON_TEXT = '转换';
    const RESULT_TITLE_TEXT = '转换结果';
    let mountScheduled = false;

    function getConvertButton() {
        return Array.from(document.querySelectorAll('button')).find((button) => {
            return (button.textContent || '').trim() === CONVERT_BUTTON_TEXT;
        });
    }

    function getResultContainer() {
        const resultTitle = Array.from(document.querySelectorAll('div')).find((element) => {
            return (element.textContent || '').trim() === RESULT_TITLE_TEXT;
        });

        const card = resultTitle?.closest('.rounded-xl.border.bg-card.text-card-foreground.shadow.my-6');
        if (!card) {
            return null;
        }

        return card.querySelector('[lang="ja"] > div') || null;
    }

    function setButtonState(button, { text, background, disabled = false, resetText }) {
        const originalBackground = button.style.background;
        const originalText = button.dataset.defaultText || button.textContent || '';

        button.textContent = text;
        button.disabled = disabled;
        button.style.background = background;

        window.setTimeout(() => {
            button.textContent = resetText || originalText;
            button.disabled = false;
            button.style.background = originalBackground;
        }, RESET_DELAY);
    }

    function setButtonCopiedState(button) {
        setButtonState(button, {
            text: BUTTON_COPIED_TEXT,
            background: '#15803d',
            disabled: true,
        });
    }

    function setButtonFailedState(button) {
        setButtonState(button, {
            text: BUTTON_FAILED_TEXT,
            background: '#dc2626',
        });
    }

    function setButtonDefaultStyle(button, background) {
        button.style.marginLeft = '8px';
        button.style.padding = '0 16px';
        button.style.height = '40px';
        button.style.border = 'none';
        button.style.borderRadius = '6px';
        button.style.background = background;
        button.style.color = '#fff';
        button.style.fontSize = '14px';
        button.style.fontWeight = '600';
        button.style.cursor = 'pointer';
    }

    function buildPlainText(container) {
        return (container.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function isVisibleNode(node) {
        if (!(node instanceof Element)) {
            return true;
        }

        const style = window.getComputedStyle(node);
        return style.display !== 'none' && style.visibility !== 'hidden';
    }

    function cloneCleanNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            return document.createTextNode(node.textContent || '');
        }

        if (!(node instanceof Element) || !isVisibleNode(node)) {
            return null;
        }

        const tagName = node.tagName.toLowerCase();
        const targetTag = ALLOWED_TAGS.has(tagName) ? tagName : 'span';
        const clone = document.createElement(targetTag);

        Array.from(node.childNodes).forEach((child) => {
            const childClone = cloneCleanNode(child);
            if (childClone) {
                clone.appendChild(childClone);
            }
        });

        if (tagName === 'br') {
            return clone;
        }

        if (!clone.childNodes.length && !clone.textContent?.trim()) {
            return null;
        }

        return clone;
    }

    function buildCleanHtml(container) {
        const cleanRoot = cloneCleanNode(container);
        return cleanRoot ? cleanRoot.outerHTML : '';
    }

    function formatSpecialText(container) {
        const lines = Array.from(container.children).map((line) => {
            let output = '';
            let rubyCount = 0;

            Array.from(line.childNodes).forEach((node) => {
                if (node.nodeType === Node.TEXT_NODE) {
                    output += node.textContent || '';
                    return;
                }

                if (!(node instanceof Element)) {
                    return;
                }

                const tagName = node.tagName.toLowerCase();

                if (tagName === 'ruby') {
                    const baseText = Array.from(node.childNodes)
                        .filter((child) => !(child instanceof Element && child.tagName.toLowerCase() === 'rt'))
                        .map((child) => child.textContent || '')
                        .join('');
                    const rubyText = Array.from(node.querySelectorAll(':scope > rt'))
                        .map((rt) => rt.textContent || '')
                        .join('');

                    if (rubyCount > 0) {
                        output += '|';
                    }

                    output += `${baseText}<${rubyText}>`;
                    rubyCount += 1;
                    return;
                }

                output += node.textContent || '';
            });

            return output.trim();
        });

        return lines.filter(Boolean).join('\n');
    }

    function fallbackCopyText(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const copied = document.execCommand('copy');
        textarea.remove();
        return copied;
    }

    async function writeToClipboard(content, logLabel) {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(content);
                console.log(DEBUG_PREFIX, `writeText ${logLabel}复制成功`);
            } else {
                if (typeof GM_setClipboard === 'function') {
                    GM_setClipboard(content, 'text');
                    console.log(DEBUG_PREFIX, `GM_setClipboard ${logLabel}复制已执行`);
                } else {
                    const copied = fallbackCopyText(content);
                    console.log(DEBUG_PREFIX, `textarea ${logLabel}复制结果:`, copied);
                    if (!copied) {
                        throw new Error('fallback copy failed');
                    }
                }
            }

            return true;
        } catch (error) {
            console.error(DEBUG_PREFIX, `${logLabel}复制失败:`, error);
            const copied = fallbackCopyText(content);
            console.log(DEBUG_PREFIX, `异常后${logLabel}复制结果:`, copied);
            return copied;
        }
    }

    async function copyWithBuilder(button, builder, { emptyMessage, logLabel }) {
        const container = getResultContainer();
        if (!container) {
            console.warn(DEBUG_PREFIX, '未找到结果区域');
            setButtonFailedState(button);
            return;
        }

        const content = builder(container);

        console.log(DEBUG_PREFIX, `${logLabel}长度:`, content.length);

        if (!content.trim()) {
            console.warn(DEBUG_PREFIX, emptyMessage);
            setButtonFailedState(button);
            return;
        }

        const copied = await writeToClipboard(content, logLabel);
        if (copied) {
            setButtonCopiedState(button);
            return;
        }

        setButtonFailedState(button);
    }

    async function copySourceCode(button) {
        const container = getResultContainer();
        if (!container) {
            console.warn(DEBUG_PREFIX, '未找到结果区域');
            setButtonFailedState(button);
            return;
        }

        const html = buildCleanHtml(container);
        const text = buildPlainText(container);

        console.log(DEBUG_PREFIX, '结果区域已找到');
        console.log(DEBUG_PREFIX, 'HTML 长度:', html.length);
        console.log(DEBUG_PREFIX, '文本长度:', text.length);

        await copyWithBuilder(button, buildCleanHtml, {
            emptyMessage: '提取结果为空',
            logLabel: '源码',
        });
    }

    async function copyFormattedText(button) {
        await copyWithBuilder(button, formatSpecialText, {
            emptyMessage: '格式文本为空',
            logLabel: '格式',
        });
    }

    function createActionButton(config, onClick) {
        const button = document.createElement('button');
        button.id = config.id;
        button.type = 'button';
        button.textContent = config.text;
        button.dataset.defaultText = config.text;
        setButtonDefaultStyle(button, config.color);
        button.addEventListener('click', () => onClick(button));
        return button;
    }

    function mountButton() {
        const convertButton = getConvertButton();
        if (!convertButton) {
            return;
        }

        if (!document.getElementById(BUTTON_CONFIGS.source.id)) {
            convertButton.insertAdjacentElement('afterend', createActionButton(BUTTON_CONFIGS.source, copySourceCode));
        }

        if (!document.getElementById(BUTTON_CONFIGS.format.id)) {
            const copyButton = document.getElementById(BUTTON_CONFIGS.source.id);
            copyButton?.insertAdjacentElement('afterend', createActionButton(BUTTON_CONFIGS.format, copyFormattedText));
        }
    }

    function scheduleMountButton() {
        if (mountScheduled) {
            return;
        }

        mountScheduled = true;
        window.requestAnimationFrame(() => {
            mountScheduled = false;
            mountButton();
        });
    }

    const observer = new MutationObserver(() => {
        scheduleMountButton();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    scheduleMountButton();
})();
