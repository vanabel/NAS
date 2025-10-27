/* ========== MediaWiki Common.js 全站脚本 ========== */
/* 功能：
 * 1. 自动初始化 GeoGebra <ggb_applet> 扩展生成的 applet
 * 2. 懒加载 MathJax（只有页面检测到数学公式时才加载）
 * 3. 保证两者可以同时存在，不冲突
 * ================================================== */

(function () {
  'use strict';

  // ---- 数学检测函数 ----
  function pageHasMath(root) {
    const container = root || document.body;
    if (!container) {
      return false;
    }
    const text = container.innerHTML;
    return (
      /\$(.+?)\$/.test(text) || // $...$
      /\$\$(.+?)\$\$/.test(text) || // $$...$$
      /\\\((.+?)\\\)/.test(text) || // \(...\)
      /\\\[(.+?)\\\]/.test(text) // \[...\]
    );
  }

  // ---- GeoGebra 初始化函数 ----
  function initGeoGebra() {
    // 检查 window.ggbParams 是否存在
    if (!window.ggbParams || typeof window.ggbParams !== 'object') {
      return;
    }

    // 检查 GGBApplet 是否已加载
    if (typeof GGBApplet === 'undefined') {
      // GGBApplet 未加载，尝试加载它
      loadGGBApplet();
      return;
    }

    doInitGeoGebra();
  }

  // ---- 加载 GeoGebra Applet 库 ----
  function loadGGBApplet() {
    // 检查是否正在加载或已经加载过
    if (window.ggbLoading || window.ggbLoaded) {
      return;
    }

    window.ggbLoading = true;
    
    // 检查是否已经有 script 标签
    var existingScript = document.querySelector('script[src*="geogebra"]');
    if (existingScript) {
      // 等待脚本加载完成
      existingScript.addEventListener('load', function() {
        window.ggbLoading = false;
        window.ggbLoaded = true;
        doInitGeoGebra();
      });
      return;
    }

    // 动态加载 GeoGebra JavaScript 库
    var script = document.createElement('script');
    script.src = 'https://www.geogebra.org/apps/deployggb.js';
    script.async = true;
    
    script.onload = function() {
      window.ggbLoading = false;
      window.ggbLoaded = true;
      
      // 等待 GGBApplet 可用
      var attempts = 0;
      var maxAttempts = 50; // 最多5秒
      
      var checkInterval = setInterval(function() {
        attempts++;
        
        if (typeof GGBApplet !== 'undefined') {
          clearInterval(checkInterval);
          doInitGeoGebra();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          console.error('GeoGebra: GGBApplet not available after loading the library');
        }
      }, 100);
    };
    
    script.onerror = function() {
      window.ggbLoading = false;
      console.error('GeoGebra: Failed to load the JavaScript library');
    };
    
    document.head.appendChild(script);
  }

  function doInitGeoGebra() {
    if (typeof GGBApplet === 'undefined') {
      return;
    }

    Object.keys(window.ggbParams).forEach(function (key) {
      var params = window.ggbParams[key];
      var containerId = 'ggbContainer' + key;
      var container = document.getElementById(containerId);
      
      if (container) {
        try {
          // 检查容器是否已经被初始化过
          if (container.childNodes.length === 0) {
            var applet = new GGBApplet(params, true);
            applet.inject(containerId);
          }
        } catch (e) {
          console.error('GeoGebra initialization error for ' + containerId + ':', e);
        }
      }
    });
  }

  // ---- MathJax 初始化函数 ----
  function initMathJax($content) {
    var contentNode = $content && $content.get && $content.get(0);
    if (!contentNode || !pageHasMath(contentNode)) {
      return;
    }

    function typeset(target) {
      if (window.MathJax && typeof MathJax.typesetPromise === 'function') {
        MathJax.typesetPromise([target]).catch(function (err) {
          console.error('MathJax typeset failed:', err);
        });
      }
    }

    if (typeof MathJax === 'undefined') {
      window.MathJax = {
        tex: {
          inlineMath: [
            ['$', '$'],
            ['\\(', '\\)']
          ],
          displayMath: [
            ['$$', '$$'],
            ['\\[', '\\]']
          ],
          tags: 'all',
          tagSide: 'right',
          tagIndent: '0.8em'
        },
        svg: {
          fontCache: 'global',
          displayAlign: 'center',
          displayIndent: '0em'
        },
        chtml: {
          scale: 1.0,
          displayAlign: 'center'
        },
        options: {
          skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
          renderActions: {
            addMenu: [] // 禁用右键菜单（可选）
          }
        },
        startup: {
          typeset: false
        }
      };

      var script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
      script.async = true;
      script.addEventListener('load', function () {
        if (contentNode) {
          typeset(contentNode);
        }
      });
      document.head.appendChild(script);
    } else {
      typeset(contentNode);
    }
  }

  // ---- 预处理函数：修复被代码块包裹的数学公式 ----
  function fixMathInCodeBlocks(contentNode) {
    if (!contentNode) return;
    
    // 只查找主要内容区域的 pre 标签（排除 GeoGebra 和相关代码区域）
    const preElements = contentNode.querySelectorAll('pre');
    const nodesToReplace = [];
    
    preElements.forEach(function(preEl) {
      // 跳过 GeoGebra 容器内部的元素
      if (preEl.closest('[id^="ggbContainer"]')) {
        return;
      }
      
      // 跳过代码区域和脚本区域
      if (preEl.closest('script, .mw-code')) {
        return;
      }
      
      const content = preEl.textContent || preEl.innerHTML;
      
      // 检查是否只包含数学公式（$$ 之间可能有文本内容）
      // 匹配：前面可能有空白，然后是 $$...$$，后面可能有空白
      const onlyMathPattern = /^[\s\n]*\$\$[\s\S]*?\$\$[\s\n]*$/;
      
      if (onlyMathPattern.test(content.trim())) {
        // 只包含数学公式，清理前面的空白
        // 最保守的处理：只移除空行和 $$ 行前面的空格，保持内容不变
        let cleaned = content;
        
        // 按行处理
        let lines = cleaned.split('\n');
        let processedLines = lines.map(function(line) {
          // 如果这一行只包含 $$ 和前面的空格，移除前面的空格
          if (/^\s*\$\$$/.test(line)) {
            return '$$';
          }
          // 其他行保持不变
          return line;
        });
        
        cleaned = processedLines.join('\n');
        
        // 移除开头的空行
        cleaned = cleaned.replace(/^\n+/, '');
        // 移除结尾的空行
        cleaned = cleaned.replace(/\n+$/, '');
        
        // 存储需要替换的节点
        nodesToReplace.push({
          oldEl: preEl,
          text: cleaned
        });
      }
    });
    
    // 执行替换（在循环外避免DOM操作冲突）
    nodesToReplace.forEach(function(item) {
      // 创建新的 div 来替换 pre
      const newDiv = document.createElement('div');
      newDiv.textContent = item.text;
      newDiv.style.whiteSpace = 'pre-wrap';
      
      // 替换 pre 元素
      if (item.oldEl.parentNode) {
        item.oldEl.parentNode.replaceChild(newDiv, item.oldEl);
      }
    });
  }

  // ---- 主钩子：页面渲染后触发 ----
  mw.hook('wikipage.content').add(function ($content) {
    var contentNode = $content && $content.get && $content.get(0);
    
    // 1. 先初始化 GeoGebra（避免后续DOM操作影响）
    initGeoGebra();
    
    // 2. 修复被代码块包裹的数学公式
    fixMathInCodeBlocks(contentNode);
    
    // 3. 初始化 MathJax
    initMathJax($content);
  });
})();
