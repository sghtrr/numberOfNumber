// game.js
const windowInfo = wx.getWindowInfo();
const SCREEN_WIDTH = windowInfo.windowWidth;
const SCREEN_HEIGHT = windowInfo.windowHeight;
const TOP_BAR_HEIGHT = 105; // 顶部留白区域
const BOTTOM_BAR_HEIGHT = 85; // 底部留白区域
const NUMBER_COUNT = 100;
const MIN_SPACING = 20; // 数字间最小间距
const DIVIDER_LINE_WIDTH = 3; // 顶部/底部分割线宽度

let canvas = wx.createCanvas();
let ctx = canvas.getContext('2d');
let startTime = 0;
let currentNumber = 1;
let gameStarted = false;
let positions = [];
let touchTimer = null;
let customFont = null; // 自定义字体
let hintsIcon = null; // 提示图标
let hintsCount = 100; // 提示次数
let hintsIconRect = null; // 提示图标点击区域
let circleAnimations = []; // 圆圈动画状态数组

// 加载自定义字体
const loadCustomFont = () => {
  try {
    const family = wx.loadFont('font/caveat/caveatbrush-regular.ttf'); // 返回可用的字体族名
    customFont = family || 'sans-serif'; // 字体族名返回失败的场合使用内置字体
    drawGame();
  } catch (err) {
    customFont = 'sans-serif'; // 加载失败的场合使用内置字体
    drawGame();
  }
};

// 加载提示图标
const loadHintsIcon = () => {
  const img = wx.createImage();
  img.onload = () => {
    hintsIcon = img;
    drawGame();
  };
  img.src = 'icon/hints.png';
};

// 初始化游戏
function initGame() {
  // 生成1-100的有序数组
  const unShufflednumbers = Array.from({
    length: NUMBER_COUNT
  }, (_, i) => i + 1);
  // 打乱数组
  const numbers = shuffleArray(unShufflednumbers);

  // 计算随机位置（使用优化的均匀分布算法）
  positions = [];

  // 计算可用区域（考虑顶部和底部留白）
  const availableWidth = SCREEN_WIDTH;
  const availableHeight = SCREEN_HEIGHT - TOP_BAR_HEIGHT - BOTTOM_BAR_HEIGHT;

  // 随机生成每行数字数量（6-10之间）
  // const cols = Math.floor(Math.random() * 5) + 6; // 6-10
  const cols = 10; // 每行固定10个数字
  const rows = Math.ceil(NUMBER_COUNT / cols);
  const cellWidth = availableWidth / cols;
  const cellHeight = availableHeight / rows;

  // 生成随机偏移因子
  const randomOffsetFactor = Math.random() * 0.1 + 0.9; // 0.9-1.0之间的随机因子

  // 在网格单元内随机放置数字
  for (let i = 0; i < numbers.length; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;

    // 网格单元基础位置
    const baseX = col * cellWidth;
    const baseY = row * cellHeight;

    // 添加更大幅度的随机偏移
    const offsetX = Math.random() * (cellWidth - MIN_SPACING) * randomOffsetFactor;
    const offsetY = Math.random() * (cellHeight - MIN_SPACING) * randomOffsetFactor;

    // 最终位置
    const x = Math.max(15, Math.min(availableWidth - 15, baseX + cellWidth * 0.2 + offsetX));
    const y = TOP_BAR_HEIGHT + Math.max(15, Math.min(availableHeight - 15, baseY + cellHeight * 0.2 + offsetY));

    // 添加轻微扰动使分布更自然
    positions.push({
      x: x + (Math.random() - 0.5) * 10, // ±5像素扰动
      y: y + (Math.random() - 0.5) * 10, // ±5像素扰动
      number: numbers[i],
      found: false
    });
  }

  // 对数字位置进行微调避免重叠（二次检查）
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const dx = positions[i].x - positions[j].x;
      const dy = positions[i].y - positions[j].y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < MIN_SPACING) {
        // 移动位置使间距足够
        const moveDist = (MIN_SPACING - distance) / 2;
        positions[i].x += moveDist * (dx / distance);
        positions[i].y += moveDist * (dy / distance);
        positions[j].x -= moveDist * (dx / distance);
        positions[j].y -= moveDist * (dy / distance);
      }
    }
  }

  drawGame();
}

// 绘制手绘效果的圆圈
function generateHandDrawnCirclePoints(x, y, radius) {
  const points = [];
  for (let i = 0; i < 16; i++) {
    const angle = i * (Math.PI * 2) / 16;
    const offset = Math.random() * 3 - 1.5; // ±1.5像素扰动
    points.push({
      x: x + Math.cos(angle) * (radius + offset),
      y: y + Math.sin(angle) * (radius + offset)
    });
  }
  return points;
}

