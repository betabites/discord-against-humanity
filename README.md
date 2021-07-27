This is a rendition of the popular `Cards Against Humanity` card game, which has been re-created and turned into the form of a Discord game.

# Installation
If you're new to Node.js, or just simply want to play a game of this with your friends, then follow these steps. They should take roughly **10-15 minutes** to complete.

You will need
- A Discord account which you have complete access to
- A laptop or desktop which you are allowed to install software on

Once you have both of those, you will then need to do the following
1. Download & install Node.js. You can download the latest **LTS** version of Node.js from [here](https://nodejs.org/en/).
2. Create an account for your bot to use.
    1. Navigate to the [Discord developers page](https://discord.com/developers)
    2. If you have not logged into your discord account yet, login now. You will be prompted to if you haven't
    3. Click on `New Application` and create a new application. You can call this whatever you wish.
    4. Once you have created your application, click on `Bot` on the left-hand side, then click `Add Bot`.
    5. Once you have added and customised your bot, go back to the 'General' tab by clicking `General Information` on the left-hand side.
    6. Now we need to add the bot to your Discord server. There should be a small heading by the name of `Application ID`. Substitute it into the following URL, then open the URL in your browser. This will prompt you to add your bot to your Discord server.
    `https://discord.com/oauth2/authorize?client_id=[application ID goes here]&scope=bot&permissions=536996928`
    7. Once you have added your bot to your server, return to the page where you were editing your Discord application, and click back onto the `Bot` tab.
    8. Click the `copy` button underneath the 'token' header. This is a password that will allow Node.js to login as the bot. We will need it later. **Do not share this.**
    
3. Go to [this page](https://github.com/google-it-2/discord-against-humanity/releases) and download the source code in ZIP form for whichever release of Discord Against Humanity you wish to use.
4. Unzip the file once it has downloaded. Inside it should be a folder and a few files.
5. Open the terminal application. **For windows users;** The application you need to open is called 'Command Prompt'. **For all other users;** the application you need to use is probably just called 'terminal'.
6. Type in `cd`, followed by a space, then drag-and-drop the folder that was in the ZIP file into the terminal.
7. Once you have done that, hit the Enter/Return key on your keyboard
8. Now enter the command `npm install`, followed by the Enter/Return key. This should start installing the packages that Discord Against Humanity requires.
9. Finally, run the command `node index.js`, and paste your token in when prompted.

**DO NOT REMOVED THE EXTRACTED ZIP CONTENTS, AS OTHERWISE YOU WILL NEED TO REDO STEPS 3-9.**

# Usage
To start up the game, open your terminal/command prompt and do these three things;
1. Enter the command `cd`, followed by a space. Then drag-and-drop in the extracted folder that was in the downloaded ZIP file.
2. Hit the Enter/Return key on your keyboard
3. Enter the command `node index.js`, then hit the Enter/Return key on your keyboard. This will start up the bot.

# License
Cards Against Humanity is distributed underneath a 'Creative Commons' license. The statement below from the Cards Against Humaniy offical website cleary states the agreement;
```text
    We give you permission to use the Cards Against Humanity writing under a limited Creative Commons BY-NC-SA 4.0 license. That means you can use our writing if (and only if) you do all of these things:

    - Make your work available totally for free.
    - Share your work with others under the same Creative Commons license that we use.
    - Give us credit in your project.
```

# Card sourcing
The card packs attached to this game are sourced from the [JSON Against Humanity](https://github.com/crhallberg/json-against-humanity) repository. Some of these cards are created by the official Cards Against Humanity team, while other cards have been created by other people.

This repository has a default card set attached to it already, but if you wish to switch it out for your own cards, or even add to it, simply modify the [pack.json](pack.json) file. Just make sure to keep following the same structure and format.