// ScopeSpeaker React/Web client

// import React UI menu and settings pane components

import { slide as Menu } from 'react-burger-menu';

import Toggle from 'react-toggle';

// global used by speech (non-react) sections of code

var current_language = "UK English Male";
var messages = [];
var speaking = false;
var websocket = null;
var chat_endpoint_url = null;
var chat_access_token = null;
var broadcast_id = null;
var queued_message_being_said = "";
var dropping_messages = false;
var known_bots = [];
var bot_words = [];
var name_length = 10;
var saying_emojis = true;
var saying_translations = true;
var said_word = "said";
var translated_word = "translated";
var saying_left_messages = false;
var saying_join_messages = false;
var displaying_messages = true;
var saying_display_names = false;
var high_water_mark = 10;
var low_water_mark = 5;
var detect_length = 120;
var default_language = "en";

var help_msg1 = "Enter the username of a Periscope user currently live broadcasting and tap the 'Say..' button to start ScopeSpeaker listening for the broadcast chat messages.";
var help_msg2 = "While ScopeSpeaker is running, it is continuously listening to the chat messages of the Periscope stream, saying them aloud and translating them if necessary.";
var help_msg3 = "Disclaimer: ScopeSpeaker is a free app, and is provided 'as is'. No guarantee is made related to the consistency of the app performance with your goals and expectations.";

// callback function to allow chat message processing to statefully set the message displayed via 'react'

var setMessage = null;

// running chat log of messages

var chat_log = "";

// styling of the Burger menu
var menu_styles = {
  bmBurgerButton: {
    position: 'fixed',
    width: '36px',
    height: '30px',
    right: '20px',
    top: '36px'
  },
  bmBurgerBars: {
    background: '#373a47'
  },
  bmCrossButton: {
    height: '24px',
    width: '24px'
  },
  bmCross: {
    background: '#bdc3c7'
  },
  bmMenu: {
    background: '#373a47',
    padding: '2.5em 1.5em 0',
    fontSize: '1.15em'
  },
  bmMorphShape: {
    fill: '#373a47'
  },
  bmItemList: {
    color: '#b8b7ad',
    padding: '0.8em'
  },
  bmOverlay: {
    background: 'rgba(0, 0, 0, 0.3)'
  }
};

// method to append message to running log of chat messages
//
var append_to_chat_log = function (msg) {
  console.log("chat log: " + msg);
  chat_log = msg + "\n" + chat_log;
};

