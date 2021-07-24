const Discord = require("discord.js")
const client = new Discord.Client()
const fs = require("fs")

client.login(fs.readFileSync("discord_token.txt").toString())