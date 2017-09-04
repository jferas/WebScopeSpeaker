
require "json"

# Utilities to get and parse Periscope broadcast and chat info

PERISCOPE_URL = "https://www.periscope.tv/"
PERISCOPE_BROADCAST_INFO_URL = "https://api.periscope.tv/api/v2/accessVideoPublic?broadcast_id="
PERISCOPE_CHAT_ACCESS_URL = "https://api.periscope.tv/api/v2/accessChatPublic?chat_token="

JSON_TAG_BROADCAST = "broadcast";
JSON_TAG_VIDEO_STATE = "state";
JSON_TAG_BROADCAST_SOURCE = "broadcast_source";
JSON_TAG_USERNAME = "username";
JSON_TAG_URL_CHAT_TOKEN = "chat_token";
JSON_TAG_CHAT_ACCESS_TOKEN = "access_token";
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
    if start_of_video_tag
        start_of_id = start_of_video_tag + VIDEO_TAG.size
        end_of_id = response_data.index("&", start_of_video_tag)
        if end_of_id
            id_string = response_data[start_of_id, end_of_id - start_of_id]
        else
            return nil
        end
        return(id_string);
    else
        return nil
    end
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
    return {e.endpoint + CHAT_SUFFIX, e.access_token}
end

# method to perform all the necessary periscope queries to get the live chat info of user's broadcast
#
def get_chat_endpoint_info(user)
    s = get_periscope_data("http://www.google.com")
    user_data_response = get_periscope_data(PERISCOPE_URL + user)
    return {"error", "Querying server for user data"} if user_data_response.size <= 0
    broadcast_id = extract_broadcast_id(user_data_response)
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
    return chat_endpoint_info
end

