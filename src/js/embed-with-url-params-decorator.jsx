
var EmbedDecorator = require('./embed-decorator.jsx');
var React = require('react');

var queryString = require('query-string');


var decode = function(query) {
  var ret = {};

  for (var key in query) {
    var val = query[key];  

    if (val == 'false') {
      val = false;
    
    } else if (val == 'true') {
      val = true;
    
    } else if (isFinite(val)) {
      val = Number(val);

    }

    ret[key] = val;
  }

  return ret;
}


module.exports = function(Component) {
  return EmbedDecorator(React.createClass({

    getUrlParams: function() {
      return decode(queryString.parse(location.search));

      //var urlInfo = url.parse(location.href, true);
      //return typedQs.decode(urlInfo.query);
      //return queryString.parse(location.search);
    },

    render: function() {
      return <Component {...this.props} {...this.getUrlParams()} />;
    }
  }));
};
