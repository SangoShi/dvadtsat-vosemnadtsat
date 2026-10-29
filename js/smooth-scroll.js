/* Плавный скролл с lerp-интерполяцией */
(function() {
  'use strict';
  
  let targetScroll = window.scrollY;
  let currentScroll = window.scrollY;
  const ease = 0.08; // чем меньше, тем плавнее (0.05-0.15)
  let rafId = null;

  // Перехват колёсика мыши
  window.addEventListener('wheel', (e) => {
    e.preventDefault();
    targetScroll += e.deltaY;
    targetScroll = Math.max(0, Math.min(targetScroll, document.body.scrollHeight - window.innerHeight));
    
    if (!rafId) {
      rafId = requestAnimationFrame(smoothScroll);
    }
  }, { passive: false });

  // Плавная анимация
  function smoothScroll() {
    currentScroll += (targetScroll - currentScroll) * ease;
    
    // Если разница меньше 0.5px — считаем достигли цели
    if (Math.abs(targetScroll - currentScroll) < 0.5) {
      currentScroll = targetScroll;
      rafId = null;
    } else {
      rafId = requestAnimationFrame(smoothScroll);
    }
    
    window.scrollTo(0, currentScroll);
  }

  // Синхронизация при программном скролле (якори, кнопки)
  window.addEventListener('scroll', () => {
    if (!rafId) {
      targetScroll = window.scrollY;
      currentScroll = window.scrollY;
    }
  }, { passive: true });
  
})();
