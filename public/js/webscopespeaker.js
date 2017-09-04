
// ScopeSpeaker web client

$(document).ready(function() {

var username = "";
var queue = [];

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
    if (queue.length > 0) {
        say_next();
    }
}

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
    }
    else {
        log_msg("URL is: " + response_array[0]);
        log_msg("Chat Access Token is: " + response_array[1]);
        queue_message_to_say("Got a good response from the periscope server about " + username);
        queue_message_to_say("Chat messages will now begin");
        queue_message_to_say("Chat messages will now begin");
        queue_message_to_say("Chat messages will now begin");
        queue_message_to_say("Chat messages will now begin");
        queue_message_to_say("Chat messages will now begin");
        queue_message_to_say("Chat messages will now begin");
        queue_message_to_say("Chat messages will now begin");
        queue_message_to_say("Chat messages will now begin");
        queue_message_to_say("Chat messages will now begin");
        queue_message_to_say("Chat messages will now begin");
        queue_message_to_say("Chat messages will now begin");
    }
}

// method to queue a message to be said
//
var queue_message_to_say = function(m) {
    queue.push(m);
    if (!responsiveVoice.isPlaying()) {
        say_next();
    }
};

// method to de-queue and say the next message in the queue
//
var say_next = function() {
    if ( (queue.length > 0) && (!responsiveVoice.isPlaying() ) ) {
        var m = queue.shift();
        log_msg(m);
        responsiveVoice.speak(m, "UK English Male", {onstart: start_callback, onend: stop_callback});
    }
};

});


