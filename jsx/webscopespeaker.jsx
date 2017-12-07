// ScopeSpeaker React/Web client

// import React UI menu and settings pane components

import React from 'react';
import ReactDOM from 'react-dom';

import { slide as Menu } from 'react-burger-menu'

import ToggleButton from 'react-toggle-button'

import Select from 'react-select';

const SAY_MESSAGES  = "Say Chat of";
const STOP_MESSAGES = "Stop Msgs";

// global used by speech (non-react) sections of code

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
var said_word = "said";
var translated_word = "translated";
var default_language = "en";

// variables retained in localStorage

var user_name = "";
var current_voice = "UK English Male";
var saying_left_messages = false;
var saying_join_messages = false;
var saying_emojis = false;
var displaying_messages = false;
var saying_display_names = false;
var saying_translations = false;

// length of name to be said, in characters (keeps long names from taking too long to be said)
var name_length = 10;

// delay (in seconds) after message is spoken before next message is spoken (give broadcaster time to responsd)
var delay_time = 1;

// Number of characters in a message that trigger language auto detection / translation
var detect_length = 50;

// Queue Full / Queue Empty high water / low water marks.. these control when messages will be enqueued or discarded
var high_water_mark = 10;
var low_water_mark = 5;


// help message strings

var help_msgs = [
"Enter the username of a Periscope user currently live broadcasting and tap the 'Say..' button to start ScopeSpeaker listening for the broadcast chat messages.",
"While ScopeSpeaker is running, it is continuously listening to the chat messages of the Periscope stream, saying them aloud and translating them if necessary.",
"Disclaimer: ScopeSpeaker is a free app, and is provided 'as is'. No guarantee is made related to the consistency of the app performance with your goals and expectations.",
"Slide the switches to enable or disable the announcements of users joining or leaving the chats.",
"The 'Text Display' switch will disable chat message text display (to avoid distractions).",
"The 'Saying Emojis' switch will disable the pronouncement of emojis in messages.",
"",
"Settings:",
"",
"The 'Current Voice' selector allows ScopeSpeaker to use a variety of voices and accents.",
"The 'Translations' switch will enable or disable the translation of chat messages.",
"The 'DisplayNames' switch will enable the saying viewers' more human sounding DisplayName instead of their unique UserName.",
"'Name Length' controls the length (in characters) of the chat message sender's name when spoken (0 means the sender name will not be said).",
"'Delay' refers to the delay after any message so the broadcaster can say something uninterrupted.",
"'Detect Length' is the number of characters that will trigger auto detection of language for translations.  Any message shorter than that will assume the sender's language as indicated by Periscope.",
"'Queue Full' and 'Queue Open' values control when messages will stop being said (when the queue is deeper than 'Queue Full') and when they will resume being said (when the queue gets as small as 'Queue Open'"

];

// callback functions to allow chat message processing to statefully set the UI objects displayed via 'react'

var setMessage = null;
var setButtonPrompt = null;

// running chat log of messages

var chat_log = "";

