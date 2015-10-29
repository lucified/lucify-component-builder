
var React = require('react');
var Router = require('react-router');

// needed for debugging
window.React = React;


module.exports = function(AppRoutes) {

  Router
    .create({
      routes: AppRoutes,
      scrollBehavior: Router.ScrollToTopBehavior
      //location: Router.HistoryLocation
    })
    .run(function (Handler) {
      React.render(<Handler/>, document.getElementById('content'));
    });

}
