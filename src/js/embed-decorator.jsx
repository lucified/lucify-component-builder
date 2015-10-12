
var React = require('react');

//var mui = require('material-ui');
//var ThemeManager = new mui.Styles.ThemeManager();


var EmbedDecorator = function(Component) {
  return React.createClass({

    getChildContext: function(){
      return {
        embed: true,
        containerClass: "container-embed",
        //muiTheme: ThemeManager.getCurrentTheme()
      }
    },

    childContextTypes: {
      embed: React.PropTypes.bool,
      //muiTheme: React.PropTypes.object,
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