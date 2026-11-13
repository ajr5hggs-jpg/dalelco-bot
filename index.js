const {Telegraf,Markup}=require('telegraf');
const express=require('express');
const BOT_TOKEN=process.env.BOT_TOKEN;
const CHAT_ID=process.env.CHAT_ID;
const bot=new Telegraf(BOT_TOKEN);
const app=express();
app.get('/',(q,r)=>r.send('Dalelco Live Menu SL TP'));
app.listen(process.env.PORT||10000,()=>console.log('Server OK'));

let SETTINGS={frame:'1h',rsiBuy:35,rsiSell:60};

function buildSignal(t,p,r){
let s=t=='BUY'?(p-55).toFixed(2):(p+55).toFixed(2);
let a=t=='BUY'?(p+85).toFixed(2):(p-85).toFixed(2);
let b=t=='BUY'?(p+160).toFixed(2):(p-160).toFixed(2);
let c=t=='BUY'?(p+250).toFixed(2):(p-250).toFixed(2);
return `${t=='BUY'?'🟢 شراء ذهب':'🔴 بيع ذهب'} Dalelco [${SETTINGS.frame}]
💰 السعر: ${p}$ 
📊 RSI: ${r}
✅ دخول: ${p}
🛑 SL: ${s} (-55$)
🎯 TP1: ${a} (+85$)
🎯 TP2: ${b} (+160$)
🎯 TP3: ${c} (+250$)`;
}

async function getData(){
const res=await fetch(`https://api.binance.com/api/v3/klines?symbol=PAXGUSDT&interval=${SETTINGS.frame}&limit=100`);
const d=await res.json();
const closes=d.map(x=>+x[4]);
let g=0,l=0;
for(let i=1;i<15;i++){
let df=closes[closes.length-i]-closes[closes.length-1-i];
if(df>=0)g+=df;else l-=df;
}
let rsi=100-(100/(1+g/l));
return {price:closes[closes.length-1],rsi};
}

async function checkGold(){
try{
let {price,rsi}=await getData();
console.log(`[${SETTINGS.frame}] RSI ${rsi.toFixed(1)} Price ${price}`);
if(rsi<SETTINGS.rsiBuy)await bot.telegram.sendMessage(CHAT_ID,buildSignal('BUY',price.toFixed(2),rsi.toFixed(1)));
else if(rsi>SETTINGS.rsiSell)await bot.telegram.sendMessage(CHAT_ID,buildSignal('SELL',price.toFixed(2),rsi.toFixed(1)));
}catch(e){console.log(e.message);}
}

function menuKeyboard(){
return Markup.inlineKeyboard([
[Markup.button.callback(`⏰ الفريم: ${SETTINGS.frame}`,'noop'),Markup.button.callback(`📊 RSI Buy: ${SETTINGS.rsiBuy} Sell: ${SETTINGS.rsiSell}`,'noop')],
[Markup.button.callback('1m','set_1m'),Markup.button.callback('5m','set_5m'),Markup.button.callback('15m','set_15m'),Markup.button.callback('1h','set_1h'),Markup.button.callback('4h','set_4h')],
[Markup.button.callback('RSI Buy 30','rsiBuy_30'),Markup.button.callback('35','rsiBuy_35'),Markup.button.callback('40','rsiBuy_40')],
[Markup.button.callback('RSI Sell 60','rsiSell_60'),Markup.button.callback('65','rsiSell_65'),Markup.button.callback('70','rsiSell_70')],
[Markup.button.callback('💰 سعر حالي','do_price'),Markup.button.callback('📈 اشارة الان','do_signal')]
]);
}

bot.start(ctx=>ctx.reply(`Dalelco Gold شغال 24س ✅
الأوامر:
/menu - لوحة تحكم الفريم و RSI
/price - سعر الذهب الحالي
/signal - اشارة الان`,menuKeyboard()));

bot.command('menu',ctx=>ctx.reply(`⚙️ الإعدادات الحالية:
فريم: ${SETTINGS.frame}
شراء لما RSI أقل من: ${SETTINGS.rsiBuy}
بيع لما RSI أكتر من: ${SETTINGS.rsiSell}

اختار من الأزرار:`,menuKeyboard()));

bot.command('signal',async ctx=>{
let {price,rsi}=await getData();
ctx.reply(buildSignal(rsi<50?'BUY':'SELL',price.toFixed(2),rsi.toFixed(1)));
});

bot.command('price',async ctx=>{
try{
let {price,rsi}=await getData();
ctx.reply(`💰 الذهب: ${price.toFixed(2)}$
📊 RSI: ${rsi.toFixed(1)}
⏰ فريم: ${SETTINGS.frame}
