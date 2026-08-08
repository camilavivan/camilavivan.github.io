(function () {
  if (window.__fuxuanLoaded) return;
  window.__fuxuanLoaded = true;

  // 从侧边栏读取最新信息
  function getSidebarInfo() {
    const fortune = (document.getElementById('fortune')?.textContent || '今日运势：平').trim();
    const weather = (document.getElementById('weather-text')?.textContent || '天气获取中...').trim();
    const yi = (document.getElementById('yi')?.textContent || '宜：无特别事项').trim();
    const ji = (document.getElementById('ji')?.textContent || '忌：无特别事项').trim();
    return { fortune, weather, yi, ji };
  }

  const fixedMessages = [
    '命由我定，运由我改。',
    '星轨已定，你却仍在犹豫？',
    '有什么想问的，尽管说。',
    '本座在听。',
    '想算一卦吗？',
    '嗯？找本座有事？',
    '触碰星轨可是要付出代价的。'
  ];

  let msgIndex = 0;
  let idleTimer = null;

  function getNextMessage() {
    const info = getSidebarInfo();
    const list = [
      info.fortune,
      info.weather,
      info.yi,
      info.ji,
      ...fixedMessages
    ];
    const msg = list[msgIndex % list.length];
    msgIndex++;
    return msg;
  }

  function showTip(text) {
    const tip = document.getElementById('oml2d-tips');
    const content = document.getElementById('oml2d-tips-content');
    if (!tip || !content) return;

    content.textContent = text;

    // 强制显示气泡
    tip.style.setProperty('opacity', '1', 'important');
    tip.style.setProperty('visibility', 'visible', 'important');
    tip.style.setProperty('display', 'flex', 'important');
    tip.classList.remove('oml2d-hidden-tips');
  }

  // 空闲：1~8 秒随机间隔自动换句
  function scheduleNextIdle() {
    if (idleTimer) clearTimeout(idleTimer);
    const delay = 1000 + Math.random() * 7000; // 1~8 秒
    idleTimer = setTimeout(() => {
      showTip(getNextMessage());
      scheduleNextIdle();
    }, delay);
  }

  // 点击看板娘：立刻换句，并重置空闲计时
  function bindClick() {
    const handler = function () {
      showTip(getNextMessage());
      scheduleNextIdle();
    };

    const candidates = [
      document.getElementById('oml2d-stage'),
      document.getElementById('oml2d'),
      document.querySelector('#oml2d-stage'),
      document.querySelector('[id*="oml2d"]'),
      document.querySelector('#oml2d canvas'),
      document.querySelector('canvas')
    ].filter(Boolean);

    candidates.forEach(function (el) {
      el.addEventListener('click', handler);
    });

    // 兜底：点击到 canvas 或 oml2d 相关区域时触发
    document.addEventListener('click', function (e) {
      const t = e.target;
      if (!t) return;
      if (t.tagName === 'CANVAS' || t.closest('[id*="oml2d"]')) {
        handler();
      }
    });
  }

  function init() {
    if (typeof OML2D === 'undefined') {
      setTimeout(init, 150);
      return;
    }

    OML2D.loadOml2d({
      models: [
        {
          path: '/live2d/fuxuan/fuxuan.model3.json',
          scale: 0.045,
          position: [0, -10],
          stageStyle: {
            width: 230,
            height: 450
          }
        }
      ],
      menus: {
        disable: true
      },
      tips: {
        style: {
          width: 220,
          minHeight: 48,
          fontSize: 13,
          lineHeight: 1.5,
          padding: '10px 16px',
          borderRadius: '16px'
        },
        // 关闭库自带定时，改由我们控制
        idleTips: {
          interval: 999999,
          message: ['命由我定，运由我改。']
        },
        clickTips: {
          message: ['']
        }
      }
    });

    // 启动自定义逻辑
    setTimeout(function () {
      bindClick();
      showTip(getNextMessage());
      scheduleNextIdle();
    }, 1200);
  }

  init();
})();