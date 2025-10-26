// ==UserScript==
// @name         NotebookLM MathJax Injector (CSP Fixed)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Inject MathJax into Google NotebookLM with CSP workaround and enhanced math rendering
// @author       ergs0204 (with Zolangui modifications)
// @match        https://notebooklm.google.com/*
// @grant        GM_addStyle
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // Logging function for debugging
    function log(message, type = 'INFO') {
        console.log(`[MathJax] ${new Date().toISOString()}: ${message}`, type);
    }

    // Enhanced math symbol mapping for better LaTeX support
    const mathSymbols = {
        // Greek letters
        'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta', 'ε': '\\varepsilon',
        'ζ': '\\zeta', 'η': '\\eta', 'θ': '\\theta', 'ι': '\\iota', 'κ': '\\kappa',
        'λ': '\\lambda', 'μ': '\\mu', 'ν': '\\nu', 'ξ': '\\xi', 'π': '\\pi',
        'ρ': '\\rho', 'σ': '\\sigma', 'τ': '\\tau', 'υ': '\\upsilon', 'φ': '\\phi',
        'χ': '\\chi', 'ψ': '\\psi', 'ω': '\\omega',
        
        // Uppercase Greek letters
        'Α': '\\Alpha', 'Β': '\\Beta', 'Γ': '\\Gamma', 'Δ': '\\Delta', 'Ε': '\\Epsilon',
        'Ζ': '\\Zeta', 'Η': '\\Eta', 'Θ': '\\Theta', 'Ι': '\\Iota', 'Κ': '\\Kappa',
        'Λ': '\\Lambda', 'Μ': '\\Mu', 'Ν': '\\Nu', 'Ξ': '\\Xi', 'Π': '\\Pi',
        'Ρ': '\\Rho', 'Σ': '\\Sigma', 'Τ': '\\Tau', 'Υ': '\\Upsilon', 'Φ': '\\Phi',
        'Χ': '\\Chi', 'Ψ': '\\Psi', 'Ω': '\\Omega',
        
        // Mathematical symbols
        '∇': '\\nabla', '∂': '\\partial', '∫': '\\int', '∬': '\\iint', '∭': '\\iiint',
        '∮': '\\oint', '∞': '\\infty', '±': '\\pm', '∓': '\\mp', '×': '\\times',
        '÷': '\\div', '√': '\\sqrt', '∛': '\\sqrt[3]', '∜': '\\sqrt[4]',
        '≤': '\\leq', '≥': '\\geq', '≠': '\\neq', '≈': '\\approx', '≡': '\\equiv',
        '∈': '\\in', '∉': '\\notin', '⊂': '\\subset', '⊃': '\\supset', '⊆': '\\subseteq',
        '⊇': '\\supseteq', '∪': '\\cup', '∩': '\\cap', '∅': '\\emptyset',
        '∀': '\\forall', '∃': '\\exists', '∄': '\\nexists',
        '→': '\\rightarrow', '←': '\\leftarrow', '↔': '\\leftrightarrow',
        '⇒': '\\Rightarrow', '⇐': '\\Leftarrow', '⇔': '\\Leftrightarrow',
        '∧': '\\wedge', '∨': '\\vee', '¬': '\\neg', '⊥': '\\perp',
        
        // Superscripts and subscripts
        '⁰': '^0', '¹': '^1', '²': '^2', '³': '^3', '⁴': '^4', '⁵': '^5',
        '⁶': '^6', '⁷': '^7', '⁸': '^8', '⁹': '^9', '⁺': '^+', '⁻': '^-',
        '₀': '_0', '₁': '_1', '₂': '_2', '₃': '_3', '₄': '_4', '₅': '_5',
        '₆': '_6', '₇': '_7', '₈': '_8', '₉': '_9', '₊': '_+', '₋': '_-'
    };

    // Convert Unicode symbols to LaTeX
    function convertUnicodeToLatex(text) {
        let result = text;
        for (const [unicode, latex] of Object.entries(mathSymbols)) {
            result = result.replace(new RegExp(unicode, 'g'), latex);
        }
        return result;
    }

    // Enhanced math rendering function
    function createEnhancedMathRenderer() {
        function renderMath(element) {
            let text = element.textContent || element.innerText;
            if (!text) return false;

            let processed = text;
            let hasMath = false;

            // Convert Unicode symbols to LaTeX first
            processed = convertUnicodeToLatex(processed);

            // Handle display math $$...$$
            processed = processed.replace(/\$\$([^$]+?)\$\$/gs, (match, math) => {
                hasMath = true;
                const cleanMath = math.trim();
                const originalLatex = `$$${cleanMath}$$`;
                return `<div class="math-display" data-math="${cleanMath}" data-original="${originalLatex}" title="点击复制原始LaTeX公式">${renderLatexToHtml(cleanMath)}<span class="math-copy-btn" onclick="copyMathFormula('${originalLatex.replace(/'/g, "\\'")}')" title="复制原始公式">📋</span></div>`;
            });

            // Handle inline math $...$
            processed = processed.replace(/\$([^$]+?)\$/g, (match, math) => {
                hasMath = true;
                const cleanMath = math.trim();
                const originalLatex = `$${cleanMath}$`;
                return `<span class="math-inline" data-math="${cleanMath}" data-original="${originalLatex}" title="点击复制原始LaTeX公式">${renderLatexToHtml(cleanMath)}<span class="math-copy-btn-inline" onclick="copyMathFormula('${originalLatex.replace(/'/g, "\\'")}')" title="复制原始公式">📋</span></span>`;
            });

            // Handle LaTeX inline \(...\)
            processed = processed.replace(/\\\(([^)]+?)\\\)/g, (match, math) => {
                hasMath = true;
                const cleanMath = math.trim();
                const originalLatex = `\\(${cleanMath}\\)`;
                return `<span class="math-inline" data-math="${cleanMath}" data-original="${originalLatex}" title="点击复制原始LaTeX公式">${renderLatexToHtml(cleanMath)}<span class="math-copy-btn-inline" onclick="copyMathFormula('${originalLatex.replace(/'/g, "\\'")}')" title="复制原始公式">📋</span></span>`;
            });

            // Handle LaTeX display \[...\]
            processed = processed.replace(/\\\[([^\]]+?)\\\]/g, (match, math) => {
                hasMath = true;
                const cleanMath = math.trim();
                const originalLatex = `\\[${cleanMath}\\]`;
                return `<div class="math-display" data-math="${cleanMath}" data-original="${originalLatex}" title="点击复制原始LaTeX公式">${renderLatexToHtml(cleanMath)}<span class="math-copy-btn" onclick="copyMathFormula('${originalLatex.replace(/'/g, "\\'")}')" title="复制原始公式">📋</span></div>`;
            });

            if (hasMath && processed !== text) {
                element.innerHTML = processed;
                return true;
            }
            return false;
        }

        return { renderMath };
    }

    // Simple LaTeX to HTML renderer for basic math expressions
    function renderLatexToHtml(latex) {
        let html = latex;
        
        // Handle fractions
        html = html.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '<span class="frac"><span class="numerator">$1</span><span class="denominator">$2</span></span>');
        
        // Handle superscripts
        html = html.replace(/\^(\w+)/g, '<sup>$1</sup>');
        html = html.replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>');
        
        // Handle subscripts
        html = html.replace(/_(\w+)/g, '<sub>$1</sub>');
        html = html.replace(/_\{([^}]+)\}/g, '<sub>$1</sub>');
        
        // Handle square roots
        html = html.replace(/\\sqrt\{([^}]+)\}/g, '<span class="sqrt">√<span class="radicand">$1</span></span>');
        
        // Handle integrals
        html = html.replace(/\\int/g, '<span class="integral">∫</span>');
        html = html.replace(/\\sum/g, '<span class="sum">Σ</span>');
        html = html.replace(/\\prod/g, '<span class="prod">∏</span>');
        
        // Handle Greek letters and symbols
        html = html.replace(/\\alpha/g, '<span class="greek">α</span>');
        html = html.replace(/\\beta/g, '<span class="greek">β</span>');
        html = html.replace(/\\gamma/g, '<span class="greek">γ</span>');
        html = html.replace(/\\delta/g, '<span class="greek">δ</span>');
        html = html.replace(/\\epsilon/g, '<span class="greek">ε</span>');
        html = html.replace(/\\theta/g, '<span class="greek">θ</span>');
        html = html.replace(/\\lambda/g, '<span class="greek">λ</span>');
        html = html.replace(/\\mu/g, '<span class="greek">μ</span>');
        html = html.replace(/\\pi/g, '<span class="greek">π</span>');
        html = html.replace(/\\sigma/g, '<span class="greek">σ</span>');
        html = html.replace(/\\tau/g, '<span class="greek">τ</span>');
        html = html.replace(/\\phi/g, '<span class="greek">φ</span>');
        html = html.replace(/\\omega/g, '<span class="greek">ω</span>');
        
        // Handle uppercase Greek letters
        html = html.replace(/\\Gamma/g, '<span class="greek">Γ</span>');
        html = html.replace(/\\Delta/g, '<span class="greek">Δ</span>');
        html = html.replace(/\\Theta/g, '<span class="greek">Θ</span>');
        html = html.replace(/\\Lambda/g, '<span class="greek">Λ</span>');
        html = html.replace(/\\Sigma/g, '<span class="greek">Σ</span>');
        html = html.replace(/\\Phi/g, '<span class="greek">Φ</span>');
        html = html.replace(/\\Omega/g, '<span class="greek">Ω</span>');
        
        // Handle operators
        html = html.replace(/\\nabla/g, '<span class="operator">∇</span>');
        html = html.replace(/\\partial/g, '<span class="operator">∂</span>');
        html = html.replace(/\\infty/g, '<span class="operator">∞</span>');
        html = html.replace(/\\leq/g, '<span class="operator">≤</span>');
        html = html.replace(/\\geq/g, '<span class="operator">≥</span>');
        html = html.replace(/\\neq/g, '<span class="operator">≠</span>');
        html = html.replace(/\\approx/g, '<span class="operator">≈</span>');
        html = html.replace(/\\equiv/g, '<span class="operator">≡</span>');
        html = html.replace(/\\in/g, '<span class="operator">∈</span>');
        html = html.replace(/\\subset/g, '<span class="operator">⊂</span>');
        html = html.replace(/\\supset/g, '<span class="operator">⊃</span>');
        html = html.replace(/\\cup/g, '<span class="operator">∪</span>');
        html = html.replace(/\\cap/g, '<span class="operator">∩</span>');
        html = html.replace(/\\emptyset/g, '<span class="operator">∅</span>');
        html = html.replace(/\\forall/g, '<span class="operator">∀</span>');
        html = html.replace(/\\exists/g, '<span class="operator">∃</span>');
        html = html.replace(/\\rightarrow/g, '<span class="operator">→</span>');
        html = html.replace(/\\leftarrow/g, '<span class="operator">←</span>');
        html = html.replace(/\\leftrightarrow/g, '<span class="operator">↔</span>');
        html = html.replace(/\\Rightarrow/g, '<span class="operator">⇒</span>');
        html = html.replace(/\\Leftarrow/g, '<span class="operator">⇐</span>');
        html = html.replace(/\\Leftrightarrow/g, '<span class="operator">⇔</span>');
        
        // Handle mathematical sets
        html = html.replace(/\\mathbb\{R\}/g, '<span class="mathset">ℝ</span>');
        html = html.replace(/\\mathbb\{N\}/g, '<span class="mathset">ℕ</span>');
        html = html.replace(/\\mathbb\{Z\}/g, '<span class="mathset">ℤ</span>');
        html = html.replace(/\\mathbb\{Q\}/g, '<span class="mathset">ℚ</span>');
        html = html.replace(/\\mathbb\{C\}/g, '<span class="mathset">ℂ</span>');
        
        return html;
    }

    // Copy math formula function
    function copyMathFormula(formula) {
        try {
            navigator.clipboard.writeText(formula).then(() => {
                log(`已复制公式到剪贴板: ${formula}`);
                showCopyNotification('公式已复制到剪贴板！');
            }).catch(err => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = formula;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                log(`已复制公式到剪贴板 (fallback): ${formula}`);
                showCopyNotification('公式已复制到剪贴板！');
            });
        } catch (err) {
            console.error('复制失败:', err);
            showCopyNotification('复制失败，请手动复制', 'error');
        }
    }

    // Show copy notification
    function showCopyNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `math-copy-notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : '#dc3545'};
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 2000);
    }

    // Add enhanced CSS for math styling
    function addMathStyles() {
        const styles = `
            .math-inline {
                background: linear-gradient(135deg, rgba(0, 123, 255, 0.08), rgba(0, 123, 255, 0.12));
                padding: 2px 6px;
                border-radius: 4px;
                font-family: 'Times New Roman', 'STIX Two Math', 'Cambria Math', serif;
                font-style: italic;
                color: #0066cc;
                border: 1px solid rgba(0, 123, 255, 0.2);
                display: inline-block;
                margin: 0 1px;
                font-size: 1.05em;
                line-height: 1.2;
                vertical-align: baseline;
                box-shadow: 0 1px 3px rgba(0, 123, 255, 0.1);
                transition: all 0.2s ease;
            }

            .math-inline:hover {
                background: linear-gradient(135deg, rgba(0, 123, 255, 0.12), rgba(0, 123, 255, 0.16));
                box-shadow: 0 2px 6px rgba(0, 123, 255, 0.15);
                transform: translateY(-1px);
            }

            .math-display {
                background: linear-gradient(135deg, rgba(0, 123, 255, 0.05), rgba(0, 123, 255, 0.08));
                padding: 15px 20px;
                margin: 15px 0;
                border-radius: 8px;
                font-family: 'Times New Roman', 'STIX Two Math', 'Cambria Math', serif;
                font-style: italic;
                text-align: center;
                color: #0066cc;
                border: 2px solid rgba(0, 123, 255, 0.15);
                font-size: 1.3em;
                line-height: 1.4;
                box-shadow: 0 2px 8px rgba(0, 123, 255, 0.08);
                position: relative;
            }

            .math-display::before {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 4px;
                background: linear-gradient(to bottom, #0066cc, #004499);
                border-radius: 4px 0 0 4px;
            }

            .math-processed {
                background: linear-gradient(90deg, rgba(40, 167, 69, 0.08), transparent);
                border-left: 3px solid #28a745;
                padding-left: 10px;
                position: relative;
            }

            /* Fraction styling */
            .frac {
                display: inline-block;
                text-align: center;
                vertical-align: middle;
                margin: 0 2px;
            }

            .numerator, .denominator {
                display: block;
                padding: 1px 3px;
            }

            .numerator {
                border-bottom: 1px solid #0066cc;
                margin-bottom: 1px;
            }

            /* Superscript and subscript styling */
            sup {
                font-size: 0.7em;
                vertical-align: super;
                color: #004499;
            }

            sub {
                font-size: 0.7em;
                vertical-align: sub;
                color: #004499;
            }

            /* Square root styling */
            .sqrt {
                position: relative;
                display: inline-block;
            }

            .sqrt::before {
                content: '√';
                position: absolute;
                left: -8px;
                top: -2px;
                font-size: 1.2em;
                color: #0066cc;
            }

            .radicand {
                border-top: 1px solid #0066cc;
                padding-left: 8px;
                padding-top: 1px;
            }

            /* Greek letters and operators styling */
            .greek, .operator, .mathset {
                font-weight: bold;
                color: #004499;
            }

            .operator {
                font-size: 1.1em;
            }

            .mathset {
                font-style: normal;
                font-weight: bold;
            }

            /* Integral and sum styling */
            .integral, .sum, .prod {
                font-size: 1.5em;
                font-weight: bold;
                color: #0066cc;
                vertical-align: middle;
            }

            /* Copy button styling */
            .math-copy-btn, .math-copy-btn-inline {
                cursor: pointer;
                margin-left: 5px;
                opacity: 0.6;
                transition: opacity 0.2s ease;
                font-size: 0.8em;
                user-select: none;
                display: inline-block;
                vertical-align: middle;
            }

            .math-copy-btn:hover, .math-copy-btn-inline:hover {
                opacity: 1;
                transform: scale(1.1);
            }

            .math-display:hover .math-copy-btn,
            .math-inline:hover .math-copy-btn-inline {
                opacity: 0.8;
            }

            /* Notification animations */
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }

            /* Responsive design */
            @media (max-width: 768px) {
                .math-display {
                    font-size: 1.1em;
                    padding: 10px 15px;
                }
                
                .math-inline {
                    font-size: 1em;
                }
            }

            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .math-inline {
                    background: linear-gradient(135deg, rgba(0, 123, 255, 0.15), rgba(0, 123, 255, 0.2));
                    color: #66b3ff;
                    border-color: rgba(0, 123, 255, 0.3);
                }

                .math-display {
                    background: linear-gradient(135deg, rgba(0, 123, 255, 0.1), rgba(0, 123, 255, 0.15));
                    color: #66b3ff;
                    border-color: rgba(0, 123, 255, 0.25);
                }

                .math-display::before {
                    background: linear-gradient(to bottom, #66b3ff, #4d94ff);
                }
            }
        `;

        if (typeof GM_addStyle !== 'undefined') {
            GM_addStyle(styles);
        } else {
            const styleSheet = document.createElement('style');
            styleSheet.textContent = styles;
            document.head.appendChild(styleSheet);
        }
    }

    // Process math expressions in the content
    function processMathExpressions() {
        log('🚀 开始处理数学表达式...');

        const renderer = createEnhancedMathRenderer();
        let processedCount = 0;

        // Look for various selectors that might contain math
        const selectors = [
            '.notebook-content',
            '[data-testid="notebook-content"]',
            '.content',
            '.text-content',
            'div[role="textbox"]',
            '.note-content',
            '.labs-tailwind-doc-viewer',
            '.note-editor',
            'p',
            'div',
            'span'
        ];

        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                // Skip if already processed
                if (element.classList.contains('math-processed')) return;

                // Skip if element contains only child elements (no direct text)
                if (element.children.length > 0 && !element.textContent.trim()) return;

                // Check if element contains potential math
                const text = element.textContent || element.innerText || '';
                if (text.includes('$') || text.includes('\\(') || text.includes('\\[') || 
                    Object.keys(mathSymbols).some(symbol => text.includes(symbol))) {
                    if (renderer.renderMath(element)) {
                        element.classList.add('math-processed');
                        processedCount++;
                        log(`已处理元素中的数学公式: ${element.tagName}`);
                    }
                }
            });
        }

        if (processedCount > 0) {
            log(`✅ 成功处理了 ${processedCount} 个包含数学表达式的元素`);
        } else {
            log('未找到需要处理的数学表达式');
        }
    }

    // Enhanced content detection
    function waitForContent() {
        log('等待 NotebookLM 内容加载...');

        const selectors = [
            '.notebook-content',
            '[data-testid="notebook-content"]',
            '.content',
            'div[role="main"]',
            'main',
            '.labs-tailwind-doc-viewer',
            '.note-editor'
        ];

        let attempts = 0;
        const maxAttempts = 50;

        const checkInterval = setInterval(() => {
            attempts++;

            for (const selector of selectors) {
                const content = document.querySelector(selector);
                if (content && content.textContent.trim()) {
                    clearInterval(checkInterval);
                    log(`找到内容，使用选择器: ${selector}`);
                    setTimeout(() => {
                        processMathExpressions();
                        setupMutationObserver();
                    }, 1000);
                    return;
                }
            }

            if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                log('达到最大尝试次数，强制处理');
                processMathExpressions();
                setupMutationObserver();
            }
        }, 200);
    }

    // Set up mutation observer for dynamic content
    function setupMutationObserver() {
        log('设置动态内容的突变观察器...');

        const observer = new MutationObserver((mutations) => {
            let shouldProcess = false;

            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const text = node.textContent || '';
                            if (text.includes('$') || text.includes('\\(') || text.includes('\\[') ||
                                Object.keys(mathSymbols).some(symbol => text.includes(symbol))) {
                                shouldProcess = true;
                            }
                        }
                    });
                }
            });

            if (shouldProcess) {
                setTimeout(processMathExpressions, 500);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // URL change detection for SPA
    function setupUrlChangeDetection() {
        let lastUrl = location.href;

        const observer = new MutationObserver(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                if (location.href.includes('notebooklm.google.com')) {
                    log('URL 已更改，重新初始化数学公式渲染器');
                    setTimeout(waitForContent, 1000);
                }
            }
        });

        observer.observe(document, { subtree: true, childList: true });
    }

    // Initialize the script
    function initialize() {
        log('启动 NotebookLM 数学公式渲染器');

        // Add math styles immediately
        addMathStyles();

        // Check if we're on the right page
        if (location.href.includes('notebooklm.google.com')) {
            // Wait for page load
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', waitForContent);
            } else {
                waitForContent();
            }

            // Also try after window load
            if (document.readyState !== 'complete') {
                window.addEventListener('load', () => {
                    setTimeout(waitForContent, 2000);
                });
            }

            // Setup URL change detection
            setupUrlChangeDetection();
        }
    }

    // Start initialization
    initialize();

    // Expose functions for manual testing
    unsafeWindow.mathJaxDebug = {
        processMath: processMathExpressions,
        waitForContent: waitForContent,
        convertSymbols: convertUnicodeToLatex,
        copyFormula: copyMathFormula,
        getAllFormulas: () => {
            const formulas = [];
            document.querySelectorAll('[data-original]').forEach(el => {
                formulas.push({
                    original: el.getAttribute('data-original'),
                    rendered: el.textContent.replace('📋', '').trim(),
                    element: el
                });
            });
            return formulas;
        },
        exportAllFormulas: () => {
            const formulas = unsafeWindow.mathJaxDebug.getAllFormulas();
            const latexText = formulas.map(f => f.original).join('\n\n');
            copyMathFormula(latexText);
            return latexText;
        }
    };

    // Make copy function globally available
    unsafeWindow.copyMathFormula = copyMathFormula;

    log('数学公式用户脚本已初始化');

})();
