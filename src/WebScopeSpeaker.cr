require "kemal"
require "crustache"
require "./WebScopeSpeaker/version"
require "./WebScopeSpeaker/periscope"

module Webscopespeaker
    CHATS = [] of PeriscopeLiveChat

    @@live_chat : PeriscopeLiveChat = PeriscopeLiveChat.new

    # Serve the web page
    get "/" do
        render "views/index.ecr"
    end

    # Serve the response to get live chat room info about a user
    #
    get "/chatinfo/:user" do |env|
        user = env.params.url["user"]
        #@@live_chat = PeriscopeLiveChat.new
        @@live_chat.get_periscope_chat_connection(user).to_json
    end

    ws "/chat" do |socket|
        # Add the client to the list of periscope listeners
        puts "received a chat request from the web client"
        @@live_chat.add_periscope_listener(socket)

        # right now, simply log that we received something from the client
        socket.on_message do |message|
            puts "Got a message from the browser: " + message
        end

        # Remove clients from the list when it's closed
        socket.on_close do
            puts "Browser web socket closed"
        end
    end

    Kemal.run

end