// React Class to manage the user interface
//
var WebScopeSpeaker = React.createClass({
  displayName: 'WebScopeSpeaker',

  //class WebScopeSpeaker extends React.Component {


  getInitialState: function () {
    return {
      message: "",
      help_msg1: help_msg1,
      help_msg2: help_msg2,
      help_msg3: help_msg3,
      translation_info: "",
      menu_open_state: false,
      page_showing: "message",
      saying_emojis: true,
      diplaying_messages: true,
      saying_left_messages: false,
      saying_join_messages: false
    };
  },

  componentDidMount: function () {
    this.sendable = true;
    this.user = localStorage.getItem('user') || "";
    this.refs.user.value = this.user;
    append_to_chat_log("in did mount, user is:" + this.user);
  },

  componentWillMount() {
    var _this = this;

    setMessage = function (the_message, translation_info) {
      console.log("in setMessage:" + the_message);
      _this.setState({ help_msg1: "" });
      _this.setState({ help_msg2: "" });
      _this.setState({ help_msg3: "" });
      if (displaying_messages) {
        _this.setState({ message: the_message });
        _this.setState({ translation_info: translation_info });
      } else {
        _this.setState({ message: "" });
        _this.setState({ translation_info: "" });
      }
    };
  },

  menu: function () {
    return React.createElement(
      Menu,
      { isOpen: this.state.menu_open_state, styles: menu_styles, right: true },
      React.createElement(
        'button',
        { onClick: this.changeVoice, className: 'col-6 abutton', href: '/about' },
        'Change Voice'
      ),
      React.createElement(
        'button',
        { onClick: this.doSettings, className: 'col-6 abutton', href: '/contact' },
        'Settings'
      ),
      React.createElement(
        'button',
        { onClick: this.showHelp, className: 'col-6 abutton', href: '' },
        'Help'
      )
    );
  },

  header: function () {
    return React.createElement(
      'div',
      null,
      React.createElement(
        'div',
        { className: 'header' },
        React.createElement(
          'h1',
          null,
          'ScopeSpeaker'
        )
      )
    );
  },

  topOfPage: function () {
    return React.createElement(
      'div',
      null,
      this.menu(),
      this.header()
    );
  },

  link_html: function () {
    var translated = this.state.translation_info;
    var yandex_url = "http://translate.yandex.com";

    if (translated != null && translated.length > 0) {
      return React.createElement(
        'div',
        { className: 'col-12' },
        React.createElement('br', null),
        React.createElement('br', null),
        '(',
        translated,
        ') Translation powered by ',
        React.createElement(
          'a',
          { href: yandex_url },
          ' Yandex.Translate'
        )
      );
    } else {
      return null;
    }
  },

  messagePage: function () {
    if (this.state.page_showing == "message") {
      return React.createElement(
        'div',
        null,
        React.createElement(
          'div',
          { className: 'row' },
          React.createElement(
            'button',
            { className: 'col-2 abutton', onClick: this.getUserData },
            'Say Chat of'
          ),
          React.createElement('input', { type: 'text', className: 'col-8 user_input', autofocus: 'true',
            placeholder: 'Periscope user name...', ref: 'user', onKeyUp: this.getUserDataWithEnter })
        ),
        React.createElement(
          'div',
          { className: 'row sctogglerow' },
          React.createElement(
            'span',
            { className: 'sctoggle' },
            React.createElement(
              'div',
              { className: 'toggle-label', htmlFor: 'join_toggle' },
              'Join Msgs'
            ),
            React.createElement(Toggle, {
              id: 'join_toggle',
              defaultChecked: saying_join_messages,
              onChange: this.sayingJoinMessagesChange })
          ),
          React.createElement(
            'span',
            { className: 'sctoggle' },
            React.createElement(
              'div',
              { className: 'toggle-label', htmlFor: 'display_toggle' },
              'Text Display'
            ),
            React.createElement(Toggle, {
              id: 'display_toggle',
              defaultChecked: displaying_messages,
              onChange: this.displayingMessagesChange })
          ),
          React.createElement(
            'span',
            { className: 'sctoggle' },
            React.createElement(
              'div',
              { className: 'toggle-label', htmlFor: 'emojis_toggle' },
              'Show Emojis'
            ),
            React.createElement(Toggle, {
              id: 'emojis_toggle',
              defaultChecked: saying_emojis,
              onChange: this.sayingEmojiChange })
          ),
          React.createElement(
            'span',
            { className: 'sctoggle' },
            React.createElement(
              'div',
              { className: 'toggle-label', htmlFor: 'left_toggle' },
              'Left Msgs'
            ),
            React.createElement(Toggle, {
              id: 'left_toggle',
              defaultChecked: saying_left_messages,
              onChange: this.sayingLeftMessagesChange })
          )
        ),
        React.createElement('hr', null),
        this.helpMessages(),
        React.createElement(
          'div',
          { className: 'row' },
          React.createElement(
            'div',
            { className: 'col-12' },
            this.state.message
          )
        ),
        this.link_html()
      );
    } else {
      return null;
    }
  },

  helpMessages: function () {
    if (this.state.help_msg1.length > 0) {
      return React.createElement(
        'div',
        { className: 'row col-12' },
        this.state.help_msg1,
        React.createElement('br', null),
        React.createElement('br', null),
        this.state.help_msg2,
        React.createElement('br', null),
        React.createElement('br', null),
        this.state.help_msg3
      );
    } else {
      return null;
    }
  },

  settingsPage: function () {
    if (this.state.page_showing == "settings") {
      return React.createElement(
        'div',
        null,
        React.createElement(
          'div',
          null,
          'This will be a settings page with sliders on it'
        ),
        React.createElement(
          'button',
          { className: 'col-2 abutton', onClick: this.backToMessagePage },
          'Back to Messages'
        )
      );
    } else {
      return null;
    }
  },

  render: function () {
    return React.createElement(
      'div',
      null,
      this.topOfPage(),
      this.messagePage(),
      this.settingsPage()
    );
  },

  changeVoice: function () {
    this.setState({ menu_open_state: false });
  },

  doSettings: function () {
    this.setState({ menu_open_state: false });
    this.setState({ page_showing: "settings" });
  },

  backToMessagePage: function () {
    this.setState({ page_showing: "message" });
  },

  showHelp: function () {
    this.setState({ page_showing: "message" });
    this.setState({ message: "" });
    this.setState({ help_msg1: help_msg1 });
    this.setState({ help_msg2: help_msg2 });
    this.setState({ help_msg3: help_msg3 });
    this.setState({ menu_open_state: false });
  },

  sayingJoinMessagesChange: function (e) {
    saying_join_messages = e.target.checked;
    this.state.saying_join_messages = saying_join_messages;
  },

  sayingLeftMessagesChange: function (e) {
    saying_left_messages = e.target.checked;
    this.state.saying_left_messages = saying_left_messages;
  },

  sayingEmojiChange: function (e) {
    saying_emojis = e.target.checked;
    this.state.saying_emojis = saying_emojis;
  },

  displayingMessagesChange: function (e) {
    displaying_messages = e.target.checked;
    this.state.displaying_messages = displaying_messages;
  },

  getUserData: function () {
    append_to_chat_log("about to ask for user info");
    localStorage.setItem('user', this.refs.user.value);
    queue_message_to_say("Looking for a Periscope live stream by " + this.refs.user.value);
    axios.get(window.location.href + "chatinfo/" + this.refs.user.value).then(function (response) {
      append_to_chat_log("response data is: " + response.data);
      if (response.data[0] == "error") {
        queue_message_to_say("An error occurred, the problem is: " + response.data[1]);
        queue_message_to_say("Chat messages will not begin");
      } else {
        broadcast_id = response.data[1];
        append_to_chat_log("Got a broadcast ID of: " + broadcast_id);
        queue_message_to_say("Got a good response from the periscope server about " + localStorage.getItem('user'));
        queue_message_to_say("Chat messages will now begin");
        openChatWebsocket();
      }
    }).catch(function (err) {
      append_to_chat_log("An error occured: " + err);
      queue_message_to_say("An error occuored: " + err);
    });
  },

  getUserDataWithEnter: function (e) {
    if (e.keyCode == 13) {
      this.getUserData();
    }
  }

});

