// game.js
const systemInfo = wx.getSystemInfoSync();
const SCREEN_WIDTH = systemInfo.windowWidth;
const SCREEN_HEIGHT = systemInfo.windowHeight;
const TOP_BAR_HEIGHT = 60;
const NUMBER_COUNT = 100;

let canvas = wx.createCanvas();
let ctx = canvas.getContext('2d');
let startTime = 0;
let currentNumber = 1;
let gameStarted = false;
let positions = [];
let touchTimer = null;

// 初始化游戏
function initGame() {
  // 生成1-100的有序数组
  const numbers = Array.from({length: NUMBER_COUNT}, (_, i) => i + 1);
  
  // 计算随机位置（避开边缘和顶部状态栏）
  positions = [];
  const minSpacing = Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) / 20; // 最小间距
  
  for (let i = 0; i < numbers.length; i++) {
    let validPosition = false;
    let attempts = 0;
    
    while (!validPosition && attempts < 100) {
      attempts++;
      const newPos = {
        x: Math.random() * (SCREEN_WIDTH - 40) + 20,
        y: TOP_BAR_HEIGHT + 20 + Math.random() * (SCREEN_HEIGHT - TOP_BAR_HEIGHT - 60),
        number: numbers[i],
        found: false
      };
      
      // 检查是否与其他数字重叠
      validPosition = true;
      for (const pos of positions) {
        const dx = newPos.x - pos.x;
        const dy = newPos.y - pos.y;
        if (dx * dx + dy * dy < minSpacing * minSpacing) {
          validPosition = false;
          break;
        }
      }
      
      if (validPosition) positions.push(newPos);
    }
    
    // 如果尝试太多次找不到位置，随机放入
    if (!validPosition) {
      positions.push({
        x: Math.random() * (SCREEN_WIDTH - 40) + 20,
        y: TOP_BAR_HEIGHT + 20 + Math.random() * (SCREEN_HEIGHT - TOP_BAR_HEIGHT - 60),
        number: numbers[i],
        found: false
      });
    }
  }

  drawGame();
}

// 绘制手绘效果的圆圈
function drawHandDrawnCircle(x, y, radius, color) {
  const POINTS = 24; // 更多点使圆更平滑
  const JITTER = radius * 0.1; // 抖动幅度
  const lineWidth = 3;
  
  ctx.beginPath();
  
  // 创建初始点
  const startAngle = Math.random() * Math.PI * 2;
  for (let i = 0; i < POINTS; i++) {
    const angle = startAngle + i * Math.PI * 2 / POINTS;
    
    // 添加随机抖动
    const jitteredRadius = radius + (Math.random() - 0.5) * JITTER;
    const pointX = x + Math.cos(angle) * jitteredRadius;
    const pointY = y + Math.sin(angle) * jitteredRadius;
    
    if (i === 0) {
      ctx.moveTo(pointX, pointY);
    } else {
      // 使用二次贝塞尔曲线连接点
      const prevX = x + Math.cos(angle - Math.PI * 2 / POINTS) * radius;
      const prevY = y + Math.sin(angle - Math.PI * 2 / POINTS) * radius;
      const controlX = (prevX + pointX) / 2;
      const controlY = (prevY + pointY) / 2;
      ctx.quadraticCurveTo(controlX, controlY, pointX, pointY);
    }
  }
  
  // 闭合路径
  ctx.closePath();
  
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

// 获取随机的圆圈颜色（蓝、绿、紫等明快颜色）
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
  ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  
  // 绘制顶部状态栏
  ctx.fillStyle = '#f9f9f9';
  ctx.fillRect(0, 0, SCREEN_WIDTH, TOP_BAR_HEIGHT);
  
  // 绘制分割线
  ctx.strokeStyle = '#e0e0e0';
  ctx.beginPath();
  ctx.moveTo(0, TOP_BAR_HEIGHT);
  ctx.lineTo(SCREEN_WIDTH, TOP_BAR_HEIGHT);
  ctx.stroke();
  
  // 绘制时间
  const elapsed = gameStarted ? Math.floor((Date.now() - startTime) / 1000) : 0;
  const timeStr = `${Math.floor(elapsed / 60).toString().padStart(2, '0')}:${(elapsed % 60).toString().padStart(2, '0')}`;
  
  ctx.font = '28px sans-serif';
  ctx.fillStyle = '#333';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(timeStr, 20, TOP_BAR_HEIGHT / 2);
  
  // 绘制下一个要选择的数字（较大字体）
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`下一个: ${currentNumber}`, SCREEN_WIDTH / 2, TOP_BAR_HEIGHT / 2);
  
  // 绘制图标区域背景
  ctx.fillStyle = '#f0f0f0';
  ctx.beginPath();
  ctx.arc(SCREEN_WIDTH - 50, TOP_BAR_HEIGHT / 2, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(SCREEN_WIDTH - 100, TOP_BAR_HEIGHT / 2, 20, 0, Math.PI * 2);
  ctx.fill();
  
  // 绘制数字 - 较小的字体
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  positions.forEach(pos => {
    if (!pos.found) {
      ctx.fillStyle = '#333';
      ctx.fillText(pos.number.toString(), pos.x, pos.y);
    } else if (pos.circleColor) {
      // 已找到的数字要保留圆圈和数字
      drawHandDrawnCircle(pos.x, pos.y, 22, pos.circleColor);
      ctx.fillStyle = '#FFF';
      ctx.fillText(pos.number.toString(), pos.x, pos.y);
    }
  });
  
  // 绘制进度百分比
  const percent = ((currentNumber - 1) / NUMBER_COUNT * 100).toFixed(1);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#666';
  ctx.textAlign = 'right';
  ctx.fillText(`${percent}%`, SCREEN_WIDTH - 20, TOP_BAR_HEIGHT / 2);
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
  positions.forEach(pos => {
    if (!pos.found) {
      // 计算触摸点与数字中心的距离
      const dx = x - pos.x;
      const dy = y - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // 如果点击点在数字范围内
      if (distance < 25) {
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
initGame();