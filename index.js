const { Telegraf, Markup } = require('telegraf')
const express = require('express')
const bot = new Telegraf(process.env.BOT_TOKEN)
const app = express()
app.get('/', (req,res)=>res.send('RSI Bot Live'))
app.listen(process.env.PORT || 10000)
let prices=[]
let lastSignal=0
const CHAT_ID=process.env.CHAT_ID
const menu=Markup.keyboard([['Live Price','RSI Now'],['Status']]).resize()
async function getGoldPrice(){
 try{
  const r=await fetch('https://api.gold-api.com/price/XAU')
  const j=await r.json()
  return parseFloat(j.price||2000)
 }catch{return 2000}
}
function calcRSI(prices){
 if(prices.length<15) return 50
 let g=0,l=0
 for(let i=prices.length-14;i<prices.length;i++){
  const d=prices[i]-prices[i-1]
  if(d>=0) g+=d; else l-=d
 }
 if(l==0) return 100
 const rs=g/l
 return 100-(100/(1+rs))
}
async function check(){
 const p=await getGoldPrice()
 prices.push(p)
 if(prices.length>50) prices.shift()
 const rsi=calcRSI(prices)
 console.log(`Price ${p} RSI ${rsi}`)
 const now=Date.now()
 if(now-lastSignal<3600000) return
 if(rsi<35){
  lastSignal=now
  if(CHAT_ID) await bot.telegram.sendMessage(CHAT_ID,`🟢 BUY GOLD\nPrice: ${p}\nRSI: ${rsi.toFixed(2)} < 35`)
 }else if(rsi>65){
  lastSignal=now
  if(CHAT_ID) await bot.telegram.sendMessage(CHAT_ID,`🔴 SELL GOLD\nPrice: ${p}\nRSI: ${rsi.toFixed(2)} > 65`)
 }
}
setInterval(check,2*60*1000)
check()
bot.start(ctx=>ctx.reply('RSI Bot شغال ✅\nفحص كل دقيقتين 35/65',menu))
bot.hears('Live Price',async ctx=>{
 const p=await getGoldPrice()
 ctx.reply(`💰 GOLD: ${p}`)
})
bot.hears('RSI Now',ctx=>{
 const rsi=calcRSI(prices)
 ctx.reply(`RSI: ${rsi.toFixed(2)}\nعدد: ${prices.length}/15`)
})
bot.hears('Status',ctx=>ctx.reply(`Active ✅\nRSI 35/65\nPrices: ${prices.length}`,menu))
bot.launch()
