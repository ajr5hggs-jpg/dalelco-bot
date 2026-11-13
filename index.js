const express = require('express');
const app = express();
app.get('/', (req,res)=>res.send('Dalelco Auto OK - Entry+SL+TP'));
app.listen(process.env.PORT || 10000, '0.0.0.0', ()=>console.log('Web OK'));

if(!process.env.BOT_TOKEN){
  console.log('BOT_TOKEN missing in Render');
} else {
  const { Telegraf } = require('telegraf');
  const https = require('https');
  const bot = new Telegraf(process.env.BOT_TOKEN);
  
  let set = { frame:'60', buy:35, sell:65, auto:true, lastSig:'WAIT' };
  let chats = new Set();

  function getBinance(interval){
    const map = {'15':'15m','60':'1h','240':'4h','D':'1d'};
    let binInt = map[interval] || '1h';
    return new Promise((res,rej)=>{
      https.get(`https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=${binInt}&limit=50`, r=>{
        let d=''; r.on('data',c=>d+=c); r.on('end',()=>{ try{res(JSON.parse(d))}catch(e){rej(e)} });
      }).on('error',rej);
    });
  }

  async function getData(){
    const klines = await getBinance(set.frame);
    const c = klines.map(x=>parseFloat(x[4]));
    let g=0,lo=0; 
    for(let i=c.length-14;i<c.length;i++){ 
      let de=c[i]-c[i-1]; 
      if(de>=0) g+=de; else lo-=de; 
    }
    let rsi = lo==0?100:100-(100/(1+(g/14)/(lo/14)));
    return {price:c[c.length-1], rsi};
  }

  const menu={reply_markup:{keyboard:[['📊 Status','💰 Price'],['⚙️ Frame','📈 RSI'],['🔔 Auto ON','🔕 Auto OFF'],['❓ Help']],resize_keyboard:true}};

  bot.catch((err, ctx)=>console.log('Bot err: '+err.message));

  bot.start(ctx=>{
    chats.add(ctx.chat.id);
    ctx.reply(`🚀 Dalelco Bot شغال
━━━━━━━━━━━━━━
F: ${set.frame} | B<${set.buy} S>${set.sell}
Auto: ${set.auto?'ON ✅':'OFF 🔕'}

📊 Status = فحص + دخول + SL + TP
🔔 Auto ON = يرسل براو عند إشارة دخول فقط
🔕 Auto OFF = يوقف
━━━━━━━━━━━━━━`, menu);
  });

  bot.hears('📊 Status', async ctx=>{
    try{ 
      chats.add(ctx.chat.id);
      const {price,rsi}=await getData(); 
      let isBuy=rsi<set.buy, isSell=rsi>set.sell;
      let sig=isBuy?'🟢 BUY':isSell?'🔴 SELL':'⚪ WAIT';
      let sl=isBuy?price*0.98:isSell?price*1.02:price*0.98;
      let tp1=isBuy?price*1.03:isSell?price*0.97:price*1.03;
      let tp2=isBuy?price*1.05:isSell?price*0.95:price*1.05;

      ctx.reply(
` ${sig} BTC
━━━━━━━━━━━━━━
💰 سعر الدخول: $${price.toFixed(2)}
📈 RSI: ${rsi.toFixed(1)} (B<${set.buy} S>${set.sell})
⏰ فريم: ${set.frame}

🛑 Stop Loss: $${sl.toFixed(2)} (${isBuy?'-2%':isSell?'+2%':'-2%'})
🎯 Take Profit 1: $${tp1.toFixed(2)} (${isBuy?'+3%':isSell?'-3%':'+3%'})
🎯 Take Profit 2: $${tp2.toFixed(2)} (${isBuy?'+5%':isSell?'-5%':'+5%'})
━━━━━━━━━━━━━━`, menu);
    }catch(e){ ctx.reply('حاول تاني بعد دقيقة', menu); }
  });

  bot.hears('💰 Price
