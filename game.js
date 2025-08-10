// game.js
const systemInfo = wx.getSystemInfoSync();
const SCREEN_WIDTH = systemInfo.windowWidth;
const SCREEN_HEIGHT = systemInfo.windowHeight;
const TOP_BAR_HEIGHT = 60;
const NUMBER_COUNT = 100;
const MIN_SPACING = 30; // 数字间最小间距

let canvas = wx.createCanvas();
let ctx = canvas.getContext('2d');
let startTime = 0;
let currentNumber = 1;
let gameStarted = false;
let positions = [];
let touchTimer = null;
let backgroundImage = null;

// 加载背景图片
const loadBackgroundImage = () => {
  const img = wx.createImage();
  img.onload = () => {
    backgroundImage = img;
    drawGame();
  };
  img.src = './images/bg.jpeg';
};

// 初始化游戏
function initGame() {
  // 生成1-100的有序数组
  const unShufflednumbers = Array.from({length: NUMBER_COUNT}, (_, i) => i + 1);
  const numbers = shuffleArray(unShufflednumbers);

  // 计算随机位置（使用优化的均匀分布算法）
  positions = [];
  
  // 计算可用区域
  const availableWidth = SCREEN_WIDTH;
  const availableHeight = SCREEN_HEIGHT - TOP_BAR_HEIGHT;
  
  // 计算网格行列数（确保数字均匀分布）
  const cols = Math.ceil(Math.sqrt(NUMBER_COUNT * (availableWidth / availableHeight)));
  const rows = Math.ceil(NUMBER_COUNT / cols);
  const cellWidth = availableWidth / cols;
  const cellHeight = availableHeight / rows;
  
  // 在网格单元内随机放置数字
  for (let i = 0; i < numbers.length; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    
    // 在网格单元内随机偏移（确保间距）
    const x = col * cellWidth + cellWidth * 0.5 + (Math.random() - 0.5) * (cellWidth - MIN_SPACING);
    const y = TOP_BAR_HEIGHT + row * cellHeight + cellHeight * 0.5 + (Math.random() - 0.5) * (cellHeight - MIN_SPACING);
    
    positions.push({
      x: Math.max(20, Math.min(SCREEN_WIDTH - 20, x)),
      y: Math.max(TOP_BAR_HEIGHT + 20, Math.min(SCREEN_HEIGHT - 20, y)),
      number: numbers[i],
      found: false
    });
  }

  drawGame();
}

// 绘制手绘效果的圆圈
function drawHandDrawnCircle(x, y, color) {
  const radius = 15; // 圆圈半径
  
  ctx.beginPath();
  
  // 创建手绘效果的点
  const points = [];
  for (let i = 0; i < 8; i++) {
    const angle = i * (Math.PI * 2) / 8;
    // 添加轻微不规则性
    const offset = Math.random() * 2 - 1;
    points.push({
      x: x + Math.cos(angle) * (radius + offset),
      y: y + Math.sin(angle) * (radius + offset)
    });
  }
  
  // 使用二次贝塞尔曲线连接点
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    if (i === 0) {
      ctx.moveTo(points[i].x, points[i].y);
    }
    const cpx = (points[i].x + next.x) / 2;
    const cpy = (points[i].y + next.y) / 2;
    ctx.quadraticCurveTo(cpx, cpy, next.x, next.y);
  }
  
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
    '#00CED1'  // 青色
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
  ctx.fillStyle = 'rgba(249, 249, 249, 0.8)';
  ctx.fillRect(0, 0, SCREEN_WIDTH, TOP_BAR_HEIGHT);
  
  // 绘制分割线
  ctx.strokeStyle = '#e0e0e0';
  ctx.beginPath();
  ctx.moveTo(0, TOP_BAR_HEIGHT);
  ctx.lineTo(SCREEN_WIDTH, TOP_BAR_HEIGHT);
  ctx.stroke();
  
  // 绘制时间
  const elapsed = gameStarted ? Math.floor((Date.now() - startTime) / 1000) : 0;
  const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const seconds = (elapsed % 60).toString().padStart(2, '0');
  const timeStr = `${minutes}:${seconds}`;
  
  ctx.font = '26px sans-serif';
  ctx.fillStyle = '#333';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(timeStr, 15, TOP_BAR_HEIGHT / 2);
  
  // 绘制下一个要选择的数字
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${currentNumber}`, SCREEN_WIDTH / 2, TOP_BAR_HEIGHT / 2);
  
  // 绘制数字
  ctx.font = '15px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  positions.forEach(pos => {
    if (pos.found && pos.circleColor) {
      // 先绘制手绘圆圈
      drawHandDrawnCircle(pos.x, pos.y, pos.circleColor);
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
  if (!gameStarted && y > TOP_BAR_HEIGHT) {
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

// 初始化游戏
loadBackgroundImage();
initGame();