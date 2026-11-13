const { Telegraf } = require('telegraf');
const express = require('express');
const https = require('https');

const app = express();
app.get('/', (req,res)=>res.send('OK'));
app.listen(process.env.PORT || 10000, '0.0.0.0');

const bot = new Telegraf(process.env.BOT_TOKEN || '123:abc');

let set = { frame:'60', buy:35, sell:65 };

function getBybit(frame){
  return new Promise((res,rej)=>{
    https.get(`https://api.bybit.com/v5/market/kline?category=linear&symbol=BTCUSDT&interval=${frame}&limit=50`, r=>{
      let d=''; r.on('data',c=>d+=c); r.on('end',()=>{ try{ res(JSON.parse(d)) }catch(e){rej(e)} });
    }).on('error',rej);
  });
}
async function getData(){
  const j=await getBybit(set.frame); const list=j.result.list.reverse(); const c=list.map(x=>+x[4]);
  let g=0,l=0; for(let i=1;i<=14;i++){let de=c[i]-c[i-1]; if(de>=0)g+=de; else l-=de;}
  let ag=g/14, al=l/14; let rsi=al==0?100:100-(100/(1+ag/al));
  return {price:c[c.length-1], rsi};
}

const menu={reply_markup:{keyboard:[['📊 Status','💰 Price'],['⚙️ Frame','📈 RSI'],['❓ Help']],resize_keyboard:true}};

bot.start(ctx=>ctx.reply(`🚀 Dalelco\nFrame: ${set.frame} | Buy<${set.buy} Sell>${set.sell}`, menu));

bot.hears('📊 Status', async ctx=>{
  try{ 
    const {price,rsi}=await getData(); 
    let isBuy = rsi < set.buy;
    let isSell = rsi > set.sell;
    let sig = isBuy ? '🟢 BUY' : isSell ? '🔴 SELL' : '⚪ WAIT';
    
    // حساب الاستوب والربح
    let sl, tp1, tp2;
    if(isBuy){
      sl = price * 0.98; // -2%
      tp1 = price * 1.03; // +3%
      tp2 = price * 1.05; // +5%
    } else if(isSell){
      sl = price * 1.02; // +2% للشورت
      tp1 = price * 0.97; // -3%
      tp2 = price * 0.95; // -5%
    } else {
      sl = price * 0.98;
      tp1 = price * 1.03;
      tp2 = price * 1.05;
    }

    ctx.reply(
` ${sig} | BTC
💰 دخول: $${price.toFixed(2)}
📈 RSI: ${rsi.toFixed(1)} (B<${set.buy} S>${set.sell})
⏰ فريم: ${set.frame}

🛑 Stop Loss: $${sl.toFixed(2)} (${isBuy ? '-2%' : isSell ? '+2%' : '-2%'})
🎯 TP1: $${tp1.toFixed(2)} (${isBuy ? '+3%' : isSell ? '-3%' : '+3%'})
🎯 TP2: $${tp2.toFixed(2)} (${isBuy ? '+5%' : isSell ? '-5%' : '+5%'})
`, menu); 
  }catch(e){ctx.reply('جرب تاني');}
});

bot.hears('💰 Price', async ctx=>{ const {price}=await getData(); ctx.reply(`💰 $${price.toFixed(2)}`, menu); });

bot.hears('⚙️ Frame', ctx=>{
  ctx.reply('اختار الفريم:', {reply_markup:{inline_keyboard:[
    [{text:'15m',callback_data:'f_15'},{text:'1h',callback_data:'f_60'},{text:'4h',callback_data:'f_240'}],
    [{text:'1D',callback_data:'f_D'}]
  ]}});
});

bot.hears('📈 RSI', ctx=>{
  ctx.reply(`RSI: Buy<${set.buy} Sell>${set.sell}`, {reply_markup:{inline_keyboard:[
    [{text:'Buy 30',callback_data:'b_30'},{text:'Buy 35',callback_data:'b_35'},{text:'Buy 40',callback_data:'b_40'}],
    [{text:'Sell 60',callback_data:'s_60'},{text:'Sell 65',callback_data:'s_65'},{text:'Sell 70',callback_data:'s_70'}]
  ]}});
});

bot.hears('❓ Help', ctx=>ctx.reply(`📊 Status = دخول + SL + TP\n💰 Price = سعر\n⚙️ Frame = فريم\n📈 RSI = مستويات`, menu));

bot.on('callback_query', async ctx=>{
  const d=ctx.callbackQuery.data;
  if(d.startsWith('f_')){ set.frame=d.split('_')[1]; ctx.reply(`✅ Frame ${set.frame}`, menu); }
  if(d.startsWith('b_')){ set.buy=parseInt(d.split('_')[1]); ctx.reply(`✅ Buy <${set.buy}`, menu); }
  if(d.startsWith('s_')){ set.sell=parseInt(d.split('_')[1]); ctx.reply(`✅ Sell >${set.sell}`, menu); }
  ctx.answerCbQuery();
});

bot.launch().then(()=>console.log('BOT OK'));
