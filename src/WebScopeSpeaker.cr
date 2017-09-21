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
        status, broadcast_id, chat_endpoint, chat_access_token = get_periscope_chat_connection(user)
        if status != "error"
            p = PeriscopeLiveChat.new(user, broadcast_id, chat_endpoint, chat_access_token)
            CHATS << p
        end
        {status, broadcast_id}.to_json
    
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
            parsed_broadcast_id = "xxxxx"
            #CHATS.each |c| do
                #if (c.broadcast_id == parse_broadcast_id) && !c.listening_socket
                #    c.add_web_client_listener(socket)
                #end
            #end
        end

        # Remove clients from the list when it's closed
        socket.on_close do
            puts "Browser web socket closed"
        end
    end

    Kemal.run

end
