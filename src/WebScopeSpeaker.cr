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
    status, broadcast_id, chat_endpoint, chat_access_token = PeriscopeLiveChat.get_periscope_chat_connection(user)
    if status != "error"
      p = PeriscopeLiveChat.new(user, broadcast_id, chat_endpoint, chat_access_token)
      CHATS << p
    end
    {status, broadcast_id}.to_json
  end

  # Respond to a browser's request to receive chat messages .. Add the client websocket to the appropriate periscope
  #  chat instance in the list of periscope chat listeners
  #
  ws "/chat" do |socket|
    puts "received a request for chat messages from a web client"

    #
    # Parse broadcast ID from the JSON web client message, then find that broadcast ID in the chat instances,
    #  and add the web client listening socket to the matched chat instance.
    #
    socket.on_message do |message|
      puts "Got a message from a browser: " + message

      client_request = WebClientRequest.from_json(message)
      parsed_broadcast_id = client_request.room
      CHATS.each do |c|
        if (c.broadcast_id == parsed_broadcast_id) && !c.listening_socket
          c.add_web_client_listener(socket)
        end
      end
    end

    # Remove appropriate chat client from the list when the socket is closed
    #
    socket.on_close do
      puts "Browser web socket closed"
      CHATS.each do |c|
        if c.listening_socket == socket
          s = c.periscope_socket
          s.close if s && s.closed?
          CHATS.delete(c)
          puts "Chat instance deleted"
        end
      end
    end
  end

  Kemal.run
end
