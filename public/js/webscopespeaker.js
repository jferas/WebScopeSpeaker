$(document).ready(function() {

var username = "";

$("#start_chat").click(function() {
    username = $('#user').val();
    getPeriscopeUserData(username);
    //alert("User name is: " + username);
});

// method to request data about a Periscope user
//
var getPeriscopeUserData = function(user)
{
    console.log("host url is:" + window.location.href);

    $.ajax({url: window.location.href + "chatinfo/" + user, type: 'GET',
            contentType: 'application/x-www-form-urlencoded', dataType: 'text',
            success: onSuccessGetUserData, error: onAjaxError});
};

// AJAX error handler
//
var onAjaxError = function(err)
{
    $("#message").html("An error occured: " + err);
};

function encode_utf8( s ){
        return unescape( encodeURIComponent( s ) );
}
// AJAX success handler - extract Periscope user info from received HTML response
//
var onSuccessGetUserData = function(response, status_info)
{
    alert("Server response:" + response);
}


});
