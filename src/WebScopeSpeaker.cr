require "kemal"
require "crustache"
require "./WebScopeSpeaker/*"

module WebScopeSpeaker

# Serve the web page
get "/" do
  render "views/index.ecr"
end

# Serve the response to get live chat room info about a user
get "/:user" do |env|
  user = env.params.url["user"]
  puts "we have a user of #{user}"
  response = HTTP::Client.get("https://www.periscope.tv/" + user)
  if response.status_code == 200
    puts "We got a response of #{response.body}"
  else
    puts "We got an error of #{response.status_code}"
  end

  "Saw your request for data about #{user}"
end

Kemal.run
end
