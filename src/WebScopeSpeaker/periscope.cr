

        PERISCOPE_URL = "https://www.periscope.tv/"
        PERISCOPE_BROADCAST_INFO_URL = "https://api.periscope.tv/api/v2/accessVideoPublic?broadcast_id="
        PERISCOPE_CHAT_ACCESS_URL = "https://api.periscope.tv/api/v2/accessChatPublic?chat_token="

        # method to get data from Periscope
        #
        private def get_periscope_data(url : String)
            response = HTTP::Client.get(url)
            if response.status_code == 200
                puts "We got a response of #{response.body}"
                retval = response.body
            else
                retval = "Eror on #{url} .. We got an error of #{response.status_code}"
                puts retval
            end
            return retval
        end

        private def extract_broadcast_id(response_data)
            return "The broadcast id"
        end

        private def extract_chat_url_access_token(response_data)
            return "The chat url access token"
        end

        private def extract_chat_endpoint_info(response_data)
            return "The chat endpoint info"
        end

        # method to perform all the necessary periscope queries to get the live chat info of user's broadcast
        #
        # TODO: chat_end_point_info should be an object containing endpoint url and access toke
        #
        def get_chat_endpoint_info(user)
            s = get_periscope_data("http://www.google.com")
            user_data_response = get_periscope_data(PERISCOPE_URL + user)
            if user_data_response.size > 0
                broadcast_id = extract_broadcast_id(user_data_response)
                if broadcast_id.size > 0
                    puts "Got a broadcast ID of #{broadcast_id}"
                    broadcast_data_response = get_periscope_data(PERISCOPE_BROADCAST_INFO_URL + broadcast_id)
                    if (broadcast_data_response.size > 0)
                        chat_url_access_token = extract_chat_url_access_token(broadcast_data_response)
                        if chat_url_access_token.size > 0
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

