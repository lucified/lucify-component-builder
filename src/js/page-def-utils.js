
var deepcopy = require('deepcopy');


/*
 * Enrich/prepare a pageDef so that it is ready to be passed on
 * to the page template for index.html
 *
 * pageDef      -- pageDef or embedDef for the page
 * baseUrl      -- server baseUrl, e.g. http://www.lucify.com/
 * assetContext -- subfolder on server, e.g. mortality-article/
 */
function enrichPageDef(pageDef, baseUrl, assetContext) {
  var def;
  if (pageDef != null) {
    def = deepcopy(pageDef);
  } else {
    def = {title: 'Lucify component'};
  }

  // default subpath by default
  def.path = def.path != null ? def.path : '';
  def.url = baseUrl + assetContext + def.path.replace('/', '');

  if (!def.url.endsWith('/')) {
    def.url = def.url + '/';
  }

  // by default, google analytics, riveted, etc are enabled
  def.googleAnalytics = def.googleAnalytics === false ? false : true;
  def.googleAnalyticsSendPageView = def.googleAnalyticsSendPageView === false ? false : true;

  def.riveted = def.riveted === false ? false : true;
  def.adsByGoogle = def.adsByGoogle === false ? false : true;
  def.iFrameResize = def.iFrameResize === false ? false : true;

  return def;
}

/*
 * Get page defs as array from
 * the options object
 */
function getPageDefsAsArray(opts) {
  if (Array.isArray(opts.pageDefs)) {
    return opts.pageDefs;
  }
  if (opts.pageDef != null) {
    return [opts.pageDef];
  }
  return [null];
}

/*
 * Get enriched page defs
 */
function getEnrichedPageDefs(opts) {
  return getPageDefsAsArray(opts).map(item => {
    return enrichPageDef(item, opts.baseUrl, opts.assetContext);
  });
}


module.exports.enrichPageDef = enrichPageDef;
module.exports.getEnrichedPageDefs = getEnrichedPageDefs;