// styling of the Burger menu
let menu_styles = {
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
    background: '#d7d8dd',
    padding: '2.5em 1.5em 0',
    fontSize: '1.15em'
  },
  bmMorphShape: {
    fill: '#d7d8dd'
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
var append_to_chat_log = function(msg) {
  console.log("chat log: " + msg);
  chat_log = msg + "\n" + chat_log;
};

// React Class to render a page header
//
class Header extends React.Component {

  // instantiation of the component
  constructor(props) {
    super(props);

    // initial component state
    this.state = {
      menu_open_state: this.props.menu_open_state
    }
  }

  render() {
    var back_button = null;

    if (this.props.backToMessagePage) {
        back_button = <img className="back_button" src="/images/left_arrow.png" onClick={this.props.backToMessagePage}/>;
    }
    return (
      <div>
        {back_button}
        <div className="header">
          <h3>{this.props.title}</h3>
          <div>{this.props.subtitle}</div>
        </div>
      </div>
    );
  }
}

// React class to render a voice selection component
//
class VoiceSelectComponent extends React.Component {

  // instantiation of the component
  constructor(props) {
    super(props);

    // bind this to UI methods
    this.handleVoiceChange= this.handleVoiceChange.bind(this);
    this.getAvailableVoices = this.getAvailableVoices.bind(this);

    // make a local copy in the select component of the list of voices and the selected voice
    this.state = {
      voicelist: [],
      selectedVoice:{value: this.props.current_voice, label: this.props.current_voice}
    };
  }
  
  // method to do initialization before the component gets rendered
  componentWillMount() {
    // get the list of available voices
    this.setState({voicelist: this.getAvailableVoices()});
  }

  // method to actually render the voice selection object
  render() {
    return (
      <Select
        className="col-10"
        name="voice-name"
        searchable={false}
        value={this.state.selectedVoice}
        options={this.state.voicelist}
        onChange={this.handleVoiceChange}
      />
    );
  }

  // method invoked when the selected voice is changed
  handleVoiceChange(selectedOption) {
    this.setState({selectedVoice: selectedOption });
    current_voice = selectedOption.label;
    localStorage.setItem('current_voice', current_voice);
    append_to_chat_log("The newly selected voice is: " + current_voice);
  }
    
  // method to fetch the available voices from responsive voice API and properly populate options list for select object
  getAvailableVoices() {
    var vl = responsiveVoice.getVoices();
    var voicelist = [];
    for (var i=0; i<vl.length; i++) {
      var entry = {value: vl[i].name, label: vl[i].name};
      voicelist.push(entry);
    }
    return voicelist;
  }

}

// React Class to manage the overall ScopeSpeaker user interface
//
class WebScopeSpeaker extends React.Component {

  // *******************************************************************************
  // ***   these methods of the class are invoked when the class is instantiated ***
  // *******************************************************************************

  // initial react component constructor
  
  constructor(props) {
    super(props);

    // bind 'this' to the methods that are triggered by UI actions
    this.getUserData = this.getUserData.bind(this);
    this.getUserDataWithEnter = this.getUserDataWithEnter.bind(this);
    this.collectUserName = this.collectUserName.bind(this);
    this.doSettings = this.doSettings.bind(this);
    this.showHelp = this.showHelp.bind(this);
    this.nameLengthChange = this.nameLengthChange.bind(this);
    this.delayTimeChange = this.delayTimeChange.bind(this);
    this.detectLengthChange = this.detectLengthChange.bind(this);
    this.highWaterMarkChange = this.highWaterMarkChange.bind(this);
    this.lowWaterMarkChange = this.lowWaterMarkChange.bind(this);
    this.backToMessagePage = this.backToMessagePage.bind(this);
    this.skipMessage = this.skipMessage.bind(this);

    // setup the initial states for rendering
    this.state = { 
      message: help_msgs[0],
      translation_info: "",
      menu_open_state: false,
      page_showing: "message",
      user_name: user_name,
      name_length: name_length,
      delay_time: delay_time,
      detect_length: detect_length,
      high_water_mark: high_water_mark,
      low_water_mark: low_water_mark,
      saying_emojis: saying_emojis,
      displaying_messages: displaying_messages,
      saying_left_messages: saying_left_messages,
      saying_join_messages: saying_join_messages,
      saying_display_names: saying_display_names,
      saying_translations: saying_translations,
      button_prompt: SAY_MESSAGES
      };
  };

  // acquire values for states from local storage just before rendering
  componentDidMount () {
  }

  // after compenent mounts, create function callable from outside React
  componentWillMount() {

    user_name = localStorage.getItem('user') || "";
    current_voice = localStorage.getItem('current_voice') || "UK English Male";

    name_length = localStorage.getItem('name_length') || 10;
    delay_time = localStorage.getItem('delay_time') || 1;
    detect_length = localStorage.getItem('detect_length') || 50;
    high_water_mark = localStorage.getItem('high_water_mark') || 10;
    low_water_mark = localStorage.getItem('low_water_mark') || 5;

    // retrieve settings from localStorage(strings), these will default to true if data not present
    saying_emojis = (localStorage.getItem('saying_emojis') != "false") ? true : false;
    displaying_messages = (localStorage.getItem('displaying_messages') != "false") ? true : false;
    saying_translations = (localStorage.getItem('saying_translations') != "false") ? true : false;

    // retrieve settings from localStorage(strings), these will default to false if data not present
    saying_left_messages = (localStorage.getItem('saying_left_messages') == "true") ? true : false;
    saying_join_messages = (localStorage.getItem('saying_join_messages') == "true") ? true : false;
    saying_display_names = (localStorage.getItem('saying_display_names') == "true") ? true : false;

    this.setState({user_name: user_name});

    this.setState({name_length: name_length});
    this.setState({delay_time: delay_time});
    this.setState({detect_length: detect_length});
    this.setState({high_water_mark: high_water_mark});
    this.setState({low_water_mark: low_water_mark});

    this.setState({saying_emojis: saying_emojis});
    this.setState({displaying_messages: displaying_messages});
    this.setState({saying_left_messages: saying_left_messages});
    this.setState({saying_join_messages: saying_join_messages});
    this.setState({saying_display_names: saying_display_names});
    this.setState({saying_translations: saying_translations});

    // create function callable from outside React to set message
    setMessage = (the_message, translation_info) => {
      console.log("in setMessage:" + the_message);
      if (displaying_messages) {
        this.setState({message: the_message});
        this.setState({translation_info: translation_info});
      }
      else {
        this.setState({message: ""});
        this.setState({translation_info: ""});
      }
    };

    // create function to set button prompt string
    setButtonPrompt = (the_prompt) => {
      this.setState({button_prompt: the_prompt});
    }
  }

  // ************************************************************************************
  // ***   these methods of the class are the creators of the rendered user interface ***
  // ************************************************************************************

  // method to return a link to the yandex translation service if the state indicates that the current message was translated
  link_html() {
    var translated = this.state.translation_info;
    var yandex_url = "http://translate.yandex.com";

    if ( (translated != null) && (translated.length > 0) ) {
      return( 
        <div className="col-12"  >
          <br></br>
          <br></br>
          ({translated}) Translation powered by <a href={yandex_url}> Yandex.Translate</a>
        </div>
      );
    }
    else {
      return null;
    }
  }

  // method to return a render-able group of toggle components
  toggleGroup() {
    return(
      <div className="row sctogglerow">
        <span className="toggle_left">
          <div className="toggle-label" htmlFor="left_toggle">Left Msgs</div>
          <ToggleButton id="left_toggle" value={this.state.saying_left_messages} onToggle={ (value) => {
            saying_left_messages = !value;
            this.setState({ saying_left_messages: saying_left_messages });
            localStorage.setItem('saying_left_messages', saying_left_messages);
            } } />
        </span>
        <span className="toggle_left">
          <div className="toggle-label" htmlFor="join_toggle">Join Msgs</div>
          <ToggleButton id="join_toggle" value={this.state.saying_join_messages} onToggle={ (value) => {
            saying_join_messages = !value;
            this.setState({ saying_join_messages: saying_join_messages });
            localStorage.setItem('saying_join_messages', saying_join_messages);
            } } />
        </span>
        <span className="toggle_right">
          <div className="toggle-label" htmlFor="display_toggle">Text Display</div>
          <ToggleButton id="display_toggle" value={this.state.displaying_messages} onToggle={ (value) => {
            displaying_messages = !value;
            this.setState({ displaying_messages: displaying_messages });
            localStorage.setItem('displaying_messages', displaying_messages);
            } } />
        </span>
        <span className="toggle_right">
          <div className="toggle-label" htmlFor="emojis_toggle">Saying Emojis</div>
          <ToggleButton id="emojis_toggle" value={this.state.saying_emojis} onToggle={ (value) => {
            saying_emojis = !value;
            this.setState({ saying_emojis: saying_emojis });
            localStorage.setItem('saying_emojis', saying_emojis);
            } } />
        </span>
     </div>
    );
}

  // method to return a render-able group for prompting, containing the "Say" button and the text object to contain the periscope user name
  promptGroup() {
    var skip_message_button = null;

    if (this.state.button_prompt == STOP_MESSAGES) {
      skip_message_button = <button className="col-2 abutton" onClick={this.skipMessage}>Skip Msg</button>;
    }
    return(
      <div className="row">
        <button className="col-2 abutton" onClick={this.getUserData}>{this.state.button_prompt}</button>
        <input id="user_name_text" type="text" className="col-6 user_input" autoFocus="true" value={user_name}
             placeholder='Periscope user name...' onChange={this.collectUserName} onKeyUp={this.getUserDataWithEnter} />
        {skip_message_button}
      </div>
    );
  }
 
  // method to return a render-able help page or nothing, depending upon state
  helpPage() {
    if (this.state.page_showing != "help") {
      return(null);
    }

    return(
      <div>
        <Menu isOpen={ this.state.menu_open_state } styles={ menu_styles } right>
          <button onClick={ this.doSettings } className="col-6 abutton" href="/contact">Settings and Voice</button>
          <button onClick={ this.showHelp } className="col-6 abutton" href="">Help</button>
        </Menu>
        <Header title="ScopeSpeaker" subtitle="(Hear Periscope Chat Messages)" backToMessagePage={this.backToMessagePage} />
        <hr></hr>
        <div className="row col-12">
        {
          help_msgs.map( (msg) => {
            return(<span>{msg}<br></br><br></br></span>);
          })
        }
        </div>
      </div>
    );
  }

  // method to return a render-able chat message or nothing, depending upon state
  messagePage() {
    if (this.state.page_showing != "message") {
      return(null);
    }

    return(
      <div>
        <Menu isOpen={ this.state.menu_open_state } styles={ menu_styles } right>
          <button onClick={ this.doSettings } className="col-6 abutton" href="/contact">Settings and Voice</button>
          <button onClick={ this.showHelp } className="col-6 abutton" href="">Help</button>
        </Menu>
        <Header title="ScopeSpeaker" subtitle="(Hear Periscope Chat Messages)" />
        { this.promptGroup() }
        { this.toggleGroup() }
        <hr></hr>
        <div className="row">
          <div className="col-12" >
            {this.state.message}
          </div>
        </div>
        { this.link_html() }
      </div>
    );
  }

  // method to return a render-able slider component for the settings page
  sliderComponent(sliderID, description, changeFunc, curVal, minVal, maxVal) {
    return(
      <div className="row col-10" >
        {description + ": "}<label>{curVal}</label>
        <br></br>
        <input id={sliderID} className="col-10" type="range" onChange={changeFunc} value={curVal} min={minVal} max={maxVal} />
       </div>
    );
  }

  // method to return a render-able settings page if the state indicates it should be displayed
  settingsPage() {
    if (this.state.page_showing != "settings") {
      return(null);
    }

    return(
      <div>
        <Menu isOpen={ this.state.menu_open_state } styles={ menu_styles } right>
          <button onClick={ this.doSettings } className="col-6 abutton" href="/contact">Settings and Voice</button>
          <button onClick={ this.showHelp } className="col-6 abutton" href="">Help</button>
        </Menu>
        <Header title="ScopeSpeaker" subtitle="(Settings and Voice)" backToMessagePage={this.backToMessagePage} />
        <div>
          <div className="row sctogglerow">
            <span className="toggle_left">
              <div className="toggle-label" htmlFor="translations_toggle">Translate Msgs</div>
              <ToggleButton id="translations_toggle" value={this.state.saying_translations} onToggle={ (value) => {
                saying_translations = !value;
                this.setState({ saying_translations: saying_translations });
                localStorage.setItem('saying_translations', saying_translations);
                } } />
            </span>
            <span className="toggle_right">
              <div className="toggle-label" htmlFor="names_toggle">Display Names</div>
              <ToggleButton id="names_toggle" value={this.state.saying_display_names} onToggle={ (value) => {
                saying_display_names = !value;
                this.setState({ saying_display_names: saying_display_names });
                localStorage.setItem('saying_display_names', saying_display_names);
                } } />
            </span>
          </div>
          <hr></hr>
          <br></br>
          Current Voice:
          <VoiceSelectComponent current_voice={current_voice} />
          { this.sliderComponent("name_len", "Length of name to be said", this.nameLengthChange, name_length, 0, 50) }
          { this.sliderComponent("delay_time", "Delay between spoken messages (secs)", this.delayTimeChange, delay_time, 0, 30) }
          { this.sliderComponent("language_detect", "Characters in message to trigger language detect", this.detectLengthChange, detect_length, 0, 50) }
          { this.sliderComponent("high_water", "Msg queue high water mark", this.highWaterMarkChange, high_water_mark, 0, 100) }
          { this.sliderComponent("low_water", "Msg queue low water mark", this.lowWaterMarkChange, low_water_mark, 0, 100) }
        </div>
      </div>
    );
  }

  // the render method for the app which renders the page top, a message page, or a settings page
  render() {
    return (
      <div>
        { this.messagePage() }
        { this.helpPage() }
        { this.settingsPage() }
      </div>
    );
  }

  // ********************************************************************************************************************
  // ***   methods below here in the class are invoked by interactions with displayed element of the user interface   ***
  // ********************************************************************************************************************

  // method to collect the username from the input text object
  collectUserName() {
    var text_object = document.getElementById("user_name_text");
    user_name = text_object.value.trim().toLowerCase().replace('@', '');
    this.setState({user_name: user_name });
  }

  // method to send AJAX request to server get user info, and open user associate chat web socket, invoked from 'Say' button
  //  (if messages are in progress, the button is labelled with STOP_MESSAGES and pressing it shuts down the chat messages)
  //
  getUserData() {
    if (this.state.button_prompt == STOP_MESSAGES) {
      this.setState({button_prompt: SAY_MESSAGES});
      websocket.close();
      messages = [];
      append_to_chat_log("Chat messages stopped");
      queue_message_to_say("Chat messages stopped");
      return;
    }
    append_to_chat_log("about to ask for user info");
    localStorage.setItem('user', user_name);
    this.setState({user_name: user_name });
    queue_message_to_say("Looking for a Periscope live stream by " + user_name);
    this.setState({button_prompt: STOP_MESSAGES});
    axios.get(window.location.href + "chatinfo/" + user_name).then(
      function(response) {
        append_to_chat_log("response data is: " + response.data);
        if (response.data[0] == "error") {
          setButtonPrompt(SAY_MESSAGES);
          queue_message_to_say("An error occurred, the problem is: " + response.data[1]);
          queue_message_to_say("Chat messages will not begin");
        }
        else {
          broadcast_id = response.data[1];
          append_to_chat_log("Got a broadcast ID of: " + broadcast_id);
          queue_message_to_say("Got a good response from the periscope server about " + localStorage.getItem('user'));
          queue_message_to_say("Chat messages will now begin");
          openChatWebsocket();
        }
      }
    ).catch(
      function(err) {
        setButtonPrompt(SAY_MESSAGES);
        append_to_chat_log("An error occured: " + err);
        queue_message_to_say("An error occured: " + err);
      }
    )
  }

  // method to invoke the getUserData method when the 'enter' key is pressed
  getUserDataWithEnter(e) {
    if ( (e.keyCode == 13) && (this.state.button_prompt == SAY_MESSAGES) ) {
     this.getUserData(); 
    }
  }

  // method invoked by menu to change the state to display the settings page
  doSettings() {
    this.setState({menu_open_state: false });
    this.setState({page_showing: "settings"});
  }

  // method invoked by settings page back button to change the state to revert to the message page
  //  (also saves all of the settings to localStorage)
  backToMessagePage() {
    this.setState({page_showing: "message"});
  }

  // method invoked by menu to change the state to show the message page with help messages showing
  showHelp() {
    this.setState({page_showing: "help"});
    this.setState({menu_open_state: false });
  }

  // method invoked by toggle for left messages
  sayingLeftMessagesChange(value) {
    saying_left_messages = !value;
    this.setState({ saying_left_messages: saying_left_messages });
    localStorage.setItem('saying_left_messages', saying_left_messages);
  }

  // method invoked by toggle for join messages
  sayingJoinMessagesChange(value) {
    saying_join_messages = !value;
    this.setState({ saying_join_messages: saying_join_messages });
    localStorage.setItem('saying_join_messages', saying_join_messages);
  }

  // method invoked by toggle for displaying text messages
  sayingDisplayingMessagesChange(value) {
    displaying_messages = !value;
    this.setState({ displaying_messages: displaying_messages });
    localStorage.setItem('displaying_messages', displaying_messages);
  }

  // method invoked by toggle for saying emojis
  sayingEmojisChange(value) {
    saying_emojis = !value;
    this.setState({ saying_emojis: saying_emojis });
    localStorage.setItem('saying_emojis', saying_emojis);
  }

  // method invoked by toggle for saying translations
  sayingTranslationsChange(value) {
    saying_translations = !value;
    this.setState({ saying_translations: saying_translations });
    localStorage.setItem('saying_translations', saying_translations);
  }

  // method invoked by toggle for saying display names
  sayingDisplayNamesChange(value) {
    saying_display_name = !value;
    this.setState({ saying_display_name: saying_display_name });
    localStorage.setItem('saying_display_name', saying_display_name);
  }

  // method invoked by slider to change the name length value
  nameLengthChange(e) {
    var slider_object = document.getElementById("name_len");
    name_length = slider_object.value;
    this.setState({name_length: name_length});
    localStorage.setItem('name_length', name_length);
  }

  // method invoked by slider to change the delay time value
  delayTimeChange() {
    var slider_object = document.getElementById("delay_time");
    delay_time = slider_object.value;
    this.setState({delay_time: delay_time});
    localStorage.setItem('delay_time', delay_time);
  }

  // method invoked by slider to change the language detect value
  detectLengthChange() {
    var slider_object = document.getElementById("language_detect");
    detect_length = slider_object.value;
    this.setState({detect_length: detect_length});
    localStorage.setItem('detect_length', detect_length);
  }

  // method invoked by slider to change the queue high water mark value
  highWaterMarkChange() {
    var slider_object = document.getElementById("high_water");
    high_water_mark = slider_object.value;
    this.setState({high_water_mark: high_water_mark});
    localStorage.setItem('high_water_mark', high_water_mark);
  }

  // method invoked by slider to change the queue low water mark value
  lowWaterMarkChange() {
    var slider_object = document.getElementById("low_water");
    low_water_mark = slider_object.value;
    this.setState({low_water_mark: low_water_mark});
    localStorage.setItem('low_water_mark', low_water_mark);
  }

  // method invoked when the 'skip message' button is pressed.. invoke stop_callback to act as though speech ended normally.
  skipMessage() {
    responsiveVoice.cancel();
    setMessage("Message skipped", "");
    stop_callback();
  }
}

// log app startup, and do inital invocation of render method to initially display the user interface
//
append_to_chat_log("Scopespeaker debug/run log:\n");

ReactDOM.render(React.createElement(WebScopeSpeaker, null), document.getElementById('webscopespeaker'));


// method to open a chat websocket with the periscope chat server, given URL and access token
//
var openChatWebsocket = function() {
    var chat_url = window.location.href.replace("http", "ws") + "chat";
    websocket = new WebSocket(chat_url);
    websocket.onopen = function(evt) { onOpen(evt) };
    websocket.onclose = function(evt) { onClose(evt) };
    websocket.onmessage = function(evt) { onMessage(evt) };
    websocket.onerror = function(evt) { onError(evt) };
};

// method invoked when chat websocket is opened, sends handshake of join message and auth message
//
var onOpen = function(evt) {
    append_to_chat_log("\nSecure web-socket connected to ScopeSpeaker proxy server");
    var join_message = {};
    join_message["room"] = broadcast_id;
    doSend(JSON.stringify(join_message));
};

// method invoked when chat websocket is closed
//
var onClose = function(evt) {
  setButtonPrompt(SAY_MESSAGES);
  append_to_chat_log("Web-socket disconnected");
};

// method invoked when chat websocket receives a message, parse message and say it
//
var onMessage = function(evt) {
    var message_to_say = extractChatMessage(evt.data);
    if (message_to_say != null) {
        var msg_fields = message_to_say.split(":");
        var language_tag = msg_fields[0];
        var who_said_it = msg_fields[1];
        msg_fields.shift();
        msg_fields.shift();
        var what_was_said = msg_fields.join(" ");
        if ( (what_was_said == "left") && (!saying_left_messages) ) {
            return;
        }
        if ( (what_was_said == "joined") && (!saying_join_messages) ) {
            return;
        }
        var to_be_said = language_tag + ":" + who_said_it + ":" + what_was_said;
        queue_message_to_say(to_be_said);
    }
};

// method invoked when chat websocket has an error
//
var onError = function(evt) {
  setButtonPrompt(SAY_MESSAGES);
  append_to_chat_log("Error:" + evt.data);
};

// method to send a message on the websocket to the Periscope chat server
//
var doSend = function(message) {
    append_to_chat_log("SENT: " + message);
    websocket.send(message);
};

// method to extract information from the incoming Periscope chat message
var extractChatMessage = function(chat_msg) {
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
                }
                else {
                    who_said_it = user_name;
                }
                var language_tag = "";
                if (language_array.length > 1) {
                    language_tag = "?M";
                }
                if ( (language_tag.length == 0) && (what_they_said.length > detect_length) ) {
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
            }
            catch(err) {
                append_to_chat_log("Inner Payload parse error: " + err);
                append_to_chat_log("Message: " + err.message);
                websocket.close();
                return null;
            }
        }
        else if (kind == 2) {
            var payload_kind = payload.kind;
            var sender = payload.sender;
            var message_for_chatlog = "";
            if (payload_kind == 1) {
                message_for_chatlog = sender.username + " joined";
                if (saying_join_messages) {
                    queue_message_to_say(message_for_chatlog);
                }
                else {
                    append_to_chat_log(message_for_chatlog);
                }
                return null;
            }
            else if (payload_kind == 2) {
                message_for_chatlog = sender.username + " left";
                if (saying_left_messages) {
                    queue_message_to_say(message_for_chatlog);
                }
                else {
                    append_to_chat_log(message_for_chatlog);
                }
                return null;
            }
        }
    }
    catch(err) {
        append_to_chat_log("Payload parse error: " + err);
        append_to_chat_log("Message: " + err.message);
        queue_priority_message_to_say("Chat message payload parse error");
        websocket.close();
        return null;
    }

    if ( (who_said_it.length == 0) || (what_they_said.length == 0) ) {
        return null;
    }
    return language_tag + ":" + who_said_it + ":" + what_they_said;
};

