const { Telegraf } = require('telegraf');
const express = require('express');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.log('Missing BOT_TOKEN or CHAT_ID');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const app = express();
app.get('/', (req, res) => res.send('Gold Bot Live RSI 35/60'));
app.listen(process.env.PORT || 10000, () => console.log('Server started'));

const RSI_LOW = 35;
const RSI_HIGH = 60;

async function checkGold() {
  try {
    // هنا بنجيب سعر الدهب الحقيقي
    const res = await fetch('https://api.binance.com/api/v3/klines?symbol=PAXGUSDT&interval=1h&limit=100');
    const data = await res.json();
    const closes = data.map(c => parseFloat(c[4]));
    
    // حساب RSI بسيط
    let gains=0, losses=0;
    for(let i=1; i<14; i++){
      const diff = closes[closes.length-i] - closes[closes.length-i-1];
      if(diff>=0) gains+=diff; else losses-=diff;
    }
    const rs = gains/losses;
    const rsi = 100 - (100/(1+rs));
    
    console.log(`Gold RSI: ${rsi.toFixed(2)}`);
    
    if(rsi < RSI_LOW) {
      await bot.telegram.sendMessage(CHAT_ID, `🟢 ذهب رخيص! RSI = ${rsi.toFixed(1)} (تحت 35)\nإشارة: اشتري`);
    } else if(rsi > RSI_HIGH) {
      await bot.telegram.sendMessage(CHAT_ID, `🔴 ذهب غالي! RSI = ${rsi.toFixed(1)} (فوق 60)\nإشارة: بيع`);
    }
  } catch(e){ console.log('Error:', e.message); }
}

bot.start((ctx) => ctx.reply(`البوت شغال ✅\n35 = شراء\n60 = بيع`));
bot.launch();
console.log('Bot started RSI 35/60');
setInterval(checkGold, 5*60*1000); // كل 5 دقائق
checkGold();
