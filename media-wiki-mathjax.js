/* 这里的任何JavaScript将为所有用户在每次页面加载时加载。 */
window.MathJax = {
  tex: {
    inlineMath: { '[+]': [['$', '$']] },    // 添加 $...$ 作为内联数学分隔符（默认已包含 \(...\)）
    displayMath: { '[+]': [['$$', '$$']] }, // 添加 $$...$$ 作为显示数学分隔符（默认已包含 \[...\]）
    tags: 'all',        // 自动对所有显示公式编号
    tagSide: 'right',   // 编号位置（右侧）
    tagIndent: '0.8em'  // 编号缩进
  },
  svg: {
    fontCache: 'global',
    displayAlign: 'center',
    displayIndent: '0em'
  },
  chtml: {
    scale: 1.0,         // 字体缩放因子
    displayAlign: 'center'
  },
  options: {
    renderActions: {
      addMenu: []       // （可选）禁用 MathJax 右键菜单
    }
  }
};

(function () {
  var script = document.createElement('script');
  // 使用 MathJax 3 的 CDN（MathJax 4 可能尚未完全部署到所有 CDN）
  script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js';
  script.async = true;
  document.head.appendChild(script);
})();
