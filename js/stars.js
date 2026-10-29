/* Интерактивные звёзды на фоне города */
(function() {
  'use strict';
  
  const STAR_COUNT = 80;           // сколько звёзд
  const REPEL_RADIUS = 120;        // радиус отталкивания от курсора (px)
  const REPEL_FORCE = 0.6;         // сила отталкивания (0-1)
  const RETURN_SPEED = 0.08;       // скорость возврата на место (0-1)
  
  const stars = [];
  let mouseX = -9999;
  let mouseY = -9999;
  
  // Ищем контейнер города
  const cityContainer = document.querySelector('.hero-scene');
  if (!cityContainer) return;
  
  // Создаём canvas для звёзд
  const canvas = document.createElement('canvas');
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '2';  // звёзды поверх неба, но под городом
  // Вставляем canvas после .sky, чтобы небо не закрывало его
  const sky = cityContainer.querySelector('.sky');
  if (sky && sky.nextSibling) {
    cityContainer.insertBefore(canvas, sky.nextSibling);
  } else {
    cityContainer.appendChild(canvas);
  }
  
  const ctx = canvas.getContext('2d');
  
  function resize() {
    const rect = cityContainer.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }
  
  // Инициализация звёзд
  function initStars() {
    stars.length = 0;
    const w = canvas.width;
    const h = canvas.height;
    
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        // Исходные координаты
        homeX: Math.random() * w,
        homeY: Math.random() * h,
        // Текущие координаты
        x: 0,
        y: 0,
        // Размер и прозрачность
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.4 + 0.3,
        // Цвет: белый или слегка фиолетовый
        color: Math.random() > 0.7 ? '#a78bfa' : '#ffffff'
      });
      // Начальная позиция = домашняя
      stars[i].x = stars[i].homeX;
      stars[i].y = stars[i].homeY;
    }
  }
  
  // Отслеживание курсора на окне, чтобы работало даже если .hero-copy закрывает canvas
  function onMouseMove(e) {
    const rect = cityContainer.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  }
  
  function onMouseLeave() {
    mouseX = -9999;
    mouseY = -9999;
  }
  
  // Анимация
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    stars.forEach((star) => {
      // Расстояние до курсора
      const dx = mouseX - star.x;
      const dy = mouseY - star.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Если курсор близко — отталкиваем звезду
      if (dist < REPEL_RADIUS && dist > 0) {
        const force = (REPEL_RADIUS - dist) / REPEL_RADIUS * REPEL_FORCE;
        star.x -= (dx / dist) * force * 50;
        star.y -= (dy / dist) * force * 50;
      }
      
      // Плавное возвращение к исходной позиции
      star.x += (star.homeX - star.x) * RETURN_SPEED;
      star.y += (star.homeY - star.y) * RETURN_SPEED;
      
      // Рисуем звезду как кружок
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = star.color;
      ctx.globalAlpha = star.alpha;
      ctx.fill();
    });
    
    ctx.globalAlpha = 1;
    requestAnimationFrame(animate);
  }
  
  // Запуск
  window.addEventListener('resize', () => {
    resize();
    initStars();
  });
  
  // Подписываемся на движения мыши на window, чтобы работало через .hero-copy
  window.addEventListener('mousemove', onMouseMove);
  cityContainer.addEventListener('mouseleave', onMouseLeave);
  
  resize();
  initStars();
  animate();
  
  console.log('[Stars] Интерактивные звёзды запущены');
})();