// log app startup, and do inital invocation of render method to initially display the user interface
//
append_to_chat_log("Scopespeaker debug/run log:\n");

ReactDOM.render(React.createElement(WebScopeSpeaker, null), document.getElementById('webscopespeaker'));

// method to open a chat websocket with the periscope chat server, given URL and access token
//
var openChatWebsocket = function () {
  var chat_url = window.location.href.replace("http", "ws") + "chat";
  websocket = new WebSocket(chat_url);
  websocket.onopen = function (evt) {
    onOpen(evt);
  };
  websocket.onclose = function (evt) {
    onClose(evt);
  };
  websocket.onmessage = function (evt) {
    onMessage(evt);
  };
  websocket.onerror = function (evt) {
    onError(evt);
  };
};

// method invoked when chat websocket is opened, sends handshake of join message and auth message
//
var onOpen = function (evt) {
  append_to_chat_log("\nSecure web-socket connected to ScopeSpeaker proxy server");
  var join_message = {};
  join_message["room"] = broadcast_id;
  doSend(JSON.stringify(join_message));
};

// method invoked when chat websocket is closed
//
var onClose = function (evt) {
  append_to_chat_log("Web-socket disconnected");
};

// method invoked when chat websocket receives a message, parse message and say it
//
var onMessage = function (evt) {
  var message_to_say = extractChatMessage(evt.data);
  if (message_to_say != null) {
    var msg_fields = message_to_say.split(":");
    var language_tag = msg_fields[0];
    var who_said_it = msg_fields[1];
    msg_fields.shift();
    msg_fields.shift();
    var what_was_said = msg_fields.join(" ");
    if (what_was_said == "left" && !saying_left_messages) {
      return;
    }
    if (what_was_said == "joined" && !saying_join_messages) {
      return;
    }
    var to_be_said = language_tag + ":" + who_said_it + ":" + what_was_said;
    queue_message_to_say(to_be_said);
  }
};

// method invoked when chat websocket has an error
//
var onError = function (evt) {
  append_to_chat_log("Error:" + evt.data);
};

