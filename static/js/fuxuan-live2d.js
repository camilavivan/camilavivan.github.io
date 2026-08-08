(function () {
  if (window.__fuxuanLoaded) return;
  window.__fuxuanLoaded = true;

  let weatherText = '天气获取中...';
  let fortuneText = '今日运势：平';
  let yiText = '宜：无特别事项';
  let jiText = '忌：无特别事项';

  // 从侧边栏读取已计算好的黄历，保证和侧边栏一致
  function syncFromSidebar() {
    const fortuneEl = document.getElementById('fortune');
    const yiEl = document.getElementById('yi');
    const jiEl = document.getElementById('ji');

    if (fortuneEl && fortuneEl.textContent.trim()) {
      fortuneText = fortuneEl.textContent.trim();
    }
    if (yiEl && yiEl.textContent.trim()) {
      yiText = yiEl.textContent.trim();
    }
    if (jiEl && jiEl.textContent.trim()) {
      jiText = jiEl.textContent.trim();
    }
  }

  // 天气：定位 + 中文城市名（不使用映射表）
  async function updateWeather() {
    try {
      let lat = 32.0603, lon = 118.7969, city = '南京';

      // 1. 获取大致坐标
      try {
        const geoRes = await fetch('https://get.geojs.io/v1/ip/geo.json', {
          signal: AbortSignal.timeout(4000)
        });
        if (geoRes.ok) {
          const loc = await geoRes.json();
          if (loc.latitude && loc.longitude) {
            lat = loc.latitude;
            lon = loc.longitude;
          }
        }
      } catch (e) {}

      // 2. 用坐标换中文地名（Nominatim，无需映射）
      try {
        const geoNameRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=zh`,
          {
            signal: AbortSignal.timeout(5000),
            headers: { 'User-Agent': 'HugoBlog/1.0' }
          }
        );
        if (geoNameRes.ok) {
          const geoData = await geoNameRes.json();
          // 优先取城市/区，没有就用上级
          city =
            geoData.address?.city ||
            geoData.address?.town ||
            geoData.address?.county ||
            geoData.address?.state ||
            geoData.address?.country ||
            '未知位置';
        }
      } catch (e) {
        // 逆地理失败就保持默认南京
      }

      // 3. 获取天气
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
  }

  function init() {
    if (typeof OML2D === 'undefined') {
      setTimeout(init, 150);
      return;
    }

    // 等侧边栏先渲染完再同步
    setTimeout(() => {
      syncFromSidebar();
      updateWeather();
    }, 800);

    // 定时同步
    setInterval(syncFromSidebar, 30 * 1000);
    setInterval(updateWeather, 10 * 60 * 1000);

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