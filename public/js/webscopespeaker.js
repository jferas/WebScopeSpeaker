
// ScopeSpeaker web client

$(document).ready(function() {

var username = "";

log_msg = function(msg) {
    var s = $("#message").html();
    s = s + "<br>" + msg;
    $("#message").html(s);
}

start_callback = function() {
    log_msg("Started talking");
}

stop_callback = function() {
    log_msg("Stopped talking");
}

// button function to get user name from text field and query server for Periscope chat token

$("#start_chat").click(function() {
    username = $('#user').val();
    for (var i = 0; i < 100; i++) {
    responsiveVoice.speak("trying " + username, "UK English Male");// , {onstart: start_callback, onend: stop_callback});
    }
    //getPeriscopeChatData(username);
    //alert("User name is: " + username);
});

// method to request data about a Periscope user
//
var getPeriscopeChatData = function(user)
{
    console.log("host url is:" + window.location.href);

    $.ajax({url: window.location.href + "chatinfo/" + user, type: 'GET',
            contentType: 'application/x-www-form-urlencoded', dataType: 'text',
            success: onSuccessGetChatData, error: onAjaxError});
};

// AJAX error handler
//
var onAjaxError = function(err)
{
    log_msg("An error occured: " + err);
};

function encode_utf8( s ){
        return unescape( encodeURIComponent( s ) );
}
// AJAX success handler - received Periscope chat token from server
//
var onSuccessGetChatData = function(response, status_info)
{
    //alert("Server response:" + response);
    log_msg(response);
    responsiveVoice.speak("Got a response from the periscope server", "UK English Male", {onstart: start_callback, onend: stop_callback});
}


});