// method to send a message on the websocket to the Periscope chat server
//
var doSend = function (message) {
  append_to_chat_log("SENT: " + message);
  websocket.send(message);
};

// method to extract information from the incoming Periscope chat message
var extractChatMessage = function (chat_msg) {
  var who_said_it = "";
  var what_they_said = "";
  try {
    var chat_message = JSON.parse(chat_msg);
    var kind = chat_message.kind;
    var payload_string = chat_message.payload;
    var payload = JSON.parse(payload_string);
    if (kind == 1) {
      try {
        var body_string = payload.body;
        var outer_body = JSON.parse(body_string);
        if (outer_body.body == null) {
          return;
        }
        what_they_said = outer_body.body;
        var sender = payload.sender;
        if (sender.display_name == null) {
          return;
        }
        var language_array = sender.lang;
        var chat_message_language = language_array[0];
        var display_name = sender.display_name;
        var user_name = sender.username;
        if (saying_display_names) {
          who_said_it = display_name;
        } else {
          who_said_it = user_name;
        }
        var language_tag = "";
        if (language_array.length > 1) {
          language_tag = "?M";
        }
        if (language_tag.length == 0 && what_they_said.length > detect_length) {
          language_tag = "?L";
        }
        language_tag += chat_message_language;
        if (what_they_said == "joined") {
          return null;
        }
        if (known_bots.indexOf(user_name) >= 0) {
          return null;
        }
        if (bot_words.indexOf(what_they_said) >= 0) {
          known_bots.push(user_name);
          return null;
        }
      } catch (err) {
        append_to_chat_log("Inner Payload parse error: " + err);
        append_to_chat_log("Message: " + err.message);
        websocket.close();
        return null;
      }
    } else if (kind == 2) {
      var payload_kind = payload.kind;
      var sender = payload.sender;
      var message_for_chatlog = "";
      if (payload_kind == 1) {
        message_for_chatlog = sender.username + "joined";
        if (saying_join_messages) {
          queue_message_to_say(message_for_chatlog);
        } else {
          append_to_chat_log(message_for_chatlog);
        }
        return null;
      } else if (payload_kind == 2) {
        message_for_chatlog = sender.username + "left";
        if (saying_left_messages) {
          queue_message_to_say(message_for_chatlog);
        } else {
          append_to_chat_log(message_for_chatlog);
        }
        return null;
      }
    }
  } catch (err) {
    append_to_chat_log("Payload parse error: " + err);
    append_to_chat_log("Message: " + err.message);
    queue_priority_message_to_say("Chat message payload parse error");
    websocket.close();
    return null;
  }

  if (who_said_it.length == 0 || what_they_said.length == 0) {
    return null;
  }
  return language_tag + ":" + who_said_it + ":" + what_they_said;
};

// callback method when speech begins
//
var start_callback = function () {};

// callback method when speech ends - say next message if present
//
var stop_callback = function () {
  speaking = false;
  if (messages.length > 0) {
    schedule_say_next(50);
  }
};

// method to set up a scheduled call to say_next within a given number of milliseconds
//
var schedule_say_next = function (t) {
  setTimeout(say_next, t);
};

// method to put a priority message to be said at the front of the queue
//
var queue_priority_message_to_say = function (m) {
  messages.unshift(m);
  if (!speaking) {
    say_next();
  }
};

// method to queue a message to be said
//
var queue_message_to_say = function (m) {
  if (dropping_messages) {
    return;
  }
  messages.push(m);
  var queue_size = messages.length;
  if (queue_size == high_water_mark) {
    the_message = "Scope Speaker un-said queue has " + high_water_mark + " messages, new messages won't be said till queue is down to " + low_water_mark;
    messages.unshift(the_message);
    append_to_chat_log(the_message);
    dropping_messages = true;
  }
  if (!speaking) {
    say_next();
  }
};

