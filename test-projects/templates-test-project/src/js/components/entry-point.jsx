
import React from 'react';
import ReactDOM from 'react-dom';

import HelloWorld from './hello-world.jsx';

window.React = React;
ReactDOM.render(<HelloWorld />, document.getElementById('content'));
