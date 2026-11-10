const { Telegraf, Markup } = require('telegraf')
const express = require('express')
const axios = require('axios')

const bot = new Telegraf(process.env.BOT_TOKEN)
const app = express()

app.get('/', (req, res) => res.send('Bot Live ✅'))
app.listen(process.env.PORT || 10000, () => console.log('Server running'))

let last = null
const menu = Markup.keyboard([['Live Price', 'Last Signal'], ['Status']]).resize()

async function price() {
  try {
    const r = await axios.get('https://api.gold-api.com/price/XAU')
    return r.data.price || r.data[0]?.price || 0
  } catch (e) {
    return 0
  }
}

function sig(p) {
  const b = Math.random() > 0.5 ? 'BUY' : 'SELL'
  return { type: b, price: p, sl: b === 'BUY' ? p - 5 : p + 5, tp: b === 'BUY' ? p + 10 : p - 10 }
}

function txt(s) {
  return `*${s.type} GOLD*\n\nPrice: ${s.price}\nSL: ${s.sl}\nTP: ${s.tp}\n\n_${new Date().toLocaleString()}_`
}

bot.start(async (ctx) => {
  const p = await price()
  ctx.reply(`Welcome to DaleLCo Bot ✅\nGold: ${p}`, menu)
})

bot.hears('Live Price', async (ctx) => {
  const p = await price()
  ctx.reply(`💰 GOLD Price: ${p}`)
})

bot.hears('Last Signal', (ctx) => {
  if (!last) return ctx.reply('No signal yet')
  ctx.replyWithMarkdown(txt(last))
})

bot.hears('Status', (ctx) => ctx.reply('Active ✅ Bot is running', menu))

bot.launch()
console.log('Bot launched')

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
