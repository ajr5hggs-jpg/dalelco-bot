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

  bot.hears('💰 Price', async ctx=>{ 
    try{ const {price}=await getData(); ctx.reply(`💰 BTC: $${price.toFixed(2)}`, menu); }
    catch{ ctx.reply('جرب تاني', menu); }
  });

  bot.hears('⚙️ Frame', ctx=>ctx.reply('اختار الفريم:',{reply_markup:{inline_keyboard:[[{text:'15m',callback_data:'f_15'},{text:'1h',callback_data:'f_60'},{text:'4h',callback_data:'f_240'},{text:'1D',callback_data:'f_D'}]]}}));
  bot.hears('📈 RSI', ctx=>ctx.reply(`RSI الحالي B<${set.buy} S>${set.sell}`,{reply_markup:{inline_keyboard:[[{text:'Buy 30',callback_data:'b_30'},{text:'Buy 35',callback_data:'b_35'}],[{text:'Sell 65',callback_data:'s_65'},{text:'Sell 70',callback_data:'s_70'}]]}}));
  bot.hears('🔔 Auto ON', ctx=>{ set.auto=true; chats.add(ctx.chat.id); ctx.reply('✅ Auto شغال\nحيرسل ليك براو بس لما تجي إشارة:\n💰 دخول + 🛑 SL + 🎯 TP', menu); });
  bot.hears('🔕 Auto OFF', ctx=>{ set.auto=false; ctx.reply('🔕 Auto وقف', menu); });
  bot.hears('❓ Help', ctx=>ctx.reply('البوت بفحص كل 5 دقايق ويرسل إشارة دخول كاملة براو', menu));

  bot.on('callback_query', ctx=>{
    const d=ctx.callbackQuery.data;
    if(d.startsWith('f_')) set.frame=d.split('_')[1];
    if(d.startsWith('b_')) set.buy=parseInt(d.split('_')[1]);
    if(d.startsWith('s_')) set.sell=parseInt(d.split('_')[1]);
    ctx.answerCbQuery(); ctx.reply(`✅ تم F:${set.frame} B:${set.buy} S:${set.sell}`, menu);
  });

  // Auto يرسل براو عند إشارة دخول فقط
  setInterval(async ()=>{
    if(!set.auto || chats.size==0) return;
    try{
      const {price,rsi}=await getData();
      let curSig = rsi<set.buy ? 'BUY' : rsi>set.sell ? 'SELL' : 'WAIT';
      
      if(curSig!='WAIT' && curSig!=set.lastSig){
        let isBuy=curSig=='BUY';
        let sl=isBuy?price*0.98:price*1.02;
        let tp1=isBuy?price*1.03:price*0.97;
        let tp2=isBuy?price*1.05:price*0.95;
        
        let msg=
`🚨 إشارة دخول جديدة!
${isBuy?'🟢 BUY':'🔴 SELL'} BTC
━━━━━━━━━━━━━━
💰 سعر الدخول: $${price.toFixed(2)}
📈 RSI: ${rsi.toFixed(1)}
⏰ فريم: ${set.frame}

🛑 Stop Loss: $${sl.toFixed(2)}
🎯 TP1: $${tp1.toFixed(2)}
🎯 TP2: $${tp2.toFixed(2)}
━━━━━━━━━━━━━━`;
        
        for(let chatId of chats){
          bot.telegram.sendMessage(chatId, msg, menu).catch(()=>{});
        }
      }
      set.lastSig=curSig;
    }catch(e){ console.log('Auto err: '+e.message); }
  }, 5*60*1000);

  bot.launch().then(()=>console.log('BOT LAUNCHED - AUTO ENTRY ONLY'));
}
