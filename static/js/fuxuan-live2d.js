(function () {
  if (window.__fuxuanLoaded) return;
  window.__fuxuanLoaded = true;

  let weatherText = '天气获取中...';
  let fortuneText = '今日运势：平';
  let yiText = '宜：无特别事项';
  let jiText = '忌：无特别事项';

  async function updateInfo() {
    // 天气
    try {
      let lat = 32.0603, lon = 118.7969, city = '南京';
      try {
        const geoRes = await fetch('https://get.geojs.io/v1/ip/geo.json', {
          signal: AbortSignal.timeout(4000)
        });
        if (geoRes.ok) {
          const loc = await geoRes.json();
          if (loc.latitude && loc.longitude) {
            lat = loc.latitude;
            lon = loc.longitude;
            city = loc.city || loc.region || loc.country || '未知位置';
          }
        }
      } catch (e) {}

      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (weatherRes.ok) {
        const data = await weatherRes.json();
        if (data.current) {
          const temp = Math.round(data.current.temperature_2m);
          const map = {
            0: '晴', 1: '晴', 2: '多云', 3: '阴',
            45: '雾', 48: '雾',
            51: '小雨', 53: '中雨', 55: '大雨',
            61: '小雨', 63: '中雨', 65: '大雨',
            71: '小雪', 73: '中雪', 75: '大雪',
            80: '阵雨', 81: '阵雨', 82: '暴雨',
            95: '雷阵雨', 96: '雷阵雨', 99: '雷暴'
          };
          const text = map[data.current.weather_code] || '未知';
          weatherText = city + ' · ' + text + ' ' + temp + '°C';
        }
      }
    } catch (e) {
      weatherText = '南京 · 天气获取失败';
    }

    // 农历宜忌 + 运势
    if (typeof Solar !== 'undefined') {
      try {
        const lunar = Solar.fromDate(new Date()).getLunar();
        const yi = lunar.getDayYi().slice(0, 3).join('、') || '无特别事项';
        const ji = lunar.getDayJi().slice(0, 3).join('、') || '无特别事项';
        yiText = '宜：' + yi;
        jiText = '忌：' + ji;

        const ganZhi = lunar.getDayInGanZhi();
        const fortunes = ['大吉', '中吉', '小吉', '平', '小凶', '凶'];
        const index = (ganZhi.charCodeAt(0) + ganZhi.charCodeAt(1)) % fortunes.length;
        fortuneText = '今日运势：' + fortunes[index];
      } catch (e) {}
    }
  }

  function init() {
    if (typeof OML2D === 'undefined') {
      setTimeout(init, 150);
      return;
    }

    updateInfo();
    setInterval(updateInfo, 10 * 60 * 1000);

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
        // 透明玻璃气泡（能看到网页背景）
        style: {
          width: 220,
          minHeight: 48,
          fontSize: 13,
          lineHeight: 1.5,
          padding: '10px 16px',
          borderRadius: '16px',
          background: 'rgba(255, 255, 255, 0.25)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          color: '#1a1a2e',
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.12)',
          border: '1px solid rgba(255, 255, 255, 0.35)',
          zIndex: 9999,
          wordBreak: 'break-all'
        },
        mobileStyle: {
          width: 170,
          fontSize: 12
        },
        // 每个气泡只说一句完整内容
        idleTips: {
          interval: 8500,
          message: [
            fortuneText,
            weatherText,
            yiText,
            jiText,
            '命由我定，运由我改。',
            '星轨已定，你却仍在犹豫？',
            '有什么想问的，尽管说。'
          ]
        },
        clickTips: {
          message: [
            '嗯？找本座有事？',
            '触碰星轨可是要付出代价的。',
            fortuneText,
            weatherText,
            '本座在听。',
            '想算一卦吗？'
          ]
        }
      }
    });
  }

  init();
})();