// 绘制不同颜色手绘效果的圆圈
function drawHandDrawnCircle(x, y, color, points, progress = 1) {
  const radius = 15; // 圆圈半径
  const pts = (points && points.length) ? points : generateHandDrawnCirclePoints(x, y, radius);

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  
  // 根据进度绘制圆圈
  const totalPoints = pts.length;
  const currentPoints = Math.floor(totalPoints * progress);
  
  for (let i = 1; i <= currentPoints; i++) {
    const prev = pts[i - 1];
    const current = pts[i % totalPoints];
    const cpx = (prev.x + current.x) / 2;
    const cpy = (prev.y + current.y) / 2;
    ctx.quadraticCurveTo(prev.x, prev.y, cpx, cpy);
  }
  
  // 如果进度完成，闭合路径
  if (progress >= 1) {
    ctx.quadraticCurveTo(pts[totalPoints - 1].x, pts[totalPoints - 1].y, pts[0].x, pts[0].y);
    ctx.closePath();
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

// 添加圆圈动画
function addCircleAnimation(x, y, color, points) {
  const animation = {
    x, y, color, points,
    progress: 0,
    duration: 500, // 动画持续时间（毫秒）
    startTime: Date.now(),
    completed: false
  };
  
  circleAnimations.push(animation);
  
  // 如果没有动画在运行，开始动画循环
  if (circleAnimations.length === 1) {
    animateCircles();
  }
}

// 动画循环
function animateCircles() {
  const currentTime = Date.now();
  let hasActiveAnimations = false;
  
  circleAnimations.forEach((anim, index) => {
    if (!anim.completed) {
      const elapsed = currentTime - anim.startTime;
      anim.progress = Math.min(elapsed / anim.duration, 1);
      
      if (anim.progress >= 1) {
        anim.completed = true;
        anim.progress = 1;
      } else {
        hasActiveAnimations = true;
      }
    }
  });
  
  // 重绘游戏界面
  drawGame();
  
  // 如果还有动画在进行，继续循环
  if (hasActiveAnimations) {
    requestAnimationFrame(animateCircles);
  } else {
    // 清理已完成的动画
    circleAnimations = circleAnimations.filter(anim => !anim.completed);
  }
}

// 获取随机的圆圈颜色
function getRandomCircleColor() {
  const colors = [
    '#1E90FF', // 蓝色
    '#32CD32', // 绿色
    '#9370DB', // 紫色
    '#FF6347', // 红色
    '#FFD700', // 金色
    '#00CED1' // 青色
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// 绘制游戏界面
function drawGame() {
  // 清空画布
  ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

  // 绘制白色背景
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

  // 绘制网格背景
  ctx.strokeStyle = '#0077FF';
  ctx.lineWidth = 0.3;
  
  // 绘制垂直线
  for (let x = 0; x <= SCREEN_WIDTH; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, SCREEN_HEIGHT);
    ctx.stroke();
  }
  
  // 绘制水平线
  for (let y = 0; y <= SCREEN_HEIGHT; y += 27) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(SCREEN_WIDTH, y);
    ctx.stroke();
  }

  // 绘制顶部状态栏
  ctx.fillStyle = 'rgba(249, 249, 249, 1)';
  ctx.fillRect(0, 0, SCREEN_WIDTH, TOP_BAR_HEIGHT - 5);

  // 绘制顶部分割线
  ctx.strokeStyle = '#1196db';
  ctx.lineWidth = DIVIDER_LINE_WIDTH;
  ctx.beginPath();
  ctx.moveTo(0, TOP_BAR_HEIGHT - 5);
  ctx.lineTo(SCREEN_WIDTH, TOP_BAR_HEIGHT - 5);
  ctx.stroke();

  // 绘制底部状态栏
  ctx.fillStyle = 'rgba(249, 249, 249, 1)';
  ctx.fillRect(0, SCREEN_HEIGHT - BOTTOM_BAR_HEIGHT + 5, SCREEN_WIDTH, SCREEN_HEIGHT);

  // 绘制底部分割线
  ctx.strokeStyle = '#1196db';
  ctx.lineWidth = DIVIDER_LINE_WIDTH;
  ctx.beginPath();
  ctx.moveTo(0, SCREEN_HEIGHT - BOTTOM_BAR_HEIGHT + 5);
  ctx.lineTo(SCREEN_WIDTH, SCREEN_HEIGHT - BOTTOM_BAR_HEIGHT + 5);
  ctx.stroke();

  // 绘制提示图标
  if (hintsIcon) {
    const iconSize = 45; // 图标尺寸
    const barTop = SCREEN_HEIGHT - BOTTOM_BAR_HEIGHT + 5;
    const iconX = 30; // 左侧内边距
    const iconY = barTop + (BOTTOM_BAR_HEIGHT - iconSize) / 2; // 垂直居中
    ctx.drawImage(hintsIcon, iconX, iconY, iconSize, iconSize);

    // 记录图标点击区域用于命中检测
    hintsIconRect = { x: iconX, y: iconY, width: iconSize, height: iconSize };

    // 绘制提示次数徽标
    const badgeR = 12;
    const badgeCx = iconX + iconSize - badgeR + 3;
    const badgeCy = iconY + 4;
    ctx.beginPath();
    ctx.arc(badgeCx, badgeCy, badgeR, 0, Math.PI * 2);
    ctx.fillStyle = '#FF4D4F';
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold 14px "${customFont}"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(hintsCount), badgeCx, badgeCy);
  } else {
    // 图标未就绪时不响应点击
    hintsIconRect = null;
  }

  // 绘制时间
  const elapsed = gameStarted ? Math.floor((Date.now() - startTime) / 1000) : 0;
  const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const seconds = (elapsed % 60).toString().padStart(2, '0');
  const timeStr = `${minutes}:${seconds}`;

  ctx.font = `26px "${customFont}"`;
  ctx.fillStyle = '#333';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(timeStr, 15, TOP_BAR_HEIGHT / 1.5);

  // 绘制下一个要选择的数字
  ctx.font = `bold 28px "${customFont}"`;
  ctx.textAlign = 'center';
  ctx.fillText(`${currentNumber}`, SCREEN_WIDTH / 2, TOP_BAR_HEIGHT / 1.5);

  // 绘制数字
  ctx.font = `19px "${customFont}"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  positions.forEach(pos => {
    if (pos.found && pos.circleColor) {
      // 查找对应的动画状态
      const animation = circleAnimations.find(anim => 
        anim.x === pos.x && anim.y === pos.y && anim.color === pos.circleColor
      );
      
      if (animation) {
        // 绘制动画中的圆圈
        drawHandDrawnCircle(pos.x, pos.y, pos.circleColor, pos.circlePoints, animation.progress);
      } else {
        // 绘制完整的圆圈（动画完成或没有动画）
        drawHandDrawnCircle(pos.x, pos.y, pos.circleColor, pos.circlePoints, 1);
      }
      
      // 数字颜色保持不变（黑色）
      ctx.fillStyle = '#333';
      ctx.fillText(pos.number.toString(), pos.x, pos.y);
    } else {
      // 未找到的数字
      ctx.fillStyle = '#333';
      ctx.fillText(pos.number.toString(), pos.x, pos.y);
    }
  });
}

// 游戏结束
function endGame() {
  gameStarted = false;
  clearInterval(touchTimer);
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  wx.showModal({
    title: '游戏完成',
    content: `恭喜你完成了游戏！用时: ${minutes}分${seconds}秒`,
    showCancel: false
  });
}

// 随机打乱数组  
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // 交换元素  
  }
  return array;
}

// 触摸事件处理
wx.onTouchStart((e) => {
  const touch = e.touches[0];
  const x = touch.clientX;
  const y = touch.clientY;

  // 点击提示图标：消耗一次提示并圈出当前目标数字
  if (hintsIconRect && x >= hintsIconRect.x && x <= hintsIconRect.x + hintsIconRect.width && y >= hintsIconRect.y && y <= hintsIconRect.y + hintsIconRect.height) {
    if (hintsCount <= 0) {
      wx.showToast({ title: '没有可用提示', icon: 'none' });
    } else if (currentNumber <= NUMBER_COUNT) {
      const target = positions.find(p => !p.found && p.number === currentNumber);
      if (target) {
        target.found = true;
        target.circleColor = getRandomCircleColor();
        // 点击时生成并缓存手绘圆圈点，避免后续重绘抖动
        target.circlePoints = generateHandDrawnCirclePoints(target.x, target.y, 15);
        // 添加圆圈动画
        addCircleAnimation(target.x, target.y, target.circleColor, target.circlePoints);
        currentNumber++;
        hintsCount--;
        if (currentNumber > NUMBER_COUNT) {
          endGame();
        }
        // 不需要立即调用 drawGame()，动画会自动重绘
      }
    }
    return; // 已处理提示点击，阻止后续处理
  }

  // 点击游戏区域开始游戏
  if (!gameStarted && y > TOP_BAR_HEIGHT && y < SCREEN_HEIGHT - BOTTOM_BAR_HEIGHT) {
    gameStarted = true;
    startTime = Date.now();
    touchTimer = setInterval(() => {
      drawGame();
    }, 1000);
  }

  // 检查是否点击了数字
  const touchRadius = 16; // 触摸检测半径

  positions.forEach(pos => {
    if (!pos.found) {
      // 计算触摸点与数字中心的距离
      const dx = x - pos.x;
      const dy = y - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 如果点击点在数字范围内
      if (distance < touchRadius) {
        if (pos.number === currentNumber) {
          pos.found = true;
          // 为每个数字分配一个随机的圆圈颜色
          pos.circleColor = getRandomCircleColor();
          // 点击时生成并缓存手绘圆圈点，避免后续重绘抖动
          pos.circlePoints = generateHandDrawnCirclePoints(pos.x, pos.y, 15);
          // 添加圆圈动画
          addCircleAnimation(pos.x, pos.y, pos.circleColor, pos.circlePoints);
          currentNumber++;

          // 游戏完成检查
          if (currentNumber > NUMBER_COUNT) {
            endGame();
          }
          // 不需要立即调用 drawGame()，动画会自动重绘
        }
      }
    }
  });
});

loadCustomFont(); // 加载自定义字体
loadHintsIcon();
initGame(); // 初始化游戏