const { Telegraf } = require('telegraf');
const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);

let lastSignal = 0;

// حساب RSI خفيف وسريع
function calcRSI(prices, period = 14) {
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    let diff = prices[i] - prices[i-1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < prices.length; i++) {
    let diff = prices[i] - prices[i-1];
    if (diff >= 0) {
      avgGain = (avgGain * (period -1) + diff) / period;
      avgLoss = (avgLoss * (period -1)) / period;
    } else {
      avgGain = (avgGain * (period -1)) / period;
      avgLoss = (avgLoss * (period -1) - diff) / period;
    }
  }
  if (avgLoss === 0) return 100;
  let rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

async function getData() {
  // Bybit سريع وما محظور
  const res = await fetch('https://api.bybit.com/v5/market/kline?category=linear&symbol=BTCUSDT&interval=60&limit=100');
  const data = await res.json();
  const klines = data.result.list.reverse(); // Bybit بجيبها مقلوبة
  const closes = klines.map(k => parseFloat(k[4]));
  const price = closes[closes.length - 1];
  const rsi = calcRSI(closes.slice(-30));
  return { price, rsi };
}

bot.start(async (ctx) => {
  ctx.reply('🚀 Dalelco Pro - خفيف وسريع\nFrame: 1h | Buy<35 Sell>65', {
    reply_markup: {
      keyboard: [['📊 Status', '⚙️ Settings']],
      resize_keyboard: true
    }
  });
});

bot.hears('📊 Status', async (ctx) => {
  try {
    ctx.reply('⏳ بجيب السعر...');
    const { price, rsi } = await getData();
    let signal = rsi < 35 ? '🟢 BUY' : rsi > 65 ? '🔴 SELL' : '⚪ WAIT';
    let sl = rsi < 35 ? price * 0.98 : price * 1.02;
    let tp1 = rsi < 35 ? price * 1.02 : price * 0.98;
    let tp2 = rsi < 35 ? price * 1.04 : price * 0.96;
    
    ctx.reply(
      `${signal}\n\n💰 Price: $${price.toFixed(2)}\n📈 RSI: ${rsi.toFixed(2)}\n\n🛑 SL: $${sl.toFixed(2)}\n🎯 TP1: $${tp1.toFixed(2)}\n🎯 TP2: $${tp2.toFixed(2)}\n\nSource: Bybit ✅`
    );
  } catch (e) {
    ctx.reply('⚠️ خطأ بسيط، دوس Status تاني');
  }
});

// فحص كل 5 دقايق بدل 2 (أخف 60%)
setInterval(async () => {
  try {
    const { price, rsi } = await getData();
    if (rsi < 35 && Date.now() - lastSignal > 3600000) {
      lastSignal = Date.now();
      // هنا بيرسل الإشارة لكل الناس
      // bot.telegram.sendMessage...
    }
  } catch(e) {}
}, 300000); // 5 دقايق

bot.launch();
console.log('Bot خفيف شغال بـ Bybit');
