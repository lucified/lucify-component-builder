
import React from 'react';
import ReactDOM from 'react-dom';

import HelloWorld from './components/hello-world.jsx';

window.React = React;
ReactDOM.render(<HelloWorld />, document.getElementById('content'));
