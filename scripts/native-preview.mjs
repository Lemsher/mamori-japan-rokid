// Customize the official CLI shell; the app itself remains the bundled Ink canvas.
export function nativePreview(html){
 html=html.replace('<html lang="en">','<html lang="zh-CN">')
  .replace('AIX Preview</p>','原生 Ink · 本地交互演示</p>')
  .replace('Source: <span','源码：<span').replace('Version: <span','版本：<span').replace('Files: <span','文件：<span')
  .replace('<aside class="card sidebar">','<aside class="card sidebar"><div><h2>镜腿操作</h2><p class="instruction">↑↓ 选择卡片，Enter 确认。<br>返回键直接退回上一级。</p></div>')
  .replace('aria-label="Backspace">&#8592;</button>','aria-label="Backspace"><span>←</span><small>返回上级</small></button>')
  .replace('aria-label="Enter">Enter</button>','aria-label="Enter"><span>Enter</span><small>确认选择</small></button>')
  .replace('aria-label="ArrowUp">&#8593;</button>','aria-label="ArrowUp"><span>↑</span><small>上一项</small></button>')
  .replace('aria-label="ArrowDown">&#8595;</button>','aria-label="ArrowDown"><span>↓</span><small>下一项</small></button>')
  .replace('</aside>','<p class="instruction">画布运行 agent/ 中的 .ink 页面。可点击画布或使用键盘。首次 Enter 选中，再次确认。<br>本地通过不代表已完成眼镜真机验证。</p></aside>');
 html=html.replace('</head>',`<style>
 :root{color-scheme:light;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#eef2f3;color:#182f35;}
 body{background:#eef2f3;}.page{max-width:1080px;padding-top:28px;}.eyebrow{color:#38656d;letter-spacing:.08em;}h1{font-size:34px;letter-spacing:-.02em;}.hero{margin-bottom:20px;}.meta{font-size:12px;color:#536e74;}
 .layout{grid-template-columns:minmax(504px,1fr) 304px;gap:20px;}.card{border:1px solid #d5dfe1;border-radius:18px;background:#fff;box-shadow:none;backdrop-filter:none;}.preview-card{padding:24px 12px;}.preview-shell,.canvas-frame,canvas{width:480px;min-width:480px;max-width:480px;flex-shrink:0;}.preview-shell,.canvas-frame{border-radius:12px;background:#000;box-shadow:none;}
 .sidebar{padding:20px;gap:16px;}h2{margin:0 0 8px;font-size:18px;}.instruction{font-size:12px;line-height:1.65;color:#536e74;margin:0;}.status{padding:9px 12px;border-radius:8px;font-size:11px;}.controls-panel{padding:0;}.controls-grid{gap:8px;}.control-button{border-radius:12px;aspect-ratio:auto;height:72px;font-size:24px;background:#f5f8f9;border-color:#d5dfe1;box-shadow:none;flex-direction:column;gap:8px;}.control-button small{font-size:11px;font-weight:400;}.control-button[data-role="tap"]{background:#244b54;box-shadow:none;}.control-button:focus-visible{outline:2px solid #244b54;outline-offset:3px;}
 @media(max-width:880px){.layout{display:flex;flex-direction:column;}.preview-card{min-height:390px;}.sidebar{gap:12px;}.controls-grid{grid-template-columns:repeat(4,1fr);width:100%;}.controls-panel{width:100%;}.control-button{max-width:none;height:64px;}.sidebar .instruction{font-size:12px;}}
 @media(max-width:530px){.page{width:calc(100vw - 24px);padding:16px 0;}.preview-card{padding:12px;min-height:0;align-items:center;}.preview-shell{margin-left:0;margin-right:0;transform:scale(var(--ink-scale,1));transform-origin:top center;margin-bottom:calc(352px * (var(--ink-scale,1) - 1));}.hero h1{font-size:28px;}.sidebar{padding:14px;}}
 @media(prefers-reduced-motion:reduce){.control-button{transition:none;}}
 </style></head>`);
 html=html.replace('</body>',`<script>
 // Dispatch through the same native Ink input path as the on-screen temple buttons.
 const templeKeys=['ArrowUp','ArrowDown','Enter','Backspace','Escape'];
 for(const type of ['keydown','keyup'])document.addEventListener(type,event=>{
  if(!templeKeys.includes(event.code)||event.ctrlKey||event.metaKey||event.altKey||['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName))return;
  event.preventDefault();event.stopImmediatePropagation();
  if(type==='keyup')document.querySelector('.control-button[data-key="'+(event.code==='Escape'?'Backspace':event.code)+'"]').click();
 },true);
 const resize=()=>document.documentElement.style.setProperty('--ink-scale',String(Math.min(1,(innerWidth-50)/480)));
 addEventListener('resize',resize);resize();
 </script></body>`);
 return html;
}
