
import React from 'react';

var HelloWorld = () => {

  return (
    <div>
      <h2>Hello World</h2>
      <div>
        <ul>
          <li>This index.html should contain a comment with contents 'HELLO'</li>
          <li>The <a href="embed-codes.html">embed-codes.html</a> page should
          contain a comment with contents 'HELLO EMBED CODES'. Note that
          the page is not available when running on webpack-dev-server. It only
          exists within distribution builds.</li>
        </ul>
      </div>
    </div>
  );

};

HelloWorld.displayName = 'Hello World';
export default HelloWorld;
