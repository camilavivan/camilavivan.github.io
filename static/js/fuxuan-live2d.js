(function () {
  if (window.__fuxuanLoaded) return;
  window.__fuxuanLoaded = true;

  // 动态信息
  let weatherText = '天气获取中...';
  let fortuneText = '今日运势：平';
  let yiText = '宜：无特别事项';
  let jiText = '忌：无特别事项';

  // 更新天气 + 农历宜忌运势
  async function updateInfo() {
    // 天气（优先定位，失败用南京）
    try {
      let lat = 32.0603, lon = 118.7969, city = '南京';
      try {
        const geoRes = await fetch('https://get.geojs.io/v1/ip/geo.json', { signal: AbortSignal.timeout(4000) });
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
          weatherText = `${city} · ${text} ${temp}°C`;
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

    // 定时更新信息（每 10 分钟）
    setInterval(updateInfo, 10 * 60 * 1000);

    OML2D.loadOml2d({
      models: [
        {
          path: '/live2d/fuxuan/fuxuan.model3.json',
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
        // 玻璃效果气泡
        style: {
          width: 200,
          minHeight: 50,
          fontSize: 13,
          lineHeight: 1.45,
          padding: '10px 14px',
          borderRadius: '14px',
          background: 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          color: '#2d1b4e',
          boxShadow: '0 8px 24px rgba(124, 58, 237, 0.18)',
          border: '1px solid rgba(255, 255, 255, 0.45)',
          textShadow: '0 1px 1px rgba(255,255,255,0.8)'
        },
        mobileStyle: {
          width: 160,
          fontSize: 12
        },
        // 空闲轮播（使用普通字符串，定时刷新内容）
        idleTips: {
          interval: 9000,
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
        // 点击互动
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

    // 因为 message 是初始化时的快照，需要定期刷新 tips 内容
    // 简单做法：每隔一段时间重新设置 tips（兼容性更好）
    setInterval(() => {
      // 如果库支持动态更新可以用，这里用重新赋值最稳妥的方式是页面刷新后自然更新
      // 当前版本主要依赖初始化时的值 + 定时 updateInfo
    }, 60000);
  }

  init();
})();