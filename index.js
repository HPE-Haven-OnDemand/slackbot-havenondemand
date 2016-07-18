var env = process.env.NODE_ENV || 'dev'
var path = require('path')
require('datejs')

if (env == 'dev') {
  require('dotenv').load()
}

var async = require('async')

var havenondemand = require('havenondemand')
var client = new havenondemand.HODClient(process.env.HOD_APIKEY)

var Botkit = require('Botkit')

var controller = Botkit.slackbot({
    debug: false
})

var bot = controller.spawn({
    token: process.env.SLACK_TOKEN
}).startRTM()

var questions = {askForDates: 'Please specify the date or ranges of dates for the summary. Use MM/DD/YYYY format\nFor example, say  \'07/12/2016\' or \'07/05/2016 to 07/11/2016\''}

controller.hears(['(.*) / (.*)', '(.*)/(.*)', '(.*)/ (.*)', '(.*) /(.*)'], 'direct_mention', function(bot, message) {
  var textIndex = message.match[1]
  var query = message.match[2]
  var data = {indexes: textIndex, text: query, print: 'all', summary: 'quick'}
  client.call('querytextindex', data, function(err, resp, body) {
    var documents = resp.body.documents // array
    formatDocumentsForPrintSummary(documents, function(text) { //FORMAT DOCUMENTS FOR PRINT SUMMARY PRINT
      bot.startConversation(message, function(err, convo) {
        var message1 = text + '*Please respond with the number of the document you want to view*'
        convo.ask(message1, function(response, convo) {
          var documentNumber = parseInt(response.text) // get index for document and convert to integer
          if (documentNumber >= documents.length || documentNumber < 0 || typeof documentNumber != 'number') { // if index is out of bounds or not a number, repeat the question
            convo.repeat()
            convo.next()
          } else { // if entered correct index for document
            var content = documents[documentNumber].content
            convo.say(content)
            convo.next()
          }
        })
      })
    })
  })
})

function formatDocumentsForPrintSummary(docs, callback) {
  var textBlob = ''
  async.eachOf(docs, function(document, index) {
    if (document.title) var title = '_' + document.title + '_'
    if (document.summary) var summary = document.summary
    textBlob += index + ' - ' + title + '\n' + 'Summary: ' + summary + '\n' + '- - - -\n'
    if (index+1 == docs.length) callback(textBlob)
  }, function(err) {
    console.log(err)
  })
}


controller.hears('summary for (.*)', 'direct_mention', function(bot, message) {
  var entityToGetInfo = message.match[1]
  var channel = message.channel
  var asker = message.user
  var user
  // figure out what we will get the summary of (the channel or a user)
  if (entityToGetInfo == 'this conversation' || entityToGetInfo == 'this channel' || entityToGetInfo == 'channel' || entityToGetInfo == 'chat' || entityToGetInfo == 'this chat' ) { // get info for entire chat
    user = null
  } else if (entityToGetInfo == 'myself' || entityToGetInfo == 'me') { // get info for the asker
    user = asker
  } else { // if they're specifyihng someone
    user = entityToGetInfo.substring(1, entityToGetInfo.length - 1) // strip the '<' and '>' from the user
  }
  bot.startConversation(message, function(err, convo) {
    convo.ask(questions.askForDates, function(response, convo) {
      convo.say('Hold on. Let me go get a summary of this conversation for you...')
      var dates  = convo.extractResponse(questions.askForDates) // get dates
      convertDatesToUnix(dates, function(unixDates, error) { // convert dates (array)
        if (error) {
          console.log(err)
        } else {
          getInfoFromSlackAPI(user, unixDates, channel,  function(channel) {
            formatForHOD(channel.messages, user, function(text) {
              var data = {text: text}
              client.post('analyzesentiment', data, function(err1, resp1, body1) {
                if (err1) {
                  console.log(err1)
                } else {
                  console.log('Analyzed sentiments')
                  var sentiments = resp1.body
                  client.post('extractconcepts', data, function(err2, resp2, body2) {
                    if (err2) {
                      console.log(err2)
                    } else {
                      console.log('Extracted concepts')
                      var concepts = resp2.body
                      formatTextForReply(sentiments, concepts.concepts, function(replyText) {
                        convo.say(replyText) // deliver the response to the user
                        convo.next()
                      })
                    }
                  })
                }
              })
            })
          })
        }
      })
    })
  })

})

