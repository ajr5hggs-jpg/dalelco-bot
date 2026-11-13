const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const fetch = require('node-fetch');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.log("Missing BOT_TOKEN or CHAT_ID");
}

const bot = new Telegraf(BOT_TOKEN);
const app = express();
app.get('/', (req, res) => res.send('Dalelco Pro Bot Live - PAXG/USDT'));
app.listen(process.env.PORT || 10000, () => console.log("Web server live"));

// الحالة
let S = {
  frame: '1h',
  buy: 35,
  sell: 65,
  lastSignal: 'No signal yet - Waiting for RSI trigger'
};

// حساب EMA
function ema(arr, period) {
  let k = 2 / (period + 1);
  let emaArr = [arr[0]];
  for (let i = 1; i < arr.length; i++) {
    emaArr.push(arr[i] * k + emaArr[i - 1] * (1 - k));
  }
  return emaArr[emaArr.length - 1];
}

// حساب RSI
function rsi(closes) {
  let gains = 0, losses = 0;
  for (let i = closes.length - 15; i < closes.length - 1; i++) {
    let diff = closes[i + 1] - closes[i];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  let rs = gains / losses;
  return 100 - (100 / (1 + rs));
}

// جلب البيانات من Binance
async function getData() {
  let url = `https://api.binance.com/api/v3/klines?symbol=PAXGUSDT&interval=${S.frame}&limit=100`;
  let res = await fetch(url);
  let data = await res.json();
  let closes = data.map(c => parseFloat(c[4]));
  let price = closes[closes.length - 1];
  return {
    price: price,
    ema20: ema(closes, 20),
    ema50: ema(closes, 50),
    rsi: rsi(closes),
    trend: price > ema(closes, 20) ? 'Uptrend 📈' : 'Downtrend 📉'
  };
}

// بناء رسالة الإشارة مع SL/TP
function buildSignal(data, type) {
  let entry = data.price;
  let sl = data.ema50;
  let risk = Math.abs(entry - sl);
  
  let tp1, tp2;
  if (type === 'BUY') {
    tp1 = entry + risk * 1.5;
    tp2 = entry + risk * 3;
  } else {
    tp1 = entry - risk * 1.5;
    tp2 = entry - risk * 3;
  }

  let slPerc = ((sl - entry) / entry * 100).toFixed(2);
  let tp1Perc = ((tp1 - entry) / entry * 100).toFixed(2);
  let tp2Perc = ((tp2 - entry) / entry * 100).toFixed(2);

  let icon = type === 'BUY' ? '🟢' : '🔴';
  
  let msg = `${icon} ${type} SIGNAL - PAXG/USDT (${S.frame})\n\n`;
  msg += `Entry: $${entry.toFixed(2)}\n`;
  msg += `SL: $${sl.toFixed(2)} (EMA50) (${slPerc}%)\n`;
  msg += `TP1: $${tp1.toFixed(2)} (${tp1Perc}% | RR 1.5)\n`;
  msg += `TP2: $${tp2.toFixed(2)} (${tp2Perc}% | RR 3)\n\n`;
  msg += `RSI: ${data.rsi.toFixed(1)} | ${data.trend}\n`;
  msg += `EMA20: $${data.ema20.toFixed(2)}\n`;
  msg += `EMA50: $${data.ema50.toFixed(2)}\n`;
  msg += `Time: ${new Date().toISOString().slice(0, 16)} UTC\n\n`;
  msg += `⚠️ Signal only - Not financial advice`;

  S.lastSignal = msg;
  return msg;
}

// الفحص التلقائي كل 2 دقيقة
async function autoCheck() {
  try {
    let d = await getData();
    console.log(`Check ${S.frame} | Price $${d.price.toFixed(2)} | RSI ${d.rsi.toFixed(1)}`);
    if (d.rsi < S.buy) {
      await bot.telegram.sendMessage(CHAT_ID, buildSignal(d, 'BUY'));
    } else if (d.rsi > S.sell) {
      await bot.telegram.sendMessage(CHAT_ID, buildSignal(d, 'SELL'));
    }
  } catch (e) {
    console.log("AutoCheck Error:", e.message);
  }
}

// الكيبورد
function mainKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📊 Status', 'do_status'), Markup.button.callback('💰 Live Price', 'do_price')],
    [Markup.button.callback('⚙️ Settings', 'do_settings'), Markup.button.callback('📈 Last Signal', 'do_last')]
  ]);
}

