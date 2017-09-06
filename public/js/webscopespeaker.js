
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
    log_msg("speech ended, queue length: " + queue.length);
    speech_in_progress = false;
    if (queue.length > 0) {
        log_msg("starting next queued message");
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
    log_msg(response);
    var response_array = JSON.parse(response);
    if (response_array[0] == "error") {
        queue_message_to_say("An error occurred, the problem is: " + response_array[1]);
        queue_message_to_say("Chat messages will not begin");
    }
    else {
        chat_endpoint_url = response_array[0];
        chat_access_token = response_array[1];
        broadcast_id = response_array[2];
        log_msg("URL is: " + chat_endpoint_url);
        log_msg("Chat Access Token is: " + chat_access_token);
        queue_message_to_say("Got a good response from the periscope server about " + username);
        queue_message_to_say("Chat messages will now begin");
        open_chat_websocket(chat_endpoint_url);
    }
}

// method to open a chat websocket with the periscope chat server, given URL and access token
//
var open_chat_websocket = function(url, token) {
    websocket = new WebSocket(url);
    websocket.onopen = function(evt) { onOpen(evt) };
    websocket.onclose = function(evt) { onClose(evt) };
    websocket.onmessage = function(evt) { onMessage(evt) };
    websocket.onerror = function(evt) { onError(evt) };
}

// method invoked when chat websocket is opened, sends handshake of join message and auth message
//
var onOpen = function(evt) {
    log_msg("CONNECTED");
    join_message = "{\"kind\":2,\"payload\":\"{\\\"kind\\\":1,\\\"body\\\":\\\"{\\\\\\\"room\\\\\\\":\\\\\\\"replace_this\\\\\\\"}\\\"}\"}";
    auth_message = "{\"kind\":3,\"payload\":\"{\\\"access_token\\\":\\\"replace_this\\\"}\"}";
    joinJsonMessage = joinJsonMessage.gsub("replace_this", broadcast_id);
    authJsonMessage = authJsonMessage.gsub("replace_this", chat_access_token);
    doSend(join_message);
    doSend(auth_message);
}

// method invoked when chat websocket is closed
//
var onClose = function(evt) {
    log_msg("DISCONNECTED");
}

// method invoked when chat websocket receives a message, parse message and say it
//
var onMessage = function(evt) {
    log_msg("Message: " + evt.data);
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
    log_msg("message queued, length: " + queue.length);
    if (!speech_in_progress) {
        log_msg("Voice is not active, saying next queued message");
        say_next();
    }
};

// method to de-queue and say the next message in the queue
//
var say_next = function() {
    if (speech_in_progress) {
        log_msg("Delaying next while speech in progress...");
        schedule_say_next(500);
    }

    if (queue.length > 0) {
        speech_in_progress = true;
        var m = queue.shift();
        $("#chat").html(m);
        log_msg(m);
        responsiveVoice.speak(m, "UK English Male", {onstart: start_callback, onend: stop_callback});
    }
};

log_msg("<u>Scopespeaker run log:</u><br>");
});


