const express = require('express');
const app = express();
app.get('/', (req,res)=>res.send('Dalelco Multi GOLD+EURO+DOLLAR OK'));
app.listen(process.env.PORT || 10000, '0.0.0.0', ()=>console.log('Web OK'));

if(!process.env.BOT_TOKEN){
  console.log('BOT_TOKEN missing');
} else {
  const { Telegraf } = require('telegraf');
  const https = require('https');
  const bot = new Telegraf(process.env.BOT_TOKEN);
  
  let set = { frame:'60', buy:35, sell:65, auto:true, lastSig:'WAIT', sym:'PAXGUSDT', symName:'GOLD 🥇' };
  let chats = new Set();

  function getBinance(interval){
    const map = {'15':'15m','60':'1h','240':'4h','D':'1d'};
    let binInt = map[interval] || '1h';
    return new Promise((res,rej)=>{
      https.get(`https://data-api.binance.vision/api/v3/klines?symbol=${set.sym}&interval=${binInt}&limit=50`, r=>{
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

  const menu={reply_markup:{keyboard:[['📊 Status','💰 Price'],['💱 Currency','⚙️ Frame'],['📈 RSI','🔔 Auto ON'],['🔕 Auto OFF','❓ Help']],resize_keyboard:true}};

  bot.catch((e,ctx)=>console.log(e.message));

  bot.start(ctx=>{
    chats.add(ctx.chat.id);
    ctx.reply(`🚀 Dalelco Multi شغال
━━━━━━━━━━━━━━
عملة: ${set.symName} (${set.sym})
F: ${set.frame} | B<${set.buy} S>${set.sell}
Auto: ${set.auto?'ON ✅':'OFF'}

💱 Currency = غير العملة
📊 Status = دخول + SL + TP
━━━━━━━━━━━━━━`, menu);
  });

  bot.hears('💱 Currency', ctx=>{
    ctx.reply('اختار العملة:',{reply_markup:{inline_keyboard:[
      [{text:'🥇 GOLD (XAU)',callback_data:'cur_PAXGUSDT_GOLD'}],
      [{text:'💶 EURO (EUR)',callback_data:'cur_EURUSDT_EURO'}],
      [{text:'💵 DOLLAR (BTC)',callback_data:'cur_BTCUSDT_DOLLAR'}]
    ]}});
  });

  bot.hears('📊 Status', async ctx=>{
    try{ 
      chats.add(ctx.chat.id);
      const {price,rsi}=await getData(); 
      let isBuy=rsi<set.buy, isSell=rsi>set.sell;
      let sig=isBuy?`🟢 BUY ${set.symName}`:isSell?`🔴 SELL ${set.symName}`:`⚪ WAIT ${set.symName}`;
      let sl=isBuy?price*0.98:isSell?price*1.02:price*0.98;
      let tp1=isBuy?price*1.03:isSell?price*0.97:price*1.03;
      let tp2=isBuy?price*1.05:isSell?price*0.95:price*1.05;
      ctx.reply(`${sig}\n━━━━━━━━━━━━━━\n💰 دخول ${set.sym}: $${price.toFixed(4)}\n📈 RSI: ${rsi.toFixed(1)}\n⏰ فريم: ${set.frame}\n\n🛑 SL: $${sl.toFixed(4)}\n🎯 TP1: $${tp1.toFixed(4)}\n🎯 TP2: $${tp2.toFixed(4)}\n━━━━━━━━━━━━━━`, menu);
    }catch(e){ ctx.reply('حاول تاني', menu); }
  });

  bot.hears('💰 Price', async ctx=>{ 
    try{ const {price}=await getData(); ctx.reply(`${set.symName}: $${price.toFixed(4)}`, menu); }
    catch{ ctx.reply('جرب تاني', menu); }
  });

  bot.hears('⚙️ Frame', ctx=>ctx.reply('اختار الفريم:',{reply_markup:{inline_keyboard:[[{text:'15m',callback_data:'f_15'},{text:'1h',callback_data:'f_60'},{text:'4h',callback_data:'f_240'},{text:'1D',callback_data:'f_D'}]]}}));
  bot.hears('📈 RSI', ctx=>ctx.reply(`RSI B<${set.buy} S>${set.sell}`,{reply_markup:{inline_keyboard:[[{text:'Buy 30',callback_data:'b_30'},{text:'Buy 35',callback_data:'b_35'}],[{text:'Sell 65',callback_data:'s_65'},{text:'Sell 70',callback_data:'s_70'}]]}}));
  bot.hears('🔔 Auto ON', ctx=>{ set.auto=true; chats.add(ctx.chat.id); ctx.reply(`✅ Auto ON - ${set.symName}`, menu); });
  bot.hears('🔕 Auto OFF', ctx=>{ set.auto=false; ctx.reply('🔕 Auto OFF', menu); });
  bot.hears('❓ Help', ctx=>ctx.reply('💱 لتغيير بين دهب/يورو/دولار', menu));

  bot.on('callback_query', ctx=>{
    const d=ctx.callbackQuery.data;
    if(d.startsWith('cur_')){ let p=d.split('_'); set.sym=p[1]; set.symName=p[2]; set.lastSig='WAIT'; ctx.answerCbQuery(`تم ${set.symName}`); ctx.reply(`✅ العملة بقت: ${set.symName} (${set.sym})`, menu); return; }
    if(d.startsWith('f_')) set.frame=d.split('_')[1];
    if(d.startsWith('b_')) set.buy=parseInt(d.split('_')[1]);
    if(d.startsWith('s_')) set.sell=parseInt(d.split('_')[1]);
    ctx.answerCbQuery(); ctx.reply(`✅ تم F:${set.frame} B:${set.buy} S:${set.sell}`, menu);
  });

  setInterval(async ()=>{
    if(!set.auto || chats.size==0) return;
    try{
      const {price,rsi}=await getData();
      let curSig = rsi<set.buy ? 'BUY' : rsi>set.sell ? 'SELL' : 'WAIT';
      if(curSig!='WAIT' && curSig!=set.lastSig){
        let isBuy=curSig=='BUY';
        let sl=isBuy?price*0.98:price*1.02; let tp1=isBuy?price*1.03:price*0.97; let tp2=isBuy?price*1.05:price*0.95;
        let msg=`🚨 ${set.symName} إشارة!\n${isBuy?'🟢 BUY':'🔴 SELL'} ${set.sym}\n━━━━━━━━━━━━━━\n💰 دخول: $${price.toFixed(4)}\n📈 RSI: ${rsi.toFixed(1)}\n🛑 SL: $${sl.toFixed(4)}\n🎯 TP1: $${tp1.toFixed(4)}\n🎯 TP2: $${tp2.toFixed(4)}`;
        for(let chatId of chats){ bot.telegram.sendMessage(chatId, msg, menu).catch(()=>{}); }
      }
      set.lastSig=curSig;
    }catch(e){}
  }, 5*60*1000);

  bot.launch().then(()=>console.log('MULTI BOT LAUNCHED'));
}
