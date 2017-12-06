# WebScopeSpeaker

A ReactJS / Crystal / Kemal web application that communicates with Periscope chat servers via websockets to receive messages and uses the ResponsiveVoice javascript text-to-speech library to speak those messages.

This is essentially a web app version of the ScopeSpeaker Android app found at https://github.com/jferas/ScopeSpeaker/ and has been a learning experience to dig into Crystal and its Kemal web framework, as well as ReactJS.

The Crystal/Kemal server acts a proxy between a simple web client in a browser and the Periscope chat server, maintaining a separate browser-to-chat-server mapping for each web client.

## Prerequisites


For the server side, you'll need to install:

1. The Crystal programming language environment (Easy like ruby, fast like C)
2. The Crystal-base web framework, Kemal.

For the web client side, you'll need to install React and its various components:

1. The 'react' UI library
2. The 'react-dom' library
3. The 'react-burger-menu' library
4. The 'react-toggle-button' library
5. The 'react-select' library
6. The 'babel' JSX compiler

## Installation


```
git clone https://github.com/jferas/WebScopeSpeaker
cd WebScopeSpeaker && shards install
crystal run src/WebScopeSpeaker.cr
```

## Usage

Go to `http://localhost:3000/` to see it in action locally on your development machine.

Enter the name of a Periscope user who is currently broadcasting live, wait for the app to connect to the chat servers, and then listen to the incoming chat messages from the broadcast.

## Development (things still planned to be done)

1. Figure out the Crystal testing framework and write tests

## Contributing

1. Fork it ( https://github.com/jferas/WebScopeSpeaker/fork )
2. Create your feature branch (git checkout -b my-new-feature)
3. Commit your changes (git commit -am 'Add some feature')
4. Push to the branch (git push origin my-new-feature)
5. Create a new Pull Request

## Contributors

- [[jferas]](https://github.com/jferas) John Feras - creator, maintainer
