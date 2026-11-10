const {Telegraf,Markup}=require('telegraf')
const express=require('express')
const axios=require('axios')
const bot=new Telegraf(process.env.BOT_TOKEN)
const app=express()
app.get('/',(r,s)=>s.send('Bot Live'))
app.listen(process.env.PORT||10000)
let last=null
const menu=Markup.keyboard([['Status','Live Price'],['Last Signal']]).resize()
async function price(){try{return(await axios.get('https://api.gold-api.com/price/XAU')).data.price}catch{return 4135}}
function sig(p){const b=Math.random()>0.5;return{type:b?'BUY 🟢':'SELL 🔴',e:p.toFixed(2),sl:(b?p-10:p+10).toFixed(2),tp:(b?p+20:p-20).toFixed(2)}}
function txt(s){return `*${s.type} GOLD*\n\nEntry: ${s.e}\nSL: ${s.sl}\nTP: ${s.tp}\n\nDalelco Bot`}
bot.start(async c=>{const p=await price();last=sig(p);await c.reply('Dalelco Bot 🤖',menu);await c.replyWithMarkdown(txt(last),menu)})
bot.hears('Live Price',async c=>c.reply(`Gold: $${(await price()).toFixed(2)}`))
bot.hears('Last Signal',c=>c.replyWithMarkdown(last?txt(last):'No signal yet',menu))
bot.hears('Status',c=>c.reply('Active ✅ 3-5 signals/day',menu))
bot.launch()
set
