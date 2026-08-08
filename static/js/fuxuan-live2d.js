(function () {
  if (window.__fuxuanLoaded) return;
  window.__fuxuanLoaded = true;

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
    tip.style.opacity = '1';
    tip.style.visibility = 'visible';
  }

  // 空闲：1~8 秒随机间隔
  function scheduleNextIdle() {
    if (idleTimer) clearTimeout(idleTimer);
    const delay = 1000 + Math.random() * 7000; // 1~8 秒
    idleTimer = setTimeout(() => {
      showTip(getNextMessage());
      scheduleNextIdle();
    }, delay);
  }

  // 点击看板娘：立刻换一句，并重置空闲计时
  function bindClick() {
    // 尝试绑定到舞台 / canvas
    const stage =
      document.getElementById('oml2d-stage') ||
      document.querySelector('#oml2d canvas') ||
      document.querySelector('[id*="oml2d"] canvas') ||
      document.querySelector('.oml2d-stage');

    const target = stage || document.body;

    target.addEventListener('click', function (e) {
      // 只响应看板娘区域附近的点击（简单判断）
      const tip = document.getElementById('oml2d-tips');
      if (!tip) return;

      showTip(getNextMessage());
      scheduleNextIdle(); // 点击后重新开始随机计时
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
        // 关闭库自带的定时和点击文案，改由我们自己控制
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
    setTimeout(() => {
      bindClick();
      showTip(getNextMessage());
      scheduleNextIdle();
    }, 1200);
  }

  init();
})();