
var React = require('react');


var EmbedDecorator = function(Component) {
  return React.createClass({

    getChildContext: function(){
      return {
        embed: true,
        containerClass: "container-embed",
      }
    },

    childContextTypes: {
      embed: React.PropTypes.bool,
      containerClass: React.PropTypes.string
    },

    render: function() {
      return (
        <div className="embed-decorator">
          <Component {...this.props} />
        </div>
      )
    }
  });
};


module.exports = EmbedDecorator;