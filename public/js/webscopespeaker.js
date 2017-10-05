
// ScopeSpeaker web client

$(document).ready(function() {

var username = "";
var current_language = "UK English Male";
var messages = [];
var speaking = false;
var websocket;
var chat_endpoint_url;
var chat_access_token;
var broadcast_id;
var queued_message_being_said = "";
var dropping_messages = false;
var known_bots = [];
var bot_words = [];

// settings variables
//
var name_length = 10;
var saying_emojis = true;
var saying_translations = true;
var said_word = "said";
var translated_word = "translated";
var saying_left_messages = false;
var saying_join_messages = false;
var saying_display_names = false;
var high_water_mark = 10;
var low_water_mark = 5;
var detect_length = 120;
var default_language = "en";

// method to log message to message display object on screen
//
log_msg = function(msg) {
    var s = $("#message").html();
    s = msg + "<br>" + s;
    $("#message").html(s);
}

// callback method when speech begins
//
start_callback = function() {
}

// callback method when speech ends - say next message if present
//
stop_callback = function() {
    speaking = false;
    if (messages.length > 0) {
        schedule_say_next(50);
    }
};

// method to set up a scheduled call to say_next within a given number of milliseconds
//
schedule_say_next = function(t) {
    setTimeout(say_next, t);
};

// button function to get user name from text field and query server for Periscope chat token

$("#start_chat").click(function() {
    username = $('#user').val();
    queue_message_to_say("trying " + username);
    getPeriscopeChatData(username);
    //alert("User name is: " + username);
});

// method to request data about a Periscope user
//
var getPeriscopeChatData = function(user) {

    $.ajax({url: window.location.href + "chatinfo/" + user, type: 'GET',
            contentType: 'application/x-www-form-urlencoded', dataType: 'text',
            success: onSuccessGetChatData, error: onAjaxError});
};

// AJAX error handler - recevied HTTP error from server
//
var onAjaxError = function(err) {
    log_msg("An error occured: " + err);
    queue_message_to_say("An error occured: " + err);
};

// AJAX success handler - received Periscope chat token from server
//
var onSuccessGetChatData = function(response, status_info) {
    //alert("Server response:" + response);
    var response_array = JSON.parse(response);
    if (response_array[0] == "error") {
        queue_message_to_say("An error occurred, the problem is: " + response_array[1]);
        queue_message_to_say("Chat messages will not begin");
    }
    else {
        broadcast_id = response_array[1];
        queue_message_to_say("Got a good response from the periscope server about " + username);
        queue_message_to_say("Chat messages will now begin");
        open_chat_websocket(broadcast_id);
    }
}

// method to open a chat websocket with the periscope chat server, given URL and access token
//
var open_chat_websocket = function() {
    chat_url = window.location.href.replace("http", "ws") + "chat";
    websocket = new WebSocket(chat_url);
    websocket.onopen = function(evt) { onOpen(evt) };
    websocket.onclose = function(evt) { onClose(evt) };
    websocket.onmessage = function(evt) { onMessage(evt) };
    websocket.onerror = function(evt) { onError(evt) };
}

// method invoked when chat websocket is opened, sends handshake of join message and auth message
//
var onOpen = function(evt) {
    log_msg("<br>Secure web-socket connected to ScopeSpeaker proxy server");
    join_message = {};
    join_message["room"] = broadcast_id;
    doSend(JSON.stringify(join_message));
}

// method invoked when chat websocket is closed
//
var onClose = function(evt) {
    log_msg("Web-socket disconnected");
}

// method invoked when chat websocket receives a message, parse message and say it
//
var onMessage = function(evt) {
    message_to_say = extractChatMessage(evt.data);
    if (message_to_say != null) {
        msg_fields = message_to_say.split(":");
        language_tag = msg_fields[0];
        who_said_it = msg_fields[1];
        msg_fields.shift();
        msg_fields.shift();
        what_was_said = msg_fields.join(" ");
        if ( (what_was_said == "left") && (!saying_left_messages) ) {
            return;
        }
        if ( (what_was_said == "joined") && (!saying_join_messages) ) {
            return;
        }
        to_be_said = language_tag + ":" + who_said_it + ":" + what_was_said;
        queue_message_to_say(to_be_said);
    }
}


// method invoked when chat websocket has an error
//
var onError = function(evt) {
    log_msg("Error:" + evt.data);
}

// method to send a message on the websocket to the Periscope chat server
//
var doSend = function(message) {
    log_msg("SENT: " + message);
    websocket.send(message);
}

// method to extract information from the incoming Periscope chat message
var extractChatMessage = function(chat_msg) {
    var who_said_it = "";
    var what_they_said = "";
    try {
        chat_message = JSON.parse(chat_msg);
        kind = chat_message.kind;
        payload_string = chat_message.payload;
        payload = JSON.parse(payload_string);
        if (kind == 1) {
            try {
                body_string = payload.body;
                outer_body = JSON.parse(body_string);
                if (outer_body.body == null) {
                    return;
                }
                what_they_said = outer_body.body;
                sender = payload.sender;
                if (sender.display_name == null) {
                    return;
                }
                language_array = sender.lang;
                chat_message_language = language_array[0];
                display_name = sender.display_name;
                user_name = sender.username;
                if (saying_display_names) {
                    who_said_it = display_name;
                }
                else {
                    who_said_it = user_name;
                }
                language_tag = "";
                if (language_array.length > 1) {
                    language_tag = "?M";
                }
                if ( (language_tag.length == 0) && (what_they_said.length > detect_length) ) {
                    language_tag = "?L";
                }
                language_tag += chat_message_language;
                if (what_they_said == "joined") {
                    return null;
                }
                if (known_bots.indexOf(user_name) >= 0) {
                    return null;
                }
                if (bot_words.indexOf(what_they_said) >= 0) {
                    known_bots.push(user_name);
                    return null;
                }
            }
            catch(err) {
                log_msg("Inner Payload parse error: " + err);
                log_msg("Message: " + err.message);
                websocket.close();
                return null;
            }
        }
        else if (kind == 2) {
            payload_kind = payload.kind;
            sender = payload.sender;
            if (payload_kind == 1) {
                message_for_chatlog = sender.username + "joined";
                if (saying_join_messages) {
                    queue_message_to_say(message_for_chatlog);
                }
                else {
                    log_msg(message_for_chatlog);
                }
                return null;
            }
            else if (payload_kind == 2) {
                message_for_chatlog = sender.username + "left";
                if (saying_left_messages) {
                    queue_message_to_say(message_for_chatlog);
                }
                else {
                    log_msg(message_for_chatlog);
                }
                return null;
            }
        }
    }
    catch(err) {
        log_msg("Payload parse error: " + err);
        log_msg("Message: " + err.message);
        queue_priority_message_to_say("Chat message payload parse error");
        websocket.close();
        return null;
    }

    if ( (who_said_it.length == 0) || (what_they_said.length == 0) ) {
        return null;
    }
    return language_tag + ":" + who_said_it + ":" + what_they_said;
}

// method to put a priority message to be said at the front of the queue
//
var queue_priority_message_to_say = function(m) {
    messages.unshift(m);
    if (!speaking) {
        say_next();
    }
};

// method to queue a message to be said
//
var queue_message_to_say = function(m) {
    if (dropping_messages) {
        return;
    }
    messages.push(m);
    queue_size = messages.length;
    if (queue_size == high_water_mark) {
        the_message = "Scope Speaker un-said queue has " + high_water_mark
                    + " messages, new messages won't be said till queue is down to " + low_water_mark;
        messages.unshift(the_message);
        log_msg(the_message);
        dropping_messages = true;
    }
    if (!speaking) {
        say_next();
    }
};

// method to de-queue and say the next message in the queue
//
var say_next = function() {
    var who_said_it = "";
    var what_was_said = "";

    if (speaking) {
        log_msg("exit say_next because speech in progress");
        return;
    }

    if (messages.length == 0) {
        log_msg("exit say_next because no messages");
        return;
    }

    // TODO: add some logic here about current voice when we get access to alternate voices

    speaking = true;
    var speak_string = messages.shift();
    if ( (dropping_messages) && (messages.length == low_water_mark) ) {
        // we're crossing back to the low water mark, allow saying new messages, announce we're doing so, and put msg back in queue
        dropping_messages = false;
        messages.unshift(speak_string);
        speak_string = "Scope Speaker has recovered the un-said message queue down to " + lowWaterMark + ", new messages will resume being said";
        log_msg(speak_string);
    }
    message_processed = false;
    queued_message_being_said = speak_string;
    colon_location = speak_string.indexOf(":");
    question_mark_location = speak_string.indexOf("?");
    if ( (question_mark_location == 0) || ((colon_location > 0) && (colon_location < 6)) ) {
        msg_fields = speak_string.split(":");
        language_tag = msg_fields[0];
        who_said_it = msg_fields[1];
        what_was_said = msg_fields[2];
        if (saying_translations && (language_tag != default_language)) {
            translation_command = language_tag + "-" + default_language;
            log_msg(who_said_it + " said before translation(" + translation_command + "): " + what_was_said);
            send_translation_request(who_said_it, what_was_said, translation_command);
        }
        else {
            sayIt(who_said_it, said_word, what_was_said, "");
        }
        message_processed = true;
    }

    // message not processed above means it isn't from someone, but is informative from app
    if (!message_processed) {
        log_msg(speak_string);
        sayIt("", "", speak_string, "");
    }
};

// function to speak text
//
var sayIt = function(who, announce_word, message_to_say, additional_screen_info) {
    var speak_string;
    var sayer;
    var announce_phrase = announce_word + ": ";

    if (announce_word.length == 0) {
        announce_phrase = "";
    }

    if ( (message_to_say != null) && (!saying_emojis) ) {
        speak_string = removeEmoji(message_to_say);
    }
    else {
        speak_string = message_to_say;
    }
    if ( (who.length != 0) && (!saying_emojis) ) {
        sayer = removeEmoji(who);
    }
    else {
        sayer = who;
    }
    $("#chat").html( sayer + " " + announce_phrase + speak_string + additional_screen_info);
    if ( (name_length == 0) || (sayer.length == 0) ) {
        responsiveVoice.speak(speak_string, current_language , {onstart: start_callback, onend: stop_callback});
    }
    else {
        shortend_who = who.substring(0, Math.min(who.length, name_length));
        responsiveVoice.speak(shortend_who + " " + announce_word + ": " + speak_string,
                current_language , {onstart: start_callback, onend: stop_callback});

    }
};

// function to send a translation request to Yandex language translation service
//
var send_translation_request = function(who_said_it, text_to_be_translated, language_pair) {
    var jsonString;
    var translation_command;

    if (language_pair.indexOf("?") == 0) {
        translation_command = language_pair.split("-")[1];
    }
    else {
        translation_command = language_pair;
    }
    var yandexKey = "trnsl.1.1.20170707T040715Z.91d8bbf749039bd6.313fa4324e6371e9ae58a30e2a4f93b47dca1ca2";
    var yandexUrl = "https://translate.yandex.net/api/v1.5/tr.json/translate?key=" + yandexKey
             + "&text=" + encodeURI(text_to_be_translated) + "&lang=" + translation_command;
    $.ajax({url: yandexUrl, type: 'GET',
            contentType: 'application/x-www-form-urlencoded', dataType: 'text',
            success: function(response, status_info) {
                         var result_string = response;

                         log_msg("got translation response: " + response);

                         //Getting the characters between [ and ]
                         result_string = result_string.substring(result_string.indexOf('[')+1);
                         result_string = result_string.substring(0,result_string.indexOf("]"));

                         //Getting the characters between " and "
                         result_string = result_string.substring(result_string.indexOf("\"")+1);
                         result_string = result_string.substring(0,result_string.indexOf("\""));

                         log_msg("got translation text: " + result_string);

                         say_translated_text(who_said_it, result_string,
                "<br><br>(" + this.languagePair + ") Translation powered by <a href=\"http://translate.yandex.com\">Yandex.Translate</a>");
                     }, 
            error: onAjaxError});
};

// function to say text that has been translated
//
var say_translated_text = function(who_said_it, what_was_said, translation_info) {
    log_msg("After translation: " + what_was_said);
    if ( (what_was_said == "joined") || (what_was_said == "Joined")
    ||   (what_was_said == "Participation") || (what_was_said == "has joined") )  {
            speaking = false;
            queued_message_being_said = null;
            say_next();
            return;
        }
        var announce_word = translated_word;

        if (translation_info.indexOf("?L") >= 0) {
            var source_language = translation_info.split("-")[0].split("L")[1];
            if (source_language == defaultLanguage) {
                announce_word = said_word;
            }
        }
        sayIt(who_said_it, announce_word, what_was_said, translation_info);
};

// function to remove emoji from a given string
//
var removeEmoji = function(s) {
    return s.replace(/([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/g, '');
};

log_msg("<u>Scopespeaker debug/run log:</u><br>");
});


