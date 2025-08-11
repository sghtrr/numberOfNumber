// game.js
const windowInfo = wx.getWindowInfo();
const SCREEN_WIDTH = windowInfo.windowWidth;
const SCREEN_HEIGHT = windowInfo.windowHeight;
const TOP_BAR_HEIGHT = 105;
const BOTTOM_BAR_HEIGHT = 85; // 新增底部留白区域
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
let backgroundImage = null;
let customFont = null;
let hintsIcon = null; // 提示图标

// 加载自定义字体
const loadCustomFont = () => {
  try {
    const family = wx.loadFont('font/caveat/caveatbrush-regular.ttf'); // 返回可用的字体族名
    customFont = family || 'sans-serif';
    console.log('字体加载成功:', customFont);
    drawGame();
  } catch (err) {
    console.error('字体加载失败:', err);
    customFont = 'sans-serif';
    drawGame();
  }
};

// 加载背景图片
const loadBackgroundImage = () => {
  const img = wx.createImage();
  console.log('背景加载成功');
  img.onload = () => {
    backgroundImage = img;
    drawGame();
  };
  img.src = 'images/bg.jpeg';
};

// 加载提示图标（左下）
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
  const numbers = shuffleArray(unShufflednumbers);

  // 计算随机位置（使用优化的均匀分布算法）
  positions = [];

  // 计算可用区域（考虑顶部和底部留白）
  const availableWidth = SCREEN_WIDTH;
  const availableHeight = SCREEN_HEIGHT - TOP_BAR_HEIGHT - BOTTOM_BAR_HEIGHT;

  // 随机生成每行数字数量（6-10之间）
  // const cols = Math.floor(Math.random() * 5) + 6; // 6-10
  const cols = 10;
  const rows = Math.ceil(NUMBER_COUNT / cols);
  const cellWidth = availableWidth / cols;
  const cellHeight = availableHeight / rows;

  // 生成随机偏移因子（使每次游戏布局不同）
  const randomOffsetFactor = Math.random() * 0.1 + 0.9; // 0.9-1.0之间的随机因子

  // 在网格单元内随机放置数字
  for (let i = 0; i < numbers.length; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;

    // 网格单元基础位置
    const baseX = col * cellWidth;
    const baseY = row * cellHeight;

    // 添加更大幅度的随机偏移（同时确保间距）
    const offsetX = Math.random() * (cellWidth - MIN_SPACING) * randomOffsetFactor;
    const offsetY = Math.random() * (cellHeight - MIN_SPACING) * randomOffsetFactor;

    // 最终位置（使用更动态的计算方式）
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

function drawHandDrawnCircle(x, y, color, points) {
  const radius = 15; // 圆圈半径
  const pts = (points && points.length) ? points : generateHandDrawnCirclePoints(x, y, radius);

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const current = pts[i];
    const cpx = (prev.x + current.x) / 2;
    const cpy = (prev.y + current.y) / 2;
    ctx.quadraticCurveTo(prev.x, prev.y, cpx, cpy);
  }
  ctx.quadraticCurveTo(pts[pts.length - 1].x, pts[pts.length - 1].y, pts[0].x, pts[0].y);

  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.stroke();
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

  // 绘制背景图片（如果有）
  if (backgroundImage) {
    ctx.drawImage(backgroundImage, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  } else {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
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

  // 绘制提示图标（位于底部留白区域左侧）
  if (hintsIcon) {
    console.log("icon绘画")
    const iconSize = 40; // 图标尺寸
    const barTop = SCREEN_HEIGHT - BOTTOM_BAR_HEIGHT + 5;
    const iconX = 30; // 左侧内边距
    const iconY = barTop + (BOTTOM_BAR_HEIGHT - iconSize) / 2; // 垂直居中
    ctx.drawImage(hintsIcon, iconX, iconY, iconSize, iconSize);
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
      // 先绘制手绘圆圈
      drawHandDrawnCircle(pos.x, pos.y, pos.circleColor, pos.circlePoints);
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
          currentNumber++;

          // 游戏完成检查
          if (currentNumber > NUMBER_COUNT) {
            endGame();
          }

          drawGame();
        }
      }
    }
  });
});

loadCustomFont(); // 加载自定义字体
loadBackgroundImage(); // 加载背景图片
loadHintsIcon();
initGame(); // 初始化游戏