(function () {
  if (window.__fuxuanLoaded) return;
  window.__fuxuanLoaded = true;

  // 等待 oh-my-live2d 加载完成
  function init() {
    if (typeof OML2D === 'undefined') {
      setTimeout(init, 100);
      return;
    }

    OML2D.loadOml2d({
      models: [
        {
          path: "/live2d/fuxuan/fuxuan.model3.json",
          scale: 0.048,
          position: [0, -15],
          stageStyle: {
            width: 240,
            height: 460
          }
        }
      ],
      menus: {
        disable: true
      },
      tips: {
        idleTips: {
          interval: 10000,
          message: [
            "命由我定，运由我改。",
            "星轨已定，你却仍在犹豫？",
            "今日运势……让我算算。",
            "有什么想问的，尽管说。"
          ]
        },
        clickTips: {
          message: [
            "嗯？找本座有事？",
            "触碰星轨可是要付出代价的。",
            "你的命运线……有些有趣。",
            "本座在听。",
            "想算一卦吗？"
          ]
        }
      }
    });
  }

  init();
})();