# Haven OnDemand powered Slackbot
Slackbot that incorporates searching through your Haven OnDemand text indexes and text analytics for users within a Slack channel.

## How to download and run
1. Clone it to your computer
```
git clone https://github.com/HPE-Haven-OnDemand/slackbot-havenondemand
```
2. Move into that directory
```
cd slackbot-havenondemand
```
3. Install all of the dependencies
```
npm install
```
4. Create a `.env` file and add the following:
```
HOD_APIKEY = 'replace_with_apikey'
SLACK_TOKEN = 'replace_with_slack_token'
```
replacing where it says `replace_with_apikey` with your Haven OnDemand API key (found [here](https://www.havenondemand.com/account/api-keys.html)) and replacing where it says `replace_with_slack_token` with your Slack token (sign up [here](https://my.slack.com/services/new/bot) to find it and to also name and configure the bot on Slack)
5. Run the following to start the bot
```
node index.js
```

## How to get help
In your slack channel, say the following:
```
@name_of_bot: help
```
The bot will print out all of its capabilities.

## How to detect profanities
The bot automatically detects to see if bad language is used and recommends alternative phrasing. This feature is set to `on` by default.

To turn the profanity checker on, say the following:
```
@name_of_bot: profanity checker on
```
To turn the profanity checker off, say the following:
```
@name_of_bot: profanity checker off
```
To see if it is turned on or off, say the following:
```
@name_of_bot: profanity checker status
```

## How to import URL to Haven OnDemand index
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
i.e. Mention the bot, specify which text index you’d like to search from, followed by a semicolon, followed by query (e.g. `@name_of_bot: companywiki ; vacation policy`). The bot will respond back with a list of documents and their summaries from the wiki that match your query. Respond back to the bot with which document you wish to see all of and the bot will delightfully respond back with the full document.

**Note: you do _not_ need to import from Slack for this to work. Indexes already in Haven OnDemand will work.**

## How to list name of indexes and connectors (imports)
In your slack channel, say the following:
```
@name_of_bot: list resources
```
The bot will print out all of your indexes and connectors (imports)

## How to get a summary of a user's messages
In your slack channel, say the following:
```
@name_of_bot: summary for <replace_with_user>
```
The bot will ask for a range of dates and will reply back with a quick summary of what the user has said on these dates.