// Helper functions

function formatTextForReply(sentimentsObj, conceptsArray, callback) {
  var finalReply = ''
  var conceptsReply = 'Here are the main concepts:\n'
  var sentimentsReply = ''
  var sentimentsOverallReply = ''
  async.eachOf(conceptsArray, function(concept, indexConcepts) {
    var text = concept.concept;
    var weight = concept.occurrences;
    var numWords = text.split(' ').length
    var numCharacters = text.split('').length
    if (numCharacters > 1) {
      if (numWords < 4) {
        conceptsReply += text + ' was mentioned ' + weight + ' times\n'
      }
    }
    if (indexConcepts+1 == conceptsArray.length) { //move onto sentiments
      async.eachOf(sentimentsObj, function(sentimentObjectValue, sentimentKey) {
        if (sentimentKey != 'aggregate') { // if it's the 'positive' or 'negative' category
          if (sentimentObjectValue.length > 0) {
            sentimentsReply += 'Was talking ' + sentimentKey + ' about ' +  sentimentObjectValue.topic + ' with a sentiment of ' + sentimentObjectValue.sentiment + ' with a score of ' + sentimentObjectValue.score + '\n'
          }
        } else { //do something else if it's the aggregate
          // finish up
          sentimentsOverallReply = 'The overall sentiment is ' + sentimentObjectValue.sentiment + ' with a score of ' + sentimentObjectValue.score + '\n'
          callback(conceptsReply+sentimentsOverallReply+sentimentsReply)
        }
      }, function(err) {})
    }
  }, function(err) {})
}

function formatForHOD(messages, user, callback) { //messages is an array
  user = user.substring(1, user.length)
  var textBlob = ''
  async.eachOf(messages, function(message, index) {
    if (user == null) { // if looking at entire conversation
      if (message.user != bot.identity.id) { //exclude what the bot says
        textBlob += message.text
      }
      if (index+1 == messages.length) {
        callback(textBlob)
      }
    } else { // looking for specific user sayings
      if (message.user == user) {
        textBlob += message.text
      }
      if (index+1 == messages.length) {
        callback(textBlob)
      }
    }
  }, function(err) {})
}

function getInfoFromSlackAPI(user, dates, channel, callback) {
  var date1 = dates[0]
  var date2 = dates[1]
  var inclusive = dates[2]
  bot.api.channels.history({channel: channel, oldest: date1, latest: date2, inclusive: inclusive, count: 1000}, function(err, channel) {
    callback(channel)
  })
}

function convertDatesToUnix(dates, callback) {
  var datesArray = dates.split(' ')
  if (datesArray.length == 2) { //something went wrong
    return callback(null, 'Wrong date format')
  } else if (datesArray.length == 3) { //range of dates
    var fromDate = Date.parse(datesArray[0]).getTime()/1000 // parse date and convert to Unix timestamp
    var toDate = Date.parse(datesArray[2]).getTime()/1000 // parse date and convert to Unix timestamp
    var inclusive = 1
  } else if (datesArray.length == 1) { // only one date
    if (datesArray[0].toLowerCase() == 'today') { // if today
      var fromDate = Date.today().getTime()/1000
      var toDate = Date.now().getTime()/1000
      var inclusive  = 1
    } else { // if date is specified
      var fromDate = Date.parse(datesArray[0]).getTime()/1000
      var toDate = fromDate + 86400 // add one day to it
      var inclusive = 0
    }
  }
  return callback([fromDate, toDate, inclusive], null) // 3rd parameter is used when calling Slack API
}
