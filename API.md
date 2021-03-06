
# API for lucify-component-builder

TODO: this is work-in-progress

## Available `opts`

### General options

- `entryPoint`: Absolute path to entry point for main Javascript bundle. This option is required.
- `assetContext`: HTTP path for the entry point `ìndex.html`, including trailing slash, not including `baseUrl`. Defaults to `''`.
- `embedSupport`: Set to true to generate embeds codes page and also include scripts that support embedding to the distribution.
- `flow`: Flow id of flow in which to send notifications
- `maxAge`: The maxAge for HTTP cache headers for assets with rev urls
- `bucket`: The s3 bucket in which to deploy
- `baseUrl`: The base url on the server, including trailing slash, not including path. e.g. `http://www.example.com/`
- `commit`: Git commit hash
- `branch`: Git branch name
- `project`: GitHub project name
- `org`: GitHub organization name,
- `embedCodes`: Set to `true` to generate `embed-codes.html` along boostrapping `index.html`
- `embedCodesHtmlTemplate`: Absolute path to page template for `embed-codes.html` page. Defaults to (this)[https://github.com/lucified/lucify-component-builder/blob/master/src/www/embed-codes.hbs] template.

### Options for bootstrapping index.html

- `pageDef`: object containing page metadata for entry point. The following attributes are recognized:
    + `title`: Page title
    + `description`: Description metadata for social sharing, etc,
    + `ogType`: Open graph type
    + `twitterImage`: Filename for twitter card image
    + `openGraphImage`: Filename for open graph (Facebook) image
    + `schemaImage`: 'Filename for schema image
    + `googleAds`: Set to `true` to enable script src snippet in `index.html` for Google ads. Defaults to `true`. TODO: should be Google Ads Id instead of boolean.
    + `googleAnalytics`: Set to `true` to enable script src snippet in `index.html` for Google Analytics. Defaults to `true`. TODO: should be Google Analytics Id instead of boolean.
    + `riveted`: Set to `true` to enable script src snippet in `index.html` for Riveted.js. Defaults to `true`.
    + `iframeResize`: Set to `true` to bundle IFrame resizing code into bootstrapping index.html. Defaults to `true`
    + `indexHtmlTemplate`: Absolute path to handlebars template for `index.html`. Defaults to [this](https://github.com/lucified/lucify-component-builder/blob/master/src/www/embed.hbs) template.
    + `externalStyles`: Set to `true` to get [external stylesheets](https://github.com/webpack/extract-text-webpack-plugin). This option is only checked from the first `pageDef` element and controls all of them.
### Options for multi-page React-router projects

- `pageDefs`: list of objects containing page metadata for all entry points. For each object, the same attributes as allowed for `pageDef` are recognized. They are optional. However, a `path` attribute is mandatory. It is the page's web path below `assetContext`.

## `LUCIFY_ENV`

Most options have defaults. Some of them depend on `LUCIFY_ENV`. See `src/js/deploy-options.js` for details.

## Environment variables for notifications

If `GITHUB_TOKEN` is defined, will notify of new deployment with GitHub Deployment API.

If `FLOW_TOKEN` is defined, will use it to notify of successfull deployment to Flowdock.

## Environment variables for AWS

The build should have a set of AWS environment variables and/or credentials specified, suitable for deploying to `bucket`.

They can be defined in multiple ways

(1) `AWS_PROFILE` and `~/.aws/credentials`

(2) `AWS_SECRET_ACCESS_KEY` and `AWS_ACCESS_KEY_ID`

(3) Optionally, you can define `OVERRIDE_AWS_SECRET_ACCESS_KEY` and `OVERRIDE_AWS_ACCESS_KEY_ID`

(4) Also, `ENCRYPTED_AWS_SECRET_ACCESS_KEY` is available. When this is used, `LUCIFY_ENC_PASS` should be defined, so that it can be decrypted.




