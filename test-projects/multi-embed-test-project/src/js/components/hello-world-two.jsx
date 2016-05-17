
var React = require('react');
var url50e = require('../../images/50euro.jpg');


var HelloWorld2 = React.createClass({

  render: function() {

    return (
      <div className="hello-world">

        <div>
          <div>
            <h2>Hello World 2</h2>
            <img src={url50e} style={{width: "100%"}} />
          </div>
        </div>

      </div>
    );
  }

});


module.exports = HelloWorld2;

