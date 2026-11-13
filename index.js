const { Telegraf } = require('telegraf');
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Dalelco Bot Live - Bybit'));
app.listen(10000, () => console.log('Server ON 10000'));

const bot = new Telegraf(process.env.BOT_TOKEN);

let settings = { frame: '60', rsi_buy: 35, rsi_sell: 65, auto: false };
let lastSignal = 0;

function calcRSI(prices, p = 14) {
  let g = 0, l = 0;
  for (let i = 1; i <= p; i++) {
    let d = prices[i] - prices[i - 1];
    if (d >= 0) g += d; else l -= d;
  }
  let ag = g / p, al = l / p;
  for (let i = p + 1; i < prices.length; i++) {
    let d = prices[i] - prices[i - 1];
    if (d >= 0) { ag = (ag * (p - 1) + d) / p; al = (al * (p - 1)) / p; }
    else { ag = (ag * (p - 1)) / p; al = (al * (p - 1) - d) / p; }
  }
  if (al == 0) return 100;
  return 100 - (100 / (1 + ag / al));
}

async function getData() {
  const res = await fetch(`https://api.bybit.com/v5/market/kline?category=linear&symbol=BTCUSDT&interval=${settings.frame}&limit=100`);
  const json = await res.json();
  const list = json.result.list.reverse();
  const closes = list.map(k => parseFloat(k[4]));
  return { price: closes[closes.length - 1], rsi: calcRSI(closes.slice(-30)) };
}

const mainMenu = {
  reply_markup: {
    keyboard: [
      ['📊 Status', '⚙️ Settings'],
      ['🔔 Auto ON', '🔕 Auto OFF'],
      ['💰 Price', '❓ Help']
    ],
    resize_keyboard: true
  }
};

bot.start((ctx) => {
  ctx.reply(`🚀 Dalelco Pro - Bybit Fast\nFrame: ${settings.frame} | Buy<${settings.rsi_buy} Sell>${settings.rsi_sell}\nAuto: ${settings.auto ? 'ON' : 'OFF'}`, mainMenu);
});

bot.hears('📊 Status', async (ctx) => {
  try {
    const { price, rsi } = await getData();
    let sig = rsi < settings.rsi_buy ? '🟢 BUY' : rsi > settings.rsi_sell ? '🔴 SELL' : '⚪ WAIT';
    let sl = sig.includes('BUY') ? price * 0.98 : price * 1.02;
    let tp1 = sig.includes('BUY') ? price * 1.02 : price * 0.98;
    let tp2 = sig.includes('BUY') ? price * 1.04 : price * 0.96;
    ctx.reply(`${sig}\n\n💰 Price: $${price.toFixed(2)}\n📈 RSI: ${rsi.toFixed(2)}\n\n🛑 SL: $${sl.toFixed(2)}\n🎯 TP1: $${tp1.toFixed(2)}\n🎯 TP2: $${tp2.toFixed(2)}`, mainMenu);
  } catch (e) { ctx.reply('⚠️ جرب تاني', mainMenu); }
});

bot.hears('💰 Price', async (ctx) => {
  const { price } = await getData();
  ctx.reply(`💰 BTC: $${price.toFixed(2)}`, mainMenu);
});

bot.hears('⚙️ Settings', (ctx) => {
  ctx.reply('⚙️ اختار الفريم:', {
    reply_markup: { inline_keyboard: [[{ text: '1h', callback_data: 'f_60' }, { text: '4h', callback_data: 'f_240' }, { text: '1d', callback_data: 'f_D' }]] }
  });
});

bot.hears('🔔 Auto ON', (ctx) => { settings.auto = true; ctx.reply('🔔 Auto ON كل 5 دقايق', mainMenu); });
bot.hears('🔕 Auto OFF', (ctx) => { settings.auto = false; ctx.reply('🔕 Auto OFF', mainMenu); });
bot.hears('❓ Help', (ctx) => ctx.reply('Status: فحص كامل\nPrice: السعر بس\nSettings: الفريم\nAuto: تشغيل تلقائي', mainMenu));

bot.on('callback_query', (ctx) => {
  const d = ctx.callbackQuery.data;
  if (d.startsWith('f_')) { settings.frame = d.replace('f_', ''); ctx.reply(`✅ Frame بقى ${settings.frame}`, mainMenu); }
  ctx.answerCbQuery();
});

setInterval(async () => {
  if (!settings.auto) return;
  try {
    const { price, rsi } = await getData();
    if ((rsi < settings.rsi_buy || rsi > settings.rsi_sell) && Date.now() - lastSignal > 3600000) {
      lastSignal = Date.now();
    }
  } catch (e) { }
}, 300000);

bot.launch();
console.log('Bot Live');
