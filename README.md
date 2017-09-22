# WebScopeSpeaker

A Crystal / Kemal web application that communicates with Periscope chat servers via websockets to receive messages and uses the ResponsiveVoice javascript text-to-speech library to speak those messages.

The Crystal/Kemal server acts a proxy between a simple web client in a browser and the Periscope chat server, maintaining a separate browser-to-chat-server mapping for web client.

This is essentially a web app version of the ScopeSpeaker Android app found at https://github.com/jferas/ScopeSpeaker/ and hasbeen a learning experience to learn Crystal and its Kemal web framework.

## Installation

```
git clone https://github.com/jferas/WebScopeSpeaker
cd WebScopeSpeaker && shards install
crystal run src/WebScopeSpeaker.cr
```

## Usage

Go to `http://localhost:3000/` to see it in action.

Enter the name of a Periscope user who is currently broadcasting live, wait for the app to connect to the chat servers, and then listen to the incoming chat messages from the broadcast.

## Development (things still planned to be done)

1. Figure out the exception being thrown on browser websocket closure
2. Figure out the Crystal testing framework and write tests
3. Add in the Yandex web service language translation support implemented in the ScopeSpeaker Android app
4. Cleanup the simple/ugle user interface (replace with react?)

## Contributing

1. Fork it ( https://github.com/jferas/WebScopeSpeaker/fork )
2. Create your feature branch (git checkout -b my-new-feature)
3. Commit your changes (git commit -am 'Add some feature')
4. Push to the branch (git push origin my-new-feature)
5. Create a new Pull Request

## Contributors

- [[jferas]](https://github.com/jferas) John Feras - creator, maintainer
