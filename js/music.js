/* ══════════════════════════════════════════════════════════════════════
   Фоновая музыка: тумблер в шапке, громкость и эффект «далёкого» звука.
   Настройки — в js/data.js, блок music.
   ══════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const cfg = (typeof SITE !== "undefined" && SITE.music) || {};
  const toggle = document.getElementById("music-toggle");
  const audio = document.getElementById("bg-music");
  const label = document.getElementById("np-label");
  if (!toggle || !audio) {
    console.warn('[Music] Элементы не найдены');
    return;
  }

  if (!cfg.src) {
    toggle.hidden = true;
    console.warn('[Music] Путь к файлу не указан в SITE.music.src');
    return;
  }

  const KEY = "dv18-music";
  const clamp = (v, def) => Math.min(1, Math.max(0, typeof v === "number" ? v : def));
  const VOLUME = clamp(cfg.volume, 0.08);
  const DEPTH = clamp(cfg.depth, 0.8);
  const FADE = 2.0; // секунды плавного появления (от 0 до целевой громкости)

  const canUseEffects = !!(window.AudioContext || window.webkitAudioContext);
  console.log('[Music] Инициализация: volume=' + VOLUME + ', depth=' + DEPTH + ', effects=' + canUseEffects);

  let ctx = null;
  let master = null;
  let playing = false;
  let fadeTimer = null;

  audio.loop = true;
  audio.preload = "auto";
  
  // Загружаем музыку через fetch как blob для обхода CORS
  fetch(cfg.src)
    .then(res => res.blob())
    .then(blob => {
      const url = URL.createObjectURL(blob);
      audio.src = url;
      console.log('[Music] ✓ Audio загружен через blob URL (обход CORS)');
    })
    .catch(err => {
      console.warn('[Music] ✗ Не удалось загрузить через fetch, fallback на прямой src:', err.message);
      audio.src = cfg.src;
    });

  // Синтетическое «эхо комнаты»: затухающий шум
  function makeImpulse(context, seconds) {
    const rate = context.sampleRate;
    const length = Math.floor(rate * seconds);
    const impulse = context.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
      }
    }
    return impulse;
  }

  function setupEffects() {
    if (ctx) {
      console.log('[Music] Эффекты уже настроены, ctx.state=' + ctx.state);
      return;
    }
    if (!canUseEffects) {
      console.warn('[Music] Web Audio API недоступно, используем audio.volume');
      return;
    }
    
    const Ctx = window.AudioContext || window.webkitAudioContext;
    ctx = new Ctx();
    console.log('[Music] AudioContext создан, state=' + ctx.state);

    let source;
    try {
      source = ctx.createMediaElementSource(audio);
      console.log('[Music] ✓ MediaElementSource создан успешно');
    } catch (err) {
      console.warn('[Music] ✗ Ошибка createMediaElementSource (CORS):', err.message);
      console.warn('[Music] Fallback: используем audio.volume без эффектов');
      ctx = null;
      master = null;
      return;
    }

    // Усиление басов (80-250 Hz) — мягче
    const bassBoost = ctx.createBiquadFilter();
    bassBoost.type = "lowshelf";
    bassBoost.frequency.value = 200;
    bassBoost.gain.value = 4; // +4dB на низких частотах (было +8dB)

    // Lowpass: режем высокие частоты для эффекта "за стеной" — мягче
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 1800; // режем выше 1800Hz (было 800Hz)
    lowpass.Q.value = 0.7; // более плавный срез (было 1.2)

    // Второй фильтр убираем — достаточно одного
    const lowpass2 = ctx.createBiquadFilter();
    lowpass2.type = "lowpass";
    lowpass2.frequency.value = 3500; // очень высоко, почти не режет (было 1400Hz)
    lowpass2.Q.value = 0.5;

    // Реверберация — короче и тише
    const reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(ctx, 2.0 + DEPTH * 2.5); // 2-4.5 секунд (было 3.5-7s)

    const dry = ctx.createGain();
    const wet = ctx.createGain();
    dry.gain.value = 0.65; // 65% прямого сигнала (было 0.4)
    wet.gain.value = 0.35; // 35% реверберации (было 0.65)

    master = ctx.createGain();
    master.gain.value = 0;

    // Цепочка: source -> bassBoost -> lowpass -> lowpass2 -> [dry, reverb->wet] -> master -> выход
    source.connect(bassBoost);
    bassBoost.connect(lowpass);
    lowpass.connect(lowpass2);
    lowpass2.connect(dry);
    lowpass2.connect(reverb);
    reverb.connect(wet);
    dry.connect(master);
    wet.connect(master);
    master.connect(ctx.destination);

    audio.volume = 1; // громкость контролируется через master.gain
    
    console.log('[Music] ✓ ЭКСТРЕМАЛЬНЫЕ эффекты: bass=+' + bassBoost.gain.value + 'dB, lowpass=' + lowpass.frequency.value + 'Hz→' + lowpass2.frequency.value + 'Hz, reverb=' + (5.0 + DEPTH * 5).toFixed(1) + 's, dry=' + dry.gain.value.toFixed(2) + ', wet=' + wet.gain.value.toFixed(2));
  }

  function fadeTo(value, done) {
    clearInterval(fadeTimer);
    
    if (!master) {
      // Fallback: используем audio.volume
      console.log('[Music] Fallback fade через audio.volume: ' + audio.volume.toFixed(3) + ' -> ' + value.toFixed(3));
      audio.volume = value;
      if (done) done();
      return;
    }

    const now = ctx.currentTime;
    const current = master.gain.value;
    console.log('[Music] Fade: ' + current.toFixed(3) + ' -> ' + value.toFixed(3));
    
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(current, now);
    master.gain.linearRampToValueAtTime(value, now + FADE);
    
    if (done) {
      setTimeout(done, FADE * 1000);
    }
  }

  function render() {
    toggle.classList.toggle("is-playing", playing);
    label.textContent = playing ? "сейчас играет" : "музыка выключена";
  }

  function play() {
    console.log('[Music] play() вызван');
    setupEffects();
    
    // Разблокировка AudioContext (если suspended)
    if (ctx && ctx.state === "suspended") {
      console.log('[Music] Разблокировка AudioContext...');
      ctx.resume().then(() => {
        console.log('[Music] ✓ AudioContext resumed, state=' + ctx.state);
      }).catch(err => {
        console.warn('[Music] ✗ Ошибка resume:', err);
      });
    }

    // Устанавливаем громкость в 0 ДО запуска
    if (master) {
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(0, now);
      console.log('[Music] Стартовая громкость через master.gain: 0');
    } else {
      audio.volume = 0;
      console.log('[Music] Стартовая громкость через audio.volume: 0 (эффекты не работают, fallback режим)');
    }

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        playing = true;
        render();
        fadeTo(VOLUME);
        try { localStorage.setItem(KEY, "on"); } catch (e) {}
        console.log('[Music] ▶ Воспроизведение началось, целевая громкость=' + VOLUME);
        
        // Диагностика через 3 секунды
        setTimeout(() => {
          if (master) {
            console.log('[Music] Проверка через 3с: master.gain=' + master.gain.value.toFixed(3) + ', audio.volume=' + audio.volume.toFixed(3) + ', ctx.state=' + ctx.state);
          } else {
            console.log('[Music] Проверка через 3с: audio.volume=' + audio.volume.toFixed(3) + ' (Web Audio не используется)');
          }
        }, 3000);
      }).catch((err) => {
        playing = false;
        render();
        console.warn('[Music] ✗ Ошибка воспроизведения:', err.name, err.message);
      });
    }
  }

  function stop() {
    console.log('[Music] stop() вызван');
    playing = false;
    render();
    try { localStorage.setItem(KEY, "off"); } catch (e) {}
    
    // Плавное затухание перед остановкой
    fadeTo(0, () => {
      if (!playing) {
        audio.pause();
        console.log('[Music] ⏸ Остановлено после затухания');
      }
    });
  }

  toggle.addEventListener("click", () => {
    console.log('[Music] Клик по тумблеру, playing=' + playing);
    if (playing) {
      stop();
    } else {
      play();
    }
  });

  audio.addEventListener("error", (e) => {
    label.textContent = "файл не найден";
    console.error("[Music] Ошибка загрузки:", audio.error ? audio.error.message : e);
  });

  audio.addEventListener("loadeddata", function handler() {
    console.log('[Music] Первые данные загружены, запуск автовоспроизведения...');
    audio.removeEventListener("loadeddata", handler);
    play();
  }, { once: true });

  // Если loadeddata не сработает, попробуем через canplay
  audio.addEventListener("canplay", function handler() {
    console.log('[Music] canplay событие, проверка автозапуска...');
    if (!playing) {
      play();
    }
  }, { once: true });

  console.log('[Music] Скрипт инициализирован, автовоспроизведение при первых данных');
})();
