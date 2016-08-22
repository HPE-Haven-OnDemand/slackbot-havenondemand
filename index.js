var env = process.env.NODE_ENV || 'dev'
if (env == 'dev') {
  require('dotenv').load()
}

require('datejs')
var util = require('util')
var async = require('async')

var havenondemand = require('havenondemand')
var client = new havenondemand.HODClient(process.env.HOD_APIKEY)

var Botkit = require('botkit')

var controller = Botkit.slackbot({
    debug: false
})

var bot = controller.spawn({
    token: process.env.SLACK_TOKEN
}).startRTM()

// API key
//
controller.hears(['update API key to (.*)', 'API key is (.*)', 'add account (.*)'], 'direct_mention', function(bot, message) {
  var apiKey = message.match[1]
  createHODClient(apiKey, function() {
    console.log('Client created for ' + apiKey)
  })
})

//Helper functions
function createHODClient(apiKey, callback) {
  client = new havenondemand.HODClient(apiKey)
  callback()
}

// Help
//
controller.hears('help', 'direct_mention', function(bot, message) {
  bot.reply(message,
    "Here is a list of commands I can perform. Just directly mention me and I will perform them :)\n*configure import* - will help you port of documents so they can become searchable\n*list resources* - lists all the importers and indexes you have\n*<INDEX NAME> ; <QUERY>* - will search through the specified index using the query and print out the results\n*summary for <USERNAME>* - will provide a comprehensive summary of user's conversation in the chat*\n*API key is <API KEY>* will update your API key associated with Haven OnDemand, which you can find here after signup\n*profanity checker <STATUS>* will toggle the profanity checker - enter *on* to turn it on, *off* to turn it off, or *status* to check the status"
  )
})

// Indexing and search
//
controller.hears(['(.*) ; (.*)', '(.*);(.*)', '(.*); (.*)', '(.*) ;(.*)'], 'direct_mention', function(bot, message) {
  var textIndex = message.match[1]
  var query = message.match[2]
  var data = {indexes: textIndex, text: query, print: 'all', summary: 'quick', absolute_max_results: 10}
  client.call('querytextindex', data, function(err, resp, body) {
    var documents = resp.body.documents // array
    if (documents.length > 0) {
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
    } else {
      bot.reply(message, 'Nothing matched your query. Try again!')
    }
  })
})

controller.hears(['configure import'], 'direct_mention', function(bot, message) {
  var url
  var description
  var isUsernameAndPassword
  var username
  var password
  var usernameField
  var passwordField

  askForUrl = function(response, convo) {
    debugger
    convo.ask('Please provide a URL to import documents from.', function(response, convo) {
      debugger
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
        debugger
        convo.say(processingDescription)
        if (err) deleteAll(err, params) // delete everything and say to start again
        convo.next()
      })
    })
  }

  bot.startConversation(message, askForUrl)
})

controller.hears('list resources', 'direct_mention', function(bot, message) {
  var privateResources

  askForIndexOrConnector = function(response, convo) {
    convo.ask('Which would you like to look at:\nSay either *imports* or *indexes*', function(response, convo) {
      if (response.text == 'imports') {
        var type = 'connector'
      } else if (response.text == 'indexes') {
        var type = 'content'
      } else {
        convo.say('You\'ve made a mistake! Try again.')
        return convo.next()
      }
      var data = {type: type}
      client.post('listresources', data, function(err, resp, body) {
        privateResources = resp.body.private_resources
        formatDocumentsForPrintResources(privateResources, function(text) {
          convo.say(text)
          askIfWouldLikeMoreInfoOnOne(response, convo)
          convo.next()
        })
      })
    })
  }

  askIfWouldLikeMoreInfoOnOne = function(response, convo) {
    convo.ask('*Please respond with the number of the resource you want to view*', function(response, convo) {
      var documentNumber = parseInt(response.text) // get index for document and convert to integer
      if (documentNumber >= privateResources.length || documentNumber < 0 || typeof documentNumber != 'number') { // if index is out of bounds or not a number, repeat the question
        convo.repeat()
        convo.next()
      } else { // if entered correct index for document
        var resource = privateResources[documentNumber].resource
        var type = privateResources[documentNumber].type
        if (type == 'content') { // it's an index
          var data = {index: resource}
          var endpoint = 'indexstatus'
        } else { // it's a connector
          var data = {connector: resource}
          var endpoint = 'connectorstatus'
        }
        client.post(endpoint, data, function(err, resp, body) {
          //format it
          if (endpoint == 'connectorstatus') { // if connector
            if (err) {
              var formattedText = "Name: " + resp.body.connector +"\nError: " + resp.body.error
            } else {
              var formattedText = "Name: " + resp.body.connector +"\nStatus: " + resp.body.status.toLowerCase() + "\nDocuments added: " + resp.body.document_counts.added  + "\nErrors: " + resp.body.document_counts.errors + "\nTime processing: " + resp.body.time_processing
            }
          } else { // if index
            var formattedText = "Name: " + resource + "\nNumber of documents: " + resp.body.total_documents
          }
          convo.say(formattedText) //say what is formated
          convo.next()
        })
      }
    })
  }

  bot.startConversation(message, askForIndexOrConnector)
})

