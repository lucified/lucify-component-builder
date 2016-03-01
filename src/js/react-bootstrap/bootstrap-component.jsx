
var React = require('react');
//var ReactDOM = require('react-dom');

//var injectTapEventPlugin = require("react-tap-event-plugin");
var EmbedWithUrlParamsDecorator = require('./embed-with-url-params-decorator.jsx');

module.exports = function(Component) {
  //injectTapEventPlugin();
  var Comp = EmbedWithUrlParamsDecorator(Component);
  window.React = React;
  React.render(<Comp />, document.getElementById('content'));
};
