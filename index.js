
var env = process.env.NODE_ENV || 'dev'
var path = require('path')
require('datejs')
var util = require('util')

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

controller.hears(['(.*) ; (.*)', '(.*);(.*)', '(.*); (.*)', '(.*) ;(.*)'], 'direct_mention', function(bot, message) {
  var textIndex = message.match[1]
  var query = message.match[2]
  debugger
  var data = {indexes: textIndex, text: query, print: 'all', summary: 'quick', absolute_max_results: 10}
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

controller.hears(['update API key to (.*)', 'API key is (.*)', 'add account (.*)'], 'direct_mention', function(bot, message) {
  var apiKey = message.match[1]
  createHODClient(apiKey, function() {
    console.log('Client created for ' + apiKey)
  })
})

function createHODClient(apiKey, callback) {
  client = new havenondemand.HODClient(apiKey)
  callback()
}

// controller.hears(['import from Dropbox with app key (.*) and access token (.*)'], 'direct_mention', function(bot, message) {
//   var app_key = message.match[1]
//   var access_token = message.match[2]
//   var indexName = 'indexname' + makeid()
//   var data1 = {index: indexName, flavor: 'standard'}
//   client.post('createtextindex', data1, function(err1, resp1, body1) {
//     if (err1) {
//       console.log(err1)
//     } else {
//       var data2 = {
//         flavor: 'dropbox_cloud',
//         connector: 'slackbotconnector' + makeid(),
//         config: JSON.stringify({
//           full_dropbox_access: true
//         }),
//         destination: JSON.stringify({
//           action: 'addtotextindex',
//           index: indexName,
//         }),
//         schedule: JSON.stringify({
//           frequency : {frequency_type : 'seconds', interval : 21600}
//         }),
//         credentials: JSON.stringify({
//           app_key: app_key,
//           access_token: access_token
//         })
//       }
//       debugger
//       client.post('createconnector', data2, function(err2, resp2, body2) {
//         if (err2) {
//           console.log(err2)
//         } else {
//           console.log('Created connector for Dropbox')
//         }
//       })
//     }
//   })
// })

function makeid() {
    var text = ""
    var possible = "abcdefghijklmnopqrstuvwxyz0123456789"

    for (var i=0; i < 5; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length))

    return text
}

var questions = {
  askForDates: 'Please specify the date or ranges of dates for the summary. Use MM/DD/YYYY format\nFor example, say  \'07/12/2016\' or \'07/05/2016 to 07/11/2016\'',
  askForUrl: 'Tell me a URL you are importing from'
}


controller.hears(['configure import'], 'direct_mention', function(bot, message) {
  var url
  var description
  var isUsernameAndPassword
  var username
  var password
  var usernameField
  var passwordField

  askForUrl = function(response, convo) {
    convo.ask(questions.askForUrl, function(response, convo) {
      var urlWithBrackets = response.text
      url = urlWithBrackets.substring(1, urlWithBrackets.length - 1) // strip the '<' and '>' from the url
      convo.say('Great!')
      askIfThereIsUserNameAndPassword(response, convo)
      convo.next()
    })
  }

  askIfThereIsUserNameAndPassword = function(response, convo) {
      convo.ask('Is there a username and password associated with this URL?', function(response, convo) {
        if (response.text.match(bot.utterances.yes)) { // if they said yes
          isUsernameAndPassword = true
          convo.say('Ok. I\'m going to need a bit more information from you.')
          askForUsername(response, convo)
        } else { // if they said no
          userUsernameAndPassword = false
          username = null
          password = null
          convo.say('Ok. This makes things a bit simpler :)')
          askForDescription(response, convo)
        }
        convo.next()
      })
  }

  askForUsername = function(response, convo) {
    convo.ask('Please enter your username associated with this URL.', function(response, convo) {
      username = response.text
      convo.say('Awesome!')
      askForPassword(response, convo)
      convo.next()
    })
  }

  askForPassword = function(response, convo) {
    convo.ask('Please enter your password for this account. I promise I won\'t steal anything :)', function(response, convo) {
      password = response.text
      convo.say('Thanks!')
      askForUsernameField(response, convo)
      convo.next()
    })
  }

  askForUsernameField = function(response, convo) {
    convo.ask('Ok, this one is a bit trickier. I\'m going to need the field element of the username input. For you none web developers, this is way for the computer to know that what you write in the input field is in fact your username.\n(Using Chrome) To find this, do the following:\n1) Navigate to the login page of the URL.\n2) Right click on the input field where you type your username and scroll to the bottom where it says \'Inspect\' and click that.\n3) This will bring up the HTML of the page (aka what makes the page look like what it does). We\'re looking at the tag that saying <input ... >\n4) See where it says *\'name\'=*? Go ahead copy what that equals and send it over to me. For example, if it were to say <input name="login" type="text" class="form-control" id="login" value>, you would send over to me *login*', function(response, convo) {
      usernameField = response.text
      convo.say('I know that one was a bit trickier. Thanks for that!')
      askForPasswordField(response, convo)
      convo.next()
    })
  }

  askForPasswordField = function(response, convo) {
    convo.ask('Ok, this one is similar to the one before, but I\'ll go over it again. I\'m going to need the field element of the password input. For you none web developers, this is way for the computer to know that what you write in the input field is in fact your password.\n(Using Chrome) To find this, do the following:\n1) Navigate to the login page of the URL.\n2) Right click on the input field where you type your password and scroll to the bottom where it says \'Inspect\' and click that.\n3) This will bring up the HTML of the page (aka what makes the page look like what it does). We\'re looking at the tag that saying <input ... >\n4) See where it says *\'name\'=*? Go ahead copy what that equals and send it over to me. For example, if it were to say <input name="password" type="text" class="form-control" id="password" value>, you would send over to me *password*', function(response, convo) {
      passwordField = response.text
      convo.say('Dope. You\'re doing great!')
      askForDescription(response, convo)
      convo.next()
    })
  }

  askForDescription = function(response, convo) {
    convo.ask('Please add a description for this URL', function(response, convo) {
      convo.say('Thanks! Let me go ahead and start importing this. I will let you know when it is completed.')
      description = response.text
      configureAndStartIndexConnector(bot, url, description, isUsernameAndPassword, username, password, usernameField, passwordField, function(err, params, processingDescription) {
        if (err) deleteAll(err, params) // delete everything and say to start again
        debugger
        convo.say(processingDescription)
        convo.next()
      })
    })
  }

  bot.startConversation(message, askForUrl)
})

function deleteAll(step, iD) {
  client.post('deletetextindex', {index: iD}, function(err1, resp1, body1) {
    if (err1) {
      console.log(err1)
    } else {
      console.log('Deleted text index ' + iD)
    }
  })
  if (step == 'connector') {
    client.post('deleteconnector', {connector: iD}, function(err2, resp2, body2) {
      if (err2) {
        console.log(err2)
      } else {
        console.log('Deleted connector ' + iD)
      }
    })
  }
}

function configureAndStartIndexConnector(bot, url, description, isUsernameAndPassword, username, password, usernameField, passwordField, callback) {
  var id = makeid()
  var indexName = id
  var connectorName = id
  var indexFlavor = 'explorer'
  // var indexFlavor = 'standard'
  var connectorFlavor = 'web_cloud'
  var data1 = {index: indexName, flavor: indexFlavor, description: description}
  debugger
  client.post('createtextindex', data1, function(err1, resp1, body1) {
    if (err1) {
      console.log('Error 1:')
      console.log(util.inspect(err1, false, null))
      callback('index', id, 'Oops! There was an error creating the index (the thing used to store the data) for you. Try again.')
    } else {
      console.log('Created text index ' + indexName)
      var data2 = {
        flavor: connectorFlavor,
        connector: connectorName,
        description: description + ' for ' + indexName + ' index',
        destination: JSON.stringify({
          action: 'addtotextindex',
          index: indexName,
        }),
        schedule: JSON.stringify({
          // schedule: '0s',
          frequency : {frequency_type : 'seconds', interval : 21600}
        })
      }
      if (isUsernameAndPassword) { // if there is a username and password
        data2.credentials = JSON.stringify({ // add credentials
          login_value: username,
          password_value: password
        })
        data2.config = JSON.stringify({
          url: url,
          login_field_value: usernameField,
          password_field_value: passwordField
        })
      } else { // if there is no username
        data2.config = JSON.stringify({
          url: url
        })
      }
      client.post('createconnector', data2, function(err2, resp2, body2) {
        if (err2) {
          console.log('Error 2:')
          console.log(util.inspect(err2, false, null))
          callback('connector', id, 'Oops! There was an error creating the connector (the thing used to import the data) for you. Try again.')
        } else {
          console.log('Created connector for ' + url + 'called' + connectorName)
          var data3 = {connector: connectorName}
          debugger
          client.post('startconnector', data3, function(err3, resp3, body3) {
            if (err3) {
              console.log('Error 3:')
              console.log(util.inspect(err3, false, null))
              callback('connector', id, 'Oops! There was an error starting the connector (the thing used to import the data) for you. Try again.')
            } else {
              console.log('Scheduled connector - ' + connectorName)
              callback(null, id, 'Starting to import documents. To see the status of the importing, ask me "status of import <IMPORT_NAME>')
            }
          })
        }
      })
    }
  })
  //
}



controller.hears(['import from (.*)'], 'direct_mention', function(bot, message) {
  bot.startConversation(message, function(err, convo) {
    convo.ask('Please add a description', function(response, convo) {
      // convo.next()
      // convo.ask('something', function(response, convo) { console.log("asdfasdf") })
      bot.reply(message, 'Processing...')
      var descriptionText = response.text
      var urlWithBrackets = message.match[1]
      var url = urlWithBrackets.substring(1, urlWithBrackets.length - 1) // strip the '<' and '>' from the url
      var id = makeid()
      var indexName = id
      var connectorName = id
      var indexFlavor = 'explorer'
      // var indexFlavor = 'standard'
      var connectorFlavor = 'web_cloud'
      var data1 = {index: indexName, flavor: indexFlavor, description: descriptionText}
      client.post('createtextindex', data1, function(err1, resp1, body1) {
        if (err1) {
          bot.reply(message, 'Oops! There was an error creating the index (the thing used to store the data) for you. Try again.')
          console.log('Error 1:')
          console.log(util.inspect(err1, false, null))
        } else {
          console.log('Created text index ' + indexName)
          bot.reply(message, 'Created text index ' + indexName)
          var data2 = {
            flavor: connectorFlavor,
            connector: connectorName,
            description: descriptionText + ' for ' + indexName + ' index',
            config: JSON.stringify({
              url: url
            }),
            destination: JSON.stringify({
              action: 'addtotextindex',
              index: indexName,
            }),
            schedule: JSON.stringify({
              // schedule: '0s',
              frequency : {frequency_type : 'seconds', interval : 21600}
            })
          }
          client.post('createconnector', data2, function(err2, resp2, body2) {
            if (err2) {
              bot.reply(message, 'Oops! There was an error creating the connector (the thing used to import the data) for you. Try again.')
              console.log('Error 2:')
              console.log(util.inspect(err2, false, null))
            } else {
              console.log('Created connector for ' + url + 'called' + connectorName)
              var data3 = {connector: connectorName}
              client.post('startconnector', data3, function(err3, resp3, body3) {
                if (err3) {
                  bot.reply(message, 'Oops! There was an error starting the connector (the thing used to import the data) for you. Try again.')
                  console.log('Error 3:')
                    console.log(util.inspect(err3, false, null))
                } else {
                  console.log('Scheduled connector - ' + connectorName)
                  bot.reply(message, 'Starting to import documents. To see the status of the importing, ask me "status of import <IMPORT_NAME>"')
                }
              })
            }
          })
        }
      })
    })
  })
})

controller.hears('list imports', 'direct_mention', function(bot, message) {
  var data = {type: 'connector'}
  client.post('listresources', data, function(err, resp, body) {
    var privateResources = resp.body.private_resources
    aysnc.eachOf(privateResources, function(privateResource, index) {

    }, function(err) { })
  })
})



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
