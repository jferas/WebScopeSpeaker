
require "json"

# Utilitiy methods and classes to get and parse Periscope broadcast and chat info

PERISCOPE_URL = "https://www.periscope.tv/"
PERISCOPE_BROADCAST_INFO_URL = "https://api.periscope.tv/api/v2/accessVideoPublic?broadcast_id="
PERISCOPE_USER_BROADCAST_LIST_URL = "https://api.periscope.tv/api/v2/getUserBroadcastsPublic?user_id=replace_with_user_id&all=true&session_id=replace_with_session_id"

PERISCOPE_CHAT_ACCESS_URL = "https://api.periscope.tv/api/v2/accessChatPublic?chat_token="

USER_TAG = ",&quot;usernames&quot;:{&quot;replace_this&quot;:&quot;"

SESSION_TAG = "public&quot;:{&quot;broadcastHistory&quot;:{&quot;token&quot;:{&quot;session_id&quot;:&quot;"

JSON_TAG_BROADCAST = "broadcast";
JSON_TAG_VIDEO_STATE = "state";
JSON_TAG_BROADCAST_SOURCE = "broadcast_source";
JSON_TAG_USERNAME = "username";
JSON_TAG_URL_CHAT_TOKEN = "chat_token";
JSON_TAG_CHAT_ACCESS_TOKEN = "access_://assets.pscp.tv/univ/main-d863b608e0cdff3b7d2a.jstoken";
JSON_TAG_ENDPOINT_URL = "endpoint";

VIDEO_TAG = "https://www.pscp.tv/w/"
BROADCAST_ID_TAG = ",\"id\":\""

CHAT_SUFFIX = "/chatapi/v1/chatnow"

# classes defining structure of JSON responses from Periscope to queries for broadcast data

class BroadcastResponse
    JSON.mapping({
        id: String,
        state: String,
        broadcast_source: String,
        username: String
    })
end

class BroadcastDataResponse
    JSON.mapping({
        chat_token: String,
        broadcast: { type: BroadcastResponse, nilable: false }
    })
end

class ChatAccessResponse
    JSON.mapping({
        access_token: String,
        endpoint: String
    })
end

# method to get data from Periscope via HTTP request
#
def get_periscope_data(url : String)
    response = HTTP::Client.get(url)
    if response.status_code == 200
        retval = response.body
    else
        retval = "Eror on #{url} .. We got an error of #{response.status_code}"
        puts retval
    end
    return retval
end

# method to extract the most recent broadcast ID from the plain HTML (non-react) Periscope response
#
def extract_broadcast_id(response_data)
    start_of_video_tag = response_data.index(VIDEO_TAG)
    return nil if !start_of_video_tag

    start_of_id = start_of_video_tag + VIDEO_TAG.size
    end_of_id = response_data.index("&", start_of_video_tag)
    return nil if !end_of_id

    id_string = response_data[start_of_id, end_of_id - start_of_id]
    return id_string
end

# method to extract the user ID from the HTML of the react-based Periscope response
#
def extract_user_id(user, response_data)
    actual_user_tag = USER_TAG.gsub("replace_this", user)
    start_of_user_tag = response_data.index(actual_user_tag);
    return nil if !start_of_user_tag

    start_of_id = start_of_user_tag + actual_user_tag.size
    return nil if !start_of_id
    end_of_id = response_data.index('&', start_of_id)
    return nil if !end_of_id
    id_string = response_data[start_of_id, end_of_id - start_of_id]
    return id_string
end

# method to extract the session ID from the HTML of the react-based Periscope response
#
def extract_session_id(response_data)
    start_of_session_tag = response_data.index(SESSION_TAG);
    return nil if !start_of_session_tag

    start_of_id = start_of_session_tag + SESSION_TAG.size
    return nil if !start_of_id
    end_of_id = response_data.index('&', start_of_id)
    return nil if !end_of_id
    id_string = response_data[start_of_id, end_of_id - start_of_id]
    return id_string
end

# method to extract the most recent broadcast ID from API request for a user's broadcasts
#
def extract_most_recent_broadcast_id(response_data)
    start_of_id_tag = response_data.index(BROADCAST_ID_TAG)
    return nil if !start_of_id_tag

    start_of_id = start_of_id_tag + BROADCAST_ID_TAG.size
    return nil if !start_of_id
    end_of_id = response_data.index("\"", start_of_id)
    return nil if !end_of_id

    id_string = response_data[start_of_id, end_of_id - start_of_id]
    return id_string
end

# method to extract the chat token from the response containing data about most recent broadcast (returns "REPLAY" if the broadcast is not live)
#
def extract_chat_url_access_token(response_data)
    bd = BroadcastDataResponse.from_json(response_data)
    b = bd.broadcast
    if b.state == "RUNNING"
        return bd.chat_token
    else
        return "REPLAY"
    end
end

