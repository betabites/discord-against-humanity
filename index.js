// 1242

const fs = require("fs")
const Discord = require("discord.js")
const client = new Discord.Client()
const html_to_image = require('node-html-to-image')
const gTTS = require("gtts")
const readline = require("readline");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
let channel
let join_msg_id
let current_card_czar = null
let current_black_card
let current_submissions = {}
let submissions_locked = false
let config = {}
let vc_channel
let leaving_queue = []
let joining_queue = []
let scoreboard = {}
let scoreboard_msg

// Load deck
const deck = JSON.parse(fs.readFileSync("pack.json").toString())
let all_cards = {
    white: [],
    black: []
}
let inventories = {}
for (let i in deck) {
    all_cards.white = all_cards.white.concat(deck[i].white)
    all_cards.black = all_cards.black.concat(deck[i].black)
    for (let r in deck[i].white) {
        if (deck[i].white[r].text.endsWith(".")) {
            deck[i].white[r].text = deck[i].white[r].text.substr(0, deck[i].white[r].text.length - 1)
        }
    }
    console.log("Loaded in pack; " + deck[i].name)
}

function pick_random_card(type = "white") {
    if (type === "white") {
        return all_cards.white[Math.floor(Math.random() * all_cards.white.length)]
    } else {
        return all_cards.black[Math.floor(Math.random() * all_cards.black.length)]
    }
}

function insert_into_black_card(black_card_text, items, formatting="md") {
    console.log(items)
    let matches = black_card_text.match(/_/g)
    if (matches === null) {
        return black_card_text + " " + items[0]
    } else {
        let split_text = black_card_text.split("_")
        let result = ""
        for (let i in split_text) {
            result += split_text[i]
            if (parseInt(i) !== split_text.length - 1) {
                console.log([i, split_text.length])
                result += "<strong>" + items[i] + "</strong>"
            }
        }
        return result
    }
}

function topup_player_hand(player_id) {
    let cards_needed = (10 - inventories[player_id].length)
    for (let i = 0 ; i < cards_needed ; i++) {
        inventories[player_id].push(pick_random_card())
    }
}

function send_inventory_to_player(player_id) {
    if (player_id === current_card_czar) {
        channel.guild.members.cache.get(player_id).send(new Discord.MessageEmbed()
            .setTitle("The current black card is...")
            .setDescription(current_black_card.text.replace("_", "\\_"))
            .setFooter("YOU are the card czar. The card combinations will be posted in the server once they have all been submitted. You will need to choose your favourite one.")
            .setColor("#000000")
        )
    } else {
        channel.guild.members.cache.get(player_id).send(new Discord.MessageEmbed()
            .setTitle("The current black card is...")
            .setDescription(current_black_card.text.replace("_", "\\_"))
            .setColor("#000000")
        )
        let cards = []
        for (let item in inventories[player_id]) {
            cards.push((parseInt(item) + 1) + ". " + inventories[player_id][item].text)
        }

        channel.guild.members.cache.get(player_id).send(new Discord.MessageEmbed()
            .setTitle("Your white cards are;")
            .setDescription(cards.join("\n\n"))
            .setColor("#FFFFFF")
        )
    }
}

function start_new_round() {
    current_black_card = pick_random_card("black")

    for (let player of joining_queue) {
        inventories[player] = []
    }

    joining_queue = []

    current_card_czar = Object.keys(inventories)[Math.floor(Math.random() * Object.keys(inventories).length)]
    submissions_locked = false
    current_submissions = {}

    channel.send(new Discord.MessageEmbed()
        .setTitle("The current black card is...")
        .setDescription(current_black_card.text.replace(/_/g, "\\_"))
        .addField("The card czar is", "<@" + current_card_czar + ">")
        .setColor("#000000")
    )

    for (let player of Object.keys(inventories)) {
        send_inventory_to_player(player)
    }
}

async function ready() {
    try {
        channel = await client.channels.fetch(config.channel_id)
        channel.send("To join this cards against humanity game, please react to this message with a :thumbsup:. If at any point you wish to leave the game, simply remove your reaction.\n\n**Credit to the Cards Against Humanity team for creating the original card game;** https://cardsagainsthumanity.com/").then(msg => {
            msg.react("👍")
            msg.pin().catch(err => {})
            join_msg_id = msg.id
        }).catch(e => {

        })

        channel.send(new Discord.MessageEmbed()
            .setTitle("The game's scoreboard will show up here.")
        ).then(msg => {
            msg.pin()
            scoreboard_msg = msg
        })

        client.channels.fetch(config.vc_channel).then(async channel => {
            // console.log(channel)
            vc_channel = await channel.join()
        })

        console.log()
        while (true) {
            // Wait for start
            await question("Press Enter/Return when you are ready to start the game. A minimum of three players are required.")
            if (joining_queue.length < 3) {
                console.log(3 - (joining_queue.length) + " more player(s) need to join before you can start")
            } else {
                break
            }
        }

        // Start the game
        console.log("STARTING THE GAME!")
        channel.send("The game is starting! You will receive your cards in your DMs")

        // Generate everyone's inventories
        for (let player of joining_queue) {
            // Generate the player's hand
            inventories[player] = [];
            topup_player_hand(player)
            // console.log(inventories)
        }
        joining_queue = []
        setTimeout(() => {start_new_round()}, 5000)
    } catch(e) {
        console.log(e)
        console.error("ERR: Failed to get channel from channel ID. Please check that the channel ID in config.json is correct, and has no extra characters or spaces.")
        process.exit()
    }
}