//Helper functions
function formatDocumentsForPrintResources(resources, callback) {
  var textBlob = ''
  async.eachOf(resources, function(resource, index) {
    textBlob += index + ' - ' + resource.resource + '\n' + 'Description: ' + resource.description + '\n' + '- - - -\n'
    if (index+1 == resources.length) callback(textBlob)
  }, function(err) {
    console.log(err)
  })
}


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

function makeid() {
    var text = ""
    var possible = "abcdefghijklmnopqrstuvwxyz0123456789"

    for (var i=0; i < 5; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length))

    return text
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
              callback(null, id, 'Starting to import documents. To see the status of the importing, ask me "list resources"')
            }
          })
        }
      })
    }
  })
  //
}

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

// User analytics
//
//
var questions = {
  askForDates: 'Please specify the date or ranges of dates for the summary. Use MM/DD/YYYY format\nFor example, say  \'07/12/2016\' or \'07/05/2016 to 07/11/2016\''
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

// Profanity checker
//
var profanityCheckerOn = true
var profanityCheckerSubstituteOn = true

controller.on('ambient', function(bot, message) {
  if (profanityCheckerOn) {
    var text = message.text
    var user = message.user
    findAndReplaceBadWords(text, function(cleanText) {
      var replyText = "What a potty mouth you have! Maybe try saying this instead:\n*" + cleanText + "*"
      bot.reply(message, replyText)
    })
  }
})

controller.hears('profanity checker (.*)', 'direct_mention', function(bot, message) {
  var value = message.match[1]
  var text
  if (value == 'on') {
    profanityCheckerOn = true
    text = "Profanity check as been turned " + value
  } else if (value == 'off') {
    profanityCheckerOn = false
    text = "Profanity check as been turned " + value
  } else if (value == 'status') {
    if (profanityCheckerOn) {
      text = 'Profanity checker is on'
    } else {
      text = 'Profanity checker is off'
    }
  } else {
    text = "Whoops! Please enter say either *profanity checker on*, *profanity checker off*, or *profanity checker status*"
  }
  bot.reply(message, text)
})

// Helper functions
function findAndReplaceBadWords(chatText, callback) {
  var type = 'profanity,racism,slang'
  var category = "MATCH{" + type + "}:category"
  chatText = chatText.toLowerCase()
  var data = {index: 'slackbotprofanities', max_results: 100, text: chatText, field_text: category, print: 'fields', print_fields: 'content,substitute'}
  client.post('querytextindex', data, function(err, resp, body) {
    var documents = resp.body.documents
    var tempText = chatText.toLowerCase()
    var documentCounter = 1
    async.each(documents, function(doc, c) {
      documentCounter +=1
      var terms = JSON.parse("[" + doc.content + "]")
      var termCounter = 1
      async.each(terms, function(term, c) {
        termCounter += 1
        term = term.trim()
        term = term.replace("/\"/", "")
        var i = tempText.indexOf(term)
        while (i >= 0) {
          chatText = chatText.replace(term, doc.substitute[0])
          i = tempText.indexOf(term, i+1)
        }
        if (documentCounter > documents.length && termCounter > terms.length) {
          callback(chatText)
        }
      }, function(err) {console.log(err)} )
    }, function(err) {console.log(err)} )
  })
}

// Dropbox
//

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