// الأوامر
bot.start(async (ctx) => {
  await ctx.reply(`Welcome to Dalelco Pro Bot 🚀\nFrame: ${S.frame} | Buy<${S.buy} Sell>${S.sell}\n\nChecking market...`, mainKeyboard());
  let d = await getData();
  await ctx.reply(buildSignal(d, d.rsi < 50 ? 'BUY' : 'SELL'));
});

bot.command('status', async (ctx) => {
  let d = await getData();
  ctx.reply(`📊 Status ${S.frame}\nPrice: $${d.price.toFixed(2)}\nEMA20: $${d.ema20.toFixed(2)}\nEMA50: $${d.ema50.toFixed(2)}\nRSI: ${d.rsi.toFixed(1)}\nTrend: ${d.trend}`, mainKeyboard());
});

bot.command('price', async (ctx) => {
  let d = await getData();
  ctx.reply(`💰 PAXG/USDT Live: $${d.price.toFixed(2)}\nRSI: ${d.rsi.toFixed(1)} (${S.frame})`);
});

bot.action('do_status', async (ctx) => {
  let d = await getData();
  await ctx.editMessageText(`📊 Status - ${S.frame}\nPrice: $${d.price.toFixed(2)}\nEMA20: $${d.ema20.toFixed(2)}\nEMA50: $${d.ema50.toFixed(2)}\nRSI: ${d.rsi.toFixed(1)}\nTrend: ${d.trend}\n\nBuy<${S.buy} Sell>${S.sell}`, mainKeyboard());
});

bot.action('do_price', async (ctx) => {
  let d = await getData();
  await ctx.answerCbQuery();
  await ctx.reply(`💰 Live: $${d.price.toFixed(2)} | RSI ${d.rsi.toFixed(1)} | ${S.frame}`);
});

bot.action('do_last', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(S.lastSignal);
});

bot.action('do_settings', async (ctx) => {
  await ctx.editMessageText(`⚙️ Settings\nCurrent: Frame ${S.frame} | Buy <${S.buy} | Sell >${S.sell}`, Markup.inlineKeyboard([
    [Markup.button.callback('1m', 'f_1m'), Markup.button.callback('15m', 'f_15m'), Markup.button.callback('1h', 'f_1h'), Markup.button.callback('4h', 'f_4h')],
    [Markup.button.callback('Buy 30', 'b_30'), Markup.button.callback('Buy 35', 'b_35'), Markup.button.callback('Buy 40', 'b_40')],
    [Markup.button.callback('Sell 60', 's_60'), Markup.button.callback('Sell 65', 's_65'), Markup.button.callback('Sell 70', 's_70')],
    [Markup.button.callback('⬅️ Back', 'do_status')]
  ]));
});

bot.action(/f_(.+)/, async (ctx) => {
  S.frame = ctx.match[1];
  await ctx.answerCbQuery(`Frame set to ${S.frame}`);
  await ctx.editMessageText(`Frame changed to ${S.frame}`, mainKeyboard());
});

bot.action(/b_(.+)/, async (ctx) => {
  S.buy = parseInt(ctx.match[1]);
  await ctx.answerCbQuery(`Buy set to ${S.buy}`);
});

bot.action(/s_(.+)/, async (ctx) => {
  S.sell = parseInt(ctx.match[1]);
  await ctx.answerCbQuery(`Sell set to ${S.sell}`);
});

bot.launch().then(() => console.log("Bot launched"));
setInterval(autoCheck, 120000); // كل 2 دقيقة
autoCheck();