client.on("messageReactionAdd", (reaction, user) => {
    if (reaction.message.id === join_msg_id && ! user.bot) {
        if (leaving_queue.find(player => player === user.id)) {
            leaving_queue.splice(leaving_queue.indexOf(user.id), 1)
            channel.send("<@" + user.id + "> decided not to leave!")
        } else {
            channel.send("<@" + user.id + "> just joined the game!")

            user.send("Hello <@" + user.id + ">! I'll post your card inventory here when the next round starts, so that you can play.")
            joining_queue.push(user.id)
        }
    }
})

client.on("messageReactionRemove", (reaction, user) => {
    if (reaction.message.id === join_msg_id && ! user.bot) {
        if (typeof inventories[user.id] === "undefined") {
            joining_queue.splice(joining_queue.indexOf(user.id), 1)
            channel.send("<@" + user.id + "> has left the game")
        } else {
            channel.send("<@" + user.id + "> will be leaving the game at the end of the round.")
            leaving_queue.push(user.id)
        }
    }
})

client.on("message", msg => {
    if (msg.channel.type === "dm" && typeof inventories[msg.author.id] !== "undefined" && msg.author.id !== current_card_czar && submissions_locked === false && typeof current_submissions[msg.author.id] === "undefined")
    {
        let items = msg.content.split(" ")
        let required_item_count = current_black_card.pick
        if (items.length !== required_item_count) {
            msg.reply("This black card requires you to use " + required_item_count + " of your cards. To select your cards, simply post their numbers, seperated by a space.")
        } else {
            let items_text = []
            for (let item of items) {
                if ((parseInt(item) - 1) >= inventories[msg.author.id].length || parseInt(item) < 0) {
                    msg.reply("It seems that one of those numbers is invalid. Please try again.")
                    return false
                }

                items_text.push(inventories[msg.author.id][parseInt(item) - 1].text)
                if (inventories[msg.author.id].length > 10) {
                    inventories[msg.author.id].splice(parseInt(item) - 1, 1)
                } else {
                    inventories[msg.author.id][parseInt(item) - 1] = pick_random_card()
                }
            }
            // console.log(items_text)

            current_submissions[msg.author.id] = insert_into_black_card(current_black_card.text, items_text)
            // console.log(current_submissions)

            msg.reply("Your submission has been recorded.")
            if (Object.keys(current_submissions).length >= Object.keys(inventories).length - 1) {
                console.log()
                // Lock submissions and post them for voting
                submissions_locked = true
                let items = []
                for (let item in Object.keys(current_submissions)) {
                    items.push((parseInt(item) + 1) + ". " + current_submissions[Object.keys(current_submissions)[item]])
                }

                console.log("This round's submissions:\n" + items.join("\n\n").replace("<strong>", "**").replace("</strong>", "**"))

                channel.guild.members.cache.get(current_card_czar).send(
                    "**Card Czar! Here are your submissions!**\n\n" + items.join("\n\n").replace("<strong>", "**").replace("</strong>", "**") + "\n\nSend me the number of the one you wish to pick.",
                )

                if (typeof vc_channel.channel.members.get(current_card_czar) === "undefined") {
                    // Card Czar is not in the voice channel, so speak for them
                    let gtts = new gTTS("Card Czar! Here are your submissions!\n\n" + items.join("\n\n").replace("<strong>", "").replace("</strong>", "") + "\n\nUse your DMs to vote for one.", 'en');
                    gtts.save("voice.mp3", (err, result) => {
                        if (err) {console.log("ERR; Could not generate TTS")}
                        else {
                            vc_channel.play("voice.mp3")
                        }
                    })
                } else if (vc_channel.channel.members.get(current_card_czar).voice.mute) {
                    // Card Czar is muted, so speak for them
                    let gtts = new gTTS("Card Czar! Here are your submissions!\n\n" + items.join("\n\n").replace(/\*\*/g, "") + "\n\nUse your DMs to vote for one.", 'en');
                    gtts.save("voice.mp3", (err, result) => {
                        if (err) {console.log("ERR; Could not generate TTS")}
                        else {
                            vc_channel.play("voice.mp3")
                        }
                    })
                }


            }
        }
    }
    if (msg.channel.type === "dm" && msg.author.id === current_card_czar && submissions_locked === true) {
        try {
            let selected_sub = parseInt(msg.content) - 1
            if (selected_sub > Object.keys(current_submissions).length || selected_sub < 0) {
                msg.reply("Sorry, but that's not a valid submission number.")
            } else {
                msg.reply("Your vote has been counted!")

                // Convert the selected submission into an image
                html_to_image({
                    output: "./output.png",
                    transparent: true,
                    html: "<html><head><style> body{padding:0;margin:0;width:calc(7cm + 40px);height:calc(9cm + 40px);background-color:transparent;}#card{font-family:\"Helvetica Neue\",serif;width:7cm;height:9cm;padding:20px;border-radius:10px;background-color:black;color:white}</style></head><body><div id=\"card\">" + current_submissions[Object.keys(current_submissions)[selected_sub]] + "</div></body></html>"
                })
                    .then(() => {
                    if (typeof scoreboard[Object.keys(current_submissions)[selected_sub]] === "undefined") {
                        scoreboard[Object.keys(current_submissions)[selected_sub]] = 1
                    } else {
                        scoreboard[Object.keys(current_submissions)[selected_sub]] += 1
                    }
                    console.log(scoreboard)
                    // Update the scoreboard
                    let embed = new Discord.MessageEmbed()
                    let player_ids = Object.keys(scoreboard)
                    player_ids.sort((a, b) => {
                        return scoreboard[b] - scoreboard[a]
                    })

                    for (let player of player_ids) {
                        embed.addField(channel.guild.members.cache.get(player).user.username, scoreboard[player])
                    }
                    scoreboard_msg.edit(embed)

                    let items = []
                    for (let item in Object.keys(current_submissions)) {
                        items.push((parseInt(item) + 1) + ". " + current_submissions[Object.keys(current_submissions)[item]])
                    }

                    channel.send(items.join("\n\n") + "\n\nThe card czar chose;", new Discord.MessageAttachment(fs.readFileSync("./output.png")), "output.png")
                    for (let player of Object.keys(inventories)) {
                        if (player === current_card_czar) {
                            channel.guild.members.cache.get(player).send(
                                "Here is the card you chose;", new Discord.MessageAttachment(fs.readFileSync("./output.png")), "output.png"
                            )
                        } else {
                            channel.guild.members.cache.get(player).send(
                                items.join("\n\n").replace("<strong>", "**").replace("</strong>", "**") + "\n\nThe card czar chose;", new Discord.MessageAttachment(fs.readFileSync("./output.png")), "output.png"
                            )
                        }
                    }

                    // Remove any players that were meant to leave the game at the end of this round
                    for (let player of leaving_queue) {
                        delete inventories[player]
                    }
                    leaving_queue = []

                    setTimeout(() => {start_new_round()}, 5000)
                })
                    .catch(err => {
                        if (typeof scoreboard[Object.keys(current_submissions)[selected_sub]] === "undefined") {
                            scoreboard[Object.keys(current_submissions)[selected_sub]] = 1
                        } else {
                            scoreboard[Object.keys(current_submissions)[selected_sub]] += 1
                        }
                        console.log(scoreboard)
                        // Update the scoreboard
                        let embed = new Discord.MessageEmbed()
                        let player_ids = Object.keys(scoreboard)
                        player_ids.sort((a, b) => {
                            return scoreboard[b] - scoreboard[a]
                        })

                        for (let player of player_ids) {
                            embed.addField(channel.guild.members.cache.get(player).user.username, scoreboard[player])
                        }
                        scoreboard_msg.edit(embed)

                        let items = []
                        for (let item in Object.keys(current_submissions)) {
                            items.push((parseInt(item) + 1) + ". " + current_submissions[Object.keys(current_submissions)[item]])
                        }

                        channel.send(items.join("\n\n") + "\n\nThe card czar chose;", new Discord.MessageAttachment(fs.readFileSync("./output.png")), "output.png")
                        // for (let player of Object.keys(inventories)) {
                        //     if (player === current_card_czar) {
                        //         channel.guild.members.cache.get(player).send(
                        //             "Here is the card you chose;", new Discord.MessageAttachment(fs.readFileSync("./output.png")), "output.png"
                        //         )
                        //     } else {
                        //         channel.guild.members.cache.get(player).send(
                        //             items.join("\n\n") + "\n\nThe card czar chose;", new Discord.MessageAttachment(fs.readFileSync("./output.png")), "output.png"
                        //         )
                        //     }
                        // }

                        // Remove any players that were meant to leave the game at the end of this round
                        for (let player of leaving_queue) {
                            delete inventories[player]
                        }
                        leaving_queue = []

                        setTimeout(() => {start_new_round()}, 5000)
                    })
            }
        }
        catch (e) {
            msg.reply("Please send me the number for the submission you'd like to give a point to.")
        }
    }
})

