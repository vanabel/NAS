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
    if (typeof GGBApplet === 'undefined' || !window.ggbParams) {
      return;
    }

    Object.keys(window.ggbParams).forEach(function (key) {
      var params = window.ggbParams[key];
      var containerId = 'ggbContainer' + key;
      if (document.getElementById(containerId)) {
        var applet = new GGBApplet(params, true);
        applet.inject(containerId);
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

  // ---- 主钩子：页面渲染后触发 ----
  mw.hook('wikipage.content').add(function ($content) {
    initGeoGebra();
    initMathJax($content);
  });
})();
