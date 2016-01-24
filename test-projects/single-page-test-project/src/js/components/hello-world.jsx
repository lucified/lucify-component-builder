
var React = require('react');

var DividedCols = require('lucify-commons/src/js/components/divided-cols.jsx');
var NiceSlider = require('lucify-commons/src/js/components/nice-slider.jsx');

var assets = require('lucify-commons/src/js/lucify-assets.js');

var url20e = require('../../images/50euro.jpg');
var url50e = require('../../../temp/generated-images/20euro.jpg');

var url100e = require('module1/src/images/100euro.jpg');
var url200e = require('module1/temp/generated-images/200euro.jpg');

var styles = require('../../scss/styles.scss');


var HelloWorld = React.createClass({

  render: function() {

    return (
      <div className={styles['hello-world']}>

        <div className="inputs">
          <div className="lucify-container">

              <h2>Hello World</h2>

              <h3>Images</h3>

              <DividedCols
              first={
                <div>
                  <h4>Images from project</h4>
                  <p>50 euro image from src/images/</p>
                  <img src={url20e} style={{width: "100%"}} />

                  <p>20 euro image from temp/generated-images/</p>
                  <img src={url50e} style={{width: "100%"}} />
                </div>
              }
              second={
                <div>
                  <h4>Images from dependencies</h4>
                  <p>100 euro image from test_modules/module1/src/images/</p>
                  <img src={url100e} style={{width: "100%"}} />

                  <p>200 euro image from test_modules/module1/temp/generated-images/</p>
                  <img src={url200e} style={{width: "100%"}} />
                </div>
              } />

          </div>
        </div>

      </div>
    );
  }

});


module.exports = HelloWorld;


