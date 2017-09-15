
require "json"

# Utilities to get and parse Periscope broadcast and chat info

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

CHAT_SUFFIX = "/chatapi/v1/chatnow"

# classes defining structure of JSON responses from Periscope to our queries

class BroadcastResponse
    JSON.mapping({
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

# method to get data from Periscope
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

def extract_broadcast_id(response_data)
    start_of_video_tag = response_data.index(VIDEO_TAG)
    return nil if !start_of_video_tag

    start_of_id = start_of_video_tag + VIDEO_TAG.size
    end_of_id = response_data.index("&", start_of_video_tag)
    return nil !if end_of_id

    id_string = response_data[start_of_id, end_of_id - start_of_id]
    return id_string
end

def extract_user_id(response_data)
    actual_user_tag = USER_TAG.gsub("replace_this", userName)
    start_of_user_tag = response_data.index(actual_user_tag);
    return nil if !start_of_user_tag

    start_of_id = start_of_user_tag + actual_user_tag.size
    end_of_id = response_data.index('&', start_of_id)
    idString = response_data[start_of_id, end_of_id - start_of_id]
    return id_string
end

def extract_session_id(response_data)
    start_of_session_tag = response_data.index(SESSION_TAG);
    return nil if !start_of_session_tag

    start_of_id = start_of_session_tag + SESSION_TAG.size
    end_of_id = response_data.index('&', start_of_id)
    idString = response_data[start_of_id, end_of_id - start_of_id]
    return id_string
end


def extract_chat_url_access_token(response_data)
    bd = BroadcastDataResponse.from_json(response_data)
    b = bd.broadcast
    if b.state == "RUNNING"
        return bd.chat_token
    else
        return "REPLAY"
    end
end

def extract_chat_endpoint_info(response_data)
    e = ChatAccessResponse.from_json(response_data)
    https_location = e.endpoint.index("https")
    if https_location
        the_endpoint = e.endpoint.gsub("https", "wss")
    else
        the_endpoint = e.endpoint.gsub("https", "ws")
    end

    puts "Chat endpoint: " + the_endpoint
    puts "Access token: " + e.access_token

    return {the_endpoint + CHAT_SUFFIX, e.access_token}
end

# method to perform all the necessary periscope queries to get the live chat info of user's broadcast
#
def get_periscope_chat_connection(user)
    user_data_response = get_periscope_data(PERISCOPE_URL + user)
    return {"error", "Querying server for user data"} if user_data_response.size <= 0
    puts "User data response: " + user_data_response
    broadcast_id = extract_broadcast_id(user_data_response)
    if !broadcast_id
        puts "New style periscope HTML response"
        user_id = extract_user_id(user_data_response)
        return {"error", "Extracting User ID"} if !user_id
        session_id = extract_session_id(user_data_response)
        return {"error", "Extracting Session ID"} if !session_id

        s1 = PERISCOPE_USER_BROADCAST_LIST_URL.gsub("replace_with_user_id", user_id);
        user_broadcast_list_url = s1.gsub("replace_with_session_id", session_id);
        
        list_data_response = get_periscope_data(user_broadcast_list_url)
        return {"error", "Error receiving broadcast list response"} if list_data_response.size <= 0
        
    else
        puts "Old style periscope HTML response"
    end

    return {"error", "Extracting broadcast ID"} if !broadcast_id

    puts "Got a broadcast ID of #{broadcast_id}"

    broadcast_data_response = get_periscope_data(PERISCOPE_BROADCAST_INFO_URL + broadcast_id)
    return {"error", "Querying server for broadcast data"} if (broadcast_data_response.size <= 0)
    chat_url_access_token = extract_chat_url_access_token(broadcast_data_response)
    return {"error", "Extracting chat URL access token"} if !chat_url_access_token

    return {"error", "Broadcast is not live"} if chat_url_access_token == "REPLAY"

    chat_endpoint_url_data_response = get_periscope_data(PERISCOPE_CHAT_ACCESS_URL + chat_url_access_token)
    return {"error", "Querying server for endpoint URL and token"} if chat_endpoint_url_data_response.size <= 0

    chat_endpoint_info = extract_chat_endpoint_info(chat_endpoint_url_data_response)

    # commented out for now

    #socket = connect_to_chat_server(chat_endpoint_info)
    #return {"error", "Unable to connect to chat server"} if !socket

    #puts "Secure web-socket connected to Periscope chat server at URL given above"
    #puts " .. sending handshake auth and join messages"
    #join_message = "{\"kind\":2,\"payload\":\"{\\\"kind\\\":1,\\\"body\\\":\\\"{\\\\\\\"room\\\\\\\":\\\\\\\"replace_this\\\\\\\"}\\\"}\"}";
    #auth_message = "{\"kind\":3,\"payload\":\"{\\\"access_token\\\":\\\"replace_this\\\"}\"}";
    #join_message = join_message.replace("replace_this", broadcast_id);
    #auth_message = auth_message.replace("replace_this", chat_access_token);
    #doSend(auth_message);
    #doSend(join_message);
    
    #end of commented out code */

    return {"success", broadcast_id}
end

