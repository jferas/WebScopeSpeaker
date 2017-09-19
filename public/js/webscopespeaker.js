
// ScopeSpeaker web client

$(document).ready(function() {

var username = "";
var queue = [];
var speech_in_progress = false;
var websocket;
var chat_endpoint_url;
var chat_access_token;
var broadcast_id;

// method to log message to message display object on screen
//
log_msg = function(msg) {
    var s = $("#message").html();
    s = s + "<br>" + msg;
    $("#message").html(s);
}

// callback method when speech begins
//
start_callback = function() {
}

// callback method when speech ends - say next message if present
//
stop_callback = function() {
    speech_in_progress = false;
    if (queue.length > 0) {
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
    console.log("host url is:" + window.location.href);

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
    websocket = new WebSocket("ws://localhost:3000/chat");
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
    try {
        chat_message = JSON.parse(evt.data);
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
                display_name = sender.display_name;
                msg_to_say = display_name + " said: " + what_they_said;
                queue_message_to_say(msg_to_say);
            }
            catch(err) {
                log_msg("Inner Payload parse error: " + err);
                log_msg("Message: " + evt.data);
                websocket.close();
            }
        }
    }
    catch(err) {
        log_msg("Payload parse error: " + err);
        log_msg("Message: " + evt.data);
        websocket.close();
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


// method to queue a message to be said
//
var queue_message_to_say = function(m) {
    queue.push(m);
    if (!speech_in_progress) {
        say_next();
    }
};

// method to de-queue and say the next message in the queue
//
var say_next = function() {
    if (speech_in_progress) {
        schedule_say_next(500);
    }

    if (queue.length > 0) {
        speech_in_progress = true;
        var m = queue.shift();
        $("#chat").html(m);
        responsiveVoice.speak(m, "UK English Male", {onstart: start_callback, onend: stop_callback});
    }
};

log_msg("<u>Scopespeaker debug/run log:</u><br>");
});


