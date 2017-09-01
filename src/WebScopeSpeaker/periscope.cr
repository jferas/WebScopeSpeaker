
require "json"

# methods to get and parse Periscope info

PERISCOPE_URL = "https://www.periscope.tv/"
PERISCOPE_BROADCAST_INFO_URL = "https://api.periscope.tv/api/v2/accessVideoPublic?broadcast_id="
PERISCOPE_CHAT_ACCESS_URL = "https://api.periscope.tv/api/v2/accessChatPublic?chat_token="

JSON_TAG_BROADCAST = "broadcast";
JSON_TAG_VIDEO_STATE = "state";
JSON_TAG_BROADCAST_SOURCE = "broadcast_source";
JSON_TAG_USERNAME = "username";
JSON_TAG_URL_CHAT_TOKEN = "chat_token";

VIDEO_TAG = "https://www.pscp.tv/w/"

class Broadcast
  JSON.mapping({
    state: String,
    broadcast_source: String,
    username: String
  })
end

class BroadcastData
  JSON.mapping({
    chat_token: String,
    broadcast: { type: Broadcast, nilable: false }
  })
end


# method to get data from Periscope
#
def get_periscope_data(url : String)
  response = HTTP::Client.get(url)
  if response.status_code == 200
    puts "We got a good response"
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
  bd = BroadcastData.from_json(response_data)
  b = bd.broadcast

  puts "BroadcastData:"
  p bd

  puts "Broadcast:"
  p b

  puts "State:" + b.state
  puts "Username:" + b.username
  puts "Broadcast Source:" + b.broadcast_source
  puts "Chat Token:" + bd.chat_token
  if b.state == "RUNNING"
    return bd.chat_token
  else
    return "NOT RUNNING"
  end
end

private def extract_chat_endpoint_info(response_data)
    return "The chat endpoint info"
end

# method to perform all the necessary periscope queries to get the live chat info of user's broadcast
#
# TODO: chat_end_point_info should be an object containing endpoint url and access token
#
def get_chat_endpoint_info(user)
  s = get_periscope_data("http://www.google.com")
  user_data_response = get_periscope_data(PERISCOPE_URL + user)
  if user_data_response.size > 0
    broadcast_id = extract_broadcast_id(user_data_response)
    if broadcast_id
      puts "Got a broadcast ID of #{broadcast_id}"
      broadcast_data_response = get_periscope_data(PERISCOPE_BROADCAST_INFO_URL + broadcast_id)
      if (broadcast_data_response.size > 0)
        chat_url_access_token = extract_chat_url_access_token(broadcast_data_response)
        if chat_url_access_token
          puts "Got a chat_url_access_token of #{chat_url_access_token}"
          chat_endpoint_url_data_response = get_periscope_data(PERISCOPE_CHAT_ACCESS_URL + chat_url_access_token)
          if chat_endpoint_url_data_response.size > 0
            chat_endpoint_info = extract_chat_endpoint_info(chat_endpoint_url_data_response)
            puts "Got chat_endpoint_info of #{chat_endpoint_info}"
          else
            chat_endpoint_info = "Error querying server for endpoint URL and token"
          end
        else
          chat_endpoint_info = "Error extracting chat URL access token"
        end
      else
        chat_endpoint_info = "Error querying server for broadcast data"
      end
    else
        chat_endpoint_info = "Error extracting broadcast ID"
    end
  else
    chat_endpoint_info = "Error query server for user data"
  end
end

