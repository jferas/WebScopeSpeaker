require "kemal"
require "crustache"
require "./WebScopeSpeaker/version"
require "./WebScopeSpeaker/periscope"


module Webscopespeaker
    CHATS = [] of PeriscopeLiveChat

    # Serve the web page
    get "/" do
        render "views/index.ecr"
    end

    # Serve the response to get live chat room info about a user
    #
    get "/chatinfo/:user" do |env|
        user = env.params.url["user"]
        chat_data = get_periscope_chat_connection(user)
        if chat_data[0] != "error"

            broadcast_id = chat_data[1]
            chat_endpoint = chat_data[2]
            chat_access_token = chat_data[3]

            p = PeriscopeLiveChat.new(user, broadcast_id, chat_endpoint, chat_access_token)
            CHATS << p
        end
        chat_data.to_json
    
     end
    

    ws "/chat" do |socket|
        # Add the web client to the list of periscope listeners
        puts "received a chat request from the web client"

        # right now, simply log that we received something from the client
        socket.on_message do |message|
            puts "Got a message from the browser: " + message

            #
            # TODO: add logic here to parse broadcast ID from the JSON, then find that broadcast ID in the chat instances,
            #        and add the web client listening socket to that chat instance. (right now we cheat with instance 0)
            #

            p = CHATS[0]
            p.add_web_client_listener(socket)
        end

        # Remove clients from the list when it's closed
        socket.on_close do
            puts "Browser web socket closed"
        end
    end

    Kemal.run

end