// method to de-queue and say the next message in the queue
//
var say_next = function () {
  var who_said_it = "";
  var what_was_said = "";

  if (speaking) {
    append_to_chat_log("exit say_next because speech in progress");
    return;
  }

  if (messages.length == 0) {
    append_to_chat_log("exit say_next because no messages");
    return;
  }

  // TODO: add some logic here about current voice when we get access to alternate voices

  speaking = true;
  var speak_string = messages.shift();
  if (dropping_messages && messages.length == low_water_mark) {
    // we're crossing back to the low water mark, allow saying new messages, announce we're doing so, and put msg back in queue
    dropping_messages = false;
    messages.unshift(speak_string);
    speak_string = "Scope Speaker has recovered the un-said message queue down to " + lowWaterMark + ", new messages will resume being said";
    append_to_chat_log(speak_string);
  }
  var message_processed = false;
  queued_message_being_said = speak_string;
  var colon_location = speak_string.indexOf(":");
  var question_mark_location = speak_string.indexOf("?");
  if (question_mark_location == 0 || colon_location > 0 && colon_location < 6) {
    var msg_fields = speak_string.split(":");
    var language_tag = msg_fields[0];
    who_said_it = msg_fields[1];
    what_was_said = msg_fields[2];
    if (saying_translations && language_tag != default_language) {
      var translation_command = language_tag + "-" + default_language;
      append_to_chat_log(who_said_it + " said before translation(" + translation_command + "): " + what_was_said);
      send_translation_request(who_said_it, what_was_said, translation_command);
    } else {
      sayIt(who_said_it, said_word, what_was_said, "");
    }
    message_processed = true;
  }

  // message not processed above means it isn't from someone, but is informative from app
  if (!message_processed) {
    append_to_chat_log(speak_string);
    sayIt("", "", speak_string, "");
  }
};

// function to speak text
//
var sayIt = function (who, announce_word, message_to_say, translation_info) {
  var speak_string;
  var sayer;
  var announce_phrase = announce_word + ": ";

  if (announce_word.length == 0) {
    announce_phrase = "";
  }

  if (message_to_say != null && !saying_emojis) {
    speak_string = removeEmoji(message_to_say);
  } else {
    speak_string = message_to_say;
  }
  if (who.length != 0 && !saying_emojis) {
    sayer = removeEmoji(who);
  } else {
    sayer = who;
  }
  if (name_length == 0 || sayer.length == 0) {
    setMessage(speak_string, null);
    responsiveVoice.speak(speak_string, current_language, { onstart: start_callback, onend: stop_callback });
  } else {
    setMessage(who + " " + announce_word + ": " + speak_string, translation_info);
    var shortend_who = who.substring(0, Math.min(who.length, name_length));
    responsiveVoice.speak(shortend_who + " " + announce_word + ": " + speak_string, current_language, { onstart: start_callback, onend: stop_callback });
  }
};

// function to send a translation request to Yandex language translation service
//
var send_translation_request = function (who_said_it, text_to_be_translated, language_pair) {
  var jsonString;
  var translation_command;

  if (language_pair.indexOf("?") == 0) {
    translation_command = language_pair.split("-")[1];
  } else {
    translation_command = language_pair;
  }
  var yandexKey = "trnsl.1.1.20170707T040715Z.91d8bbf749039bd6.313fa4324e6371e9ae58a30e2a4f93b47dca1ca2";
  var yandexUrl = "https://translate.yandex.net/api/v1.5/tr.json/translate?key=" + yandexKey + "&text=" + encodeURI(text_to_be_translated) + "&lang=" + translation_command;
  append_to_chat_log("Yandex URL: " + yandexUrl);
  axios.get(yandexUrl).then(function (response) {
    var result_string = response.data.text;

    append_to_chat_log("got translation text: " + result_string);
    say_translated_text(who_said_it, result_string, language_pair);
  }).catch(function (err) {
    append_to_chat_log("An error occured: " + err);
    queue_message_to_say("An error occured: " + err);
  });
};

// function to say text that has been translated
//
var say_translated_text = function (who_said_it, what_was_said, translation_info) {
  append_to_chat_log("After translation: " + what_was_said);
  if (what_was_said == "joined" || what_was_said == "Joined" || what_was_said == "Participation" || what_was_said == "has joined") {
    speaking = false;
    queued_message_being_said = null;
    say_next();
    return;
  }
  var announce_word = translated_word;

  if (translation_info.indexOf("?L") >= 0) {
    var source_language = translation_info.split("-")[0].split("L")[1];
    if (source_language == defaultLanguage) {
      announce_word = said_word;
    }
  }
  sayIt(who_said_it, announce_word, what_was_said, translation_info);
};

// function to remove emoji from a given string
//
var removeEmoji = function (s) {
  return s.replace(/([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/g, '');
};

