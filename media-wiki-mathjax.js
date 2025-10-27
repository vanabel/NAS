/* ========== MediaWiki Common.js 全站脚本 ========== */
/* 功能：
 * 1. 自动初始化 GeoGebra <ggb_applet> 扩展生成的 applet
 * 2. 懒加载 MathJax（只有页面检测到数学公式时才加载）
 * 3. 保证两者可以同时存在，不冲突
 * ================================================== */

(function () {
  'use strict';

  var MATHJAX_SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
  var mathJaxLoadingPromise = null;

  function pageHasMath(root) {
    var container = root || document.body;
    if (!container) {
      return false;
    }

    var text = container.innerHTML;
    return (
      /\$(.+?)\$/.test(text) ||
      /\$\$(.+?)\$\$/.test(text) ||
      /\\\((.+?)\\\)/.test(text) ||
      /\\\[(.+?)\\\]/.test(text)
    );
  }

  function normalizeDisplayMathBlocks(root) {
    if (!root || !root.querySelectorAll) {
      return;
    }

    var preBlocks = root.querySelectorAll('pre');
    preBlocks.forEach(function (pre) {
      if (pre.hasAttribute('data-mathjax-normalized')) {
        return;
      }

      var text = pre.textContent;
      if (!text) {
        pre.setAttribute('data-mathjax-normalized', 'skip');
        return;
      }

      var normalizedLines = text.split('\n').map(function (line) {
        return line.replace(/^\s+/, '');
      });
      var normalizedText = normalizedLines.join('\n');
      var trimmed = normalizedText.trim();

      var isDisplayMath =
        (trimmed.startsWith('$$') && trimmed.endsWith('$$')) ||
        (trimmed.startsWith('\\[') && trimmed.endsWith('\\]'));

      if (!isDisplayMath) {
        pre.setAttribute('data-mathjax-normalized', 'skip');
        return;
      }

      var container = document.createElement('div');
      container.className = 'mw-mathjax-block';
      container.textContent = trimmed;
      container.setAttribute('data-mathjax-normalized', 'true');

      pre.parentNode.replaceChild(container, pre);
    });
  }

  function deepMerge(target, source) {
    if (!source) {
      return target;
    }

    Object.keys(source).forEach(function (key) {
      var value = source[key];
      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        typeof target[key] === 'object' &&
        target[key] !== null &&
        !Array.isArray(target[key])
      ) {
        deepMerge(target[key], value);
      } else {
        target[key] = value;
      }
    });

    return target;
  }

  function ensureMathJaxConfig() {
    var desiredConfig = {
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
          addMenu: []
        }
      },
      startup: {
        typeset: false
      }
    };

    if (!window.MathJax) {
      window.MathJax = desiredConfig;
      return;
    }

    deepMerge(window.MathJax, desiredConfig);
  }

  function loadMathJaxScript() {
    if (
      typeof MathJax !== 'undefined' &&
      typeof MathJax.typesetPromise === 'function'
    ) {
      return Promise.resolve(MathJax);
    }

    if (mathJaxLoadingPromise) {
      return mathJaxLoadingPromise;
    }

    mathJaxLoadingPromise = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = MATHJAX_SCRIPT_URL;
      script.async = true;
      script.addEventListener('load', function () {
        if (window.MathJax) {
          resolve(window.MathJax);
        } else {
          reject(new Error('MathJax failed to initialize'));
        }
      });
      script.addEventListener('error', function (event) {
        mathJaxLoadingPromise = null;
        reject(event);
      });
      document.head.appendChild(script);
    });

    return mathJaxLoadingPromise;
  }

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

  function typesetContent(target) {
    if (
      window.MathJax &&
      typeof MathJax.typesetPromise === 'function' &&
      target
    ) {
      MathJax.typesetPromise([target]).catch(function (error) {
        console.error('MathJax typeset failed:', error);
      });
    }
  }

  function initMathJax($content) {
    var contentNode = $content && $content.get && $content.get(0);
    if (!contentNode) {
      return;
    }

    normalizeDisplayMathBlocks(contentNode);

    if (!pageHasMath(contentNode)) {
      return;
    }

    ensureMathJaxConfig();

    loadMathJaxScript()
      .then(function () {
        typesetContent(contentNode);
      })
      .catch(function (error) {
        console.error('Failed to load MathJax:', error);
      });
  }

  if (typeof mw !== 'undefined' && mw && mw.hook) {
    mw.hook('wikipage.content').add(function ($content) {
      initGeoGebra();
      initMathJax($content);
    });
  }
})();
