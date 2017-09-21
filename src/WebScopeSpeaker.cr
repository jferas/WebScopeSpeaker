require "kemal"
require "crustache"
require "./WebScopeSpeaker/version"
require "./WebScopeSpeaker/periscope"


# A class defining structure of web client request
#
class WebClientRequest
    JSON.mapping({
        room: String,
    })
end

module Webscopespeaker
    CHATS = [] of PeriscopeLiveChat

    # Serve the main web page
    #
    get "/" do
        render "views/index.ecr"
    end

    # Serve the response to get live chat room info about a user
    #
    get "/chatinfo/:user" do |env|
        user = env.params.url["user"]
        status, broadcast_id, chat_endpoint, chat_access_token = get_periscope_chat_connection(user)
        if status != "error"
            p = PeriscopeLiveChat.new(user, broadcast_id, chat_endpoint, chat_access_token)
            CHATS << p
        end
        {status, broadcast_id}.to_json
    
     end
    

    # Respond to chat request from browser.. Add the web client to the list of periscope listeners
    #
    ws "/chat" do |socket|
        puts "received a chat request from the web client"

        # right now, simply log that we received something from the client
        socket.on_message do |message|
            puts "Got a message from a browser: " + message

            #
            # Parse broadcast ID from the JSON web client message, then find that broadcast ID in the chat instances,
            #  and add the web client listening socket to the matched chat instance.
            #
            client_request = WebClientRequest.from_json(message)
            parsed_broadcast_id = client_request.room
            CHATS.each do |c|
                if (c.broadcast_id == parsed_broadcast_id) && !c.listening_socket
                    c.add_web_client_listener(socket)
                end
            end
        end

        # Remove clients from the list when it's closed
        socket.on_close do
            puts "Browser web socket closed"
        end
    end

    Kemal.run

end
