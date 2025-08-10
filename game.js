// game.js
const systemInfo = wx.getSystemInfoSync();
const SCREEN_WIDTH = systemInfo.windowWidth;
const SCREEN_HEIGHT = systemInfo.windowHeight;
const TOP_BAR_HEIGHT = 60;
const NUMBER_COUNT = 100;
const MIN_SPACING = 20; // 减小最小间距

let canvas = wx.createCanvas();
let ctx = canvas.getContext('2d');
let startTime = 0;
let currentNumber = 1;
let gameStarted = false;
let positions = [];
let touchTimer = null;
let backgroundImage = null;

// 加载背景图片的正确方法
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
  const numbers = Array.from({length: NUMBER_COUNT}, (_, i) => i + 1);
  
  // 计算随机位置（使用优化的碰撞检测算法）
  positions = [];
  
  // 计算可用区域
  const availableWidth = SCREEN_WIDTH;
  const availableHeight = SCREEN_HEIGHT - TOP_BAR_HEIGHT;
  
  for (let num of numbers) {
    let position = null;
    let attempts = 0;
    
    // 尝试找到合适的位置
    while (!position && attempts < 200) {
      attempts++;
      
      // 在可见区域生成随机位置（避开头状态栏）
      const x = 10 + Math.random() * (availableWidth - 20);
      const y = TOP_BAR_HEIGHT + 10 + Math.random() * (availableHeight - 20);
      
      let collision = false;
      
      // 检查与所有已有数字的距离
      for (const other of positions) {
        const dx = other.x - x;
        const dy = other.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < MIN_SPACING) {
          collision = true;
          break;
        }
      }
      
      if (!collision) {
        position = {x, y, number: num, found: false};
      }
    }
    
    // 如果尝试失败，强制添加到不会重叠的位置
    if (!position) {
      // 简单均匀分布
      const cols = Math.ceil(Math.sqrt(NUMBER_COUNT));
      const col = positions.length % cols;
      const row = Math.floor(positions.length / cols);
      
      position = {
        x: col * (availableWidth / cols) + (availableWidth / cols) * 0.5,
        y: TOP_BAR_HEIGHT + row * (availableHeight / cols) + (availableHeight / cols) * 0.5,
        number: num,
        found: false
      };
    }
    
    positions.push(position);
  }

  drawGame();
}

// 绘制圆圈的修正方法
function drawCircle(x, y, color) {
  const radius = 12; // 更小的半径
  
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  
  // 添加手绘效果 - 轻微的随机偏移
  const points = [];
  for (let i = 0; i < 8; i++) {
    const angle = i * (Math.PI * 2) / 8;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    points.push({x: px, y: py});
  }
  
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    ctx.quadraticCurveTo(
      points[i].x, 
      points[i].y,
      (points[i].x + next.x) / 2,
      (points[i].y + next.y) / 2
    );
  }
  
  ctx.stroke();
}

// 获取随机的圆圈颜色
function getRandomCircleColor() {
  const colors = [
    '#32CD32', // 绿色（如18,12）
    '#1E90FF', // 蓝色（如4,22）
    '#9370DB', // 紫色
    '#FFD700', // 金色
    '#00CED1'  // 青色
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// 绘制游戏界面（修正）
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
  
  // 绘制时间（左上角）
  const elapsed = gameStarted ? Math.floor((Date.now() - startTime) / 1000) : 0;
  const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const seconds = (elapsed % 60).toString().padStart(2, '0');
  const timeStr = `${minutes}:${seconds}`;
  
  ctx.font = '26px sans-serif';
  ctx.fillStyle = '#333';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(timeStr, 15, TOP_BAR_HEIGHT / 2);
  
  // 绘制下一个要选择的数字（中间）
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${currentNumber}`, SCREEN_WIDTH / 2, TOP_BAR_HEIGHT / 2);
  
  // 绘制数字
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  positions.forEach(pos => {
    if (pos.found && pos.circleColor) {
      // 先绘制圆圈
      drawCircle(pos.x, pos.y, pos.circleColor);
      
      // 再绘制数字（白色，在圆圈上）
      ctx.fillStyle = '#FFF';
      ctx.fillText(pos.number.toString(), pos.x, pos.y);
    } else {
      // 未找到的数字（直接绘制）
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
  const touchRadius = 15; // 触摸检测半径
  
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

// 正确初始化游戏
loadBackgroundImage();
initGame();