// callback method when speech begins
//
var start_callback = function() {
};

// callback method when speech ends - say next message if present
//
var stop_callback = function() {
    speaking = false;
    if (messages.length > 0) {
        schedule_say_next(delay_time * 1000);
    }
};

// method to set up a scheduled call to say_next within a given number of milliseconds
//
var schedule_say_next = function(t) {
      setTimeout(say_next, t);
};

// method to put a priority message to be said at the front of the queue
//
var queue_priority_message_to_say = function(m) {
    messages.unshift(m);
    if (!speaking) {
        say_next();
    }
};

// method to queue a message to be said
//
var queue_message_to_say = function(m) {
    var the_message = m;
    if (dropping_messages) {
        return;
    }
    messages.push(the_message);
    var queue_size = messages.length;
    if (queue_size == high_water_mark) {
        the_message = "Scope Speaker un-said queue has " + high_water_mark
                    + " messages, new messages won't be said till queue is down to " + low_water_mark;
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
var say_next = function() {
    var who_said_it = "";
    var what_was_said = "";

    if (speaking) {
        return;
    }

    if (messages.length == 0) {
        return;
    }

    speaking = true;
    var speak_string = messages.shift();
    if ( (dropping_messages) && (messages.length == low_water_mark) ) {
        // we're crossing back to the low water mark, allow saying new messages, announce we're doing so, and put msg back in queue
        dropping_messages = false;
        messages.unshift(speak_string);
        speak_string = "Scope Speaker has recovered the un-said message queue down to " + low_water_mark + ", new messages will resume being said";
        append_to_chat_log(speak_string);
    }
    var message_processed = false;
    queued_message_being_said = speak_string;
    var colon_location = speak_string.indexOf(":");
    var question_mark_location = speak_string.indexOf("?");
    if ( (question_mark_location == 0) || ((colon_location > 0) && (colon_location < 6)) ) {
        var msg_fields = speak_string.split(":");
        var language_tag = msg_fields[0];
        who_said_it = msg_fields[1];
        what_was_said = msg_fields[2];
        if (saying_translations && (language_tag != default_language)) {
            var translation_command = language_tag + "-" + default_language;
            append_to_chat_log(who_said_it + " said before translation(" + translation_command + "): " + what_was_said);
            send_translation_request(who_said_it, what_was_said, translation_command);
        }
        else {
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
var sayIt = function(who, announce_word, message_to_say, translation_info) {
    var speak_string;
    var sayer;
    var announce_phrase = announce_word + ": ";

    if (announce_word.length == 0) {
        announce_phrase = "";
    }

    if ( (message_to_say != null) && (!saying_emojis) ) {
        speak_string = removeEmoji(message_to_say);
    }
    else {
        speak_string = message_to_say;
    }
    if ( (who.length != 0) && (!saying_emojis) ) {
        sayer = removeEmoji(who);
    }
    else {
        sayer = who;
    }
    if ( (name_length == 0) || (sayer.length == 0) ) {
        setMessage(speak_string, null);
        //speak_string = speak_string + "......";
        responsiveVoice.speak(speak_string, current_voice , {onstart: start_callback, onend: stop_callback});
    }
    else {
        setMessage(who + " " + announce_word + ": " + speak_string, translation_info);
        speak_string = speak_string + "......";
        var shortend_who = who.substring(0, Math.min(who.length, name_length));
        responsiveVoice.speak(shortend_who + " " + announce_word + ": " + speak_string,
              current_voice, {onstart: start_callback, onend: stop_callback});
    }
};

// function to send a translation request to Yandex language translation service
//
var send_translation_request = function(who_said_it, text_to_be_translated, language_pair) {
    var jsonString;
    var translation_command;

    if (language_pair.indexOf("?") == 0) {
        translation_command = language_pair.split("-")[1];
    }
    else {
        translation_command = language_pair;
    }
    var yandexKey = "trnsl.1.1.20170707T040715Z.91d8bbf749039bd6.313fa4324e6371e9ae58a30e2a4f93b47dca1ca2";
    var yandexUrl = "https://translate.yandex.net/api/v1.5/tr.json/translate?key=" + yandexKey
             + "&text=" + encodeURI(text_to_be_translated) + "&lang=" + translation_command;
    append_to_chat_log("Yandex URL: " + yandexUrl);
    axios.get(yandexUrl).then(
        function(response) {
            var result_string = response.data.text[0];

            append_to_chat_log("got translation text: " + result_string);
            say_translated_text(who_said_it, result_string, language_pair);
        }
     ).catch(
        function(err) {
            speaking = false;
            append_to_chat_log("An error occurred: " + err);
            queue_message_to_say("An error occurred: " + err);
        }
     );
};

// function to say text that has been translated
//
var say_translated_text = function(who_said_it, what_was_said, translation_info) {
    append_to_chat_log("After translation: " + what_was_said);
    if ( (what_was_said == "joined") || (what_was_said == "Joined")
    ||   (what_was_said == "Participation") || (what_was_said == "has joined") )  {
            speaking = false;
            queued_message_being_said = null;
            say_next();
            return;
        }
        var announce_word = translated_word;

        if (translation_info.indexOf("?L") >= 0) {
            var source_language = translation_info.split("-")[0].split("L")[1];
            if (source_language == default_language) {
                announce_word = said_word;
            }
        }
        sayIt(who_said_it, announce_word, what_was_said, translation_info);
};

// function to remove emoji from a given string
//
var removeEmoji = function(s) {
  return s.replace(/([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/g, '');
};


