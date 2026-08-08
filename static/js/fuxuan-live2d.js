(function () {
  if (window.__fuxuanLoaded) return;
  window.__fuxuanLoaded = true;

  // 从侧边栏读取当前信息
  function getSidebarInfo() {
    const fortune = (document.getElementById('fortune')?.textContent || '今日运势：平').trim();
    const weather = (document.getElementById('weather-text')?.textContent || '天气获取中...').trim();
    const yi = (document.getElementById('yi')?.textContent || '宜：无特别事项').trim();
    const ji = (document.getElementById('ji')?.textContent || '忌：无特别事项').trim();
    return { fortune, weather, yi, ji };
  }

  // 轮播内容（始终从侧边栏取最新）
  const fixedMessages = [
    '命由我定，运由我改。',
    '星轨已定，你却仍在犹豫？',
    '有什么想问的，尽管说。',
    '本座在听。',
    '想算一卦吗？'
  ];

  let msgIndex = 0;

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

  // 主动改气泡文字（绕过库初始化时的固定 message）
  function startTipRotator() {
    setInterval(() => {
      const tip = document.getElementById('oml2d-tips');
      const content = document.getElementById('oml2d-tips-content');
      if (!tip || !content) return;

      // 只在气泡显示时更新
      const style = window.getComputedStyle(tip);
      if (style.opacity === '0' || style.visibility === 'hidden') return;

      content.textContent = getNextMessage();
    }, 8500);
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
        // 初始先给一组占位，真正内容由上面的 rotator 控制
        idleTips: {
          interval: 8500,
          message: [
            '命由我定，运由我改。',
            '星轨已定，你却仍在犹豫？',
            '有什么想问的，尽管说。'
          ]
        },
        clickTips: {
          message: [
            '嗯？找本座有事？',
            '触碰星轨可是要付出代价的。',
            '本座在听。',
            '想算一卦吗？'
          ]
        }
      }
    });

    // 启动轮播（从侧边栏读最新数据）
    setTimeout(startTipRotator, 1500);
  }

  init();
})();