(function () {
  if (window.__fuxuanLoaded) return;
  window.__fuxuanLoaded = true;

  function init() {
    if (typeof OML2D === 'undefined') {
      setTimeout(init, 100);
      return;
    }

    // 先获取一次天气和农历信息，供看板娘使用
    let weatherText = '天气获取中...';
    let fortuneText = '今日运势：平';
    let yiText = '宜：无特别事项';
    let jiText = '忌：无特别事项';

    // 简单获取天气（固定南京或定位）
    async function updateInfo() {
      try {
        // 这里可以复用你原来的天气逻辑，简化示例：
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=32.0603&longitude=118.7969&current=temperature_2m,weather_code&timezone=Asia%2FShanghai');
        const data = await res.json();
        if (data.current) {
          const temp = Math.round(data.current.temperature_2m);
          const map = {0:'晴',1:'晴',2:'多云',3:'阴',61:'小雨',63:'中雨',80:'阵雨',95:'雷阵雨'};
          const text = map[data.current.weather_code] || '未知';
          weatherText = `南京 · ${text} ${temp}°C`;
        }
      } catch (e) {}

      // 农历宜忌（需要页面已加载 Solar）
      if (typeof Solar !== 'undefined') {
        const lunar = Solar.fromDate(new Date()).getLunar();
        const yi = lunar.getDayYi().slice(0, 3).join('、') || '无特别事项';
        const ji = lunar.getDayJi().slice(0, 3).join('、') || '无特别事项';
        yiText = '宜：' + yi;
        jiText = '忌：' + ji;

        const ganZhi = lunar.getDayInGanZhi();
        const fortunes = ['大吉', '中吉', '小吉', '平', '小凶', '凶'];
        const index = (ganZhi.charCodeAt(0) + ganZhi.charCodeAt(1)) % fortunes.length;
        fortuneText = '今日运势：' + fortunes[index];
      }
    }

    updateInfo();

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
        style: {
          width: 210,
          fontSize: 13,
          padding: '10px 14px',
          borderRadius: '12px',
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          color: '#333',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        },
        idleTips: {
          interval: 8000,   // 8秒轮播一次
          message: [
            () => fortuneText,
            () => weatherText,
            () => yiText,
            () => jiText,
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
            "想算一卦吗？",
            () => fortuneText,
            () => weatherText
          ]
        }
      }
    });
  }

  init();
})();