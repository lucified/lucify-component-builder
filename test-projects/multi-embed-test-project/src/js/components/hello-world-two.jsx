
var React = require('react');
var assets = require('lucify-commons/src/js/lucify-assets.js');


var HelloWorld2 = React.createClass({

  render: function() {

    return (
      <div className="hello-world">

        <div className="inputs">
          <div className="lucify-container">

              <h2>Hello World 2</h2>
              <img src={assets.img('50euro.jpg')} style={{width: "100%"}} />

          </div>
        </div>

      </div>
    );
  }

});


module.exports = HelloWorld2;

