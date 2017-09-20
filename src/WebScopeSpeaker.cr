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
        p = PeriscopeLiveChat.new
        chat_data = p.get_periscope_chat_connection(user)
        return chat_data if chat_data[0] == "error"

        CHATS << p

        chat_data
    
     end
    

    ws "/chat" do |socket|
        # Add the web client to the list of periscope listeners
        puts "received a chat request from the web client"

        # right now, simply log that we received something from the client
        socket.on_message do |message|
            puts "Got a message from the browser: " + message
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
