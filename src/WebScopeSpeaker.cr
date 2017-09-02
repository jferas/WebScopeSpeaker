require "kemal"
require "crustache"
require "./WebScopeSpeaker/version"
require "./WebScopeSpeaker/periscope"

module Webscopespeaker

    # Serve the web page
    get "/" do
        render "views/index.ecr"
    end

    # Serve the response to get live chat room info about a user
    #
    get "/chatinfo/:user" do |env|
        user = env.params.url["user"]
        get_chat_endpoint_info(user).to_json
    end

    Kemal.run

end
