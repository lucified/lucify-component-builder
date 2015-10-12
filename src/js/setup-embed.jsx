
var React = require('react');
//var ReactDOM = require('react-dom');

//var injectTapEventPlugin = require("react-tap-event-plugin");
var EmbedWithUrlParamsDecorator = require('./embed-with-url-params-decorator.jsx');


module.exports = function(Component) {
  //injectTapEventPlugin();
  var EmbedComponent = EmbedWithUrlParamsDecorator(Component);
  window.React = React;
  React.render(<EmbedComponent />, document.getElementById('content'));
}