# method to extract the Periscope chat endpoint URL the response to the chat info query
#
def extract_chat_endpoint(response_data) : String
    e = ChatAccessResponse.from_json(response_data)
    https_location = e.endpoint.index("https")
    if https_location
        the_endpoint = e.endpoint.gsub("https", "wss")
    else
        the_endpoint = e.endpoint.gsub("https", "ws")
    end
    puts "Chat endpoint: " + the_endpoint
    return the_endpoint + CHAT_SUFFIX
end

# method to extract the Periscope chat endpoint URL and the chat access token from the response to the chat info query
#
def extract_chat_access_token(response_data) : String
    e = ChatAccessResponse.from_json(response_data)
    puts "Access token: " + e.access_token

    return e.access_token
end

# method to run a thread for receiving chat messages on the socket connected to the Periscope chat server (this method is 'spawn'ed)
#
def socket_runner(the_socket : HTTP::WebSocket)
    the_socket.run
end

# method to perform all the necessary periscope queries to get the live chat info of user's broadcast
#
def get_periscope_chat_connection(user : String)
    user_data_response = get_periscope_data(PERISCOPE_URL + user)
    return {"error", "Querying server for user data", "", ""} if user_data_response.size <= 0
    broadcast_id = extract_broadcast_id(user_data_response)
    if !broadcast_id
        puts "New style periscope HTML response"
        user_id = extract_user_id(user, user_data_response)
        return {"error", "Extracting User ID", "", ""} if !user_id
        session_id = extract_session_id(user_data_response)
        return {"error", "Extracting Session ID", "", ""} if !session_id

        s1 = PERISCOPE_USER_BROADCAST_LIST_URL.gsub("replace_with_user_id", user_id);
        user_broadcast_list_url = s1.gsub("replace_with_session_id", session_id);
        
        list_data_response = get_periscope_data(user_broadcast_list_url)
        return {"error", "Error receiving broadcast list response", "", ""} if list_data_response.size <= 0
        broadcast_id = extract_most_recent_broadcast_id(list_data_response)
        #puts "List data response:"
        #puts list_data_response
    else
        puts "Old style periscope HTML response"
    end

    return {"error", "Extracting broadcast ID", "", ""} if !broadcast_id

    puts "Got a broadcast ID of #{broadcast_id}"

    broadcast_data_response = get_periscope_data(PERISCOPE_BROADCAST_INFO_URL + broadcast_id)
    return {"error", "Querying server for broadcast data", "", ""} if (broadcast_data_response.size <= 0)
    chat_url_access_token = extract_chat_url_access_token(broadcast_data_response)
    return {"error", "Extracting chat URL access token", "", ""} if !chat_url_access_token

    return {"error", "Broadcast is not live", "", ""} if chat_url_access_token == "REPLAY"

    chat_endpoint_url_data_response = get_periscope_data(PERISCOPE_CHAT_ACCESS_URL + chat_url_access_token)
    return {"error", "Querying server for endpoint URL and token", "", ""} if chat_endpoint_url_data_response.size <= 0

    chat_endpoint = extract_chat_endpoint(chat_endpoint_url_data_response)
    chat_access_token = extract_chat_access_token(chat_endpoint_url_data_response)
    return {"success", broadcast_id, chat_endpoint, chat_access_token}

end



class PeriscopeLiveChat

    # instance variables.. what we need to remember about the chat connection to periscope

    @user : String
    @broadcast_id : String
    @periscope_socket : HTTP::WebSocket
    @message_count = 0
    
    # class init method to connect to (and exchange registration and auhorization info with) a Periscope chat server
    #
    def initialize(user : String, broadcast_id : String, chat_endpoint : String, chat_access_token : String)
        @user = user
        @broadcast_id = broadcast_id
        @periscope_socket = HTTP::WebSocket.new(chat_endpoint)

        puts "Secure web-socket connected to Periscope chat server at URL given above"
        puts " .. sending handshake auth and join messages"
        join_message = "{\"kind\":2,\"payload\":\"{\\\"kind\\\":1,\\\"body\\\":\\\"{\\\\\\\"room\\\\\\\":\\\\\\\"replace_this\\\\\\\"}\\\"}\"}"
        auth_message = "{\"kind\":3,\"payload\":\"{\\\"access_token\\\":\\\"replace_this\\\"}\"}"
        join_message = join_message.gsub("replace_this", broadcast_id)
        auth_message = auth_message.gsub("replace_this", chat_access_token)
        @periscope_socket.send(auth_message)
        @periscope_socket.send(join_message)
        puts "sent the auth and join messages"

        @periscope_socket.on_message do |message|
            @listening_socket.try do |l|
                l.send(message)
                @message_count += 1
                if @message_count >= 10
                    puts "10 more messages sent to the client"
                    @message_count = 0
                end
            end
        end

        @periscope_socket.on_close do
            puts "Socket got closed!"
            @listening_socket.try do |l|
                l.close if @listening_socket
            end
        end
        spawn socket_runner(@periscope_socket)
    end

 
    # add a listening socket to be used to send messages to web clients
    def add_web_client_listener(socket : HTTP::WebSocket)
        @listening_socket = socket
        puts "added a listening socket #{socket}"
    end

end