client.on("ready", () => {
    // Disconnect the bot from any previously conencted voice channels
    for (let connection of client.voice.connections) {
        console.log(connection)
        connection[1].disconnect()
    }
})
// client.on("message", msg => {
//     console.log(msg)
// })

// console.log(deck)
async function question(str) {
    return new Promise(resolve => {
        rl.question(str, (result) => {
            resolve(result)
        })
    })
}

async function settings_input() {
    let token
    while (true) {
        token = await question("Please input your bot account's token: ")
        try {
            await client.login(token)
            break
        } catch(e) {
            console.error("Failed to login. Please try again.")
        }
    }

    console.clear()
    let Guilds = client.guilds.cache.map(guild => guild.id);
    for (let guild in Guilds) {
        await client.guilds.cache.get(Guilds[guild]).fetch()
        console.log((parseInt(guild) + 1) + ". " + client.guilds.cache.get(Guilds[guild]).name)
    }

    let selected_guild

    while (true) {
        let guild_num_str = await question("Please select one of the connected Discord servers from above: ")
        try {
            let guild_num = parseInt(guild_num_str)
            if (guild_num <= 0 || guild_num > Guilds.length) {
                console.error("Invalid number. Please enter a number between 1 and " + Guilds.length)
            } else {
                selected_guild = client.guilds.cache.get(Guilds[guild_num - 1])
                break
            }
        } catch(e) {
            console.error("Please enter a number")
        }
    }

    console.clear()
    console.log("You have selected: " + selected_guild.name)

    let txt_channels = selected_guild.channels.cache.filter(ch => ch.deleted === false && ch.type === 'text').map(channel => channel.id);
    for (let channel in txt_channels) {
        console.log((parseInt(channel) + 1) + ". #" + selected_guild.channels.cache.get(txt_channels[channel]).name)
    }

    let txt_channel

    while (true) {
        let channel_num_str = await question("Please select one of the text channels from above: ")
        try {
            let channel_num = parseInt(channel_num_str)
            if (channel_num <= 0 || channel_num > txt_channels.length) {
                console.error("Invalid number. Please enter a number between 1 and " + txt_channels.length)
            } else {
                console.log(txt_channels[channel_num - 1])
                txt_channel = selected_guild.channels.cache.get(txt_channels[channel_num - 1])
                break
            }
        } catch(e) {
            console.error("Please enter a number")
        }
    }

    console.clear()
    // console.log(txt_channel)
    console.log("You have selected: #" + txt_channel.name)

    let vc_channels = selected_guild.channels.cache.filter(ch => ch.deleted === false && ch.type === 'voice').map(channel => channel.id);
    for (let channel in vc_channels) {
        console.log((parseInt(channel) + 1) + ". " + selected_guild.channels.cache.get(vc_channels[channel]).name)
    }

    let _vc_channel

    while (true) {
        let channel_num_str = await question("Please select one of the voice channels from above: ")
        try {
            let channel_num = parseInt(channel_num_str)
            if (channel_num <= 0 || channel_num > vc_channels.length) {
                console.error("Invalid number. Please enter a number between 1 and " + txt_channels.length)
            } else {
                _vc_channel = selected_guild.channels.cache.get(vc_channels[channel_num - 1])
                vc_channel = _vc_channel.join()
                break
            }
        } catch(e) {
            console.log(e)
            console.error("Please enter a number")
        }
    }
    config = {
        token: token,
        channel_id: txt_channel.id,
        vc_channel: _vc_channel.id
    }

    fs.writeFile("config.json", JSON.stringify(config), (err) => {})
    console.clear()
    console.log("The inputted configuration has been saved. If you wish to reset the configuration, then please delete config.json.")
    ready()
}

try {
    fs.accessSync("config.json", fs.ok)
    console.info("config.json successfully read")
    config = JSON.parse(fs.readFileSync("config.json").toString())
    if (typeof config.token === "undefined" || typeof config.channel_id === "undefined") {
        console.error("ERR: A required item is missing in config.json")
        process.exit()
    }
    else if (config.token === null || typeof config.channel_id === null) {
        console.error("ERR: A required item is missing in config.json")
        process.exit()
    }

    client.login(config.token).catch(e => {
        console.error("ERR: Could not login to Discord. Check your internet connection and your inputted access key.")
        process.exit()
    }).then(res => {
        ready()
    })
}
catch(e) {
    console.info("config.json was not found, or could not be accessed")
    settings_input()
}
