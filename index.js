// 1242

const fs = require("fs")
const Discord = require("discord.js")
const client = new Discord.Client()
const html_to_image = require('node-html-to-image')
let channel
let join_msg_id
let current_card_czar = null
let current_black_card
let current_submissions = {}
let submissions_locked = false
let config

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
                result += "**" + items[i] + "**"
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
    current_card_czar = Object.keys(inventories)[Math.floor(Math.random() * Object.keys(inventories).length)]
    submissions_locked = false
    current_submissions = {}

    channel.send(new Discord.MessageEmbed()
        .setTitle("The current black card is...")
        .setDescription(current_black_card.text)
        .addField("The card czar is", "<@" + current_card_czar + ">")
        .setColor("#000000")
    )

    for (let player of Object.keys(inventories)) {
        send_inventory_to_player(player)
    }
}

client.on("ready", async () => {
    console.info("Successfully logged into discord.")

    try {
        channel = await client.channels.fetch(config.channel_id)
        channel.send("To join this cards against humanity game, please react to this message with a :thumbsup:. If at any point you wish to leave the game, simply remove your reaction.").then(msg => {
            msg.react("👍")
            join_msg_id = msg.id
        }).catch(e => {

        })
    } catch(e) {
        console.error("ERR: Failed to get channel from channel ID. Please check that the channel ID in config.json is correct, and has no extra characters or spaces.")
        process.exit()
    }
})

client.on("messageReactionAdd", (reaction, user) => {
    if (reaction.message.id === join_msg_id && ! user.bot) {
        channel.send("<@" + user.id + "> just joined the game!")

        // Generate the player's hand
        inventories[user.id] = [];
        topup_player_hand(user.id)
        // console.log(inventories)

        if (Object.keys(inventories).length >= 3 && current_card_czar === null) {
            // Start the game
            console.log("STARTING THE GAME!")
            channel.send("The game is starting! You will receive your cards in your DMs")
            setTimeout(() => {start_new_round()}, 10000)
        }
    }
})

client.on("messageReactionRemove", (reaction, user) => {
    if (reaction.message.id === join_msg_id && ! user.bot) {
        channel.send("<@" + user.id + "> has left the game.")
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
                items_text.push(inventories[msg.author.id][parseInt(item) - 1].text)
                if (inventories[msg.author.id].length > 10) {
                    inventories[msg.author.id].splice(parseInt(item) - 1, 1)
                } else {
                    inventories[msg.author.id][parseInt(item) - 1] = pick_random_card()
                }
            }
            console.log(items_text)

            current_submissions[msg.author.id] = insert_into_black_card(current_black_card.text, items_text)
            // console.log(current_submissions)

            msg.reply("Your submission has been recorded.")
            if (Object.keys(current_submissions).length >= Object.keys(inventories).length - 1) {
                // Lock submissions and post them for voting
                submissions_locked = true
                let items = []
                for (let item in Object.keys(current_submissions)) {
                    items.push((parseInt(item) + 1) + ". " + current_submissions[Object.keys(current_submissions)[item]])
                }

                channel.send(
                    "**Card Czar! Here are your submissions!**\n\n" + items.join("\n\n") + "\n\nUse your DMs to vote for one.",
                    {
                        tts: true
                    }
                )
                channel.guild.members.cache.get(current_card_czar).send(
                    "**Card Czar! Here are your submissions!**\n\n" + items.join("\n\n") + "\n\nUse your DMs to vote for one."
                )
            }
        }
    }
    if (msg.channel.type === "dm" && msg.author.id === current_card_czar && submissions_locked === true) {
        try {
            let selected_sub = parseInt(msg.content) - 1
            if (selected_sub > Object.keys(current_submissions) || selected_sub < 0) {
                msg.reply("Sorry, but that's not a valid submission number.")
            } else {
                msg.reply("Your vote has been counted!")

                // Convert the selected submission into an image
                html_to_image({
                    output: "./output.png",
                    transparent: true,
                    html: "<html><head><style> body{padding:0;margin:0;width:calc(7cm + 40px);height:calc(9cm + 40px);background-color:transparent;}#card{font-family:\"Helvetica Neue\",serif;width:7cm;height:9cm;padding:20px;border-radius:10px;background-color:black;color:white}</style></head><body><div id=\"card\">" + current_submissions[Object.keys(current_submissions)[selected_sub]] + "</div></body></html>"
                }).then(() => {
                    channel.send("The card czar chose;", new Discord.MessageAttachment(fs.readFileSync("./output.png")), "output.png")
                    setTimeout(() => {start_new_round()}, 10000)
                })
            }
        }
        catch (e) {
            msg.reply("Please send me the number for the submission you'd like to give a point to.")
        }
    }
})
// client.on("message", msg => {
//     console.log(msg)
// })

// console.log(deck)

try {
    fs.accessSync("config.json", fs.ok)
    console.info("config.json successfully read")
    config = JSON.parse(fs.readFileSync("config.json").toString())
    if (typeof config.access_token === "undefined" || typeof config.channel_id === "undefined") {
        console.error("ERR: A required item is missing in config.json")
        process.exit()
    }
    else if (config.access_token === null || typeof config.channel_id === null) {
        console.error("ERR: A required item is missing in config.json")
        process.exit()
    }
    client.login(config.access_token).catch(e => {
        console.error("ERR: Could not login to Discord. Check your internet connection and your inputted access key.")
        process.exit()
    })
}
catch(e) {
    console.info("config.json was not found, or could not be accessed")
    fs.writeFileSync("config.json", "{\n" +
        "  \"access_token\": \"\",\n" +
        "  \"channel_id\": \"\"\n" +
        "}")
    console.info("config.json has been created. Please enter the required details into here, then restart this.")
    process.exit()
}
