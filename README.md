# Slackbot search using Haven OnDemand
Slackbot that takes incorporates searching through your Haven OnDemand text indexes within a slack channel.

## How to download and run
1. Clone it to your computer
```
git clone https://github.com/HPE-Haven-OnDemand/slackbot-havenondemand-search
```
2. Move into that directory
```
cd slackbot-havenondemand-search
```
3. Open up the `index.js` file and replace where it says `process.env.HOD_APIKEY` with your Haven OnDemand API key (found [here](https://www.havenondemand.com/account/api-keys.html)) and `process.env.SLACK_TOKEN` with your Slack token (sign up [here](https://my.slack.com/services/new/bot) to find it and to also name and configure the bot on Slack)
4. Run the following to start the bot
```
node index.js
```

## How to import URL to Haven OnDemand
In your slack channel, say the following:
```
@name_of_bot: configure import
```
Your bot will prompt for details and then automatically configure everything for you.

## How to search for documents already imported
In your slack channel, say the following:
```
@name_of_bot: text_index_to_search ; what you want to query
```
i.e. Mention the bot, specify which text index you’d like to search from, followed by a semicolon, followed by query (e.g. `@name_of_bot: companywiki ; vacation policy`). The bot will respond back with a list of documents and their summaries from the wiki that match your query. Respond back to the bot with which document you wish to see all of and the bot will delightfully respond back with it.

**Note: you don't need to import from slack for this to work. Indexes already in Haven OnDemand will work**

## How to list name of indexes and connectors (imports)
In your slack channel, say the following:
```
@name_of_bot: list resources
```
The bot will print out all of your indexes and connectors (imports)

## How do I get help
In your slack channel, say the following:
```
@name_of_bot: help
```
The bot will print out all of it's capabilities.
