const {Telegraf,Markup}=require('telegraf');
const express=require('express');
const BOT_TOKEN=process.env.BOT_TOKEN;
const CHAT_ID=process.env.CHAT_ID;
const bot=new Telegraf(BOT_TOKEN);
const app=express();
app.get('/',(q,r)=>r.send('Dalelco Pro Bot Live'));
app.listen(process.env.PORT||10000);

let S={frame:'1h',buy:35,sell:65,lastSignal:'No signal yet',lastData:null};

function ema(arr,period){
let k=2/(period+1);let emaArr=[arr[0]];
for(let i=1;i<arr.length;i++) emaArr.push(arr[i]*k+emaArr[i-1]*(1-k));
return emaArr[emaArr.length-1];
}
function rsiCalc(closes){
let g=0,l=0;
for(let i=closes.length-15;i<closes.length-1;i++){
let diff=closes[i+1]-closes[i];
if(diff>=0)g+=diff;else l-=diff;
}
if(l==0)return 100;
let rs=g/l;return 100-(100/(1+rs));
}
async function getData(){
const res=await fetch(`https://api.binance.com/api/v3/klines?symbol=PAXGUSDT&interval=${S.frame}&limit=100`);
const d=await res.json();
const closes=d.map(x=>+x[4]);
const price=closes[closes.length-1];
const ema20=ema(closes,20);
const ema50=ema(closes,50);
const rsi=rsiCalc(closes);
const trend=price>ema20 && price>ema50 ? 'Uptrend' : price<ema20 && price<ema50 ? 'Downtrend' : 'Sideways';
return {price,ema20,ema50,rsi,trend};
}
function buildSignal(data,type){
let entry=data.price;
let sl=data.ema50;
let risk=Math.abs(entry-sl);
let tp1=entry + risk*1.5*(type=='SELL'?-1:1);
let tp2=entry + risk*3*(type=='SELL'?-1:1);
let rr1=(Math.abs(tp1-entry)/risk).toFixed(1);
let rr2=(Math.abs(tp2-entry)/risk).toFixed(1);
let slPct=(((sl-entry)/entry)*100).toFixed(2);
let tp1Pct=(((tp1-entry)/entry)*100).toFixed(2);
let tp2Pct=(((tp2-entry)/entry)*100).toFixed(2);
let emoji=type=='BUY'?'🟢':'🔴';
let time=new Date().toISOString().slice(0,16).replace('T',' ')+' UTC';
let msg=`${emoji} SIGNAL - PAXG/USDT (${S.frame})
Entry: $${entry.toFixed(2)}
SL: $${sl.toFixed(2)} (EMA50) (${slPct}%)
TP1: $${tp1.toFixed(2)} (${tp1Pct>0?'+':''}${tp1Pct}% | RR ${rr1})
TP2: $${tp2.toFixed(2)} (${tp2Pct>0?'+':''}${tp2Pct}% | RR ${rr2})
RSI: ${data.rsi.toFixed(1)} | Trend: ${data.trend}
Time: ${time}

Signal only — no orders are placed.`;
S.lastSignal=msg;S.lastData=data;return msg;
}
async function check(){
try{
let data=await getData();
if(data.rsi < S.buy){
let msg=buildSignal(data,'BUY');
await bot.telegram.sendMessage(CHAT_ID,msg);
}else if(data.rsi > S.sell){
let msg=buildSignal(data,'SELL');
await bot.telegram.sendMessage(CHAT_ID,msg);
}
}catch(e){console.log(e.message);}
}
function mainKb(){
return Markup.inlineKeyboard([
[Markup.button.callback('📊 Status','do_status'),Markup.button.callback('💰 Live Price','do_price')],
[Markup.button.callback('⚙️ Settings','do_settings'),Markup.button.callback('📈 Last Signal','do_last')]
]);
}
bot.start(async ctx=>{
ctx.reply('Last signal resent below.',mainKb());
let data=await getData();
let type=data.rsi<50?'BUY':'SELL';
ctx.reply(buildSignal(data,type));
});
bot.action('do_status',async ctx=>{
let d=await getData();
await ctx.editMessageText(`Status
