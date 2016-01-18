
var React = require('react');

var DividedCols = require('lucify-commons/src/js/components/divided-cols.jsx');
var NiceSlider = require('lucify-commons/src/js/components/nice-slider.jsx');

var assets = require('lucify-commons/src/js/lucify-assets.js');


var HelloWorld = React.createClass({

  render: function() {

    return (
      <div className="hello-world">

        <div className="inputs">
          <div className="lucify-container">

              <h2>Hello World</h2>

              <h3>Images</h3>

              <DividedCols
              first={
                <div>
                  <h4>Images from project</h4>
                  <p>50 euro image from src/images/</p>
                  <img src={assets.img('50euro.jpg')} style={{width: "100%"}} />

                  <p>20 euro image from temp/generated-images/</p>
                  <img src={assets.img('20euro.jpg')} style={{width: "100%"}} />
                </div>
              }
              second={
                <div>
                  <h4>Images from dependencies</h4>
                  <p>100 euro image from test_modules/module1/src/images/</p>
                  <img src={assets.img('100euro.jpg')} style={{width: "100%"}} />

                  <p>200 euro image from test_modules/module1/temp/generated-images/</p>
                  <img src={assets.img('200euro.jpg')} style={{width: "100%"}} />
                </div>
              } />

          </div>
        </div>

      </div>
    );
  }

});


module.exports = HelloWorld;


