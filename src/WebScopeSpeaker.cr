require "kemal"
require "./WebScopeSpeaker/*"

module WebScopeSpeaker

get "/" do
  render "views/index.ecr"
end

Kemal.run
end
