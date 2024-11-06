// https://root.cern/js/ v7.7.5
import { Vector3, Mesh, BufferGeometry, BufferAttribute, Raycaster, Matrix4, Color as Color$1, Object3D, DoubleSide, FrontSide, InstancedMesh, MeshBasicMaterial, MeshDepthMaterial, MeshToonMaterial, MeshMatcapMaterial, MeshStandardMaterial, MeshNormalMaterial, MeshPhysicalMaterial, MeshPhongMaterial, MeshLambertMaterial, Vector2, ShapeUtils, Box3 } from 'three';
import { Font } from 'three/addons';

/** @summary version id
  * @desc For the JSROOT release the string in format 'major.minor.patch' like '7.0.0' */
const version_id = '7.7.5',

/** @summary version date
  * @desc Release date in format day/month/year like '14/04/2022' */
version_date = '31/10/2024',

/** @summary version id and date
  * @desc Produced by concatenation of {@link version_id} and {@link version_date}
  * Like '7.0.0 14/04/2022' */
version = version_id + ' ' + version_date,

/** @summary Is node.js flag
  * @private */
nodejs = !!((typeof process === 'object') && isObject(process.versions) && process.versions.node && process.versions.v8),

/** @summary internal data
  * @private */
internals = {
   /** @summary unique id counter, starts from 1 */
   id_counter: 1
},

_src = import.meta?.url;


/** @summary Location of JSROOT modules
  * @desc Automatically detected and used to dynamically load other modules
  * @private */
let source_dir = '';

if (_src && isStr(_src)) {
   const pos = _src.indexOf('modules/core.mjs');
   if (pos >= 0) {
      source_dir = _src.slice(0, pos);
      if (!nodejs)
         console.log(`Set jsroot source_dir to ${source_dir}, ${version}`);
   } else {
      if (!nodejs)
         console.log(`jsroot bundle, ${version}`);
      internals.ignore_v6 = true;
   }
}

/** @summary Indicates if running inside Node.js */
function isNodeJs() { return nodejs; }

/** @summary atob function in all environments
  * @private */
const atob_func = isNodeJs() ? str => Buffer.from(str, 'base64').toString('latin1') : globalThis?.atob,

/** @summary btoa function in all environments
  * @private */
btoa_func = isNodeJs() ? str => Buffer.from(str, 'latin1').toString('base64') : globalThis?.btoa,

/** @summary browser detection flags
  * @private */
browser = { isFirefox: true, isSafari: false, isChrome: false, isWin: false, touches: false, screenWidth: 1200 };

if ((typeof document !== 'undefined') && (typeof window !== 'undefined') && (typeof navigator !== 'undefined')) {
   navigator.userAgentData?.brands?.forEach(item => {
      if (item.brand === 'HeadlessChrome') {
         browser.isChromeHeadless = true;
         browser.chromeVersion = parseInt(item.version);
      } else if (item.brand === 'Chromium') {
         browser.isChrome = true;
         browser.chromeVersion = parseInt(item.version);
      }
   });

   if (browser.chromeVersion) {
      browser.isFirefox = false;
      browser.isWin = navigator.userAgentData.platform === 'Windows';
   } else {
      browser.isFirefox = navigator.userAgent.indexOf('Firefox') >= 0;
      browser.isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;
      browser.isChrome = !!window.chrome;
      browser.isChromeHeadless = navigator.userAgent.indexOf('HeadlessChrome') >= 0;
      browser.chromeVersion = (browser.isChrome || browser.isChromeHeadless) ? parseInt(navigator.userAgent.match(/Chrom(?:e|ium)\/([0-9]+)\.([0-9]+)\.([0-9]+)\.([0-9]+)/)[1]) : 0;
      browser.isWin = navigator.userAgent.indexOf('Windows') >= 0;
   }
   browser.touches = ('ontouchend' in document); // identify if touch events are supported
   browser.screenWidth = window.screen?.width ?? 1200;
}

/** @summary Check if prototype string match to array (typed on untyped)
  * @return {Number} 0 - not array, 1 - regular array, 2 - typed array
  * @private */
function isArrayProto(proto) {
    if ((proto.length < 14) || (proto.indexOf('[object ') !== 0)) return 0;
    const p = proto.indexOf('Array]');
    if ((p < 0) || (p !== proto.length - 6)) return 0;
    // plain array has only '[object Array]', typed array type name inside
    return proto.length === 14 ? 1 : 2;
}

/** @desc Specialized JSROOT constants, used in {@link settings}
  * @namespace */
const constants = {
   /** @summary Kind of 3D rendering, used for {@link settings.Render3D}
     * @namespace */
   Render3D: {
      /** @summary Default 3D rendering, normally WebGL, if not supported - SVG */
      Default: 0,
      /** @summary Use normal WebGL rendering and place as interactive Canvas element on HTML page */
      WebGL: 1,
      /** @summary Use WebGL rendering, but convert into svg image, not interactive */
      WebGLImage: 2,
      /** @summary Use SVG rendering, slow, inprecise and not interactive, nor recommendet */
      SVG: 3,
      fromString(s) {
         if ((s === 'webgl') || (s === 'gl')) return this.WebGL;
         if (s === 'img') return this.WebGLImage;
         if (s === 'svg') return this.SVG;
         return this.Default;
      }
   },
   /** @summary Way to embed 3D into SVG, used for {@link settings.Embed3D}
     * @namespace */
   Embed3D: {
      /** @summary Do not embed 3D drawing, use complete space */
      NoEmbed: -1,
      /** @summary Default embeding mode - on Firefox and latest Chrome is real ```Embed```, on all other ```Overlay``` */
      Default: 0,
      /** @summary WebGL canvas not inserted into SVG, but just overlayed The only way how earlier Chrome browser can be used */
      Overlay: 1,
      /** @summary Really embed WebGL Canvas into SVG */
      Embed: 2,
      /** @summary Embeding, but when SVG rendering or SVG image converion is used */
      EmbedSVG: 3,
      /** @summary Convert string values into number  */
      fromString(s) {
         if (s === 'embed') return this.Embed;
         if (s === 'overlay') return this.Overlay;
         return this.Default;
      }
   },
   /** @summary How to use latex in text drawing, used for {@link settings.Latex}
     * @namespace */
   Latex: {
      /** @summary do not use Latex at all for text drawing */
      Off: 0,
      /** @summary convert only known latex symbols */
      Symbols: 1,
      /** @summary normal latex processing with svg */
      Normal: 2,
      /** @summary use MathJax for complex cases, otherwise simple SVG text */
      MathJax: 3,
      /** @summary always use MathJax for text rendering */
      AlwaysMathJax: 4,
      /** @summary Convert string values into number */
      fromString(s) {
         if (!s || !isStr(s))
            return this.Normal;
         switch (s) {
            case 'off': return this.Off;
            case 'symbols': return this.Symbols;
            case 'normal':
            case 'latex':
            case 'exp':
            case 'experimental': return this.Normal;
            case 'MathJax':
            case 'mathjax':
            case 'math': return this.MathJax;
            case 'AlwaysMathJax':
            case 'alwaysmath':
            case 'alwaysmathjax': return this.AlwaysMathJax;
         }
         const code = parseInt(s);
         return (Number.isInteger(code) && (code >= this.Off) && (code <= this.AlwaysMathJax)) ? code : this.Normal;
      }
   }
},

/** @desc Global JSROOT settings
  * @namespace */
settings = {
   /** @summary Render of 3D drawing methods, see {@link constants.Render3D} for possible values */
   Render3D: constants.Render3D.Default,
   /** @summary 3D drawing methods in batch mode, see {@link constants.Render3D} for possible values */
   Render3DBatch: constants.Render3D.Default,
   /** @summary Way to embed 3D drawing in SVG, see {@link constants.Embed3D} for possible values */
   Embed3D: constants.Embed3D.Default,
   /** @summary Enable or disable tooltips, default on */
   Tooltip: !nodejs,
   /** @summary Time in msec for appearance of tooltips, 0 - no animation */
   TooltipAnimation: 500,
   /** @summary Enables context menu usage */
   ContextMenu: !nodejs,
   /** @summary Global zooming flag, enable/disable any kind of interactive zooming */
   Zooming: !nodejs,
   /** @summary Zooming with the mouse events */
   ZoomMouse: !nodejs,
   /** @summary Zooming with mouse wheel */
   ZoomWheel: !nodejs,
   /** @summary Zooming on touch devices */
   ZoomTouch: !nodejs,
   /** @summary Enables move and resize of elements like statbox, title, pave, colz  */
   MoveResize: !browser.touches && !nodejs,
   /** @summary Configures keybord key press handling
     * @desc Can be disabled to prevent keys heandling in complex HTML layouts
     * @default true */
   HandleKeys: !nodejs,
   /** @summary enables drag and drop functionality */
   DragAndDrop: !nodejs,
   /** @summary Interactive dragging of TGraph points */
   DragGraphs: true,
   /** @summary Show progress box, can be false, true or 'modal' */
   ProgressBox: !nodejs,
   /** @summary Show additional tool buttons on the canvas, false - disabled, true - enabled, 'popup' - only toggle button */
   ToolBar: nodejs ? false : 'popup',
   /** @summary Position of toolbar 'left' left-bottom corner on canvas, 'right' - right-bottom corner on canvas, opposite on sub-pads */
   ToolBarSide: 'left',
   /** @summary display tool bar vertical (default false) */
   ToolBarVert: false,
   /** @summary if drawing inside particular div can be enlarged on full window */
   CanEnlarge: true,
   /** @summary if frame position can be adjusted to let show axis or colz labels */
   CanAdjustFrame: false,
   /** @summary calculation of text size consumes time and can be skipped to improve performance (but with side effects on text adjustments) */
   ApproxTextSize: false,
   /** @summary Histogram drawing optimization: 0 - disabled, 1 - only for large (>5000 1d bins, >50 2d bins) histograms, 2 - always */
   OptimizeDraw: 1,
   /** @summary Automatically create stats box, default on */
   AutoStat: true,
   /** @summary Default frame position in NFC
     * @deprecated Use gStyle.fPad[Left/Right/Top/Bottom]Margin values instead */
   FrameNDC: {},
   /** @summary size of pad, where many features will be deactivated like text draw or zooming  */
   SmallPad: { width: 150, height: 100 },
   /** @summary Default color palette id  */
   Palette: 57,
   /** @summary Configures Latex usage, see {@link constants.Latex} for possible values */
   Latex: constants.Latex.Normal,
   /** @summary Grads per segment in TGeo spherical shapes like tube */
   GeoGradPerSegm: 6,
   /** @summary Enables faces compression after creation of composite shape  */
   GeoCompressComp: true,
   /** @summary if true, ignore all kind of URL options in the browser URL */
   IgnoreUrlOptions: false,
   /** @summary how many items shown on one level of hierarchy */
   HierarchyLimit: 250,
   /** @summary default display kind for the hierarchy painter */
   DislpayKind: 'simple',
   /** @summary default left area width in browser layout */
   BrowserWidth: 250,
   /** @summary custom format for all X values, when not specified {@link gStyle.fStatFormat} is used */
   XValuesFormat: undefined,
   /** @summary custom format for all Y values, when not specified {@link gStyle.fStatFormat} is used */
   YValuesFormat: undefined,
   /** @summary custom format for all Z values, when not specified {@link gStyle.fStatFormat} is used */
   ZValuesFormat: undefined,
   /** @summary Let detect and solve problem when browser returns wrong content-length parameter
     * @desc See [jsroot#189]{@link https://github.com/root-project/jsroot/issues/189} for more info
     * Can be enabled by adding 'wrong_http_response' parameter to URL when using JSROOT UI
     * @default false */
   HandleWrongHttpResponse: false,
   /** @summary Tweak browser caching with stamp URL parameter
     * @desc When specified, extra URL parameter like ```?stamp=unique_value``` append to each files loaded
     * In such case browser will be forced to load file content disregards of server cache settings
     * Can be disabled by providing &usestamp=false in URL or via Settings/Files sub-menu
     * @default true */
   UseStamp: true,
   /** @summary Maximal number of bytes ranges in http 'Range' header
     * @desc Some http server has limitations for number of bytes rannges therefore let change maximal number via setting
     * @default 200 */
   MaxRanges: 200,
  /** @summary Configure xhr.withCredentials = true when submitting http requests from JSROOT */
   WithCredentials: false,
   /** @summary Skip streamer infos from the GUI */
   SkipStreamerInfos: false,
   /** @summary Show only last cycle for objects in TFile */
   OnlyLastCycle: false,
   /** @summary Configures dark mode for the GUI */
   DarkMode: false,
   /** @summary Prefer to use saved points in TF1/TF2, avoids eval() and Function() when possible */
   PreferSavedPoints: false,
   /** @summary Angle in degree for axis labels tilt when available space is not enough */
   AxisTiltAngle: 25,
   /** @summary Strip axis labels trailing 0 or replace 10^0 by 1 */
   StripAxisLabels: true,
   /** @summary Draw TF1 by default as curve or line */
   FuncAsCurve: false,
   /** @summary Time zone used for date/time display of file time */
   TimeZone: '',
   /** @summary Page URL which will be used to show item in new tab, jsroot main dir used by default */
   NewTabUrl: '',
   /** @summary Extra parameters which will be append to the url when item shown in new tab */
   NewTabUrlPars: '',
   /** @summary Export different settings in output URL */
   NewTabUrlExportSettings: false
},

/** @namespace
  * @summary Insiance of TStyle object like in ROOT
  * @desc Includes default draw styles, can be changed after loading of JSRoot.core.js
  * or can be load from the file providing style=itemname in the URL
  * See [TStyle docu]{@link https://root.cern/doc/master/classTStyle.html} 'Private attributes' section for more detailed info about each value */
gStyle = {
   fName: 'Modern',
   /** @summary Default log x scale */
   fOptLogx: 0,
   /** @summary Default log y scale */
   fOptLogy: 0,
   /** @summary Default log z scale */
   fOptLogz: 0,
   fOptDate: 0,
   fOptFile: 0,
   fDateX: 0.01,
   fDateY: 0.01,
   /** @summary Draw histogram title */
   fOptTitle: 1,
   /** @summary Canvas fill color */
   fCanvasColor: 0,
   /** @summary Pad fill color */
   fPadColor: 0,
   fPadBottomMargin: 0.1,
   fPadTopMargin: 0.1,
   fPadLeftMargin: 0.1,
   fPadRightMargin: 0.1,
   /** @summary TPad.fGridx default value */
   fPadGridX: false,
   /** @summary TPad.fGridy default value */
   fPadGridY: false,
   fPadTickX: 0,
   fPadTickY: 0,
   fPadBorderSize: 2,
   fPadBorderMode: 0,
   fCanvasBorderSize: 2,
   fCanvasBorderMode: 0,
   /** @summary fill color for stat box */
   fStatColor: 0,
   /** @summary fill style for stat box */
   fStatStyle: 1000,
   /** @summary text color in stat box */
   fStatTextColor: 1,
   /** @summary text size in stat box */
   fStatFontSize: 0,
   /** @summary stat text font */
   fStatFont: 42,
   /** @summary Stat border size */
   fStatBorderSize: 1,
   /** @summary Printing format for stats */
   fStatFormat: '6.4g',
   fStatX: 0.98,
   fStatY: 0.935,
   fStatW: 0.2,
   fStatH: 0.16,
   fTitleAlign: 23,
   fTitleColor: 0,
   fTitleTextColor: 1,
   fTitleBorderSize: 0,
   fTitleFont: 42,
   fTitleFontSize: 0.05,
   fTitleStyle: 0,
   /** @summary X position of top left corner of title box */
   fTitleX: 0.5,
   /** @summary Y position of top left corner of title box  */
   fTitleY: 0.995,
   /** @summary Width of title box */
   fTitleW: 0,
   /** @summary Height of title box */
   fTitleH: 0,
   /** @summary Printing format for fit parameters */
   fFitFormat: '5.4g',
   fOptStat: 1111,
   fOptFit: 0,
   fNumberContours: 20,
   fGridColor: 0,
   fGridStyle: 3,
   fGridWidth: 1,
   fFrameFillColor: 0,
   fFrameFillStyle: 1001,
   fFrameLineColor: 1,
   fFrameLineWidth: 1,
   fFrameLineStyle: 1,
   fFrameBorderSize: 1,
   fFrameBorderMode: 0,
   /** @summary size in pixels of end error for E1 draw options */
   fEndErrorSize: 2,
   /** @summary X size of the error marks for the histogram drawings */
   fErrorX: 0.5,
   /** @summary when true, BAR and LEGO drawing using base = 0  */
   fHistMinimumZero: false,
   /** @summary Margin between histogram's top and pad's top */
   fHistTopMargin: 0.05,
   fHistFillColor: 0,
   fHistFillStyle: 1001,
   fHistLineColor: 602,
   fHistLineStyle: 1,
   fHistLineWidth: 1,
   /** @summary format for bin content */
   fPaintTextFormat: 'g',
   /** @summary default time offset, UTC time at 01/01/95   */
   fTimeOffset: 788918400,
   fLegendBorderSize: 1,
   fLegendFont: 42,
   fLegendTextSize: 0,
   fLegendFillColor: 0,
   fHatchesLineWidth: 1,
   fHatchesSpacing: 1,
   fCandleWhiskerRange: 1.0,
   fCandleBoxRange: 0.5,
   fCandleScaled: false,
   fViolinScaled: true,
   fOrthoCamera: false,
   fXAxisExpXOffset: 0,
   fXAxisExpYOffset: 0,
   fYAxisExpXOffset: 0,
   fYAxisExpYOffset: 0,
   fAxisMaxDigits: 5,
   fStripDecimals: true,
   fBarWidth: 1
};

/** @summary Method returns current document in use
  * @private */
function getDocument() {
   if (nodejs)
      return internals.nodejs_document;
   if (typeof document !== 'undefined')
      return document;
   if (typeof window === 'object')
      return window.document;
   return undefined;
}

/** @summary Generate mask for given bit
  * @param {number} n bit number
  * @return {Number} produced mask
  * @private */
function BIT(n) { return 1 << n; }

// used very often - keep shortcut
const extend$1 = Object.assign;

/** @summary Adds specific methods to the object.
  * @desc JSROOT implements some basic methods for different ROOT classes.
  * @param {object} obj - object where methods are assigned
  * @param {string} [typename] - optional typename, if not specified, obj._typename will be used
  * @private */
function addMethods(obj, typename) {
   extend$1(obj, getMethods(typename || obj._typename, obj));
}

/** @summary Should be used to parse JSON string produced with TBufferJSON class
  * @desc Replace all references inside object like { "$ref": "1" }
  * @param {object|string} json  object where references will be replaced
  * @return {object} parsed object */
function parse(json) {
   if (!json) return null;

   const obj = isStr(json) ? JSON.parse(json) : json, map = [];
   let newfmt;

   const unref_value = value => {
      if ((value === null) || (value === undefined)) return;

      if (isStr(value)) {
         if (newfmt || (value.length < 6) || (value.indexOf('$ref:') !== 0)) return;
         const ref = parseInt(value.slice(5));
         if (!Number.isInteger(ref) || (ref < 0) || (ref >= map.length)) return;
         newfmt = false;
         return map[ref];
      }

      if (typeof value !== 'object') return;

      const proto = Object.prototype.toString.apply(value);

      // scan array - it can contain other objects
      if (isArrayProto(proto) > 0) {
          for (let i = 0; i < value.length; ++i) {
             const res = unref_value(value[i]);
             if (res !== undefined) value[i] = res;
          }
          return;
      }

      const ks = Object.keys(value), len = ks.length;

      if ((newfmt !== false) && (len === 1) && (ks[0] === '$ref')) {
         const ref = parseInt(value.$ref);
         if (!Number.isInteger(ref) || (ref < 0) || (ref >= map.length)) return;
         newfmt = true;
         return map[ref];
      }

      if ((newfmt !== false) && (len > 1) && (ks[0] === '$arr') && (ks[1] === 'len')) {
         // this is ROOT-coded array
         let arr;
         switch (value.$arr) {
            case 'Int8': arr = new Int8Array(value.len); break;
            case 'Uint8': arr = new Uint8Array(value.len); break;
            case 'Int16': arr = new Int16Array(value.len); break;
            case 'Uint16': arr = new Uint16Array(value.len); break;
            case 'Int32': arr = new Int32Array(value.len); break;
            case 'Uint32': arr = new Uint32Array(value.len); break;
            case 'Float32': arr = new Float32Array(value.len); break;
            case 'Int64':
            case 'Uint64':
            case 'Float64': arr = new Float64Array(value.len); break;
            default: arr = new Array(value.len);
         }

         arr.fill((value.$arr === 'Bool') ? false : 0);

         if (value.b !== undefined) {
            // base64 coding
            const buf = atob_func(value.b);
            if (arr.buffer) {
               const dv = new DataView(arr.buffer, value.o || 0),
                     len = Math.min(buf.length, dv.byteLength);
               for (let k = 0; k < len; ++k)
                  dv.setUint8(k, buf.charCodeAt(k));
            } else
               throw new Error('base64 coding supported only for native arrays with binary data');
         } else {
            // compressed coding
            let nkey = 2, p = 0;
            while (nkey < len) {
               if (ks[nkey][0] === 'p') p = value[ks[nkey++]]; // position
               if (ks[nkey][0] !== 'v') throw new Error(`Unexpected member ${ks[nkey]} in array decoding`);
               const v = value[ks[nkey++]]; // value
               if (typeof v === 'object') {
                  for (let k = 0; k < v.length; ++k)
                     arr[p++] = v[k];
               } else {
                  arr[p++] = v;
                  if ((nkey < len) && (ks[nkey][0] === 'n')) {
                     let cnt = value[ks[nkey++]]; // counter
                     while (--cnt) arr[p++] = v;
                  }
               }
            }
         }

         return arr;
      }

      if ((newfmt !== false) && (len === 3) && (ks[0] === '$pair') && (ks[1] === 'first') && (ks[2] === 'second')) {
         newfmt = true;
         const f1 = unref_value(value.first),
               s1 = unref_value(value.second);
         if (f1 !== undefined) value.first = f1;
         if (s1 !== undefined) value.second = s1;
         value._typename = value.$pair;
         delete value.$pair;
         return; // pair object is not counted in the objects map
      }

     // prevent endless loop
     if (map.indexOf(value) >= 0) return;

      // add object to object map
      map.push(value);

      // add methods to all objects, where _typename is specified
      if (value._typename) addMethods(value);

      for (let k = 0; k < len; ++k) {
         const i = ks[k], res = unref_value(value[i]);
         if (res !== undefined) value[i] = res;
      }
   };

   unref_value(obj);

   return obj;
}

/** @summary Parse response from multi.json request
  * @desc Method should be used to parse JSON code, produced by multi.json request of THttpServer
  * @param {string} json string to parse
  * @return {Array} array of parsed elements */
function parseMulti(json) {
   if (!json) return null;
   const arr = JSON.parse(json);
   if (arr?.length) {
      for (let i = 0; i < arr.length; ++i)
         arr[i] = parse(arr[i]);
   }
   return arr;
}

/** @summary Method to create http request, without promise can be used only in browser environment
  * @private */
function createHttpRequest(url, kind, user_accept_callback, user_reject_callback, use_promise) {
   function configureXhr(xhr) {
      xhr.http_callback = isFunc(user_accept_callback) ? user_accept_callback.bind(xhr) : () => {};
      xhr.error_callback = isFunc(user_reject_callback) ? user_reject_callback.bind(xhr) : function(err) { console.warn(err.message); this.http_callback(null); }.bind(xhr);

      if (!kind) kind = 'buf';

      let method = 'GET', is_async = true;
      const p = kind.indexOf(';sync');
      if (p > 0) { kind = kind.slice(0, p); is_async = false; }
      switch (kind) {
         case 'head': method = 'HEAD'; break;
         case 'posttext': method = 'POST'; kind = 'text'; break;
         case 'postbuf': method = 'POST'; kind = 'buf'; break;
         case 'post':
         case 'multi': method = 'POST'; break;
      }

      xhr.kind = kind;

      if (settings.WithCredentials)
         xhr.withCredentials = true;

      if (settings.HandleWrongHttpResponse && (method === 'GET') && isFunc(xhr.addEventListener)) {
         xhr.addEventListener('progress', function(oEvent) {
            if (oEvent.lengthComputable && this.expected_size && (oEvent.loaded > this.expected_size)) {
               this.did_abort = true;
               this.abort();
               this.error_callback(Error(`Server sends more bytes ${oEvent.loaded} than expected ${this.expected_size}. Abort I/O operation`), 598);
            }
         }.bind(xhr));
      }

      xhr.onreadystatechange = function() {
         if (this.did_abort) return;

         if ((this.readyState === 2) && this.expected_size) {
            const len = parseInt(this.getResponseHeader('Content-Length'));
            if (Number.isInteger(len) && (len > this.expected_size) && !settings.HandleWrongHttpResponse) {
               this.did_abort = true;
               this.abort();
               return this.error_callback(Error(`Server response size ${len} larger than expected ${this.expected_size}. Abort I/O operation`), 599);
            }
         }

         if (this.readyState !== 4) return;

         if ((this.status !== 200) && (this.status !== 206) && !browser.qt5 &&
             // in these special cases browsers not always set status
             !((this.status === 0) && ((url.indexOf('file://') === 0) || (url.indexOf('blob:') === 0))))
               return this.error_callback(Error(`Fail to load url ${url}`), this.status);

         if (this.nodejs_checkzip && (this.getResponseHeader('content-encoding') === 'gzip')) {
            // special handling of gzipped JSON objects in Node.js
            return Promise.resolve().then(function () { return _rollup_plugin_ignore_empty_module_placeholder$1; }).then(handle => {
                const res = handle.unzipSync(Buffer.from(this.response)),
                      obj = JSON.parse(res); // zlib returns Buffer, use JSON to parse it
               return this.http_callback(parse(obj));
            });
         }

         switch (this.kind) {
            case 'xml': return this.http_callback(this.responseXML);
            case 'text': return this.http_callback(this.responseText);
            case 'object': return this.http_callback(parse(this.responseText));
            case 'multi': return this.http_callback(parseMulti(this.responseText));
            case 'head': return this.http_callback(this);
         }

         // if no response type is supported, return as text (most probably, will fail)
         if (this.responseType === undefined)
            return this.http_callback(this.responseText);

         if ((this.kind === 'bin') && ('byteLength' in this.response)) {
            // if string representation in requested - provide it
            const u8Arr = new Uint8Array(this.response);
            let filecontent = '';
            for (let i = 0; i < u8Arr.length; ++i)
               filecontent += String.fromCharCode(u8Arr[i]);
            return this.http_callback(filecontent);
         }

         this.http_callback(this.response);
      };

      xhr.open(method, url, is_async);

      if ((kind === 'bin') || (kind === 'buf'))
         xhr.responseType = 'arraybuffer';

      if (nodejs && (method === 'GET') && (kind === 'object') && (url.indexOf('.json.gz') > 0)) {
         xhr.nodejs_checkzip = true;
         xhr.responseType = 'arraybuffer';
      }

      return xhr;
   }

   if (isNodeJs()) {
      if (!use_promise)
         throw Error('Not allowed to create http requests in node.js without promise');
      // eslint-disable-next-line new-cap
      return Promise.resolve().then(function () { return _rollup_plugin_ignore_empty_module_placeholder$1; }).then(h => configureXhr(new h.default()));
   }

   const xhr = configureXhr(new XMLHttpRequest());
   return use_promise ? Promise.resolve(xhr) : xhr;
}

/** @summary Submit asynchronoues http request
  * @desc Following requests kind can be specified:
  *    - 'bin' - abstract binary data, result as string
  *    - 'buf' - abstract binary data, result as ArrayBuffer (default)
  *    - 'text' - returns req.responseText
  *    - 'object' - returns parse(req.responseText)
  *    - 'multi' - returns correctly parsed multi.json request
  *    - 'xml' - returns req.responseXML
  *    - 'head' - returns request itself, uses 'HEAD' request method
  *    - 'post' - creates post request, submits req.send(post_data)
  *    - 'postbuf' - creates post request, expectes binary data as response
  * @param {string} url - URL for the request
  * @param {string} kind - kind of requested data
  * @param {string} [post_data] - data submitted with post kind of request
  * @return {Promise} Promise for requested data, result type depends from the kind
  * @example
  * import { httpRequest } from 'https://root.cern/js/latest/modules/core.mjs';
  * httpRequest('https://root.cern/js/files/thstack.json.gz', 'object')
  *       .then(obj => console.log(`Get object of type ${obj._typename}`))
  *       .catch(err => console.error(err.message)); */
async function httpRequest(url, kind, post_data) {
   return new Promise((resolve, reject) => {
      createHttpRequest(url, kind, resolve, reject, true).then(xhr => xhr.send(post_data || null));
   });
}

const clTObject = 'TObject', clTNamed = 'TNamed', clTString = 'TString', clTObjString = 'TObjString',
      clTKey = 'TKey', clTFile = 'TFile',
      clTList = 'TList', clTHashList = 'THashList', clTMap = 'TMap', clTObjArray = 'TObjArray', clTClonesArray = 'TClonesArray',
      clTAttLine = 'TAttLine', clTAttFill = 'TAttFill', clTAttMarker = 'TAttMarker', clTAttText = 'TAttText',
      clTHStack = 'THStack', clTGraph = 'TGraph', clTMultiGraph = 'TMultiGraph', clTCutG = 'TCutG',
      clTGraphPolargram = 'TGraphPolargram', clTGraphTime = 'TGraphTime',
      clTPave = 'TPave', clTPaveText = 'TPaveText', clTPaveStats = 'TPaveStats', clTLegend = 'TLegend', clTLegendEntry = 'TLegendEntry',
      clTPaletteAxis = 'TPaletteAxis', clTImagePalette = 'TImagePalette',
      clTText = 'TText', clTLatex = 'TLatex', clTLine = 'TLine', clTBox = 'TBox', clTPolyLine = 'TPolyLine',
      clTPolyLine3D = 'TPolyLine3D', clTPolyMarker3D = 'TPolyMarker3D',
      clTAttPad = 'TAttPad', clTPad = 'TPad', clTCanvas = 'TCanvas', clTAttCanvas = 'TAttCanvas',
      clTGaxis = 'TGaxis', clTAttAxis = 'TAttAxis', clTAxis = 'TAxis', clTStyle = 'TStyle',
      clTH1 = 'TH1', clTH1I = 'TH1I', clTH1D = 'TH1D', clTH2 = 'TH2', clTH2I = 'TH2I', clTH2F = 'TH2F', clTH3 = 'TH3',
      clTF1 = 'TF1', clTF2 = 'TF2', clTProfile = 'TProfile', clTProfile2D = 'TProfile2D', clTProfile3D = 'TProfile3D',
      clTGeoVolume = 'TGeoVolume', clTGeoNode = 'TGeoNode', clTGeoNodeMatrix = 'TGeoNodeMatrix',
      nsREX = 'ROOT::Experimental::',
      kNoZoom = -1111, kInspect = 'inspect';


/** @summary Create some ROOT classes
  * @desc Supported classes: `TObject`, `TNamed`, `TList`, `TAxis`, `TLine`, `TText`, `TLatex`, `TPad`, `TCanvas`
  * @param {string} typename - ROOT class name
  * @example
  * import { create } from 'https://root.cern/js/latest/modules/core.mjs';
  * let obj = create('TNamed');
  * obj.fName = 'name';
  * obj.fTitle = 'title'; */
function create$1(typename, target) {
   const obj = target || {};

   switch (typename) {
      case clTObject:
          extend$1(obj, { fUniqueID: 0, fBits: 0 });
          break;
      case clTNamed:
         extend$1(obj, { fUniqueID: 0, fBits: 0, fName: '', fTitle: '' });
         break;
      case clTList:
      case clTHashList:
         extend$1(obj, { name: typename, arr: [], opt: [] });
         break;
      case clTAttAxis:
         extend$1(obj, { fNdivisions: 510, fAxisColor: 1,
                       fLabelColor: 1, fLabelFont: 42, fLabelOffset: 0.005, fLabelSize: 0.035, fTickLength: 0.03,
                       fTitleOffset: 1, fTitleSize: 0.035, fTitleColor: 1, fTitleFont: 42 });
         break;
      case clTAxis:
         create$1(clTNamed, obj);
         create$1(clTAttAxis, obj);
         extend$1(obj, { fNbins: 1, fXmin: 0, fXmax: 1, fXbins: [], fFirst: 0, fLast: 0,
                       fBits2: 0, fTimeDisplay: false, fTimeFormat: '', fLabels: null, fModLabs: null });
         break;
      case clTAttLine:
         extend$1(obj, { fLineColor: 1, fLineStyle: 1, fLineWidth: 1 });
         break;
      case clTAttFill:
         extend$1(obj, { fFillColor: 0, fFillStyle: 0 });
         break;
      case clTAttMarker:
         extend$1(obj, { fMarkerColor: 1, fMarkerStyle: 1, fMarkerSize: 1 });
         break;
      case clTLine:
         create$1(clTObject, obj);
         create$1(clTAttLine, obj);
         extend$1(obj, { fX1: 0, fX2: 1, fY1: 0, fY2: 1 });
         break;
      case clTBox:
         create$1(clTObject, obj);
         create$1(clTAttLine, obj);
         create$1(clTAttFill, obj);
         extend$1(obj, { fX1: 0, fX2: 1, fY1: 0, fY2: 1 });
         break;
      case clTPave:
         create$1(clTBox, obj);
         extend$1(obj, { fX1NDC: 0, fY1NDC: 0, fX2NDC: 1, fY2NDC: 1,
                       fBorderSize: 0, fInit: 1, fShadowColor: 1,
                       fCornerRadius: 0, fOption: 'brNDC', fName: '' });
         break;
      case clTAttText:
         extend$1(obj, { fTextAngle: 0, fTextSize: 0, fTextAlign: 22, fTextColor: 1, fTextFont: 42 });
         break;
      case clTPaveText:
         create$1(clTPave, obj);
         create$1(clTAttText, obj);
         extend$1(obj, { fLabel: '', fLongest: 27, fMargin: 0.05, fLines: create$1(clTList) });
         break;
      case clTPaveStats:
         create$1(clTPaveText, obj);
         extend$1(obj, { fFillColor: gStyle.fStatColor, fFillStyle: gStyle.fStatStyle,
                       fTextFont: gStyle.fStatFont, fTextSize: gStyle.fStatFontSize, fTextColor: gStyle.fStatTextColor,
                       fBorderSize: gStyle.fStatBorderSize,
                       fOptFit: 0, fOptStat: 0, fFitFormat: '', fStatFormat: '', fParent: null });
         break;
      case clTLegend:
         create$1(clTPave, obj);
         create$1(clTAttText, obj);
         extend$1(obj, { fColumnSeparation: 0, fEntrySeparation: 0.1, fMargin: 0.25, fNColumns: 1, fPrimitives: create$1(clTList), fName: clTPave,
                       fBorderSize: gStyle.fLegendBorderSize, fTextFont: gStyle.fLegendFont, fTextSize: gStyle.fLegendTextSize, fFillColor: gStyle.fLegendFillColor });
         break;
      case clTPaletteAxis:
         create$1(clTPave, obj);
         extend$1(obj, { fAxis: create$1(clTGaxis), fH: null, fName: clTPave });
         break;
      case clTLegendEntry:
         create$1(clTObject, obj);
         create$1(clTAttText, obj);
         create$1(clTAttLine, obj);
         create$1(clTAttFill, obj);
         create$1(clTAttMarker, obj);
         extend$1(obj, { fLabel: '', fObject: null, fOption: '', fTextAlign: 0, fTextColor: 0, fTextFont: 0 });
         break;
      case clTText:
         create$1(clTNamed, obj);
         create$1(clTAttText, obj);
         extend$1(obj, { fLimitFactorSize: 3, fOriginSize: 0.04 });
         break;
      case clTLatex:
         create$1(clTText, obj);
         create$1(clTAttLine, obj);
         extend$1(obj, { fX: 0, fY: 0 });
         break;
      case clTObjString:
         create$1(clTObject, obj);
         extend$1(obj, { fString: '' });
         break;
      case clTH1:
         create$1(clTNamed, obj);
         create$1(clTAttLine, obj);
         create$1(clTAttFill, obj);
         create$1(clTAttMarker, obj);
         extend$1(obj, { fBits: 8, fNcells: 0,
                       fXaxis: create$1(clTAxis), fYaxis: create$1(clTAxis), fZaxis: create$1(clTAxis),
                       fFillColor: gStyle.fHistFillColor, fFillStyle: gStyle.fHistFillStyle,
                       fLineColor: gStyle.fHistLineColor, fLineStyle: gStyle.fHistLineStyle, fLineWidth: gStyle.fHistLineWidth,
                       fBarOffset: 0, fBarWidth: 1000, fEntries: 0,
                       fTsumw: 0, fTsumw2: 0, fTsumwx: 0, fTsumwx2: 0,
                       fMaximum: kNoZoom, fMinimum: kNoZoom, fNormFactor: 0, fContour: [],
                       fSumw2: [], fOption: '', fFunctions: create$1(clTList),
                       fBufferSize: 0, fBuffer: [], fBinStatErrOpt: 0, fStatOverflows: 2 });
         break;
      case clTH1I:
      case clTH1D:
      case 'TH1L64':
      case 'TH1F':
      case 'TH1S':
      case 'TH1C':
         create$1(clTH1, obj);
         obj.fArray = [];
         break;
      case clTH2:
         create$1(clTH1, obj);
         extend$1(obj, { fScalefactor: 1, fTsumwy: 0, fTsumwy2: 0, fTsumwxy: 0 });
         break;
      case clTH2I:
      case 'TH2L64':
      case clTH2F:
      case 'TH2D':
      case 'TH2S':
      case 'TH2C':
         create$1(clTH2, obj);
         obj.fArray = [];
         break;
      case clTH3:
         create$1(clTH1, obj);
         extend$1(obj, { fTsumwy: 0, fTsumwy2: 0, fTsumwz: 0, fTsumwz2: 0, fTsumwxy: 0, fTsumwxz: 0, fTsumwyz: 0 });
         break;
      case 'TH3I':
      case 'TH3L64':
      case 'TH3F':
      case 'TH3D':
      case 'TH3S':
      case 'TH3C':
         create$1(clTH3, obj);
         obj.fArray = [];
         break;
      case clTHStack:
         create$1(clTNamed, obj);
         extend$1(obj, { fHists: create$1(clTList), fHistogram: null, fMaximum: kNoZoom, fMinimum: kNoZoom });
         break;
      case clTGraph:
         create$1(clTNamed, obj);
         create$1(clTAttLine, obj);
         create$1(clTAttFill, obj);
         create$1(clTAttMarker, obj);
         extend$1(obj, { fFunctions: create$1(clTList), fHistogram: null,
                       fMaxSize: 0, fMaximum: kNoZoom, fMinimum: kNoZoom, fNpoints: 0, fX: [], fY: [] });
         break;
      case 'TGraphAsymmErrors':
         create$1(clTGraph, obj);
         extend$1(obj, { fEXlow: [], fEXhigh: [], fEYlow: [], fEYhigh: [] });
         break;
      case clTMultiGraph:
         create$1(clTNamed, obj);
         extend$1(obj, { fFunctions: create$1(clTList), fGraphs: create$1(clTList),
                       fHistogram: null, fMaximum: kNoZoom, fMinimum: kNoZoom });
         break;
      case clTGraphPolargram:
         create$1(clTNamed, obj);
         create$1(clTAttText, obj);
         create$1(clTAttLine, obj);
         extend$1(obj, { fRadian: true, fDegree: false, fGrad: false, fPolarLabelColor: 1, fRadialLabelColor: 1,
                       fAxisAngle: 0, fPolarOffset: 0.04, fPolarTextSize: 0.04, fRadialOffset: 0.025, fRadialTextSize: 0.035,
                       fRwrmin: 0, fRwrmax: 1, fRwtmin: 0, fRwtmax: 2*Math.PI, fTickpolarSize: 0.02,
                       fPolarLabelFont: 62, fRadialLabelFont: 62, fCutRadial: 0, fNdivRad: 508, fNdivPol: 508 });
         break;
      case clTPolyLine:
         create$1(clTObject, obj);
         create$1(clTAttLine, obj);
         create$1(clTAttFill, obj);
         extend$1(obj, { fLastPoint: -1, fN: 0, fOption: '', fX: null, fY: null });
         break;
      case clTGaxis:
         create$1(clTLine, obj);
         create$1(clTAttText, obj);
         extend$1(obj, { fChopt: '', fFunctionName: '', fGridLength: 0,
                       fLabelColor: 1, fLabelFont: 42, fLabelOffset: 0.005, fLabelSize: 0.035,
                       fName: '', fNdiv: 12, fTickSize: 0.02, fTimeFormat: '',
                       fTitle: '', fTitleOffset: 1, fTitleSize: 0.035,
                       fWmax: 100, fWmin: 0 });
         break;
      case clTAttPad:
         extend$1(obj, { fLeftMargin: gStyle.fPadLeftMargin,
                       fRightMargin: gStyle.fPadRightMargin,
                       fBottomMargin: gStyle.fPadBottomMargin,
                       fTopMargin: gStyle.fPadTopMargin,
                       fXfile: 2, fYfile: 2, fAfile: 1, fXstat: 0.99, fYstat: 0.99, fAstat: 2,
                       fFrameFillColor: gStyle.fFrameFillColor,
                       fFrameFillStyle: gStyle.fFrameFillStyle,
                       fFrameLineColor: gStyle.fFrameLineColor,
                       fFrameLineWidth: gStyle.fFrameLineWidth,
                       fFrameLineStyle: gStyle.fFrameLineStyle,
                       fFrameBorderSize: gStyle.fFrameBorderSize,
                       fFrameBorderMode: gStyle.fFrameBorderMode });
         break;
      case clTPad:
         create$1(clTObject, obj);
         create$1(clTAttLine, obj);
         create$1(clTAttFill, obj);
         create$1(clTAttPad, obj);
         extend$1(obj, { fFillColor: gStyle.fPadColor, fFillStyle: 1001,
                       fX1: 0, fY1: 0, fX2: 1, fY2: 1, fXtoAbsPixelk: 1, fXtoPixelk: 1,
                       fXtoPixel: 1, fYtoAbsPixelk: 1, fYtoPixelk: 1, fYtoPixel: 1,
                       fUtoAbsPixelk: 1, fUtoPixelk: 1, fUtoPixel: 1, fVtoAbsPixelk: 1,
                       fVtoPixelk: 1, fVtoPixel: 1, fAbsPixeltoXk: 1, fPixeltoXk: 1,
                       fPixeltoX: 1, fAbsPixeltoYk: 1, fPixeltoYk: 1, fPixeltoY: 1,
                       fXlowNDC: 0, fYlowNDC: 0, fXUpNDC: 0, fYUpNDC: 0, fWNDC: 1, fHNDC: 1,
                       fAbsXlowNDC: 0, fAbsYlowNDC: 0, fAbsWNDC: 1, fAbsHNDC: 1,
                       fUxmin: 0, fUymin: 0, fUxmax: 0, fUymax: 0, fTheta: 30, fPhi: 30, fAspectRatio: 0,
                       fNumber: 0, fLogx: gStyle.fOptLogx, fLogy: gStyle.fOptLogy, fLogz: gStyle.fOptLogz,
                       fTickx: gStyle.fPadTickX, fTicky: gStyle.fPadTickY,
                       fPadPaint: 0, fCrosshair: 0, fCrosshairPos: 0, fBorderSize: gStyle.fPadBorderSize,
                       fBorderMode: gStyle.fPadBorderMode, fModified: false,
                       fGridx: gStyle.fPadGridX, fGridy: gStyle.fPadGridY,
                       fAbsCoord: false, fEditable: true, fFixedAspectRatio: false,
                       fPrimitives: create$1(clTList), fExecs: null,
                       fName: 'pad', fTitle: 'canvas' });
         break;
      case clTAttCanvas:
         extend$1(obj, { fXBetween: 2, fYBetween: 2, fTitleFromTop: 1.2,
                       fXdate: 0.2, fYdate: 0.3, fAdate: 1 });
         break;
      case clTCanvas:
         create$1(clTPad, obj);
         extend$1(obj, { fFillColor: gStyle.fCanvasColor, fFillStyle: 1001,
                       fNumPaletteColor: 0, fNextPaletteColor: 0, fDISPLAY: '$DISPLAY',
                       fDoubleBuffer: 0, fRetained: true, fXsizeUser: 0,
                       fYsizeUser: 0, fXsizeReal: 20, fYsizeReal: 10,
                       fWindowTopX: 0, fWindowTopY: 0, fWindowWidth: 0, fWindowHeight: 0,
                       fBorderSize: gStyle.fCanvasBorderSize, fBorderMode: gStyle.fCanvasBorderMode,
                       fCw: 500, fCh: 300, fCatt: create$1(clTAttCanvas),
                       kMoveOpaque: true, kResizeOpaque: true, fHighLightColor: 5,
                       fBatch: true, kShowEventStatus: false, kAutoExec: true, kMenuBar: true });
         break;
      case clTGeoVolume:
         create$1(clTNamed, obj);
         create$1(clTAttLine, obj);
         create$1(clTAttFill, obj);
         extend$1(obj, { fGeoAtt: 0, fFinder: null, fMedium: null, fNodes: null, fNtotal: 0, fNumber: 0, fRefCount: 0, fShape: null, fVoxels: null });
         break;
      case clTGeoNode:
         create$1(clTNamed, obj);
         extend$1(obj, { fGeoAtt: 0, fMother: null, fNovlp: 0, fNumber: 0, fOverlaps: null, fVolume: null });
         break;
      case clTGeoNodeMatrix:
         create$1(clTGeoNode, obj);
         extend$1(obj, { fMatrix: null });
         break;
      case 'TGeoTrack':
         create$1(clTObject, obj);
         create$1(clTAttLine, obj);
         create$1(clTAttMarker, obj);
         extend$1(obj, { fGeoAtt: 0, fNpoints: 0, fPoints: [] });
         break;
      case clTPolyLine3D:
         create$1(clTObject, obj);
         create$1(clTAttLine, obj);
         extend$1(obj, { fLastPoint: -1, fN: 0, fOption: '', fP: [] });
         break;
      case clTPolyMarker3D:
         create$1(clTObject, obj);
         create$1(clTAttMarker, obj);
         extend$1(obj, { fLastPoint: -1, fN: 0, fName: '', fOption: '', fP: [] });
         break;
   }

   obj._typename = typename;
   addMethods(obj, typename);
   return obj;
}

/** @summary variable used to keep methods for known classes
  * @private */
const methodsCache = {};

/** @summary Returns methods for given typename
  * @private */
function getMethods(typename, obj) {
   let m = methodsCache[typename];
   const has_methods = (m !== undefined);
   if (!has_methods) m = {};

   // Due to binary I/O such TObject methods may not be set for derived classes
   // Therefore when methods requested for given object, check also that basic methods are there
   if ((typename === clTObject) || (typename === clTNamed) || (obj?.fBits !== undefined)) {
      if (typeof m.TestBit === 'undefined') {
         m.TestBit = function(f) { return (this.fBits & f) !== 0; };
         m.InvertBit = function(f) { this.fBits = this.fBits ^ (f & 0xffffff); };
      }
   }

   if (has_methods) return m;

   if ((typename === clTList) || (typename === clTHashList)) {
      m.Clear = function() {
         this.arr = [];
         this.opt = [];
      };
      m.Add = function(obj, opt) {
         this.arr.push(obj);
         this.opt.push(isStr(opt) ? opt : '');
      };
      m.AddFirst = function(obj, opt) {
         this.arr.unshift(obj);
         this.opt.unshift(isStr(opt) ? opt : '');
      };
      m.RemoveAt = function(indx) {
         this.arr.splice(indx, 1);
         this.opt.splice(indx, 1);
      };
   }

   if ((typename === clTPaveText) || (typename === clTPaveStats)) {
      m.AddText = function(txt) {
         const line = create$1(clTLatex);
         line.fTitle = txt;
         line.fTextAlign = 0;
         line.fTextColor = 0;
         line.fTextFont = 0;
         line.fTextSize = 0;
         this.fLines.Add(line);
      };
      m.Clear = function() {
         this.fLines.Clear();
      };
   }

   if ((typename.indexOf(clTF1) === 0) || (typename === clTF2)) {
      m.addFormula = function(obj) {
         if (!obj) return;
         if (this.formulas === undefined) this.formulas = [];
         this.formulas.push(obj);
      };
      m.GetParName = function(n) {
         if (this.fParams?.fParNames)
            return this.fParams.fParNames[n];
         if (this.fFormula?.fParams) {
            for (let k = 0, arr = this.fFormula.fParams; k < arr.length; ++k) {
               if (arr[k].second === n)
                  return arr[k].first;
            }
         }
         return (this.fNames && this.fNames[n]) ? this.fNames[n] : `p${n}`;
      };
      m.GetParValue = function(n) {
         if (this.fParams?.fParameters) return this.fParams.fParameters[n];
         if (this.fFormula?.fClingParameters) return this.fFormula.fClingParameters[n];
         if (this.fParams) return this.fParams[n];
         return undefined;
      };
      m.GetParError = function(n) {
         return this.fParErrors ? this.fParErrors[n] : undefined;
      };
      m.GetNumPars = function() {
         return this.fNpar;
      };
   }

   if (((typename.indexOf(clTGraph) === 0) || (typename === clTCutG)) && (typename !== clTGraphPolargram) && (typename !== clTGraphTime)) {
      // check if point inside figure specified by the TGraph
      m.IsInside = function(xp, yp) {
         const x = this.fX, y = this.fY;
         let i = 0, j = this.fNpoints - 1, oddNodes = false;

         for (; i < this.fNpoints; ++i) {
            if ((y[i] < yp && y[j] >= yp) || (y[j] < yp && y[i] >= yp)) {
               if (x[i] + (yp - y[i])/(y[j] - y[i])*(x[j] - x[i]) < xp)
                  oddNodes = !oddNodes;
            }
            j = i;
         }

         return oddNodes;
      };
   }

   if (typename.indexOf(clTH1) === 0 || typename.indexOf(clTH2) === 0 || typename.indexOf(clTH3) === 0) {
      m.getBinError = function(bin) {
         //   -*-*-*-*-*Return value of error associated to bin number bin*-*-*-*-*
         //    if the sum of squares of weights has been defined (via Sumw2),
         //    this function returns the sqrt(sum of w2).
         //    otherwise it returns the sqrt(contents) for this bin.
         if (bin >= this.fNcells) bin = this.fNcells - 1;
         if (bin < 0) bin = 0;
         if (bin < this.fSumw2.length)
            return Math.sqrt(this.fSumw2[bin]);
         return Math.sqrt(Math.abs(this.fArray[bin]));
      };
      m.setBinContent = function(bin, content) {
         // Set bin content - only trivial case, without expansion
         this.fEntries++;
         this.fTsumw = 0;
         if ((bin >= 0) && (bin < this.fArray.length))
            this.fArray[bin] = content;
      };
   }

   if (typename.indexOf(clTH1) === 0) {
      m.getBin = function(x) { return x; };
      m.getBinContent = function(bin) { return this.fArray[bin]; };
      m.Fill = function(x, weight) {
         const a = this.fXaxis,
               bin = Math.max(0, 1 + Math.min(a.fNbins, Math.floor((x - a.fXmin) / (a.fXmax - a.fXmin) * a.fNbins)));
         this.fArray[bin] += weight ?? 1;
         this.fEntries++;
      };
   }

   if (typename.indexOf(clTH2) === 0) {
      m.getBin = function(x, y) { return (x + (this.fXaxis.fNbins+2) * y); };
      m.getBinContent = function(x, y) { return this.fArray[this.getBin(x, y)]; };
      m.Fill = function(x, y, weight) {
         const a1 = this.fXaxis, a2 = this.fYaxis,
               bin1 = Math.max(0, 1 + Math.min(a1.fNbins, Math.floor((x - a1.fXmin) / (a1.fXmax - a1.fXmin) * a1.fNbins))),
               bin2 = Math.max(0, 1 + Math.min(a2.fNbins, Math.floor((y - a2.fXmin) / (a2.fXmax - a2.fXmin) * a2.fNbins)));
         this.fArray[bin1 + (a1.fNbins + 2)*bin2] += weight ?? 1;
         this.fEntries++;
      };
   }

   if (typename.indexOf(clTH3) === 0) {
      m.getBin = function(x, y, z) { return (x + (this.fXaxis.fNbins+2) * (y + (this.fYaxis.fNbins+2) * z)); };
      m.getBinContent = function(x, y, z) { return this.fArray[this.getBin(x, y, z)]; };
      m.Fill = function(x, y, z, weight) {
         const a1 = this.fXaxis, a2 = this.fYaxis, a3 = this.fZaxis,
               bin1 = Math.max(0, 1 + Math.min(a1.fNbins, Math.floor((x - a1.fXmin) / (a1.fXmax - a1.fXmin) * a1.fNbins))),
               bin2 = Math.max(0, 1 + Math.min(a2.fNbins, Math.floor((y - a2.fXmin) / (a2.fXmax - a2.fXmin) * a2.fNbins))),
               bin3 = Math.max(0, 1 + Math.min(a3.fNbins, Math.floor((z - a3.fXmin) / (a3.fXmax - a3.fXmin) * a3.fNbins)));
         this.fArray[bin1 + (a1.fNbins + 2) * (bin2 + (a2.fNbins + 2)*bin3)] += weight ?? 1;
         this.fEntries++;
      };
   }

   if (typename === clTPad || typename === clTCanvas) {
      m.Divide = function(nx, ny, xmargin = 0.01, ymargin = 0.01) {
         if (!ny) {
            const ndiv = nx;
            if (ndiv < 2) return this;
            nx = ny = Math.round(Math.sqrt(ndiv));
            if (nx * ny < ndiv) nx += 1;
         }
         if (nx*ny < 2)
            return 0;
         this.fPrimitives.Clear();
         const dy = 1/ny, dx = 1/nx;
         let n = 0;
         for (let iy = 0; iy < ny; iy++) {
            const y2 = 1 - iy*dy - ymargin;
            let y1 = y2 - dy + 2*ymargin;
            if (y1 < 0) y1 = 0;
            if (y1 > y2) continue;
            for (let ix = 0; ix < nx; ix++) {
               const x1 = ix*dx + xmargin,
                     x2 = x1 + dx -2*xmargin;
               if (x1 > x2) continue;
               n++;
               const pad = create$1(clTPad);
               pad.fName = pad.fTitle = `${this.fName}_${n}`;
               pad.fNumber = n;
               if (this._typename !== clTCanvas) {
                  pad.fAbsWNDC = (x2-x1) * this.fAbsWNDC;
                  pad.fAbsHNDC = (y2-y1) * this.fAbsHNDC;
                  pad.fAbsXlowNDC = this.fAbsXlowNDC + x1 * this.fAbsWNDC;
                  pad.fAbsYlowNDC = this.fAbsYlowNDC + y1 * this.fAbsWNDC;
               } else {
                  pad.fAbsWNDC = x2 - x1;
                  pad.fAbsHNDC = y2 - y1;
                  pad.fAbsXlowNDC = x1;
                  pad.fAbsYlowNDC = y1;
               }

               this.fPrimitives.Add(pad);
            }
         }
         return nx * ny;
      };
      m.GetPad = function(number) {
         return this.fPrimitives.arr.find(elem => { return elem._typename === clTPad && elem.fNumber === number; });
      };
   }

   if (typename.indexOf(clTProfile) === 0) {
      if (typename === clTProfile3D) {
         m.getBin = function(x, y, z) { return (x + (this.fXaxis.fNbins+2) * (y + (this.fYaxis.fNbins+2) * z)); };
         m.getBinContent = function(x, y, z) {
            const bin = this.getBin(x, y, z);
            if (bin < 0 || bin >= this.fNcells || this.fBinEntries[bin] < 1e-300) return 0;
            return this.fArray ? this.fArray[bin]/this.fBinEntries[bin] : 0;
         };
         m.getBinEntries = function(x, y, z) {
            const bin = this.getBin(x, y, z);
            return (bin < 0) || (bin >= this.fNcells) ? 0 : this.fBinEntries[bin];
         };
      } else if (typename === clTProfile2D) {
         m.getBin = function(x, y) { return (x + (this.fXaxis.fNbins+2) * y); };
         m.getBinContent = function(x, y) {
            const bin = this.getBin(x, y);
            if (bin < 0 || bin >= this.fNcells) return 0;
            if (this.fBinEntries[bin] < 1e-300) return 0;
            if (!this.fArray) return 0;
            return this.fArray[bin]/this.fBinEntries[bin];
         };
         m.getBinEntries = function(x, y) {
            const bin = this.getBin(x, y);
            if (bin < 0 || bin >= this.fNcells) return 0;
            return this.fBinEntries[bin];
         };
      } else {
         m.getBin = function(x) { return x; };
         m.getBinContent = function(bin) {
            if (bin < 0 || bin >= this.fNcells) return 0;
            if (this.fBinEntries[bin] < 1e-300) return 0;
            if (!this.fArray) return 0;
            return this.fArray[bin]/this.fBinEntries[bin];
         };
      }
      m.getBinEffectiveEntries = function(bin) {
         if (bin < 0 || bin >= this.fNcells) return 0;
         const sumOfWeights = this.fBinEntries[bin];
         if (!this.fBinSumw2 || this.fBinSumw2.length !== this.fNcells)
            // this can happen  when reading an old file
            return sumOfWeights;
         const sumOfWeightsSquare = this.fBinSumw2[bin];
         return (sumOfWeightsSquare > 0) ? sumOfWeights * sumOfWeights / sumOfWeightsSquare : 0;
      };
      m.getBinError = function(bin) {
         if (bin < 0 || bin >= this.fNcells) return 0;
         const cont = this.fArray[bin],               // sum of bin w *y
               sum = this.fBinEntries[bin],          // sum of bin weights
               err2 = this.fSumw2[bin],               // sum of bin w * y^2
               neff = this.getBinEffectiveEntries(bin);  // (sum of w)^2 / (sum of w^2)
         if (sum < 1e-300) return 0;                  // for empty bins
         const EErrorType = { kERRORMEAN: 0, kERRORSPREAD: 1, kERRORSPREADI: 2, kERRORSPREADG: 3 };
         // case the values y are gaussian distributed y +/- sigma and w = 1/sigma^2
         if (this.fErrorMode === EErrorType.kERRORSPREADG)
            return 1.0/Math.sqrt(sum);
         // compute variance in y (eprim2) and standard deviation in y (eprim)
         const contsum = cont/sum, eprim = Math.sqrt(Math.abs(err2/sum - contsum**2));
         if (this.fErrorMode === EErrorType.kERRORSPREADI) {
            if (eprim !== 0) return eprim/Math.sqrt(neff);
            // in case content y is an integer (so each my has an error +/- 1/sqrt(12)
            // when the std(y) is zero
            return 1.0/Math.sqrt(12*neff);
         }
         // if approximate compute the sums (of w, wy and wy2) using all the bins
         //  when the variance in y is zero
         // case option 'S' return standard deviation in y
         if (this.fErrorMode === EErrorType.kERRORSPREAD) return eprim;
         // default case : fErrorMode = kERRORMEAN
         // return standard error on the mean of y
         return eprim/Math.sqrt(neff);
      };
   }

   if (typename === clTAxis) {
      m.GetBinLowEdge = function(bin) {
         if (this.fNbins <= 0) return 0;
         if ((this.fXbins.length > 0) && (bin > 0) && (bin <= this.fNbins)) return this.fXbins[bin-1];
         return this.fXmin + (bin-1) * (this.fXmax - this.fXmin) / this.fNbins;
      };
      m.GetBinCenter = function(bin) {
         if (this.fNbins <= 0) return 0;
         if ((this.fXbins.length > 0) && (bin > 0) && (bin < this.fNbins)) return (this.fXbins[bin-1] + this.fXbins[bin])/2;
         return this.fXmin + (bin-0.5) * (this.fXmax - this.fXmin) / this.fNbins;
      };
   }

   if (typename.indexOf('ROOT::Math::LorentzVector') === 0) {
      m.Px = m.X = function() { return this.fCoordinates.Px(); };
      m.Py = m.Y = function() { return this.fCoordinates.Py(); };
      m.Pz = m.Z = function() { return this.fCoordinates.Pz(); };
      m.E = m.T = function() { return this.fCoordinates.E(); };
      m.M2 = function() { return this.fCoordinates.M2(); };
      m.M = function() { return this.fCoordinates.M(); };
      m.R = m.P = function() { return this.fCoordinates.R(); };
      m.P2 = function() { return this.P() * this.P(); };
      m.Pt = m.pt = function() { return Math.sqrt(this.P2()); };
      m.Phi = m.phi = function() { return Math.atan2(this.fCoordinates.Py(), this.fCoordinates.Px()); };
      m.Eta = m.eta = function() { return Math.atanh(this.Pz()/this.P()); };
   }

   if (typename.indexOf('ROOT::Math::PxPyPzE4D') === 0) {
      m.Px = m.X = function() { return this.fX; };
      m.Py = m.Y = function() { return this.fY; };
      m.Pz = m.Z = function() { return this.fZ; };
      m.E = m.T = function() { return this.fT; };
      m.P2 = function() { return this.fX**2 + this.fY**2 + this.fZ**2; };
      m.R = m.P = function() { return Math.sqrt(this.P2()); };
      m.Mag2 = m.M2 = function() { return this.fT**2 - this.fX**2 - this.fY**2 - this.fZ**2; };
      m.Mag = m.M = function() { return (this.M2() >= 0) ? Math.sqrt(this.M2()) : -Math.sqrt(-this.M2()); };
      m.Perp2 = m.Pt2 = function() { return this.fX**2 + this.fY**2; };
      m.Pt = m.pt = function() { return Math.sqrt(this.P2()); };
      m.Phi = m.phi = function() { return Math.atan2(this.fY, this.fX); };
      m.Eta = m.eta = function() { return Math.atanh(this.Pz/this.P()); };
   }

   methodsCache[typename] = m;
   return m;
}

gStyle.fXaxis = create$1(clTAttAxis);
gStyle.fYaxis = create$1(clTAttAxis);
gStyle.fZaxis = create$1(clTAttAxis);

/** @summary Check if argument is a not-null Object
  * @private */
function isObject(arg) { return arg && typeof arg === 'object'; }

/** @summary Check if argument is a Function
  * @private */
function isFunc(arg) { return typeof arg === 'function'; }

/** @summary Check if argument is a atring
  * @private */
function isStr(arg) { return typeof arg === 'string'; }

const clTStreamerElement = 'TStreamerElement', clTStreamerObject = 'TStreamerObject',
      clTStreamerSTL = 'TStreamerSTL', clTStreamerInfoList = 'TStreamerInfoList',
      clTDirectory = 'TDirectory', clTDirectoryFile = 'TDirectoryFile',
      clTQObject = 'TQObject', clTBasket = 'TBasket', clTDatime = 'TDatime',
      nameStreamerInfo = 'StreamerInfo',

      kChar = 1, kShort = 2, kInt = 3, kLong = 4, kFloat = 5, kCounter = 6,
      kCharStar = 7, kDouble = 8, kDouble32 = 9, kLegacyChar = 10,
      kUChar = 11, kUShort = 12, kUInt = 13, kULong = 14, kBits = 15,
      kLong64 = 16, kULong64 = 17, kBool = 18, kFloat16 = 19,

      kBase = 0, kOffsetL = 20, kOffsetP = 40,
      kObject = 61, kAny = 62, kObjectp = 63, kObjectP = 64, kTString = 65,
      kTObject = 66, kTNamed = 67, kAnyp = 68, kAnyP = 69,

      kStreamer = 500, kStreamLoop = 501,

      kMapOffset = 2, kByteCountMask = 0x40000000, kNewClassTag = 0xFFFFFFFF, kClassMask = 0x80000000,

      // constants of bits in version
      kStreamedMemberWise = BIT(14),

      // constants used for coding type of STL container
      kNotSTL = 0, kSTLvector = 1, kSTLlist = 2, kSTLdeque = 3, kSTLmap = 4, kSTLmultimap = 5,
      kSTLset = 6, kSTLmultiset = 7, kSTLbitset = 8,
      // kSTLforwardlist = 9, kSTLunorderedset = 10, kSTLunorderedmultiset = 11, kSTLunorderedmap = 12,
      // kSTLunorderedmultimap = 13, kSTLend = 14

      // name of base IO types
      BasicTypeNames = ['BASE', 'char', 'short', 'int', 'long', 'float', 'int', 'const char*', 'double', 'Double32_t',
                        'char', 'unsigned  char', 'unsigned short', 'unsigned', 'unsigned long', 'unsigned', 'Long64_t', 'ULong64_t', 'bool', 'Float16_t'],

      // names of STL containers
      StlNames = ['', 'vector', 'list', 'deque', 'map', 'multimap', 'set', 'multiset', 'bitset'],

      // TObject bits
      kIsReferenced = BIT(4), kHasUUID = BIT(5),


/** @summary Custom streamers for root classes
  * @desc map of user-streamer function like func(buf,obj)
  * or alias (classname) which can be used to read that function
  * or list of read functions
  * @private */
CustomStreamers = {
   TObject(buf, obj) {
      obj.fUniqueID = buf.ntou4();
      obj.fBits = buf.ntou4();
      if (obj.fBits & kIsReferenced) buf.ntou2(); // skip pid
   },

   TNamed: [{
      basename: clTObject, base: 1, func(buf, obj) {
         if (!obj._typename) obj._typename = clTNamed;
         buf.classStreamer(obj, clTObject);
      }
     },
     { name: 'fName', func(buf, obj) { obj.fName = buf.readTString(); } },
     { name: 'fTitle', func(buf, obj) { obj.fTitle = buf.readTString(); } }
   ],

   TObjString: [{
      basename: clTObject, base: 1, func(buf, obj) {
         if (!obj._typename) obj._typename = clTObjString;
         buf.classStreamer(obj, clTObject);
      }
     },
     { name: 'fString', func(buf, obj) { obj.fString = buf.readTString(); } }
   ],

   TClonesArray(buf, list) {
      if (!list._typename) list._typename = clTClonesArray;
      list.$kind = clTClonesArray;
      list.name = '';
      const ver = buf.last_read_version;
      if (ver > 2) buf.classStreamer(list, clTObject);
      if (ver > 1) list.name = buf.readTString();
      let classv = buf.readTString(), clv = 0;
      const pos = classv.lastIndexOf(';');

      if (pos > 0) {
         clv = Number.parseInt(classv.slice(pos + 1));
         classv = classv.slice(0, pos);
      }

      let nobjects = buf.ntou4();
      if (nobjects < 0) nobjects = -nobjects;  // for backward compatibility

      list.arr = new Array(nobjects);
      list.fLast = nobjects - 1;
      list.fLowerBound = buf.ntou4();

      let streamer = buf.fFile.getStreamer(classv, { val: clv });
      streamer = buf.fFile.getSplittedStreamer(streamer);

      if (!streamer)
         console.log(`Cannot get member-wise streamer for ${classv}:${clv}`);
      else {
         // create objects
         for (let n = 0; n < nobjects; ++n)
            list.arr[n] = { _typename: classv };

         // call streamer for all objects member-wise
         for (let k = 0; k < streamer.length; ++k) {
            for (let n = 0; n < nobjects; ++n)
               streamer[k].func(buf, list.arr[n]);
         }
      }
   },

   TMap(buf, map) {
      if (!map._typename) map._typename = clTMap;
      map.name = '';
      map.arr = [];
      const ver = buf.last_read_version;
      if (ver > 2) buf.classStreamer(map, clTObject);
      if (ver > 1) map.name = buf.readTString();

      const nobjects = buf.ntou4();
      // create objects
      for (let n = 0; n < nobjects; ++n) {
         const obj = { _typename: 'TPair' };
         obj.first = buf.readObjectAny();
         obj.second = buf.readObjectAny();
         if (obj.first) map.arr.push(obj);
      }
   },

   TTreeIndex(buf, obj) {
      const ver = buf.last_read_version;
      obj._typename = 'TTreeIndex';
      buf.classStreamer(obj, 'TVirtualIndex');
      obj.fMajorName = buf.readTString();
      obj.fMinorName = buf.readTString();
      obj.fN = buf.ntoi8();
      obj.fIndexValues = buf.readFastArray(obj.fN, kLong64);
      if (ver > 1) obj.fIndexValuesMinor = buf.readFastArray(obj.fN, kLong64);
      obj.fIndex = buf.readFastArray(obj.fN, kLong64);
   },

   TRefArray(buf, obj) {
      obj._typename = 'TRefArray';
      buf.classStreamer(obj, clTObject);
      obj.name = buf.readTString();
      const nobj = buf.ntoi4();
      obj.fLast = nobj - 1;
      obj.fLowerBound = buf.ntoi4();
      /* const pidf = */ buf.ntou2();
      obj.fUIDs = buf.readFastArray(nobj, kUInt);
   },

   TCanvas(buf, obj) {
      obj._typename = clTCanvas;
      buf.classStreamer(obj, clTPad);
      obj.fDISPLAY = buf.readTString();
      obj.fDoubleBuffer = buf.ntoi4();
      obj.fRetained = (buf.ntou1() !== 0);
      obj.fXsizeUser = buf.ntoi4();
      obj.fYsizeUser = buf.ntoi4();
      obj.fXsizeReal = buf.ntoi4();
      obj.fYsizeReal = buf.ntoi4();
      obj.fWindowTopX = buf.ntoi4();
      obj.fWindowTopY = buf.ntoi4();
      obj.fWindowWidth = buf.ntoi4();
      obj.fWindowHeight = buf.ntoi4();
      obj.fCw = buf.ntou4();
      obj.fCh = buf.ntou4();
      obj.fCatt = buf.classStreamer({}, clTAttCanvas);
      buf.ntou1(); // ignore b << TestBit(kMoveOpaque);
      buf.ntou1(); // ignore b << TestBit(kResizeOpaque);
      obj.fHighLightColor = buf.ntoi2();
      obj.fBatch = (buf.ntou1() !== 0);
      buf.ntou1();   // ignore b << TestBit(kShowEventStatus);
      buf.ntou1();   // ignore b << TestBit(kAutoExec);
      buf.ntou1();   // ignore b << TestBit(kMenuBar);
   },

   TObjArray(buf, list) {
      if (!list._typename) list._typename = clTObjArray;
      list.$kind = clTObjArray;
      list.name = '';
      const ver = buf.last_read_version;
      if (ver > 2)
         buf.classStreamer(list, clTObject);
      if (ver > 1)
         list.name = buf.readTString();
      const nobjects = buf.ntou4();
      let i = 0;
      list.arr = new Array(nobjects);
      list.fLast = nobjects - 1;
      list.fLowerBound = buf.ntou4();
      while (i < nobjects)
         list.arr[i++] = buf.readObjectAny();
   },

   TPolyMarker3D(buf, marker) {
      const ver = buf.last_read_version;
      buf.classStreamer(marker, clTObject);
      buf.classStreamer(marker, clTAttMarker);
      marker.fN = buf.ntoi4();
      marker.fP = buf.readFastArray(marker.fN * 3, kFloat);
      marker.fOption = buf.readTString();
      marker.fName = (ver > 1) ? buf.readTString() : clTPolyMarker3D;
   },

   TPolyLine3D(buf, obj) {
      buf.classStreamer(obj, clTObject);
      buf.classStreamer(obj, clTAttLine);
      obj.fN = buf.ntoi4();
      obj.fP = buf.readFastArray(obj.fN * 3, kFloat);
      obj.fOption = buf.readTString();
   },

   TStreamerInfo(buf, obj) {
      buf.classStreamer(obj, clTNamed);
      obj.fCheckSum = buf.ntou4();
      obj.fClassVersion = buf.ntou4();
      obj.fElements = buf.readObjectAny();
   },

   TStreamerElement(buf, element) {
      const ver = buf.last_read_version;
      buf.classStreamer(element, clTNamed);
      element.fType = buf.ntou4();
      element.fSize = buf.ntou4();
      element.fArrayLength = buf.ntou4();
      element.fArrayDim = buf.ntou4();
      element.fMaxIndex = buf.readFastArray((ver === 1) ? buf.ntou4() : 5, kUInt);
      element.fTypeName = buf.readTString();

      if ((element.fType === kUChar) && ((element.fTypeName === 'Bool_t') || (element.fTypeName === 'bool')))
         element.fType = kBool;

      element.fXmin = element.fXmax = element.fFactor = 0;
      if (ver === 3) {
         element.fXmin = buf.ntod();
         element.fXmax = buf.ntod();
         element.fFactor = buf.ntod();
      } else if ((ver > 3) && (element.fBits & BIT(6))) { // kHasRange
         let p1 = element.fTitle.indexOf('[');
         if ((p1 >= 0) && (element.fType > kOffsetP))
            p1 = element.fTitle.indexOf('[', p1 + 1);
         const p2 = element.fTitle.indexOf(']', p1 + 1);

         if ((p1 >= 0) && (p2 >= p1 + 2)) {
            const arr = element.fTitle.slice(p1+1, p2).split(',');
            let nbits = 32;
            if (!arr || arr.length < 2)
               throw new Error(`Problem to decode range setting from streamer element title ${element.fTitle}`);

            if (arr.length === 3) nbits = parseInt(arr[2]);
            if (!Number.isInteger(nbits) || (nbits < 2) || (nbits > 32)) nbits = 32;

            const parse_range = val => {
               if (!val) return 0;
               if (val.indexOf('pi') < 0) return parseFloat(val);
               val = val.trim();
               let sign = 1;
               if (val[0] === '-') { sign = -1; val = val.slice(1); }
               switch (val) {
                  case '2pi':
                  case '2*pi':
                  case 'twopi': return sign * 2 * Math.PI;
                  case 'pi/2': return sign * Math.PI / 2;
                  case 'pi/4': return sign * Math.PI / 4;
               }
               return sign * Math.PI;
            };

            element.fXmin = parse_range(arr[0]);
            element.fXmax = parse_range(arr[1]);

            // avoid usage of 1 << nbits, while only works up to 32 bits
            const bigint = ((nbits >= 0) && (nbits < 32)) ? Math.pow(2, nbits) : 0xffffffff;
            if (element.fXmin < element.fXmax)
               element.fFactor = bigint / (element.fXmax - element.fXmin);
            else if (nbits < 15)
               element.fXmin = nbits;
         }
      }
   },

   TStreamerBase(buf, elem) {
      const ver = buf.last_read_version;
      buf.classStreamer(elem, clTStreamerElement);
      if (ver > 2) elem.fBaseVersion = buf.ntou4();
   },

   TStreamerSTL(buf, elem) {
      buf.classStreamer(elem, clTStreamerElement);
      elem.fSTLtype = buf.ntou4();
      elem.fCtype = buf.ntou4();

      if ((elem.fSTLtype === kSTLmultimap) &&
         ((elem.fTypeName.indexOf('std::set') === 0) ||
            (elem.fTypeName.indexOf('set') === 0))) elem.fSTLtype = kSTLset;

      if ((elem.fSTLtype === kSTLset) &&
         ((elem.fTypeName.indexOf('std::multimap') === 0) ||
            (elem.fTypeName.indexOf('multimap') === 0))) elem.fSTLtype = kSTLmultimap;
   },

   TStreamerSTLstring(buf, elem) {
      if (buf.last_read_version > 0)
         buf.classStreamer(elem, clTStreamerSTL);
   },

   TList(buf, obj) {
      // stream all objects in the list from the I/O buffer
      if (!obj._typename) obj._typename = this.typename;
      obj.$kind = clTList; // all derived classes will be marked as well
      if (buf.last_read_version > 3) {
         buf.classStreamer(obj, clTObject);
         obj.name = buf.readTString();
         const nobjects = buf.ntou4();
         obj.arr = new Array(nobjects);
         obj.opt = new Array(nobjects);
         for (let i = 0; i < nobjects; ++i) {
            obj.arr[i] = buf.readObjectAny();
            obj.opt[i] = buf.readTString();
         }
      } else {
         obj.name = '';
         obj.arr = [];
         obj.opt = [];
      }
   },

   THashList: clTList,

   TStreamerLoop(buf, elem) {
      if (buf.last_read_version > 1) {
         buf.classStreamer(elem, clTStreamerElement);
         elem.fCountVersion = buf.ntou4();
         elem.fCountName = buf.readTString();
         elem.fCountClass = buf.readTString();
      }
   },

   TStreamerBasicPointer: 'TStreamerLoop',

   TStreamerObject(buf, elem) {
      if (buf.last_read_version > 1)
         buf.classStreamer(elem, clTStreamerElement);
   },

   TStreamerBasicType: clTStreamerObject,
   TStreamerObjectAny: clTStreamerObject,
   TStreamerString: clTStreamerObject,
   TStreamerObjectPointer: clTStreamerObject,

   TStreamerObjectAnyPointer(buf, elem) {
      if (buf.last_read_version > 0)
         buf.classStreamer(elem, clTStreamerElement);
   },

   TTree: {
      name: '$file',
      func(buf, obj) { obj.$kind = 'TTree'; obj.$file = buf.fFile; }
   },

   RooRealVar(buf, obj) {
      const v = buf.last_read_version;
      buf.classStreamer(obj, 'RooAbsRealLValue');
      if (v === 1) { buf.ntod(); buf.ntod(); buf.ntoi4(); } // skip fitMin, fitMax, fitBins
      obj._error = buf.ntod();
      obj._asymErrLo = buf.ntod();
      obj._asymErrHi = buf.ntod();
      if (v >= 2) obj._binning = buf.readObjectAny();
      if (v === 3) obj._sharedProp = buf.readObjectAny();
      if (v >= 4) obj._sharedProp = buf.classStreamer({}, 'RooRealVarSharedProperties');
   },

   RooAbsBinning(buf, obj) {
      buf.classStreamer(obj, (buf.last_read_version === 1) ? clTObject : clTNamed);
      buf.classStreamer(obj, 'RooPrintable');
   },

   RooCategory(buf, obj) {
      const v = buf.last_read_version;
      buf.classStreamer(obj, 'RooAbsCategoryLValue');
      obj._sharedProp = (v === 1) ? buf.readObjectAny() : buf.classStreamer({}, 'RooCategorySharedProperties');
   },

   'RooWorkspace::CodeRepo': (buf /* , obj */) => {
      const sz = (buf.last_read_version === 2) ? 3 : 2;
      for (let i = 0; i < sz; ++i) {
         let cnt = buf.ntoi4() * ((i === 0) ? 4 : 3);
         while (cnt--) buf.readTString();
      }
   },

   RooLinkedList(buf, obj) {
      const v = buf.last_read_version;
      buf.classStreamer(obj, clTObject);
      let size = buf.ntoi4();
      obj.arr = create$1(clTList);
      while (size--)
         obj.arr.Add(buf.readObjectAny());
      if (v > 1) obj._name = buf.readTString();
   },

   TImagePalette: [
      {
         basename: clTObject, base: 1, func(buf, obj) {
            if (!obj._typename) obj._typename = clTImagePalette;
            buf.classStreamer(obj, clTObject);
         }
      },
      { name: 'fNumPoints', func(buf, obj) { obj.fNumPoints = buf.ntou4(); } },
      { name: 'fPoints', func(buf, obj) { obj.fPoints = buf.readFastArray(obj.fNumPoints, kDouble); } },
      { name: 'fColorRed', func(buf, obj) { obj.fColorRed = buf.readFastArray(obj.fNumPoints, kUShort); } },
      { name: 'fColorGreen', func(buf, obj) { obj.fColorGreen = buf.readFastArray(obj.fNumPoints, kUShort); } },
      { name: 'fColorBlue', func(buf, obj) { obj.fColorBlue = buf.readFastArray(obj.fNumPoints, kUShort); } },
      { name: 'fColorAlpha', func(buf, obj) { obj.fColorAlpha = buf.readFastArray(obj.fNumPoints, kUShort); } }
   ],

   TAttImage: [
      { name: 'fImageQuality', func(buf, obj) { obj.fImageQuality = buf.ntoi4(); } },
      { name: 'fImageCompression', func(buf, obj) { obj.fImageCompression = buf.ntou4(); } },
      { name: 'fConstRatio', func(buf, obj) { obj.fConstRatio = (buf.ntou1() !== 0); } },
      { name: 'fPalette', func(buf, obj) { obj.fPalette = buf.classStreamer({}, clTImagePalette); } }
   ],

   TASImage(buf, obj) {
      if ((buf.last_read_version === 1) && (buf.fFile.fVersion > 0) && (buf.fFile.fVersion < 50000))
         return console.warn('old TASImage version - not yet supported');

      buf.classStreamer(obj, clTNamed);

      if (buf.ntou1() !== 0) {
         const size = buf.ntoi4();
         obj.fPngBuf = buf.readFastArray(size, kUChar);
      } else {
         buf.classStreamer(obj, 'TAttImage');
         obj.fWidth = buf.ntoi4();
         obj.fHeight = buf.ntoi4();
         obj.fImgBuf = buf.readFastArray(obj.fWidth * obj.fHeight, kDouble);
      }
   },

   TMaterial(buf, obj) {
      const v = buf.last_read_version;
      buf.classStreamer(obj, clTNamed);
      obj.fNumber = buf.ntoi4();
      obj.fA = buf.ntof();
      obj.fZ = buf.ntof();
      obj.fDensity = buf.ntof();
      if (v > 2) {
         buf.classStreamer(obj, clTAttFill);
         obj.fRadLength = buf.ntof();
         obj.fInterLength = buf.ntof();
      } else
         obj.fRadLength = obj.fInterLength = 0;
   },

   TMixture(buf, obj) {
      buf.classStreamer(obj, 'TMaterial');
      obj.fNmixt = buf.ntoi4();
      obj.fAmixt = buf.readFastArray(buf.ntoi4(), kFloat);
      obj.fZmixt = buf.readFastArray(buf.ntoi4(), kFloat);
      obj.fWmixt = buf.readFastArray(buf.ntoi4(), kFloat);
   },

   TVirtualPerfStats: clTObject, // use directly TObject streamer

   TMethodCall: clTObject
};

function getTDatimeDate() {
   const res = new Date();
   res.setFullYear((this.fDatime >>> 26) + 1995);
   res.setMonth(((this.fDatime << 6) >>> 28) - 1);
   res.setDate((this.fDatime << 10) >>> 27);
   res.setHours((this.fDatime << 15) >>> 27);
   res.setMinutes((this.fDatime << 20) >>> 26);
   res.setSeconds((this.fDatime << 26) >>> 26);
   res.setMilliseconds(0);
   return res;
}


/** @summary these are streamers which do not handle version regularly
  * @desc used for special classes like TRef or TBasket
  * @private */
const DirectStreamers = {
   // do nothing for these classes
   TQObject() {},
   TGraphStruct() {},
   TGraphNode() {},
   TGraphEdge() {},

   TDatime(buf, obj) {
      obj.fDatime = buf.ntou4();
      obj.getDate = getTDatimeDate;
   },

   TKey(buf, key) {
      key.fNbytes = buf.ntoi4();
      key.fVersion = buf.ntoi2();
      key.fObjlen = buf.ntou4();
      key.fDatime = buf.classStreamer({}, clTDatime);
      key.fKeylen = buf.ntou2();
      key.fCycle = buf.ntou2();
      if (key.fVersion > 1000) {
         key.fSeekKey = buf.ntou8();
         buf.shift(8); // skip seekPdir
      } else {
         key.fSeekKey = buf.ntou4();
         buf.shift(4); // skip seekPdir
      }
      key.fClassName = buf.readTString();
      key.fName = buf.readTString();
      key.fTitle = buf.readTString();
   },

   TDirectory(buf, dir) {
      const version = buf.ntou2();
      dir.fDatimeC = buf.classStreamer({}, clTDatime);
      dir.fDatimeM = buf.classStreamer({}, clTDatime);
      dir.fNbytesKeys = buf.ntou4();
      dir.fNbytesName = buf.ntou4();
      dir.fSeekDir = (version > 1000) ? buf.ntou8() : buf.ntou4();
      dir.fSeekParent = (version > 1000) ? buf.ntou8() : buf.ntou4();
      dir.fSeekKeys = (version > 1000) ? buf.ntou8() : buf.ntou4();
      // if ((version % 1000) > 2) buf.shift(18); // skip fUUID
   },

   TBasket(buf, obj) {
      buf.classStreamer(obj, clTKey);
      const ver = buf.readVersion();
      obj.fBufferSize = buf.ntoi4();
      obj.fNevBufSize = buf.ntoi4();
      obj.fNevBuf = buf.ntoi4();
      obj.fLast = buf.ntoi4();
      if (obj.fLast > obj.fBufferSize) obj.fBufferSize = obj.fLast;
      const flag = buf.ntoi1();

      if (flag === 0) return;

      if ((flag % 10) !== 2) {
         if (obj.fNevBuf) {
            obj.fEntryOffset = buf.readFastArray(buf.ntoi4(), kInt);
            if ((flag > 20) && (flag < 40)) {
               for (let i = 0, kDisplacementMask = 0xFF000000; i < obj.fNevBuf; ++i)
                  obj.fEntryOffset[i] &= ~kDisplacementMask;
            }
         }

         if (flag > 40)
            obj.fDisplacement = buf.readFastArray(buf.ntoi4(), kInt);
      }

      if ((flag === 1) || (flag > 10)) {
         // here is reading of raw data
         const sz = (ver.val <= 1) ? buf.ntoi4() : obj.fLast;

         if (sz > obj.fKeylen) {
            // buffer includes again complete TKey data - exclude it
            const blob = buf.extract([buf.o + obj.fKeylen, sz - obj.fKeylen]);
            obj.fBufferRef = new TBuffer(blob, 0, buf.fFile, sz - obj.fKeylen);
            obj.fBufferRef.fTagOffset = obj.fKeylen;
         }

         buf.shift(sz);
      }
   },

   TRef(buf, obj) {
      buf.classStreamer(obj, clTObject);
      if (obj.fBits & kHasUUID)
         obj.fUUID = buf.readTString();
      else
         obj.fPID = buf.ntou2();
   },

   'TMatrixTSym<float>': (buf, obj) => {
      buf.classStreamer(obj, 'TMatrixTBase<float>');
      obj.fElements = new Float32Array(obj.fNelems);
      const arr = buf.readFastArray((obj.fNrows * (obj.fNcols + 1)) / 2, kFloat);
      for (let i = 0, cnt = 0; i < obj.fNrows; ++i) {
         for (let j = i; j < obj.fNcols; ++j)
            obj.fElements[j * obj.fNcols + i] = obj.fElements[i * obj.fNcols + j] = arr[cnt++];
      }
   },

   'TMatrixTSym<double>': (buf, obj) => {
      buf.classStreamer(obj, 'TMatrixTBase<double>');
      obj.fElements = new Float64Array(obj.fNelems);
      const arr = buf.readFastArray((obj.fNrows * (obj.fNcols + 1)) / 2, kDouble);
      for (let i = 0, cnt = 0; i < obj.fNrows; ++i) {
         for (let j = i; j < obj.fNcols; ++j)
            obj.fElements[j * obj.fNcols + i] = obj.fElements[i * obj.fNcols + j] = arr[cnt++];
      }
   }
};


/** @summary Returns type id by its name
  * @private */
function getTypeId(typname, norecursion) {
   switch (typname) {
      case 'bool':
      case 'Bool_t': return kBool;
      case 'char':
      case 'signed char':
      case 'Char_t': return kChar;
      case 'Color_t':
      case 'Style_t':
      case 'Width_t':
      case 'short':
      case 'Short_t': return kShort;
      case 'int':
      case 'EErrorType':
      case 'Int_t': return kInt;
      case 'long':
      case 'Long_t': return kLong;
      case 'float':
      case 'Float_t': return kFloat;
      case 'double':
      case 'Double_t': return kDouble;
      case 'unsigned char':
      case 'UChar_t': return kUChar;
      case 'unsigned short':
      case 'UShort_t': return kUShort;
      case 'unsigned':
      case 'unsigned int':
      case 'UInt_t': return kUInt;
      case 'unsigned long':
      case 'ULong_t': return kULong;
      case 'int64_t':
      case 'long long':
      case 'Long64_t': return kLong64;
      case 'uint64_t':
      case 'unsigned long long':
      case 'ULong64_t': return kULong64;
      case 'Double32_t': return kDouble32;
      case 'Float16_t': return kFloat16;
      case 'char*':
      case 'const char*':
      case 'const Char_t*': return kCharStar;
   }

   if (!norecursion) {
      const replace = CustomStreamers[typname];
      if (isStr(replace)) return getTypeId(replace, true);
   }

   return -1;
}

/** @summary create element of the streamer
  * @private  */
function createStreamerElement(name, typename, file) {
   const elem = {
      _typename: clTStreamerElement, fName: name, fTypeName: typename,
      fType: 0, fSize: 0, fArrayLength: 0, fArrayDim: 0, fMaxIndex: [0, 0, 0, 0, 0],
      fXmin: 0, fXmax: 0, fFactor: 0
   };

   if (isStr(typename)) {
      elem.fType = getTypeId(typename);
      if ((elem.fType < 0) && file && file.fBasicTypes[typename])
         elem.fType = file.fBasicTypes[typename];
   } else {
      elem.fType = typename;
      typename = elem.fTypeName = BasicTypeNames[elem.fType] || 'int';
   }

   if (elem.fType > 0) return elem; // basic type

   // check if there are STL containers
   const pos = typename.indexOf('<');
   let stltype = kNotSTL;
   if ((pos > 0) && (typename.indexOf('>') > pos + 2)) {
      for (let stl = 1; stl < StlNames.length; ++stl) {
         if (typename.slice(0, pos) === StlNames[stl]) {
            stltype = stl; break;
         }
      }
   }

   if (stltype !== kNotSTL) {
      elem._typename = clTStreamerSTL;
      elem.fType = kStreamer;
      elem.fSTLtype = stltype;
      elem.fCtype = 0;
      return elem;
   }

   const isptr = (typename.lastIndexOf('*') === typename.length - 1);

   if (isptr)
      elem.fTypeName = typename = typename.slice(0, typename.length - 1);

   if (getArrayKind(typename) === 0) {
      elem.fType = kTString;
      return elem;
   }

   elem.fType = isptr ? kAnyP : kAny;

   return elem;
}


/** @summary Function creates streamer for std::pair object
  * @private */
function getPairStreamer(si, typname, file) {
   if (!si) {
      if (typname.indexOf('pair') !== 0) return null;

      si = file.findStreamerInfo(typname);

      if (!si) {
         let p1 = typname.indexOf('<');
         const p2 = typname.lastIndexOf('>');
         function GetNextName() {
            let res = '', p = p1 + 1, cnt = 0;
            while ((p < p2) && (cnt >= 0)) {
               switch (typname[p]) {
                  case '<': cnt++; break;
                  case ',': if (cnt === 0) cnt--; break;
                  case '>': cnt--; break;
               }
               if (cnt >= 0) res += typname[p];
               p++;
            }
            p1 = p - 1;
            return res.trim();
         }
         si = { _typename: 'TStreamerInfo', fVersion: 1, fName: typname, fElements: create$1(clTList) };
         si.fElements.Add(createStreamerElement('first', GetNextName(), file));
         si.fElements.Add(createStreamerElement('second', GetNextName(), file));
      }
   }

   const streamer = file.getStreamer(typname, null, si);
   if (!streamer) return null;

   if (streamer.length !== 2) {
      console.error(`Streamer for pair class contains ${streamer.length} elements`);
      return null;
   }

   for (let nn = 0; nn < 2; ++nn) {
      if (streamer[nn].readelem && !streamer[nn].pair_name) {
         streamer[nn].pair_name = (nn === 0) ? 'first' : 'second';
         streamer[nn].func = function(buf, obj) {
            obj[this.pair_name] = this.readelem(buf);
         };
      }
   }

   return streamer;
}


/** @summary create member entry for streamer element
  * @desc used for reading of data
  * @private */
function createMemberStreamer(element, file) {
   const member = {
      name: element.fName, type: element.fType,
      fArrayLength: element.fArrayLength,
      fArrayDim: element.fArrayDim,
      fMaxIndex: element.fMaxIndex
   };

   if (element.fTypeName === 'BASE') {
      if (getArrayKind(member.name) > 0) {
         // this is workaround for arrays as base class
         // we create 'fArray' member, which read as any other data member
         member.name = 'fArray';
         member.type = kAny;
      } else {
         // create streamer for base class
         member.type = kBase;
         // this.getStreamer(element.fName);
      }
   }

   switch (member.type) {
      case kBase:
         member.base = element.fBaseVersion; // indicate base class
         member.basename = element.fName; // keep class name
         member.func = function(buf, obj) { buf.classStreamer(obj, this.basename); };
         break;
      case kShort:
         member.func = function(buf, obj) { obj[this.name] = buf.ntoi2(); }; break;
      case kInt:
      case kCounter:
         member.func = function(buf, obj) { obj[this.name] = buf.ntoi4(); }; break;
      case kLong:
      case kLong64:
         member.func = function(buf, obj) { obj[this.name] = buf.ntoi8(); }; break;
      case kDouble:
         member.func = function(buf, obj) { obj[this.name] = buf.ntod(); }; break;
      case kFloat:
         member.func = function(buf, obj) { obj[this.name] = buf.ntof(); }; break;
      case kLegacyChar:
      case kUChar:
         member.func = function(buf, obj) { obj[this.name] = buf.ntou1(); }; break;
      case kUShort:
         member.func = function(buf, obj) { obj[this.name] = buf.ntou2(); }; break;
      case kBits:
      case kUInt:
         member.func = function(buf, obj) { obj[this.name] = buf.ntou4(); }; break;
      case kULong64:
      case kULong:
         member.func = function(buf, obj) { obj[this.name] = buf.ntou8(); }; break;
      case kBool:
         member.func = function(buf, obj) { obj[this.name] = buf.ntou1() !== 0; }; break;
      case kOffsetL + kBool:
      case kOffsetL + kInt:
      case kOffsetL + kCounter:
      case kOffsetL + kDouble:
      case kOffsetL + kUChar:
      case kOffsetL + kShort:
      case kOffsetL + kUShort:
      case kOffsetL + kBits:
      case kOffsetL + kUInt:
      case kOffsetL + kULong:
      case kOffsetL + kULong64:
      case kOffsetL + kLong:
      case kOffsetL + kLong64:
      case kOffsetL + kFloat:
         if (element.fArrayDim < 2) {
            member.arrlength = element.fArrayLength;
            member.func = function(buf, obj) {
               obj[this.name] = buf.readFastArray(this.arrlength, this.type - kOffsetL);
            };
         } else {
            member.arrlength = element.fMaxIndex[element.fArrayDim - 1];
            member.minus1 = true;
            member.func = function(buf, obj) {
               obj[this.name] = buf.readNdimArray(this, (buf, handle) =>
                  buf.readFastArray(handle.arrlength, handle.type - kOffsetL));
            };
         }
         break;
      case kOffsetL + kChar:
         if (element.fArrayDim < 2) {
            member.arrlength = element.fArrayLength;
            member.func = function(buf, obj) {
               obj[this.name] = buf.readFastString(this.arrlength);
            };
         } else {
            member.minus1 = true; // one dimension used for char*
            member.arrlength = element.fMaxIndex[element.fArrayDim - 1];
            member.func = function(buf, obj) {
               obj[this.name] = buf.readNdimArray(this, (buf, handle) =>
                  buf.readFastString(handle.arrlength));
            };
         }
         break;
      case kOffsetP + kBool:
      case kOffsetP + kInt:
      case kOffsetP + kDouble:
      case kOffsetP + kUChar:
      case kOffsetP + kShort:
      case kOffsetP + kUShort:
      case kOffsetP + kBits:
      case kOffsetP + kUInt:
      case kOffsetP + kULong:
      case kOffsetP + kULong64:
      case kOffsetP + kLong:
      case kOffsetP + kLong64:
      case kOffsetP + kFloat:
         member.cntname = element.fCountName;
         member.func = function(buf, obj) {
            obj[this.name] = (buf.ntou1() === 1) ? buf.readFastArray(obj[this.cntname], this.type - kOffsetP) : [];
         };
         break;
      case kOffsetP + kChar:
         member.cntname = element.fCountName;
         member.func = function(buf, obj) {
            obj[this.name] = (buf.ntou1() === 1) ? buf.readFastString(obj[this.cntname]) : null;
         };
         break;
      case kDouble32:
      case kOffsetL + kDouble32:
      case kOffsetP + kDouble32:
         member.double32 = true;
      // eslint-disable-next-line no-fallthrough
      case kFloat16:
      case kOffsetL + kFloat16:
      case kOffsetP + kFloat16:
         if (element.fFactor !== 0) {
            member.factor = 1 / element.fFactor;
            member.min = element.fXmin;
            member.read = function(buf) { return buf.ntou4() * this.factor + this.min; };
         } else
            if ((element.fXmin === 0) && member.double32)
               member.read = function(buf) { return buf.ntof(); };
            else {
               member.nbits = Math.round(element.fXmin);
               if (member.nbits === 0) member.nbits = 12;
               member.dv = new DataView(new ArrayBuffer(8), 0); // used to cast from uint32 to float32
               member.read = function(buf) {
                  const theExp = buf.ntou1(), theMan = buf.ntou2();
                  this.dv.setUint32(0, (theExp << 23) | ((theMan & ((1 << (this.nbits + 1)) - 1)) << (23 - this.nbits)));
                  return ((1 << (this.nbits + 1) & theMan) ? -1 : 1) * this.dv.getFloat32(0);
               };
            }

         member.readarr = function(buf, len) {
            const arr = this.double32 ? new Float64Array(len) : new Float32Array(len);
            for (let n = 0; n < len; ++n) arr[n] = this.read(buf);
            return arr;
         };

         if (member.type < kOffsetL)
            member.func = function(buf, obj) { obj[this.name] = this.read(buf); };
         else
            if (member.type > kOffsetP) {
               member.cntname = element.fCountName;
               member.func = function(buf, obj) {
                  obj[this.name] = (buf.ntou1() === 1) ? this.readarr(buf, obj[this.cntname]) : null;
               };
            } else
               if (element.fArrayDim < 2) {
                  member.arrlength = element.fArrayLength;
                  member.func = function(buf, obj) { obj[this.name] = this.readarr(buf, this.arrlength); };
               } else {
                  member.arrlength = element.fMaxIndex[element.fArrayDim - 1];
                  member.minus1 = true;
                  member.func = function(buf, obj) {
                     obj[this.name] = buf.readNdimArray(this, (buf, handle) => handle.readarr(buf, handle.arrlength));
                  };
               }
         break;

      case kAnyP:
      case kObjectP:
         member.func = function(buf, obj) {
            obj[this.name] = buf.readNdimArray(this, buf => buf.readObjectAny());
         };
         break;

      case kAny:
      case kAnyp:
      case kObjectp:
      case kObject: {
         let classname = (element.fTypeName === 'BASE') ? element.fName : element.fTypeName;
         if (classname[classname.length - 1] === '*')
            classname = classname.slice(0, classname.length - 1);

         const arrkind = getArrayKind(classname);

         if (arrkind > 0) {
            member.arrkind = arrkind;
            member.func = function(buf, obj) { obj[this.name] = buf.readFastArray(buf.ntou4(), this.arrkind); };
         } else if (arrkind === 0)
            member.func = function(buf, obj) { obj[this.name] = buf.readTString(); };
         else {
            member.classname = classname;

            if (element.fArrayLength > 1) {
               member.func = function(buf, obj) {
                  obj[this.name] = buf.readNdimArray(this, (buf, handle) => buf.classStreamer({}, handle.classname));
               };
            } else {
               member.func = function(buf, obj) {
                  obj[this.name] = buf.classStreamer({}, this.classname);
               };
            }
         }
         break;
      }
      case kOffsetL + kObject:
      case kOffsetL + kAny:
      case kOffsetL + kAnyp:
      case kOffsetL + kObjectp: {
         let classname = element.fTypeName;
         if (classname[classname.length - 1] === '*')
            classname = classname.slice(0, classname.length - 1);

         member.arrkind = getArrayKind(classname);
         if (member.arrkind < 0) member.classname = classname;
         member.func = function(buf, obj) {
            obj[this.name] = buf.readNdimArray(this, (buf, handle) => {
               if (handle.arrkind > 0) return buf.readFastArray(buf.ntou4(), handle.arrkind);
               if (handle.arrkind === 0) return buf.readTString();
               return buf.classStreamer({}, handle.classname);
            });
         };
         break;
      }
      case kChar:
         member.func = function(buf, obj) { obj[this.name] = buf.ntoi1(); }; break;
      case kCharStar:
         member.func = function(buf, obj) {
            const len = buf.ntoi4();
            obj[this.name] = buf.substring(buf.o, buf.o + len);
            buf.o += len;
         };
         break;
      case kTString:
         member.func = function(buf, obj) { obj[this.name] = buf.readTString(); };
         break;
      case kTObject:
      case kTNamed:
         member.typename = element.fTypeName;
         member.func = function(buf, obj) { obj[this.name] = buf.classStreamer({}, this.typename); };
         break;
      case kOffsetL + kTString:
      case kOffsetL + kTObject:
      case kOffsetL + kTNamed:
         member.typename = element.fTypeName;
         member.func = function(buf, obj) {
            const ver = buf.readVersion();
            obj[this.name] = buf.readNdimArray(this, (buf, handle) => {
               if (handle.typename === clTString) return buf.readTString();
               return buf.classStreamer({}, handle.typename);
            });
            buf.checkByteCount(ver, this.typename + '[]');
         };
         break;
      case kStreamLoop:
      case kOffsetL + kStreamLoop:
         member.typename = element.fTypeName;
         member.cntname = element.fCountName;

         if (member.typename.lastIndexOf('**') > 0) {
            member.typename = member.typename.slice(0, member.typename.lastIndexOf('**'));
            member.isptrptr = true;
         } else {
            member.typename = member.typename.slice(0, member.typename.lastIndexOf('*'));
            member.isptrptr = false;
         }

         if (member.isptrptr)
            member.readitem = function(buf) { return buf.readObjectAny(); };
         else {
            member.arrkind = getArrayKind(member.typename);
            if (member.arrkind > 0)
               member.readitem = function(buf) { return buf.readFastArray(buf.ntou4(), this.arrkind); };
            else if (member.arrkind === 0)
               member.readitem = function(buf) { return buf.readTString(); };
            else
               member.readitem = function(buf) { return buf.classStreamer({}, this.typename); };
         }

         if (member.readitem !== undefined) {
            member.read_loop = function(buf, cnt) {
               return buf.readNdimArray(this, (buf2, member2) => {
                  const itemarr = new Array(cnt);
                  for (let i = 0; i < cnt; ++i)
                     itemarr[i] = member2.readitem(buf2);
                  return itemarr;
               });
            };

            member.func = function(buf, obj) {
               const ver = buf.readVersion(),
                     res = this.read_loop(buf, obj[this.cntname]);
               obj[this.name] = buf.checkByteCount(ver, this.typename) ? res : null;
            };
            member.branch_func = function(buf, obj) {
               // this is special functions, used by branch in the STL container
               const ver = buf.readVersion(), sz0 = obj[this.stl_size], res = new Array(sz0);

               for (let loop0 = 0; loop0 < sz0; ++loop0) {
                  const cnt = obj[this.cntname][loop0];
                  res[loop0] = this.read_loop(buf, cnt);
               }
               obj[this.name] = buf.checkByteCount(ver, this.typename) ? res : null;
            };

            member.objs_branch_func = function(buf, obj) {
               // special function when branch read as part of complete object
               // objects already preallocated and only appropriate member must be set
               // see code in JSRoot.tree.js for reference

               const ver = buf.readVersion(),
                     arr = obj[this.name0]; // objects array where reading is done

               for (let loop0 = 0; loop0 < arr.length; ++loop0) {
                  const obj1 = this.get(arr, loop0), cnt = obj1[this.cntname];
                  obj1[this.name] = this.read_loop(buf, cnt);
               }

               buf.checkByteCount(ver, this.typename);
            };
         } else {
            console.error(`fail to provide function for ${element.fName} (${element.fTypeName})  typ = ${element.fType}`);
            member.func = function(buf, obj) {
               const ver = buf.readVersion();
               buf.checkByteCount(ver);
               obj[this.name] = null;
            };
         }

         break;

      case kStreamer: {
         member.typename = element.fTypeName;

         const stl = (element.fSTLtype || 0) % 40;
         if ((element._typename === 'TStreamerSTLstring') ||
            (member.typename === 'string') || (member.typename === 'string*'))
            member.readelem = buf => buf.readTString();
         else if ((stl === kSTLvector) || (stl === kSTLlist) ||
                    (stl === kSTLdeque) || (stl === kSTLset) || (stl === kSTLmultiset)) {
            const p1 = member.typename.indexOf('<'),
                  p2 = member.typename.lastIndexOf('>');

            member.conttype = member.typename.slice(p1 + 1, p2).trim();
            member.typeid = getTypeId(member.conttype);
            if ((member.typeid < 0) && file.fBasicTypes[member.conttype]) {
               member.typeid = file.fBasicTypes[member.conttype];
               console.log(`!!! Reuse basic type ${member.conttype} from file streamer infos`);
            }

            // check
            if (element.fCtype && (element.fCtype < 20) && (element.fCtype !== member.typeid)) {
               console.warn(`Contained type ${member.conttype} not recognized as basic type ${element.fCtype} FORCE`);
               member.typeid = element.fCtype;
            }

            if (member.typeid > 0) {
               member.readelem = function(buf) {
                  return buf.readFastArray(buf.ntoi4(), this.typeid);
               };
            } else {
               member.isptr = false;

               if (member.conttype.lastIndexOf('*') === member.conttype.length - 1) {
                  member.isptr = true;
                  member.conttype = member.conttype.slice(0, member.conttype.length - 1);
               }

               if (element.fCtype === kObjectp) member.isptr = true;

               member.arrkind = getArrayKind(member.conttype);

               member.readelem = readVectorElement;

               if (!member.isptr && (member.arrkind < 0)) {
                  const subelem = createStreamerElement('temp', member.conttype);
                  if (subelem.fType === kStreamer) {
                     subelem.$fictional = true;
                     member.submember = createMemberStreamer(subelem, file);
                  }
               }
            }
         } else if ((stl === kSTLmap) || (stl === kSTLmultimap)) {
            const p1 = member.typename.indexOf('<'),
                  p2 = member.typename.lastIndexOf('>');

            member.pairtype = 'pair<' + member.typename.slice(p1 + 1, p2) + '>';

            // remember found streamer info from the file -
            // most probably it is the only one which should be used
            member.si = file.findStreamerInfo(member.pairtype);

            member.streamer = getPairStreamer(member.si, member.pairtype, file);

            if (!member.streamer || (member.streamer.length !== 2)) {
               console.error(`Fail to build streamer for pair ${member.pairtype}`);
               delete member.streamer;
            }

            if (member.streamer) member.readelem = readMapElement;
         } else if (stl === kSTLbitset)
            member.readelem = (buf /* , obj */) => buf.readFastArray(buf.ntou4(), kBool);

         if (!member.readelem) {
            console.error(`failed to create streamer for element ${member.typename} ${member.name} element ${element._typename} STL type ${element.fSTLtype}`);
            member.func = function(buf, obj) {
               const ver = buf.readVersion();
               buf.checkByteCount(ver);
               obj[this.name] = null;
            };
         } else
            if (!element.$fictional) {
               member.read_version = function(buf, cnt) {
                  if (cnt === 0) return null;
                  const ver = buf.readVersion();
                  this.member_wise = ((ver.val & kStreamedMemberWise) !== 0);

                  this.stl_version = undefined;
                  if (this.member_wise) {
                     ver.val = ver.val & ~kStreamedMemberWise;
                     this.stl_version = { val: buf.ntoi2() };
                     if (this.stl_version.val <= 0) this.stl_version.checksum = buf.ntou4();
                  }
                  return ver;
               };

               member.func = function(buf, obj) {
                  const ver = this.read_version(buf);

                  let res = buf.readNdimArray(this, (buf2, member2) => member2.readelem(buf2));

                  if (!buf.checkByteCount(ver, this.typename)) res = null;
                  obj[this.name] = res;
               };

               member.branch_func = function(buf, obj) {
                  // special function to read data from STL branch
                  const cnt = obj[this.stl_size],
                        ver = this.read_version(buf, cnt),
                        arr = new Array(cnt);

                  for (let n = 0; n < cnt; ++n)
                     arr[n] = buf.readNdimArray(this, (buf2, member2) => member2.readelem(buf2));

                  if (ver) buf.checkByteCount(ver, `branch ${this.typename}`);

                  obj[this.name] = arr;
               };
               member.split_func = function(buf, arr, n) {
                  // function to read array from member-wise streaming
                  const ver = this.read_version(buf);
                  for (let i = 0; i < n; ++i)
                     arr[i][this.name] = buf.readNdimArray(this, (buf2, member2) => member2.readelem(buf2));
                  buf.checkByteCount(ver, this.typename);
               };
               member.objs_branch_func = function(buf, obj) {
                  // special function when branch read as part of complete object
                  // objects already preallocated and only appropriate member must be set
                  // see code in JSRoot.tree.js for reference

                  const arr = obj[this.name0], // objects array where reading is done
                        ver = this.read_version(buf, arr.length);

                  for (let n = 0; n < arr.length; ++n) {
                     const obj1 = this.get(arr, n);
                     obj1[this.name] = buf.readNdimArray(this, (buf2, member2) => member2.readelem(buf2));
                  }

                  if (ver) buf.checkByteCount(ver, `branch ${this.typename}`);
               };
            }
         break;
      }

      default:
         console.error(`fail to provide function for ${element.fName} (${element.fTypeName})  typ = ${element.fType}`);

         member.func = function(/* buf, obj */) {};  // do nothing, fix in the future
   }

   return member;
}


/** @summary Analyze and returns arrays kind
  * @return 0 if TString (or equivalent), positive value - some basic type, -1 - any other kind
  * @private */
function getArrayKind(type_name) {
   if ((type_name === clTString) || (type_name === 'string') ||
      (CustomStreamers[type_name] === clTString)) return 0;
   if ((type_name.length < 7) || (type_name.indexOf('TArray') !== 0)) return -1;
   if (type_name.length === 7) {
      switch (type_name[6]) {
         case 'I': return kInt;
         case 'D': return kDouble;
         case 'F': return kFloat;
         case 'S': return kShort;
         case 'C': return kChar;
         case 'L': return kLong;
         default: return -1;
      }
   }

   return type_name === 'TArrayL64' ? kLong64 : -1;
}

/** @summary Let directly assign methods when doing I/O
  * @private */
function addClassMethods(clname, streamer) {
   if (streamer === null) return streamer;

   const methods = getMethods(clname);

   if (methods) {
      for (const key in methods) {
         if (isFunc(methods[key]) || (key.indexOf('_') === 0))
            streamer.push({ name: key, method: methods[key], func(_buf, obj) { obj[this.name] = this.method; } });
      }
   }

   return streamer;
}


/* Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
 * Version: 1.0.0.1
 * LastModified: Dec 25 1999
 * original: http://www.onicos.com/staff/iz/amuse/javascript/expert/inflate.txt
 */

/* constant parameters */
const zip_WSIZE = 32768,       // Sliding Window size

/* constant tables (inflate) */
zip_MASK_BITS = [
   0x0000,
   0x0001, 0x0003, 0x0007, 0x000f, 0x001f, 0x003f, 0x007f, 0x00ff,
   0x01ff, 0x03ff, 0x07ff, 0x0fff, 0x1fff, 0x3fff, 0x7fff, 0xffff],

// Tables for deflate from PKZIP's appnote.txt.
   zip_cplens = [ // Copy lengths for literal codes 257..285
   3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
   35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0],

/* note: see note #13 above about the 258 in this list. */
   zip_cplext = [ // Extra bits for literal codes 257..285
   0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2,
   3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 99, 99], // 99==invalid

   zip_cpdist = [ // Copy offsets for distance codes 0..29
   1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193,
   257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
   8193, 12289, 16385, 24577],

   zip_cpdext = [ // Extra bits for distance codes
   0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6,
   7, 7, 8, 8, 9, 9, 10, 10, 11, 11,
   12, 12, 13, 13],

   zip_border = [  // Order of the bit length code lengths
   16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

function ZIP_inflate(arr, tgt) {
   /* variables (inflate) */
   const zip_slide = new Array(2 * zip_WSIZE),
         zip_inflate_data = arr,
         zip_inflate_datalen = arr.byteLength;
   let zip_wp = 0,                // current position in slide
       zip_fixed_tl = null,      // inflate static
       zip_fixed_td,             // inflate static
       zip_fixed_bl, zip_fixed_bd,   // inflate static
       zip_bit_buf = 0,            // bit buffer
       zip_bit_len = 0,           // bits in bit buffer
       zip_method = -1,
       zip_eof = false,
       zip_copy_leng = 0,
       zip_copy_dist = 0,
       zip_tl = null, zip_td,    // literal/length and distance decoder tables
       zip_bl, zip_bd,           // number of bits decoded by tl and td
       zip_inflate_pos = 0;

   function zip_NEEDBITS(n) {
      while (zip_bit_len < n) {
         if (zip_inflate_pos < zip_inflate_datalen)
            zip_bit_buf |= zip_inflate_data[zip_inflate_pos++] << zip_bit_len;
         zip_bit_len += 8;
      }
   }

   function zip_GETBITS(n) {
      return zip_bit_buf & zip_MASK_BITS[n];
   }

   function zip_DUMPBITS(n) {
      zip_bit_buf >>= n;
      zip_bit_len -= n;
   }

   /* objects (inflate) */
   function zip_HuftBuild(b,     // code lengths in bits (all assumed <= BMAX)
                          n,     // number of codes (assumed <= N_MAX)
                          s,     // number of simple-valued codes (0..s-1)
                          d,     // list of base values for non-simple codes
                          e,     // list of extra bits for non-simple codes
                          mm) {  // maximum lookup bits
      const res = {
         status: 0,    // 0: success, 1: incomplete table, 2: bad input
         root: null,   // (zip_HuftList) starting table
         m: 0          // maximum lookup bits, returns actual
      },
      BMAX = 16,      // maximum bit length of any code
      N_MAX = 288,    // maximum number of codes in any set
      c = Array(BMAX+1).fill(0),  // bit length count table
      lx = Array(BMAX+1).fill(0), // stack of bits per table
      u = Array(BMAX).fill(null), // zip_HuftNode[BMAX][]  table stack
      v = Array(N_MAX).fill(0), // values in order of bit length
      x = Array(BMAX+1).fill(0), // bit offsets, then code stack
      r = { e: 0, b: 0, n: 0, t: null }, // new zip_HuftNode(), // table entry for structure assignment
      el = (n > 256) ? b[256] : BMAX; // set length of EOB code, if any
      let rr = null, // temporary variable, use in assignment
          a,         // counter for codes of length k
          f,         // i repeats in table every f entries
          h,         // table level
          j,         // counter
          k,         // number of bits in current code
          p = b,     // pointer into c[], b[], or v[]
          pidx = 0,  // index of p
          q,         // (zip_HuftNode) points to current table
          w,
          xp,        // pointer into x or c
          y,         // number of dummy codes added
          z,         // number of entries in current table
          o,
          tail = null,   // (zip_HuftList)
          i = n;         // counter, current code

      // Generate counts for each bit length
      do
         c[p[pidx++]]++; // assume all entries <= BMAX
      while (--i > 0);

      if (c[0] === n)    // null input--all zero length codes
         return res;

      // Find minimum and maximum length, bound *m by those
      for (j = 1; j <= BMAX; ++j)
         if (c[j] !== 0) break;

      k = j;         // minimum code length
      if (mm < j)
         mm = j;
      for (i = BMAX; i !== 0; --i)
         if (c[i] !== 0) break;

      const g = i;         // maximum code length
      if (mm > i)
         mm = i;

      // Adjust last length count to fill out codes, if needed
      for (y = 1 << j; j < i; ++j, y <<= 1) {
         if ((y -= c[j]) < 0) {
            res.status = 2;  // bad input: more codes than bits
            res.m = mm;
            return res;
         }
      }
      if ((y -= c[i]) < 0) {
         res.status = 2;
         res.m = mm;
         return res;
      }
      c[i] += y;

      // Generate starting offsets into the value table for each length
      x[1] = j = 0;
      p = c;
      pidx = 1;
      xp = 2;
      while (--i > 0)    // note that i == g from above
         x[xp++] = (j += p[pidx++]);

      // Make a table of values in order of bit lengths
      p = b; pidx = 0;
      i = 0;
      do {
         if ((j = p[pidx++]) !== 0)
            v[x[j]++] = i;
      } while (++i < n);
      n = x[g];         // set n to length of v

      // Generate the Huffman codes and for each, make the table entries
      x[0] = i = 0;     // first Huffman code is zero
      p = v; pidx = 0;     // grab values in bit order
      h = -1;        // no tables yet--level -1
      w = lx[0] = 0;    // no bits decoded yet
      q = null;         // ditto
      z = 0;         // ditto

      // go through the bit lengths (k already is bits in shortest code)
      for (; k <= g; ++k) {
         a = c[k];
         while (a-- > 0) {
            // here i is the Huffman code of length k bits for value p[pidx]
            // make tables up to required level
            while (k > w + lx[1 + h]) {
               w += lx[1 + h++]; // add bits already decoded

               // compute minimum size table less than or equal to *m bits
               z = (z = g - w) > mm ? mm : z; // upper limit
               if ((f = 1 << (j = k - w)) > a + 1) { // try a k-w bit table
                  // too few codes for k-w bit table
                  f -= a + 1; // deduct codes from patterns left
                  xp = k;
                  while (++j < z) { // try smaller tables up to z bits
                     if ((f <<= 1) <= c[++xp])
                        break;   // enough codes to use up j bits
                     f -= c[xp];   // else deduct codes from patterns
                  }
               }
               if (w + j > el && w < el)
                  j = el - w; // make EOB code end at table
               z = 1 << j;   // table entries for j-bit table
               lx[1 + h] = j; // set table size in stack

               // allocate and link in new table
               q = new Array(z);
               for (o = 0; o < z; ++o)
                  q[o] = { e: 0, b: 0, n: 0, t: null }; // new zip_HuftNode

               if (tail == null)
                  tail = res.root = { next: null, list: null }; // new zip_HuftList();
               else
                  tail = tail.next = { next: null, list: null }; // new zip_HuftList();
               tail.next = null;
               tail.list = q;
               u[h] = q;  // table starts after link

               /* connect to last table, if there is one */
               if (h > 0) {
                  x[h] = i;      // save pattern for backing up
                  r.b = lx[h];   // bits to dump before this table
                  r.e = 16 + j;  // bits in this table
                  r.t = q;    // pointer to this table
                  j = (i & ((1 << w) - 1)) >> (w - lx[h]);
                  rr = u[h-1][j];
                  rr.e = r.e;
                  rr.b = r.b;
                  rr.n = r.n;
                  rr.t = r.t;
               }
            }

            // set up table entry in r
            r.b = k - w;
            if (pidx >= n)
               r.e = 99;     // out of values--invalid code
            else if (p[pidx] < s) {
               r.e = (p[pidx] < 256 ? 16 : 15); // 256 is end-of-block code
               r.n = p[pidx++]; // simple code is just the value
            } else {
               r.e = e[p[pidx] - s];  // non-simple--look up in lists
               r.n = d[p[pidx++] - s];
            }

            // fill code-like entries with r //
            f = 1 << (k - w);
            for (j = i >> w; j < z; j += f) {
               rr = q[j];
               rr.e = r.e;
               rr.b = r.b;
               rr.n = r.n;
               rr.t = r.t;
            }

            // backwards increment the k-bit code i
            for (j = 1 << (k - 1); (i & j) !== 0; j >>= 1)
               i ^= j;
            i ^= j;

            // backup over finished tables
            while ((i & ((1 << w) - 1)) !== x[h])
               w -= lx[h--];      // don't need to update q
         }
      }

      /* return actual size of base table */
      res.m = lx[1];

      /* Return true (1) if we were given an incomplete table */
      res.status = ((y !== 0 && g !== 1) ? 1 : 0);

      return res;
   }

   /* routines (inflate) */

   function zip_inflate_codes(buff, off, size) {
      if (size === 0) return 0;

      /* inflate (decompress) the codes in a deflated (compressed) block.
         Return an error code or zero if it all goes ok. */

      let e,     // table entry flag/number of extra bits
          t,     // (zip_HuftNode) pointer to table entry
          n = 0;

      // inflate the coded data
      for (;;) {        // do until end of block
         zip_NEEDBITS(zip_bl);
         t = zip_tl.list[zip_GETBITS(zip_bl)];
         e = t.e;
         while (e > 16) {
            if (e === 99)
               return -1;
            zip_DUMPBITS(t.b);
            e -= 16;
            zip_NEEDBITS(e);
            t = t.t[zip_GETBITS(e)];
            e = t.e;
         }
         zip_DUMPBITS(t.b);

         if (e === 16) {     // then it's a literal
            zip_wp &= zip_WSIZE - 1;
            buff[off + n++] = zip_slide[zip_wp++] = t.n;
            if (n === size)
               return size;
            continue;
         }

         // exit if end of block
         if (e === 15)
            break;

         // it's an EOB or a length

         // get length of block to copy
         zip_NEEDBITS(e);
         zip_copy_leng = t.n + zip_GETBITS(e);
         zip_DUMPBITS(e);

         // decode distance of block to copy
         zip_NEEDBITS(zip_bd);
         t = zip_td.list[zip_GETBITS(zip_bd)];
         e = t.e;

         while (e > 16) {
            if (e === 99)
               return -1;
            zip_DUMPBITS(t.b);
            e -= 16;
            zip_NEEDBITS(e);
            t = t.t[zip_GETBITS(e)];
            e = t.e;
         }
         zip_DUMPBITS(t.b);
         zip_NEEDBITS(e);
         zip_copy_dist = zip_wp - t.n - zip_GETBITS(e);
         zip_DUMPBITS(e);

         // do the copy
         while (zip_copy_leng > 0 && n < size) {
            --zip_copy_leng;
            zip_copy_dist &= zip_WSIZE - 1;
            zip_wp &= zip_WSIZE - 1;
            buff[off + n++] = zip_slide[zip_wp++] = zip_slide[zip_copy_dist++];
         }

         if (n === size)
            return size;
      }

      zip_method = -1; // done
      return n;
   }

   function zip_inflate_stored(buff, off, size) {
      /* 'decompress' an inflated type 0 (stored) block. */

      // go to byte boundary
      let n = zip_bit_len & 7;
      zip_DUMPBITS(n);

      // get the length and its complement
      zip_NEEDBITS(16);
      n = zip_GETBITS(16);
      zip_DUMPBITS(16);
      zip_NEEDBITS(16);
      if (n !== ((~zip_bit_buf) & 0xffff))
         return -1;        // error in compressed data
      zip_DUMPBITS(16);

      // read and output the compressed data
      zip_copy_leng = n;

      n = 0;
      while (zip_copy_leng > 0 && n < size) {
         --zip_copy_leng;
         zip_wp &= zip_WSIZE - 1;
         zip_NEEDBITS(8);
         buff[off + n++] = zip_slide[zip_wp++] = zip_GETBITS(8);
         zip_DUMPBITS(8);
      }

      if (zip_copy_leng === 0)
         zip_method = -1; // done
      return n;
   }

   function zip_inflate_fixed(buff, off, size) {
      /* decompress an inflated type 1 (fixed Huffman codes) block.  We should
         either replace this with a custom decoder, or at least precompute the
         Huffman tables. */

      // if first time, set up tables for fixed blocks
      if (zip_fixed_tl == null) {
         // literal table
         const l = Array(288).fill(8, 0, 144).fill(9, 144, 256).fill(7, 256, 280).fill(8, 280, 288);
         // make a complete, but wrong code set
         zip_fixed_bl = 7;

         let h = zip_HuftBuild(l, 288, 257, zip_cplens, zip_cplext, zip_fixed_bl);
         if (h.status !== 0)
            throw new Error('HufBuild error: ' + h.status);
         zip_fixed_tl = h.root;
         zip_fixed_bl = h.m;

         // distance table
         l.fill(5, 0, 30); // make an incomplete code set
         zip_fixed_bd = 5;

         h = zip_HuftBuild(l, 30, 0, zip_cpdist, zip_cpdext, zip_fixed_bd);
         if (h.status > 1) {
            zip_fixed_tl = null;
            throw new Error('HufBuild error: '+h.status);
         }
         zip_fixed_td = h.root;
         zip_fixed_bd = h.m;
      }

      zip_tl = zip_fixed_tl;
      zip_td = zip_fixed_td;
      zip_bl = zip_fixed_bl;
      zip_bd = zip_fixed_bd;
      return zip_inflate_codes(buff, off, size);
   }

   function zip_inflate_dynamic(buff, off, size) {
      // decompress an inflated type 2 (dynamic Huffman codes) block.
      let i, j,  // temporary variables
          l,     // last length
          t,     // (zip_HuftNode) literal/length code table
          h;     // (zip_HuftBuild)
      const ll = new Array(286+30).fill(0); // literal/length and distance code lengths

      // read in table lengths
      zip_NEEDBITS(5);
      const nl = 257 + zip_GETBITS(5);   // number of literal/length codes
      zip_DUMPBITS(5);
      zip_NEEDBITS(5);
      const nd = 1 + zip_GETBITS(5);  // number of distance codes
      zip_DUMPBITS(5);
      zip_NEEDBITS(4);
      const nb = 4 + zip_GETBITS(4);  // number of bit length codes
      zip_DUMPBITS(4);
      if (nl > 286 || nd > 30)
         return -1;     // bad lengths

      // read in bit-length-code lengths
      for (j = 0; j < nb; ++j) {
         zip_NEEDBITS(3);
         ll[zip_border[j]] = zip_GETBITS(3);
         zip_DUMPBITS(3);
      }
      for (; j < 19; ++j)
         ll[zip_border[j]] = 0;

      // build decoding table for trees--single level, 7 bit lookup
      zip_bl = 7;
      h = zip_HuftBuild(ll, 19, 19, null, null, zip_bl);
      if (h.status !== 0)
         return -1;  // incomplete code set

      zip_tl = h.root;
      zip_bl = h.m;

      // read in literal and distance code lengths
      const n = nl + nd;   // number of lengths to get
      i = l = 0;
      while (i < n) {
         zip_NEEDBITS(zip_bl);
         t = zip_tl.list[zip_GETBITS(zip_bl)];
         j = t.b;
         zip_DUMPBITS(j);
         j = t.n;
         if (j < 16) // length of code in bits (0..15)
            ll[i++] = l = j; // save last length in l
         else if (j === 16) {   // repeat last length 3 to 6 times
            zip_NEEDBITS(2);
            j = 3 + zip_GETBITS(2);
            zip_DUMPBITS(2);
            if (i + j > n)
               return -1;
            while (j-- > 0)
               ll[i++] = l;
         } else if (j === 17) { // 3 to 10 zero length codes
            zip_NEEDBITS(3);
            j = 3 + zip_GETBITS(3);
            zip_DUMPBITS(3);
            if (i + j > n)
               return -1;
            while (j-- > 0)
               ll[i++] = 0;
            l = 0;
         } else {    // j == 18: 11 to 138 zero length codes
            zip_NEEDBITS(7);
            j = 11 + zip_GETBITS(7);
            zip_DUMPBITS(7);
            if (i + j > n)
               return -1;
            while (j-- > 0)
               ll[i++] = 0;
            l = 0;
         }
      }

      // build the decoding tables for literal/length and distance codes
      zip_bl = 9; // zip_lbits;
      h = zip_HuftBuild(ll, nl, 257, zip_cplens, zip_cplext, zip_bl);
      if (zip_bl === 0)  // no literals or lengths
         h.status = 1;
      if (h.status !== 0)
         return -1;     // incomplete code set
      zip_tl = h.root;
      zip_bl = h.m;

      for (i = 0; i < nd; ++i)
         ll[i] = ll[i + nl];
      zip_bd = 6; // zip_dbits;
      h = zip_HuftBuild(ll, nd, 0, zip_cpdist, zip_cpdext, zip_bd);
      zip_td = h.root;
      zip_bd = h.m;

      // incomplete distance tree
      if ((zip_bd === 0 && nl > 257) || (h.status !== 0))   // lengths but no distances
         return -1;

      // decompress until an end-of-block code
      return zip_inflate_codes(buff, off, size);
   }

   function zip_inflate_internal(buff, off, size) {
      // decompress an inflated entry
      let n = 0, i;

      while (n < size) {
         if (zip_eof && zip_method === -1)
            return n;

         if (zip_copy_leng > 0) {
            if (zip_method !== 0 /* zip_STORED_BLOCK */) {
               // STATIC_TREES or DYN_TREES
               while (zip_copy_leng > 0 && n < size) {
                  --zip_copy_leng;
                  zip_copy_dist &= zip_WSIZE - 1;
                  zip_wp &= zip_WSIZE - 1;
                  buff[off + n++] = zip_slide[zip_wp++] =
                  zip_slide[zip_copy_dist++];
               }
            } else {
               while (zip_copy_leng > 0 && n < size) {
                  --zip_copy_leng;
                  zip_wp &= zip_WSIZE - 1;
                  zip_NEEDBITS(8);
                  buff[off + n++] = zip_slide[zip_wp++] = zip_GETBITS(8);
                  zip_DUMPBITS(8);
               }
               if (zip_copy_leng === 0)
                  zip_method = -1; // done
            }
            if (n === size)
               return n;
         }

         if (zip_method === -1) {
            if (zip_eof)
               break;

            // read in last block bit
            zip_NEEDBITS(1);
            if (zip_GETBITS(1) !== 0)
               zip_eof = true;
            zip_DUMPBITS(1);

            // read in block type
            zip_NEEDBITS(2);
            zip_method = zip_GETBITS(2);
            zip_DUMPBITS(2);
            zip_tl = null;
            zip_copy_leng = 0;
         }

         switch (zip_method) {
            case 0: // zip_STORED_BLOCK
               i = zip_inflate_stored(buff, off + n, size - n);
               break;

            case 1: // zip_STATIC_TREES
               if (zip_tl != null)
                  i = zip_inflate_codes(buff, off + n, size - n);
               else
                  i = zip_inflate_fixed(buff, off + n, size - n);
               break;

            case 2: // zip_DYN_TREES
               if (zip_tl != null)
                  i = zip_inflate_codes(buff, off + n, size - n);
               else
                  i = zip_inflate_dynamic(buff, off + n, size - n);
               break;

            default: // error
               i = -1;
               break;
         }

         if (i === -1)
            return zip_eof ? 0 : -1;
         n += i;
      }
      return n;
   }

   let i, cnt = 0;
   while ((i = zip_inflate_internal(tgt, cnt, Math.min(1024, tgt.byteLength-cnt))) > 0)
      cnt += i;

   return cnt;
} // function ZIP_inflate

/**
 * https://github.com/pierrec/node-lz4/blob/master/lib/binding.js
 *
 * LZ4 based compression and decompression
 * Copyright (c) 2014 Pierre Curto
 * MIT Licensed
 */

/**
 * Decode a block. Assumptions: input contains all sequences of a
 * chunk, output is large enough to receive the decoded data.
 * If the output buffer is too small, an error will be thrown.
 * If the returned value is negative, an error occured at the returned offset.
 *
 * @param input {Buffer} input data
 * @param output {Buffer} output data
 * @return {Number} number of decoded bytes
 * @private */
function LZ4_uncompress(input, output, sIdx, eIdx) {
   sIdx = sIdx || 0;
   eIdx = eIdx || (input.length - sIdx);
   // Process each sequence in the incoming data
   let j = 0;
   for (let i = sIdx, n = eIdx; i < n;) {
      const token = input[i++];

      // Literals
      let literals_length = (token >> 4);
      if (literals_length > 0) {
         // length of literals
         let l = literals_length + 240;
         while (l === 255) {
            l = input[i++];
            literals_length += l;
         }

         // Copy the literals
         const end = i + literals_length;
         while (i < end) output[j++] = input[i++];

         // End of buffer?
         if (i === n) return j;
      }

      // Match copy
      // 2 bytes offset (little endian)
      const offset = input[i++] | (input[i++] << 8);

      // 0 is an invalid offset value
      if (offset === 0 || offset > j) return -(i-2);

      // length of match copy
      let match_length = (token & 0xf),
          l = match_length + 240;
      while (l === 255) {
         l = input[i++];
         match_length += l;
      }

      // Copy the match
      let pos = j - offset; // position of the match copy in the current output
      const end = j + match_length + 4; // minmatch = 4;
      while (j < end) output[j++] = output[pos++];
   }

   return j;
}


/** @summary Reads header envelope, determines zipped size and unzip content
  * @return {Promise} with unzipped content
  * @private */
async function R__unzip(arr, tgtsize, noalert, src_shift) {
   const HDRSIZE = 9, totallen = arr.byteLength,
         checkChar = (o, symb) => { return String.fromCharCode(arr.getUint8(o)) === symb; },
         getCode = o => arr.getUint8(o);

   let curr = src_shift || 0, fullres = 0, tgtbuf = null;

   const nextPortion = () => {
      while (fullres < tgtsize) {
         let fmt = 'unknown', off = 0, CHKSUM = 0;

         if (curr + HDRSIZE >= totallen) {
            if (!noalert) console.error('Error R__unzip: header size exceeds buffer size');
            return Promise.resolve(null);
         }

         if (checkChar(curr, 'Z') && checkChar(curr+1, 'L') && getCode(curr + 2) === 8) { fmt = 'new'; off = 2; } else
         if (checkChar(curr, 'C') && checkChar(curr+1, 'S') && getCode(curr + 2) === 8) { fmt = 'old'; off = 0; } else
         if (checkChar(curr, 'X') && checkChar(curr+1, 'Z') && getCode(curr + 2) === 0) { fmt = 'LZMA'; off = 0; } else
         if (checkChar(curr, 'Z') && checkChar(curr+1, 'S') && getCode(curr + 2) === 1) fmt = 'ZSTD'; else
         if (checkChar(curr, 'L') && checkChar(curr+1, '4')) { fmt = 'LZ4'; off = 0; CHKSUM = 8; }

         /*   C H E C K   H E A D E R   */
         if ((fmt !== 'new') && (fmt !== 'old') && (fmt !== 'LZ4') && (fmt !== 'ZSTD') && (fmt !== 'LZMA')) {
            if (!noalert) console.error(`R__unzip: ${fmt} format is not supported!`);
            return Promise.resolve(null);
         }

         const srcsize = HDRSIZE + ((getCode(curr + 3) & 0xff) | ((getCode(curr + 4) & 0xff) << 8) | ((getCode(curr + 5) & 0xff) << 16)),
               uint8arr = new Uint8Array(arr.buffer, arr.byteOffset + curr + HDRSIZE + off + CHKSUM, Math.min(arr.byteLength - curr - HDRSIZE - off - CHKSUM, srcsize - HDRSIZE - CHKSUM));

         if (!tgtbuf) tgtbuf = new ArrayBuffer(tgtsize);
         const tgt8arr = new Uint8Array(tgtbuf, fullres);

         if (fmt === 'ZSTD') {
            let promise;
            if (internals._ZstdStream)
               promise = Promise.resolve(internals._ZstdStream);
            else if (internals._ZstdInit !== undefined)
               promise = new Promise(resolveFunc => { internals._ZstdInit.push(resolveFunc); });
            else {
               internals._ZstdInit = [];
               promise = (isNodeJs() ? Promise.resolve().then(function () { return _rollup_plugin_ignore_empty_module_placeholder$1; }) : Promise.resolve().then(function () { return _rollup_plugin_ignore_empty_module_placeholder$1; }))
                   .then(({ ZstdInit }) => ZstdInit())
                   .then(({ ZstdStream }) => {
                     internals._ZstdStream = ZstdStream;
                     internals._ZstdInit.forEach(func => func(ZstdStream));
                     delete internals._ZstdInit;
                     return ZstdStream;
                  });
            }

            return promise.then(ZstdStream => {
               const data2 = ZstdStream.decompress(uint8arr),
                     reslen = data2.length;

               for (let i = 0; i < reslen; ++i)
                   tgt8arr[i] = data2[i];

               fullres += reslen;
               curr += srcsize;
               return nextPortion();
            });
         } else if (fmt === 'LZMA') {
            return Promise.resolve().then(function () { return _rollup_plugin_ignore_empty_module_placeholder$1; }).then(lzma => {
               const expected_len = (getCode(curr + 6) & 0xff) | ((getCode(curr + 7) & 0xff) << 8) | ((getCode(curr + 8) & 0xff) << 16),
                     reslen = lzma.decompress(uint8arr, tgt8arr, expected_len);
               fullres += reslen;
               curr += srcsize;
               return nextPortion();
            });
         }

         const reslen = (fmt === 'LZ4') ? LZ4_uncompress(uint8arr, tgt8arr) : ZIP_inflate(uint8arr, tgt8arr);

         if (reslen <= 0) break;
         fullres += reslen;
         curr += srcsize;
      }

      if (fullres !== tgtsize) {
         if (!noalert) console.error(`R__unzip: fail to unzip data expects ${tgtsize}, got ${fullres}`);
         return Promise.resolve(null);
      }

      return Promise.resolve(new DataView(tgtbuf));
   };

   return nextPortion();
}


/**
  * @summary Buffer object to read data from TFile
  *
  * @private
  */

class TBuffer {

   constructor(arr, pos, file, length) {
      this._typename = 'TBuffer';
      this.arr = arr;
      this.o = pos || 0;
      this.fFile = file;
      this.length = length || (arr ? arr.byteLength : 0); // use size of array view, blob buffer can be much bigger
      this.clearObjectMap();
      this.fTagOffset = 0;
      this.last_read_version = 0;
   }

   /** @summary locate position in the buffer  */
   locate(pos) { this.o = pos; }

   /** @summary shift position in the buffer  */
   shift(cnt) { this.o += cnt; }

   /** @summary Returns remaining place in the buffer */
   remain() { return this.length - this.o; }

   /** @summary Get mapped object with provided tag */
   getMappedObject(tag) { return this.fObjectMap[tag]; }

   /** @summary Map object */
   mapObject(tag, obj) { if (obj !== null) this.fObjectMap[tag] = obj; }

   /** @summary Map class */
   mapClass(tag, classname) { this.fClassMap[tag] = classname; }

   /** @summary Get mapped class with provided tag */
   getMappedClass(tag) { return (tag in this.fClassMap) ? this.fClassMap[tag] : -1; }

   /** @summary Clear objects map */
   clearObjectMap() {
      this.fObjectMap = {};
      this.fClassMap = {};
      this.fObjectMap[0] = null;
      this.fDisplacement = 0;
   }

   /** @summary  read class version from I/O buffer */
   readVersion() {
      const ver = {}, bytecnt = this.ntou4(); // byte count

      if (bytecnt & kByteCountMask)
         ver.bytecnt = bytecnt - kByteCountMask - 2; // one can check between Read version and end of streamer
      else
         this.o -= 4; // rollback read bytes, this is old buffer without byte count

      this.last_read_version = ver.val = this.ntoi2();
      this.last_read_checksum = 0;
      ver.off = this.o;

      if ((ver.val <= 0) && ver.bytecnt && (ver.bytecnt >= 4)) {
         ver.checksum = this.ntou4();
         if (!this.fFile.findStreamerInfo(undefined, undefined, ver.checksum)) {
            // console.error(`Fail to find streamer info with check sum ${ver.checksum} version ${ver.val}`);
            this.o -= 4; // not found checksum in the list
            delete ver.checksum; // remove checksum
         } else
            this.last_read_checksum = ver.checksum;
      }
      return ver;
   }

   /** @summary Check bytecount after object streaming */
   checkByteCount(ver, where) {
      if ((ver.bytecnt !== undefined) && (ver.off + ver.bytecnt !== this.o)) {
         if (where)
            console.log(`Missmatch in ${where} bytecount expected = ${ver.bytecnt}  got = ${this.o - ver.off}`);
         this.o = ver.off + ver.bytecnt;
         return false;
      }
      return true;
   }

   /** @summary Read TString object (or equivalent)
     * @desc std::string uses similar binary format */
   readTString() {
      let len = this.ntou1();
      // large strings
      if (len === 255) len = this.ntou4();
      if (len === 0) return '';

      const pos = this.o;
      this.o += len;

      return (this.codeAt(pos) === 0) ? '' : this.substring(pos, pos + len);
   }

    /** @summary read Char_t array as string
      * @desc string either contains all symbols or until 0 symbol */
   readFastString(n) {
      let res = '', code, closed = false;
      // eslint-disable-next-line no-unmodified-loop-condition
      for (let i = 0; (n < 0) || (i < n); ++i) {
         code = this.ntou1();
         if (code === 0) { closed = true; if (n < 0) break; }
         if (!closed) res += String.fromCharCode(code);
      }

      return res;
   }

   /** @summary read uint8_t */
   ntou1() { return this.arr.getUint8(this.o++); }

   /** @summary read uint16_t */
   ntou2() {
      const o = this.o; this.o += 2;
      return this.arr.getUint16(o);
   }

   /** @summary read uint32_t */
   ntou4() {
      const o = this.o; this.o += 4;
      return this.arr.getUint32(o);
   }

   /** @summary read uint64_t */
   ntou8() {
      const high = this.arr.getUint32(this.o); this.o += 4;
      const low = this.arr.getUint32(this.o); this.o += 4;
      return (high < 0x200000) ? (high * 0x100000000 + low) : (BigInt(high) * BigInt(0x100000000) + BigInt(low));
   }

   /** @summary read int8_t */
   ntoi1() { return this.arr.getInt8(this.o++); }

   /** @summary read int16_t */
   ntoi2() {
      const o = this.o; this.o += 2;
      return this.arr.getInt16(o);
   }

   /** @summary read int32_t */
   ntoi4() {
      const o = this.o; this.o += 4;
      return this.arr.getInt32(o);
   }

   /** @summary read int64_t */
   ntoi8() {
      const high = this.arr.getUint32(this.o); this.o += 4;
      const low = this.arr.getUint32(this.o); this.o += 4;
      if (high < 0x80000000)
         return (high < 0x200000) ? (high * 0x100000000 + low) : (BigInt(high) * BigInt(0x100000000) + BigInt(low));
      return (~high < 0x200000) ? (-1 - ((~high) * 0x100000000 + ~low)) : (BigInt(-1) - (BigInt(~high) * BigInt(0x100000000) + BigInt(~low)));
   }

   /** @summary read float */
   ntof() {
      const o = this.o; this.o += 4;
      return this.arr.getFloat32(o);
   }

   /** @summary read double */
   ntod() {
      const o = this.o; this.o += 8;
      return this.arr.getFloat64(o);
   }

   /** @summary Reads array of n values from the I/O buffer */
   readFastArray(n, array_type) {
      let array, i = 0, o = this.o;
      const view = this.arr;
      switch (array_type) {
         case kDouble:
            array = new Float64Array(n);
            for (; i < n; ++i, o += 8)
               array[i] = view.getFloat64(o);
            break;
         case kFloat:
            array = new Float32Array(n);
            for (; i < n; ++i, o += 4)
               array[i] = view.getFloat32(o);
            break;
         case kLong:
         case kLong64:
            array = new Array(n);
            for (; i < n; ++i)
               array[i] = this.ntoi8();
            return array; // exit here to avoid conflicts
         case kULong:
         case kULong64:
            array = new Array(n);
            for (; i < n; ++i)
               array[i] = this.ntou8();
            return array; // exit here to avoid conflicts
         case kInt:
         case kCounter:
            array = new Int32Array(n);
            for (; i < n; ++i, o += 4)
               array[i] = view.getInt32(o);
            break;
         case kShort:
            array = new Int16Array(n);
            for (; i < n; ++i, o += 2)
               array[i] = view.getInt16(o);
            break;
         case kUShort:
            array = new Uint16Array(n);
            for (; i < n; ++i, o += 2)
               array[i] = view.getUint16(o);
            break;
         case kChar:
            array = new Int8Array(n);
            for (; i < n; ++i)
               array[i] = view.getInt8(o++);
            break;
         case kBool:
         case kUChar:
            array = new Uint8Array(n);
            for (; i < n; ++i)
               array[i] = view.getUint8(o++);
            break;
         case kTString:
            array = new Array(n);
            for (; i < n; ++i)
               array[i] = this.readTString();
            return array; // exit here to avoid conflicts
         case kDouble32:
            throw new Error('kDouble32 should not be used in readFastArray');
         case kFloat16:
            throw new Error('kFloat16 should not be used in readFastArray');
         // case kBits:
         // case kUInt:
         default:
            array = new Uint32Array(n);
            for (; i < n; ++i, o += 4)
               array[i] = view.getUint32(o);
            break;
      }

      this.o = o;
      return array;
   }

   /** @summary Check if provided regions can be extracted from the buffer */
   canExtract(place) {
      for (let n = 0; n < place.length; n += 2)
         if (place[n] + place[n + 1] > this.length) return false;
      return true;
   }

   /** @summary Extract area */
   extract(place) {
      if (!this.arr || !this.arr.buffer || !this.canExtract(place)) return null;
      if (place.length === 2) return new DataView(this.arr.buffer, this.arr.byteOffset + place[0], place[1]);

      const res = new Array(place.length / 2);
      for (let n = 0; n < place.length; n += 2)
         res[n / 2] = new DataView(this.arr.buffer, this.arr.byteOffset + place[n], place[n + 1]);

      return res; // return array of buffers
   }

   /** @summary Get code at buffer position */
   codeAt(pos) {
      return this.arr.getUint8(pos);
   }

   /** @summary Get part of buffer as string */
   substring(beg, end) {
      let res = '';
      for (let n = beg; n < end; ++n)
         res += String.fromCharCode(this.arr.getUint8(n));
      return res;
   }

   /** @summary Read buffer as N-dim array */
   readNdimArray(handle, func) {
      let ndim = handle.fArrayDim, maxindx = handle.fMaxIndex, res;
      if ((ndim < 1) && (handle.fArrayLength > 0)) { ndim = 1; maxindx = [handle.fArrayLength]; }
      if (handle.minus1) --ndim;

      if (ndim < 1) return func(this, handle);

      if (ndim === 1) {
         res = new Array(maxindx[0]);
         for (let n = 0; n < maxindx[0]; ++n)
            res[n] = func(this, handle);
      } else if (ndim === 2) {
         res = new Array(maxindx[0]);
         for (let n = 0; n < maxindx[0]; ++n) {
            const res2 = new Array(maxindx[1]);
            for (let k = 0; k < maxindx[1]; ++k)
               res2[k] = func(this, handle);
            res[n] = res2;
         }
      } else {
         const indx = new Array(ndim).fill(0), arr = new Array(ndim);
         for (let k = 0; k < ndim; ++k)
            arr[k] = [];
         res = arr[0];
         while (indx[0] < maxindx[0]) {
            let k = ndim - 1;
            arr[k].push(func(this, handle));
            ++indx[k];
            while ((indx[k] === maxindx[k]) && (k > 0)) {
               indx[k] = 0;
               arr[k - 1].push(arr[k]);
               arr[k] = [];
               ++indx[--k];
            }
         }
      }

      return res;
   }

   /** @summary read TKey data */
   readTKey(key) {
      if (!key) key = {};
      this.classStreamer(key, clTKey);
      const name = key.fName.replace(/['"]/g, '');
      if (name !== key.fName) {
         key.fRealName = key.fName;
         key.fName = name;
      }
      return key;
   }

   /** @summary reading basket data
     * @desc this is remaining part of TBasket streamer to decode fEntryOffset
     * after unzipping of the TBasket data */
   readBasketEntryOffset(basket, offset) {
      this.locate(basket.fLast - offset);

      if (this.remain() <= 0) {
         if (!basket.fEntryOffset && (basket.fNevBuf <= 1)) basket.fEntryOffset = [basket.fKeylen];
         if (!basket.fEntryOffset) console.warn(`No fEntryOffset when expected for basket with ${basket.fNevBuf} entries`);
         return;
      }

      const nentries = this.ntoi4();
      // there is error in file=reco_103.root&item=Events;2/PCaloHits_g4SimHits_EcalHitsEE_Sim.&opt=dump;num:10;first:101
      // it is workaround, but normally I/O should fail here
      if ((nentries < 0) || (nentries > this.remain() * 4)) {
         console.error(`Error when reading entries offset from basket fNevBuf ${basket.fNevBuf} remains ${this.remain()} want to read ${nentries}`);
         if (basket.fNevBuf <= 1) basket.fEntryOffset = [basket.fKeylen];
         return;
      }

      basket.fEntryOffset = this.readFastArray(nentries, kInt);
      if (!basket.fEntryOffset) basket.fEntryOffset = [basket.fKeylen];

      if (this.remain() > 0)
         basket.fDisplacement = this.readFastArray(this.ntoi4(), kInt);
      else
         basket.fDisplacement = undefined;
   }

   /** @summary read class definition from I/O buffer */
   readClass() {
      const classInfo = { name: -1 }, bcnt = this.ntou4(), startpos = this.o;
      let tag;

      if (!(bcnt & kByteCountMask) || (bcnt === kNewClassTag))
         tag = bcnt;
      else
         tag = this.ntou4();

      if (!(tag & kClassMask)) {
         classInfo.objtag = tag + this.fDisplacement; // indicate that we have deal with objects tag
         return classInfo;
      }
      if (tag === kNewClassTag) {
         // got a new class description followed by a new object
         classInfo.name = this.readFastString(-1);

         if (this.getMappedClass(this.fTagOffset + startpos + kMapOffset) === -1)
            this.mapClass(this.fTagOffset + startpos + kMapOffset, classInfo.name);
      } else {
         // got a tag to an already seen class
         const clTag = (tag & ~kClassMask) + this.fDisplacement;
         classInfo.name = this.getMappedClass(clTag);

         if (classInfo.name === -1)
            console.error(`Did not found class with tag ${clTag}`);
      }

      return classInfo;
   }

   /** @summary Read any object from buffer data */
   readObjectAny() {
      const objtag = this.fTagOffset + this.o + kMapOffset,
            clRef = this.readClass();

      // class identified as object and should be handled so
      if ('objtag' in clRef)
         return this.getMappedObject(clRef.objtag);

      if (clRef.name === -1) return null;

      const arrkind = getArrayKind(clRef.name);
      let obj;

      if (arrkind === 0)
         obj = this.readTString();
      else if (arrkind > 0) {
         // reading array, can map array only afterwards
         obj = this.readFastArray(this.ntou4(), arrkind);
         this.mapObject(objtag, obj);
      } else {
         // reading normal object, should map before to
         obj = {};
         this.mapObject(objtag, obj);
         this.classStreamer(obj, clRef.name);
      }

      return obj;
   }

   /** @summary Invoke streamer for specified class  */
   classStreamer(obj, classname) {
      if (obj._typename === undefined) obj._typename = classname;

      const direct = DirectStreamers[classname];
      if (direct) {
         direct(this, obj);
         return obj;
      }

      const ver = this.readVersion(),
            streamer = this.fFile.getStreamer(classname, ver);

      if (streamer !== null) {
         const len = streamer.length;
         for (let n = 0; n < len; ++n)
            streamer[n].func(this, obj);
      } else {
         // just skip bytes belonging to not-recognized object
         // console.warn(`skip object ${classname}`);
         addMethods(obj);
      }

      this.checkByteCount(ver, classname);

      return obj;
   }

} // class TBuffer

// ==============================================================================

/**
  * @summary A class that reads a TDirectory from a buffer.
  *
  * @private
  */

class TDirectory {

   /** @summary constructor */
   constructor(file, dirname, cycle) {
      this.fFile = file;
      this._typename = clTDirectory;
      this.dir_name = dirname;
      this.dir_cycle = cycle;
      this.fKeys = [];
   }

   /** @summary retrieve a key by its name and cycle in the list of keys */
   getKey(keyname, cycle, only_direct) {
      if (typeof cycle !== 'number') cycle = -1;
      let bestkey = null;
      for (let i = 0; i < this.fKeys.length; ++i) {
         const key = this.fKeys[i];
         if (!key || (key.fName !== keyname)) continue;
         if (key.fCycle === cycle) { bestkey = key; break; }
         if ((cycle < 0) && (!bestkey || (key.fCycle > bestkey.fCycle))) bestkey = key;
      }
      if (bestkey)
         return only_direct ? bestkey : Promise.resolve(bestkey);

      let pos = keyname.lastIndexOf('/');
      // try to handle situation when object name contains slashed (bad practice anyway)
      while (pos > 0) {
         const dirname = keyname.slice(0, pos),
               subname = keyname.slice(pos+1),
               dirkey = this.getKey(dirname, undefined, true);

         if (dirkey && !only_direct && (dirkey.fClassName.indexOf(clTDirectory) === 0)) {
            return this.fFile.readObject(this.dir_name + '/' + dirname, 1)
                             .then(newdir => newdir.getKey(subname, cycle));
         }

         pos = keyname.lastIndexOf('/', pos-1);
      }

      return only_direct ? null : Promise.reject(Error(`Key not found ${keyname}`));
   }

   /** @summary Read object from the directory
     * @param {string} name - object name
     * @param {number} [cycle] - cycle number
     * @return {Promise} with read object */
   readObject(obj_name, cycle) {
      return this.fFile.readObject(this.dir_name + '/' + obj_name, cycle);
   }

   /** @summary Read list of keys in directory
     * @return {Promise} with TDirectory object */
   async readKeys(objbuf) {
      objbuf.classStreamer(this, clTDirectory);

      if ((this.fSeekKeys <= 0) || (this.fNbytesKeys <= 0))
         return this;

      return this.fFile.readBuffer([this.fSeekKeys, this.fNbytesKeys]).then(blob => {
         // Read keys of the top directory

         const buf = new TBuffer(blob, 0, this.fFile);

         buf.readTKey();
         const nkeys = buf.ntoi4();

         for (let i = 0; i < nkeys; ++i)
            this.fKeys.push(buf.readTKey());

         this.fFile.fDirectories.push(this);

         return this;
      });
   }

} // class TDirectory

/**
  * @summary Interface to read objects from ROOT files
  *
  * @desc Use {@link openFile} to create instance of the class
  */

class TFile {

   constructor(url) {
      this._typename = clTFile;
      this.fEND = 0;
      this.fFullURL = url;
      this.fURL = url;
      // when disabled ('+' at the end of file name), complete file content read with single operation
      this.fAcceptRanges = true;
      // use additional time stamp parameter for file name to avoid browser caching problem
      this.fUseStampPar = settings.UseStamp ? 'stamp=' + (new Date()).getTime() : false;
      this.fFileContent = null; // this can be full or partial content of the file (if ranges are not supported or if 1K header read from file)
      // stored as TBuffer instance
      this.fMaxRanges = settings.MaxRanges || 200; // maximal number of file ranges requested at once
      this.fDirectories = [];
      this.fKeys = [];
      this.fSeekInfo = 0;
      this.fNbytesInfo = 0;
      this.fTagOffset = 0;
      this.fStreamers = 0;
      this.fStreamerInfos = null;
      this.fFileName = '';
      this.fStreamers = [];
      this.fBasicTypes = {}; // custom basic types, in most case enumerations

      if (!isStr(this.fURL)) return this;

      if (this.fURL[this.fURL.length - 1] === '+') {
         this.fURL = this.fURL.slice(0, this.fURL.length - 1);
         this.fAcceptRanges = false;
      }

      if (this.fURL[this.fURL.length - 1] === '^') {
         this.fURL = this.fURL.slice(0, this.fURL.length - 1);
         this.fSkipHeadRequest = true;
      }

      if (this.fURL[this.fURL.length - 1] === '-') {
         this.fURL = this.fURL.slice(0, this.fURL.length - 1);
         this.fUseStampPar = false;
      }

      if (this.fURL.indexOf('file://') === 0) {
         this.fUseStampPar = false;
         this.fAcceptRanges = false;
      }

      const pos = Math.max(this.fURL.lastIndexOf('/'), this.fURL.lastIndexOf('\\'));
      this.fFileName = pos >= 0 ? this.fURL.slice(pos + 1) : this.fURL;
   }

   /** @summary Assign BufferArray with file contentOpen file
     * @private */
   assignFileContent(bufArray) {
      this.fFileContent = new TBuffer(new DataView(bufArray));
      this.fAcceptRanges = false;
      this.fUseStampPar = false;
      this.fEND = this.fFileContent.length;
   }

   /** @summary Actual file open
     * @return {Promise} when file keys are read
     * @private */
   async _open() { return this.readKeys(); }

   /** @summary read buffer(s) from the file
    * @return {Promise} with read buffers
    * @private */
   async readBuffer(place, filename, progress_callback) {
      if ((this.fFileContent !== null) && !filename && (!this.fAcceptRanges || this.fFileContent.canExtract(place)))
         return this.fFileContent.extract(place);

      let resolveFunc, rejectFunc;

      const file = this, first_block = (place[0] === 0) && (place.length === 2),
            blobs = [], // array of requested segments
            promise = new Promise((resolve, reject) => { resolveFunc = resolve; rejectFunc = reject; });

      let fileurl = file.fURL,
          first = 0, last = 0,
          // eslint-disable-next-line prefer-const
          read_callback, first_req,
          first_block_retry = false;

      if (isStr(filename) && filename) {
         const pos = fileurl.lastIndexOf('/');
         fileurl = (pos < 0) ? filename : fileurl.slice(0, pos + 1) + filename;
      }

      function send_new_request(increment) {
         if (increment) {
            first = last;
            last = Math.min(first + file.fMaxRanges * 2, place.length);
            if (first >= place.length) return resolveFunc(blobs);
         }

         let fullurl = fileurl, ranges = 'bytes', totalsz = 0;
         // try to avoid browser caching by adding stamp parameter to URL
         if (file.fUseStampPar)
            fullurl += ((fullurl.indexOf('?') < 0) ? '?' : '&') + file.fUseStampPar;

         for (let n = first; n < last; n += 2) {
            ranges += (n > first ? ',' : '=') + `${place[n]}-${place[n]+place[n+1]-1}`;
            totalsz += place[n + 1]; // accumulated total size
         }
         if (last - first > 2)
            totalsz += (last - first) * 60; // for multi-range ~100 bytes/per request

         // when read first block, allow to read more - maybe ranges are not supported and full file content will be returned
         if (file.fAcceptRanges && first_block)
            totalsz = Math.max(totalsz, 1e7);

         return createHttpRequest(fullurl, 'buf', read_callback, undefined, true).then(xhr => {
            if (file.fAcceptRanges) {
               xhr.setRequestHeader('Range', ranges);
               xhr.expected_size = Math.max(Math.round(1.1 * totalsz), totalsz + 200); // 200 if offset for the potential gzip
            }

            if (isFunc(progress_callback) && isFunc(xhr.addEventListener)) {
               let sum1 = 0, sum2 = 0, sum_total = 0;
               for (let n = 1; n < place.length; n += 2) {
                  sum_total += place[n];
                  if (n < first) sum1 += place[n];
                  if (n < last) sum2 += place[n];
               }
               if (!sum_total) sum_total = 1;

               const progress_offest = sum1 / sum_total, progress_this = (sum2 - sum1) / sum_total;
               xhr.addEventListener('progress', oEvent => {
                  if (oEvent.lengthComputable) {
                     if (progress_callback(progress_offest + progress_this * oEvent.loaded / oEvent.total) === 'break')
                        xhr.abort();
                  }
               });
            } else if (first_block_retry && isFunc(xhr.addEventListener)) {
               xhr.addEventListener('progress', oEvent => {
                  if (!oEvent.total)
                     console.warn('Fail to get file size information');
                  else if (oEvent.total > 5e7) {
                     console.error(`Try to load very large file ${oEvent.total} at once - abort`);
                     xhr.abort();
                  }
               });
            }

            first_req = first_block ? xhr : null;
            xhr.send(null);
         });
      }

      read_callback = function(res) {
         if (!res && first_block) {
            // if fail to read file with stamp parameter, try once again without it
            if (file.fUseStampPar) {
               file.fUseStampPar = false;
               return send_new_request();
            }
            if (file.fAcceptRanges) {
               file.fAcceptRanges = false;
               first_block_retry = true;
               return send_new_request();
            }
         }

         if (res && first_req) {
            // special workaround for servers like cernbox blocking access to some response headers
            // as result, it is not possible to parse multipart responses
            if (file.fAcceptRanges && (first_req.status === 206) && (res?.byteLength === place[1]) && !first_req.getResponseHeader('Content-Range') && (file.fMaxRanges > 1)) {
               console.warn('Server response with 206 code but browser does not provide access to Content-Range header - setting fMaxRanges = 1, consider to load full file with "filename.root+" argument or adjust server configurations');
               file.fMaxRanges = 1;
            }

            // workaround for simpleHTTP
            const kind = browser.isFirefox ? first_req.getResponseHeader('Server') : '';
            if (isStr(kind) && kind.indexOf('SimpleHTTP') === 0) {
               file.fMaxRanges = 1;
               file.fUseStampPar = false;
            }
         }

         if (res && first_block && !file.fFileContent) {
            // special case - keep content of first request (could be complete file) in memory
            file.fFileContent = new TBuffer(isStr(res) ? res : new DataView(res));

            if (!file.fAcceptRanges)
               file.fEND = file.fFileContent.length;

            return resolveFunc(file.fFileContent.extract(place));
         }

         if (!res) {
            if ((first === 0) && (last > 2) && (file.fMaxRanges > 1)) {
               // server return no response with multi request - try to decrease ranges count or fail

               if (last / 2 > 200)
                  file.fMaxRanges = 200;
               else if (last / 2 > 50)
                  file.fMaxRanges = 50;
               else if (last / 2 > 20)
                  file.fMaxRanges = 20;
               else if (last / 2 > 5)
                  file.fMaxRanges = 5;
               else
                  file.fMaxRanges = 1;
               last = Math.min(last, file.fMaxRanges * 2);
               // console.log(`Change maxranges to ${file.fMaxRanges} last ${last}`);
               return send_new_request();
            }

            return rejectFunc(Error('Fail to read with several ranges'));
         }

         // if only single segment requested, return result as is
         if (last - first === 2) {
            const b = new DataView(res);
            if (place.length === 2) return resolveFunc(b);
            blobs.push(b);
            return send_new_request(true);
         }

         // object to access response data
         const hdr = this.getResponseHeader('Content-Type'),
               ismulti = isStr(hdr) && (hdr.indexOf('multipart') >= 0),
               view = new DataView(res);

         if (!ismulti) {
            // server may returns simple buffer, which combines all segments together

            const hdr_range = this.getResponseHeader('Content-Range');
            let segm_start = 0, segm_last = -1;

            if (isStr(hdr_range) && hdr_range.indexOf('bytes') >= 0) {
               const parts = hdr_range.slice(hdr_range.indexOf('bytes') + 6).split(/[\s-/]+/);
               if (parts.length === 3) {
                  segm_start = Number.parseInt(parts[0]);
                  segm_last = Number.parseInt(parts[1]);
                  if (!Number.isInteger(segm_start) || !Number.isInteger(segm_last) || (segm_start > segm_last)) {
                     segm_start = 0; segm_last = -1;
                  }
               }
            }

            let canbe_single_segment = (segm_start <= segm_last);
            for (let n = first; n < last; n += 2) {
               if ((place[n] < segm_start) || (place[n] + place[n + 1] - 1 > segm_last))
                  canbe_single_segment = false;
            }

            if (canbe_single_segment) {
               for (let n = first; n < last; n += 2)
                  blobs.push(new DataView(res, place[n] - segm_start, place[n + 1]));
               return send_new_request(true);
            }

            if ((file.fMaxRanges === 1) || (first !== 0))
               return rejectFunc(Error('Server returns normal response when multipart was requested, disable multirange support'));

            file.fMaxRanges = 1;
            last = Math.min(last, file.fMaxRanges * 2);

            return send_new_request();
         }

         // multipart messages requires special handling

         const indx = hdr.indexOf('boundary=');
         let boundary = '', n = first, o = 0, normal_order = true;
         if (indx > 0) {
            boundary = hdr.slice(indx + 9);
            if ((boundary[0] === '"') && (boundary[boundary.length - 1] === '"'))
               boundary = boundary.slice(1, boundary.length - 1);
            boundary = '--' + boundary;
         } else
            console.error('Did not found boundary id in the response header');

         while (n < last) {
            let code1, code2 = view.getUint8(o), nline = 0, line = '',
               finish_header = false, segm_start = 0, segm_last = -1;

            while ((o < view.byteLength - 1) && !finish_header && (nline < 5)) {
               code1 = code2;
               code2 = view.getUint8(o + 1);

               if (((code1 === 13) && (code2 === 10)) || (code1 === 10)) {
                  if ((line.length > 2) && (line.slice(0, 2) === '--') && (line !== boundary))
                     return rejectFunc(Error(`Decode multipart message, expect boundary ${boundary} got ${line}`));

                  line = line.toLowerCase();

                  if ((line.indexOf('content-range') >= 0) && (line.indexOf('bytes') > 0)) {
                     const parts = line.slice(line.indexOf('bytes') + 6).split(/[\s-/]+/);
                     if (parts.length === 3) {
                        segm_start = Number.parseInt(parts[0]);
                        segm_last = Number.parseInt(parts[1]);
                        if (!Number.isInteger(segm_start) || !Number.isInteger(segm_last) || (segm_start > segm_last)) {
                           segm_start = 0; segm_last = -1;
                        }
                     } else
                        console.error(`Fail to decode content-range ${line} ${parts}`);
                  }

                  if ((nline > 1) && (line.length === 0)) finish_header = true;

                  nline++; line = '';
                  if (code1 !== 10) {
                     o++; code2 = view.getUint8(o + 1);
                  }
               } else
                  line += String.fromCharCode(code1);
               o++;
            }

            if (!finish_header)
               return rejectFunc(Error('Cannot decode header in multipart message'));

            if (segm_start > segm_last) {
               // fall-back solution, believe that segments same as requested
               blobs.push(new DataView(res, o, place[n + 1]));
               o += place[n + 1];
               n += 2;
            } else if (normal_order) {
               const n0 = n;
               while ((n < last) && (place[n] >= segm_start) && (place[n] + place[n + 1] - 1 <= segm_last)) {
                  blobs.push(new DataView(res, o + place[n] - segm_start, place[n + 1]));
                  n += 2;
               }

               if (n > n0)
                  o += (segm_last - segm_start + 1);
               else
                  normal_order = false;
            }

            if (!normal_order) {
               // special situation when server reorder segments in the reply
               let isany = false;
               for (let n1 = n; n1 < last; n1 += 2) {
                  if ((place[n1] >= segm_start) && (place[n1] + place[n1 + 1] - 1 <= segm_last)) {
                     blobs[n1/2] = new DataView(res, o + place[n1] - segm_start, place[n1 + 1]);
                     isany = true;
                  }
               }
               if (!isany)
                  return rejectFunc(Error(`Provided fragment ${segm_start} - ${segm_last} out of requested multi-range request`));

               while (blobs[n/2])
                  n += 2;

               o += (segm_last - segm_start + 1);
            }
         }

         send_new_request(true);
      };

      return send_new_request(true).then(() => promise);
   }

   /** @summary Returns file name */
   getFileName() { return this.fFileName; }

   /** @summary Get directory with given name and cycle
    * @desc Function only can be used for already read directories, which are preserved in the memory
    * @private */
   getDir(dirname, cycle) {
      if ((cycle === undefined) && isStr(dirname)) {
         const pos = dirname.lastIndexOf(';');
         if (pos > 0) {
            cycle = Number.parseInt(dirname.slice(pos + 1));
            dirname = dirname.slice(0, pos);
         }
      }

      for (let j = 0; j < this.fDirectories.length; ++j) {
         const dir = this.fDirectories[j];
         if (dir.dir_name !== dirname) continue;
         if ((cycle !== undefined) && (dir.dir_cycle !== cycle)) continue;
         return dir;
      }
      return null;
   }

   /** @summary Retrieve a key by its name and cycle in the list of keys
    * @desc If only_direct not specified, returns Promise while key keys must be read first from the directory
    * @private */
   getKey(keyname, cycle, only_direct) {
      if (typeof cycle !== 'number') cycle = -1;
      let bestkey = null;
      for (let i = 0; i < this.fKeys.length; ++i) {
         const key = this.fKeys[i];
         if (!key || (key.fName !== keyname)) continue;
         if (key.fCycle === cycle) { bestkey = key; break; }
         if ((cycle < 0) && (!bestkey || (key.fCycle > bestkey.fCycle))) bestkey = key;
      }
      if (bestkey)
         return only_direct ? bestkey : Promise.resolve(bestkey);

      let pos = keyname.lastIndexOf('/');
      // try to handle situation when object name contains slashes (bad practice anyway)
      while (pos > 0) {
         const dirname = keyname.slice(0, pos),
               subname = keyname.slice(pos + 1),
               dir = this.getDir(dirname);

         if (dir) return dir.getKey(subname, cycle, only_direct);

         const dirkey = this.getKey(dirname, undefined, true);
         if (dirkey && !only_direct && (dirkey.fClassName.indexOf(clTDirectory) === 0))
            return this.readObject(dirname).then(newdir => newdir.getKey(subname, cycle));

         pos = keyname.lastIndexOf('/', pos - 1);
      }

      return only_direct ? null : Promise.reject(Error(`Key not found ${keyname}`));
   }

   /** @summary Read and inflate object buffer described by its key
    * @private */
   async readObjBuffer(key) {
      return this.readBuffer([key.fSeekKey + key.fKeylen, key.fNbytes - key.fKeylen]).then(blob1 => {
         if (key.fObjlen <= key.fNbytes - key.fKeylen) {
            const buf = new TBuffer(blob1, 0, this);
            buf.fTagOffset = key.fKeylen;
            return buf;
         }

         return R__unzip(blob1, key.fObjlen).then(objbuf => {
            if (!objbuf)
               return Promise.reject(Error(`Fail to UNZIP buffer for ${key.fName}`));

            const buf = new TBuffer(objbuf, 0, this);
            buf.fTagOffset = key.fKeylen;
            return buf;
         });
      });
   }

   /** @summary Read any object from a root file
     * @desc One could specify cycle number in the object name or as separate argument
     * @param {string} obj_name - name of object, may include cycle number like 'hpxpy;1'
     * @param {number} [cycle] - cycle number, also can be included in obj_name
     * @return {Promise} promise with object read
     * @example
     * import { openFile } from 'https://root.cern/js/latest/modules/io.mjs';
     * let f = await openFile('https://root.cern/js/files/hsimple.root');
     * let obj = await f.readObject('hpxpy;1');
     * console.log(`Read object of type ${obj._typename}`); */
   async readObject(obj_name, cycle, only_dir) {
      const pos = obj_name.lastIndexOf(';');
      if (pos >= 0) {
         cycle = Number.parseInt(obj_name.slice(pos + 1));
         obj_name = obj_name.slice(0, pos);
      }

      if (typeof cycle !== 'number') cycle = -1;
      // remove leading slashes
      while (obj_name.length && (obj_name[0] === '/')) obj_name = obj_name.slice(1);

      // one uses Promises while in some cases we need to
      // read sub-directory to get list of keys
      // in such situation calls are asynchrone
      return this.getKey(obj_name, cycle).then(key => {
         if ((obj_name === nameStreamerInfo) && (key.fClassName === clTList))
            return this.fStreamerInfos;

         let isdir = false;

         if ((key.fClassName === clTDirectory || key.fClassName === clTDirectoryFile)) {
            const dir = this.getDir(obj_name, cycle);
            if (dir) return dir;
            isdir = true;
         }

         if (!isdir && only_dir)
            return Promise.reject(Error(`Key ${obj_name} is not directory}`));

         return this.readObjBuffer(key).then(buf => {
            if (isdir) {
               const dir = new TDirectory(this, obj_name, cycle);
               dir.fTitle = key.fTitle;
               return dir.readKeys(buf);
            }

            const obj = {};
            buf.mapObject(1, obj); // tag object itself with id == 1
            buf.classStreamer(obj, key.fClassName);

            if ((key.fClassName === clTF1) || (key.fClassName === clTF2))
               return this._readFormulas(obj);

            return obj;
         });
      });
   }

   /** @summary read formulas from the file and add them to TF1/TF2 objects
     * @private */
   async _readFormulas(tf1) {
      const arr = [];
      for (let indx = 0; indx < this.fKeys.length; ++indx) {
         if (this.fKeys[indx].fClassName === 'TFormula')
            arr.push(this.readObject(this.fKeys[indx].fName, this.fKeys[indx].fCycle));
      }

      return Promise.all(arr).then(formulas => {
         formulas.forEach(obj => tf1.addFormula(obj));
         return tf1;
      });
   }

   /** @summary extract streamer infos from the buffer
     * @private */
   extractStreamerInfos(buf) {
      if (!buf) return;

      const lst = {};
      buf.mapObject(1, lst);

      try {
         buf.classStreamer(lst, clTList);
      } catch (err) {
          console.error('Fail extract streamer infos', err);
          return;
      }

      lst._typename = clTStreamerInfoList;

      this.fStreamerInfos = lst;

      if (isFunc(internals.addStreamerInfosForPainter))
         internals.addStreamerInfosForPainter(lst);

      for (let k = 0; k < lst.arr.length; ++k) {
         const si = lst.arr[k];
         if (!si.fElements) continue;
         for (let l = 0; l < si.fElements.arr.length; ++l) {
            const elem = si.fElements.arr[l];
            if (!elem.fTypeName || !elem.fType) continue;

            let typ = elem.fType, typname = elem.fTypeName;

            if (typ >= 60) {
               if ((typ === kStreamer) && (elem._typename === clTStreamerSTL) && elem.fSTLtype && elem.fCtype && (elem.fCtype < 20)) {
                  const prefix = (StlNames[elem.fSTLtype] || 'undef') + '<';
                  if ((typname.indexOf(prefix) === 0) && (typname[typname.length - 1] === '>')) {
                     typ = elem.fCtype;
                     typname = typname.slice(prefix.length, typname.length - 1).trim();

                     if ((elem.fSTLtype === kSTLmap) || (elem.fSTLtype === kSTLmultimap)) {
                        if (typname.indexOf(',') > 0)
                           typname = typname.slice(0, typname.indexOf(',')).trim();
                        else
                           continue;
                     }
                  }
               }
               if (typ >= 60) continue;
            } else {
               if ((typ > 20) && (typname[typname.length - 1] === '*')) typname = typname.slice(0, typname.length - 1);
               typ = typ % 20;
            }

            const kind = getTypeId(typname);
            if (kind === typ) continue;

            if ((typ === kBits) && (kind === kUInt)) continue;
            if ((typ === kCounter) && (kind === kInt)) continue;

            if (typname && typ && (this.fBasicTypes[typname] !== typ))
               this.fBasicTypes[typname] = typ;
         }
      }
   }

   /** @summary Read file keys
     * @private */
   async readKeys() {
      // with the first readbuffer we read bigger amount to create header cache
      return this.readBuffer([0, 400]).then(blob => {
         const buf = new TBuffer(blob, 0, this);
         if (buf.substring(0, 4) !== 'root')
            return Promise.reject(Error(`Not a ROOT file ${this.fURL}`));

         buf.shift(4);

         this.fVersion = buf.ntou4();
         this.fBEGIN = buf.ntou4();
         if (this.fVersion < 1000000) { // small file
            this.fEND = buf.ntou4();
            this.fSeekFree = buf.ntou4();
            this.fNbytesFree = buf.ntou4();
            buf.shift(4); // const nfree = buf.ntoi4();
            this.fNbytesName = buf.ntou4();
            this.fUnits = buf.ntou1();
            this.fCompress = buf.ntou4();
            this.fSeekInfo = buf.ntou4();
            this.fNbytesInfo = buf.ntou4();
         } else { // new format to support large files
            this.fEND = buf.ntou8();
            this.fSeekFree = buf.ntou8();
            this.fNbytesFree = buf.ntou4();
            buf.shift(4); // const nfree = buf.ntou4();
            this.fNbytesName = buf.ntou4();
            this.fUnits = buf.ntou1();
            this.fCompress = buf.ntou4();
            this.fSeekInfo = buf.ntou8();
            this.fNbytesInfo = buf.ntou4();
         }

         // empty file
         if (!this.fSeekInfo || !this.fNbytesInfo)
            return Promise.reject(Error(`File ${this.fURL} does not provide streamer infos`));

         // extra check to prevent reading of corrupted data
         if (!this.fNbytesName || this.fNbytesName > 100000)
            return Promise.reject(Error(`Cannot read directory info of the file ${this.fURL}`));

         // *-*-------------Read directory info
         let nbytes = this.fNbytesName + 22;
         nbytes += 4;  // fDatimeC.Sizeof();
         nbytes += 4;  // fDatimeM.Sizeof();
         nbytes += 18; // fUUID.Sizeof();
         // assume that the file may be above 2 Gbytes if file version is > 4
         if (this.fVersion >= 40000) nbytes += 12;

         // this part typically read from the header, no need to optimize
         return this.readBuffer([this.fBEGIN, Math.max(300, nbytes)]);
      }).then(blob3 => {
         const buf3 = new TBuffer(blob3, 0, this);

         // keep only title from TKey data
         this.fTitle = buf3.readTKey().fTitle;

         buf3.locate(this.fNbytesName);

         // we read TDirectory part of TFile
         buf3.classStreamer(this, clTDirectory);

         if (!this.fSeekKeys)
            return Promise.reject(Error(`Empty keys list in ${this.fURL}`));

         // read with same request keys and streamer infos
         return this.readBuffer([this.fSeekKeys, this.fNbytesKeys, this.fSeekInfo, this.fNbytesInfo]);
      }).then(blobs => {
         const buf4 = new TBuffer(blobs[0], 0, this);

         buf4.readTKey(); //
         const nkeys = buf4.ntoi4();
         for (let i = 0; i < nkeys; ++i)
            this.fKeys.push(buf4.readTKey());

         const buf5 = new TBuffer(blobs[1], 0, this),
               si_key = buf5.readTKey();
         if (!si_key)
            return Promise.reject(Error(`Fail to read StreamerInfo data in ${this.fURL}`));

         this.fKeys.push(si_key);
         return this.readObjBuffer(si_key);
      }).then(blob6 => {
          this.extractStreamerInfos(blob6);
          return this;
      });
   }

   /** @summary Read the directory content from  a root file
     * @desc If directory was already read - return previously read object
     * Same functionality as {@link TFile#readObject}
     * @param {string} dir_name - directory name
     * @param {number} [cycle] - directory cycle
     * @return {Promise} - promise with read directory */
   async readDirectory(dir_name, cycle) {
      return this.readObject(dir_name, cycle, true);
   }

   /** @summary Search streamer info
     * @param {string} clanme - class name
     * @param {number} [clversion] - class version
     * @param {number} [checksum] - streamer info checksum, have to match when specified
     * @private */
   findStreamerInfo(clname, clversion, checksum) {
      if (!this.fStreamerInfos) return null;

      const arr = this.fStreamerInfos.arr, len = arr.length;

      if (checksum !== undefined) {
         let cache = this.fStreamerInfos.cache;
         if (!cache) cache = this.fStreamerInfos.cache = {};
         let si = cache[checksum];
         if (si !== undefined) return si;

         for (let i = 0; i < len; ++i) {
            si = arr[i];
            if (si.fCheckSum === checksum) {
               cache[checksum] = si;
               return si;
            }
         }
         cache[checksum] = null; // checksum didnot found, do not try again
      } else {
         for (let i = 0; i < len; ++i) {
            const si = arr[i];
            if ((si.fName === clname) && ((si.fClassVersion === clversion) || (clversion === undefined))) return si;
         }
      }

      return null;
   }

   /** @summary Returns streamer for the class 'clname',
     * @desc From the list of streamers or generate it from the streamer infos and add it to the list
     * @private */
   getStreamer(clname, ver, s_i) {
      // these are special cases, which are handled separately
      if (clname === clTQObject || clname === clTBasket) return null;

      let streamer, fullname = clname;

      if (ver) {
         fullname += (ver.checksum ? `$chksum${ver.checksum}` : `$ver${ver.val}`);
         streamer = this.fStreamers[fullname];
         if (streamer !== undefined) return streamer;
      }

      const custom = CustomStreamers[clname];

      // one can define in the user streamers just aliases
      if (isStr(custom))
         return this.getStreamer(custom, ver, s_i);

      // streamer is just separate function
      if (isFunc(custom)) {
         streamer = [{ typename: clname, func: custom }];
         return addClassMethods(clname, streamer);
      }

      streamer = [];

      if (isObject(custom)) {
         if (!custom.name && !custom.func) return custom;
         streamer.push(custom); // special read entry, add in the beginning of streamer
      }

      // check element in streamer infos, one can have special cases
      if (!s_i) s_i = this.findStreamerInfo(clname, ver.val, ver.checksum);

      if (!s_i) {
         delete this.fStreamers[fullname];
         if (!ver.nowarning)
            console.warn(`Not found streamer for ${clname} ver ${ver.val} checksum ${ver.checksum} full ${fullname}`);
         return null;
      }

      // special handling for TStyle which has duplicated member name fLineStyle
      if ((s_i.fName === clTStyle) && s_i.fElements) {
         s_i.fElements.arr.forEach(elem => {
            if (elem.fName === 'fLineStyle') elem.fName = 'fLineStyles'; // like in ROOT JSON now
         });
      }

      // for each entry in streamer info produce member function
      if (s_i.fElements) {
         for (let j = 0; j < s_i.fElements.arr.length; ++j)
            streamer.push(createMemberStreamer(s_i.fElements.arr[j], this));
      }

      this.fStreamers[fullname] = streamer;

      return addClassMethods(clname, streamer);
   }

   /** @summary Here we produce list of members, resolving all base classes
     * @private */
   getSplittedStreamer(streamer, tgt) {
      if (!streamer) return tgt;

      if (!tgt) tgt = [];

      for (let n = 0; n < streamer.length; ++n) {
         const elem = streamer[n];

         if (elem.base === undefined) {
            tgt.push(elem);
            continue;
         }

         if (elem.basename === clTObject) {
            tgt.push({
               func(buf, obj) {
                  buf.ntoi2(); // read version, why it here??
                  obj.fUniqueID = buf.ntou4();
                  obj.fBits = buf.ntou4();
                  if (obj.fBits & kIsReferenced) buf.ntou2(); // skip pid
               }
            });
            continue;
         }

         const ver = { val: elem.base };

         if (ver.val === 4294967295) {
            // this is -1 and indicates foreign class, need more workarounds
            ver.val = 1; // need to search version 1 - that happens when several versions of foreign class exists ???
         }

         const parent = this.getStreamer(elem.basename, ver);
         if (parent) this.getSplittedStreamer(parent, tgt);
      }

      return tgt;
   }

   /** @summary Fully clenaup TFile data
     * @private */
   delete() {
      this.fDirectories = null;
      this.fKeys = null;
      this.fStreamers = null;
      this.fSeekInfo = 0;
      this.fNbytesInfo = 0;
      this.fTagOffset = 0;
   }

} // class TFile

/** @summary Function to read vector element in the streamer
  * @private */
function readVectorElement(buf) {
   if (this.member_wise) {
      const n = buf.ntou4(), ver = this.stl_version;
      let streamer = null;

      if (n === 0) return []; // for empty vector no need to search split streamers

      if (n > 1000000)
         throw new Error(`member-wise streaming of ${this.conttype} num ${n} member ${this.name}`);

      if ((ver.val === this.member_ver) && (ver.checksum === this.member_checksum))
         streamer = this.member_streamer;
      else {
         streamer = buf.fFile.getStreamer(this.conttype, ver);

         this.member_streamer = streamer = buf.fFile.getSplittedStreamer(streamer);
         this.member_ver = ver.val;
         this.member_checksum = ver.checksum;
      }

      const res = new Array(n);
      let i, k, member;

      for (i = 0; i < n; ++i)
         res[i] = { _typename: this.conttype }; // create objects
      if (!streamer)
         console.error(`Fail to create split streamer for ${this.conttype} need to read ${n} objects version ${ver}`);
      else {
         for (k = 0; k < streamer.length; ++k) {
            member = streamer[k];
            if (member.split_func)
               member.split_func(buf, res, n);
            else {
               for (i = 0; i < n; ++i)
                  member.func(buf, res[i]);
            }
         }
      }
      return res;
   }

   const n = buf.ntou4(), res = new Array(n);
   let i = 0;

   if (n > 200000) {
      console.error(`vector streaming for ${this.conttype} at ${n}`);
      return res;
   }

   if (this.arrkind > 0)
      while (i < n) res[i++] = buf.readFastArray(buf.ntou4(), this.arrkind);
   else if (this.arrkind === 0)
      while (i < n) res[i++] = buf.readTString();
   else if (this.isptr)
      while (i < n) res[i++] = buf.readObjectAny();
   else if (this.submember)
      while (i < n) res[i++] = this.submember.readelem(buf);
   else
      while (i < n) res[i++] = buf.classStreamer({}, this.conttype);

   return res;
}


/** @summary Function used in streamer to read std::map object
  * @private */
function readMapElement(buf) {
   let streamer = this.streamer;

   if (this.member_wise) {
      // when member-wise streaming is used, version is written
      const ver = this.stl_version;

      if (this.si) {
         const si = buf.fFile.findStreamerInfo(this.pairtype, ver.val, ver.checksum);

         if (this.si !== si) {
            streamer = getPairStreamer(si, this.pairtype, buf.fFile);
            if (!streamer || streamer.length !== 2) {
               console.log(`Fail to produce streamer for ${this.pairtype}`);
               return null;
            }
         }
      }
   }

   const n = buf.ntoi4(), res = new Array(n);

   // no extra data written for empty map
   if (n === 0)
      return res;

   if (this.member_wise && (buf.remain() >= 6)) {
      if (buf.ntoi2() === kStreamedMemberWise)
         buf.shift(4); // skip checksum
      else
         buf.shift(-2); // rewind
   }

   for (let i = 0; i < n; ++i) {
      res[i] = { _typename: this.pairtype };
      streamer[0].func(buf, res[i]);
      if (!this.member_wise) streamer[1].func(buf, res[i]);
   }

   // due-to member-wise streaming second element read after first is completed
   if (this.member_wise) {
      if (buf.remain() >= 6) {
         if (buf.ntoi2() === kStreamedMemberWise)
            buf.shift(4);  // skip checksum
         else
            buf.shift(-2);  // rewind
      }
      for (let i = 0; i < n; ++i)
         streamer[1].func(buf, res[i]);
   }

   return res;
}

// =============================================================

/**
  * @summary Interface to read local file in the browser
  *
  * @hideconstructor
  * @desc Use {@link openFile} to create instance of the class
  * @private
  */

class TLocalFile extends TFile {

   constructor(file) {
      super(null);
      this.fUseStampPar = false;
      this.fLocalFile = file;
      this.fEND = file.size;
      this.fFullURL = file.name;
      this.fURL = file.name;
      this.fFileName = file.name;
   }

   /** @summary Open local file
     * @return {Promise} after file keys are read */
   async _open() { return this.readKeys(); }

   /** @summary read buffer from local file
     * @return {Promise} with read data */
   async readBuffer(place, filename /*, progress_callback */) {
      const file = this.fLocalFile;

      return new Promise((resolve, reject) => {
         if (filename)
            return reject(Error(`Cannot access other local file ${filename}`));

         const reader = new FileReader(), blobs = [];
         let cnt = 0;

         reader.onload = function(evnt) {
            const res = new DataView(evnt.target.result);
            if (place.length === 2) return resolve(res);

            blobs.push(res);
            cnt += 2;
            if (cnt >= place.length) return resolve(blobs);
            reader.readAsArrayBuffer(file.slice(place[cnt], place[cnt] + place[cnt + 1]));
         };

         reader.readAsArrayBuffer(file.slice(place[0], place[0] + place[1]));
      });
   }

} // class TLocalFile

/**
  * @summary Interface to read file in node.js
  *
  * @hideconstructor
  * @desc Use {@link openFile} to create instance of the class
  * @private
  */

class TNodejsFile extends TFile {

   constructor(filename) {
      super(null);
      this.fUseStampPar = false;
      this.fEND = 0;
      this.fFullURL = filename;
      this.fURL = filename;
      this.fFileName = filename;
   }

   /** @summary Open file in node.js
     * @return {Promise} after file keys are read */
   async _open() {
      return Promise.resolve().then(function () { return _rollup_plugin_ignore_empty_module_placeholder$1; }).then(fs => {
         this.fs = fs;

         return new Promise((resolve, reject) =>

            this.fs.open(this.fFileName, 'r', (status, fd) => {
               if (status) {
                  console.log(status.message);
                  return reject(Error(`Not possible to open ${this.fFileName} inside node.js`));
               }
               const stats = this.fs.fstatSync(fd);
               this.fEND = stats.size;
               this.fd = fd;
               this.readKeys().then(resolve).catch(reject);
            })
         );
      });
   }

   /** @summary Read buffer from node.js file
     * @return {Promise} with requested blocks */
   async readBuffer(place, filename /*, progress_callback */) {
      return new Promise((resolve, reject) => {
         if (filename)
            return reject(Error(`Cannot access other local file ${filename}`));

         if (!this.fs || !this.fd)
            return reject(Error(`File is not opened ${this.fFileName}`));

         const blobs = [];
         let cnt = 0;

         // eslint-disable-next-line n/handle-callback-err
         const readfunc = (_err, _bytesRead, buf) => {
            const res = new DataView(buf.buffer, buf.byteOffset, place[cnt + 1]);
            if (place.length === 2) return resolve(res);
            blobs.push(res);
            cnt += 2;
            if (cnt >= place.length) return resolve(blobs);
            this.fs.read(this.fd, Buffer.alloc(place[cnt + 1]), 0, place[cnt + 1], place[cnt], readfunc);
         };

         this.fs.read(this.fd, Buffer.alloc(place[1]), 0, place[1], place[0], readfunc);
      });
   }

} // class TNodejsFile

/**
  * @summary Proxy to read file contenxt
  *
  * @desc Should implement following methods:
  *
  * - openFile() - return Promise with true when file can be open normally
  * - getFileName() - returns string with file name
  * - getFileSize() - returns size of file
  * - readBuffer(pos, len) - return promise with DataView for requested position and length
  *
  * @private
  */

class FileProxy {

   async openFile() { return false; }
   getFileName() { return ''; }
   getFileSize() { return 0; }
   async readBuffer(/* pos, sz */) { return null; }

} // class FileProxy

/**
  * @summary File to use file context via FileProxy
  *
  * @hideconstructor
  * @desc Use {@link openFile} to create instance of the class, providing FileProxy as argument
  * @private
  */

class TProxyFile extends TFile {

   constructor(proxy) {
      super(null);
      this.fUseStampPar = false;
      this.proxy = proxy;
   }

   /** @summary Open file
     * @return {Promise} after file keys are read */
   async _open() {
      return this.proxy.openFile().then(res => {
         if (!res) return false;
         this.fEND = this.proxy.getFileSize();
         this.fFullURL = this.fURL = this.fFileName = this.proxy.getFileName();
         if (isStr(this.fFileName)) {
            const p = this.fFileName.lastIndexOf('/');
            if ((p > 0) && (p < this.fFileName.length - 4))
               this.fFileName = this.fFileName.slice(p+1);
         }
         return this.readKeys();
      });
   }

   /** @summary Read buffer from FileProxy
     * @return {Promise} with requested blocks */
   async readBuffer(place, filename /*, progress_callback */) {
      if (filename)
         return Promise.reject(Error(`Cannot access other file ${filename}`));

      if (!this.proxy)
         return Promise.reject(Error(`File is not opened ${this.fFileName}`));

      if (place.length === 2)
         return this.proxy.readBuffer(place[0], place[1]);

      const arr = [];
      for (let k = 0; k < place.length; k+=2)
         arr.push(this.proxy.readBuffer(place[k], place[k+1]));
      return Promise.all(arr);
   }

} // class TProxyFile


/** @summary Open ROOT file for reading
  * @desc Generic method to open ROOT file for reading
  * Following kind of arguments can be provided:
  *  - string with file URL (see example). In node.js environment local file like 'file://hsimple.root' can be specified
  *  - [File]{@link https://developer.mozilla.org/en-US/docs/Web/API/File} instance which let read local files from browser
  *  - [ArrayBuffer]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer} instance with complete file content
  *  - [FileProxy]{@link FileProxy} let access arbitrary files via tiny proxy API
  * @param {string|object} arg - argument for file open like url, see details
  * @return {object} - Promise with {@link TFile} instance when file is opened
  * @example
  *
  * import { openFile } from 'https://root.cern/js/latest/modules/io.mjs';
  * let f = await openFile('https://root.cern/js/files/hsimple.root');
  * console.log(`Open file ${f.getFileName()}`); */
function openFile(arg) {
   let file;

   if (isNodeJs() && isStr(arg)) {
      if (arg.indexOf('file://') === 0)
         file = new TNodejsFile(arg.slice(7));
      else if (arg.indexOf('http') !== 0)
         file = new TNodejsFile(arg);
   }

   if (!file && isObject(arg) && (arg instanceof FileProxy))
      file = new TProxyFile(arg);

   if (!file && isObject(arg) && (arg instanceof ArrayBuffer)) {
      file = new TFile('localfile.root');
      file.assignFileContent(arg);
   }

   if (!file && isObject(arg) && arg.size && arg.name)
      file = new TLocalFile(arg);

   if (!file)
      file = new TFile(arg);

   return file._open();
}

// special way to assign methods when streaming objects
addClassMethods(clTNamed, CustomStreamers[clTNamed]);
addClassMethods(clTObjString, CustomStreamers[clTObjString]);

// https://d3js.org v7.9.0 Copyright 2010-2021 Mike Bostock

function define(constructor, factory, prototype) {
  constructor.prototype = factory.prototype = prototype;
  prototype.constructor = constructor;
}

function extend(parent, definition) {
  var prototype = Object.create(parent.prototype);
  for (var key in definition) prototype[key] = definition[key];
  return prototype;
}

function Color() {}

var darker = 0.7;
var brighter = 1 / darker;

var reI = "\\s*([+-]?\\d+)\\s*",
    reN = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*",
    reP = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*",
    reHex = /^#([0-9a-f]{3,8})$/,
    reRgbInteger = new RegExp(`^rgb\\(${reI},${reI},${reI}\\)$`),
    reRgbPercent = new RegExp(`^rgb\\(${reP},${reP},${reP}\\)$`),
    reRgbaInteger = new RegExp(`^rgba\\(${reI},${reI},${reI},${reN}\\)$`),
    reRgbaPercent = new RegExp(`^rgba\\(${reP},${reP},${reP},${reN}\\)$`),
    reHslPercent = new RegExp(`^hsl\\(${reN},${reP},${reP}\\)$`),
    reHslaPercent = new RegExp(`^hsla\\(${reN},${reP},${reP},${reN}\\)$`);

var named = {
  aliceblue: 0xf0f8ff,
  antiquewhite: 0xfaebd7,
  aqua: 0x00ffff,
  aquamarine: 0x7fffd4,
  azure: 0xf0ffff,
  beige: 0xf5f5dc,
  bisque: 0xffe4c4,
  black: 0x000000,
  blanchedalmond: 0xffebcd,
  blue: 0x0000ff,
  blueviolet: 0x8a2be2,
  brown: 0xa52a2a,
  burlywood: 0xdeb887,
  cadetblue: 0x5f9ea0,
  chartreuse: 0x7fff00,
  chocolate: 0xd2691e,
  coral: 0xff7f50,
  cornflowerblue: 0x6495ed,
  cornsilk: 0xfff8dc,
  crimson: 0xdc143c,
  cyan: 0x00ffff,
  darkblue: 0x00008b,
  darkcyan: 0x008b8b,
  darkgoldenrod: 0xb8860b,
  darkgray: 0xa9a9a9,
  darkgreen: 0x006400,
  darkgrey: 0xa9a9a9,
  darkkhaki: 0xbdb76b,
  darkmagenta: 0x8b008b,
  darkolivegreen: 0x556b2f,
  darkorange: 0xff8c00,
  darkorchid: 0x9932cc,
  darkred: 0x8b0000,
  darksalmon: 0xe9967a,
  darkseagreen: 0x8fbc8f,
  darkslateblue: 0x483d8b,
  darkslategray: 0x2f4f4f,
  darkslategrey: 0x2f4f4f,
  darkturquoise: 0x00ced1,
  darkviolet: 0x9400d3,
  deeppink: 0xff1493,
  deepskyblue: 0x00bfff,
  dimgray: 0x696969,
  dimgrey: 0x696969,
  dodgerblue: 0x1e90ff,
  firebrick: 0xb22222,
  floralwhite: 0xfffaf0,
  forestgreen: 0x228b22,
  fuchsia: 0xff00ff,
  gainsboro: 0xdcdcdc,
  ghostwhite: 0xf8f8ff,
  gold: 0xffd700,
  goldenrod: 0xdaa520,
  gray: 0x808080,
  green: 0x008000,
  greenyellow: 0xadff2f,
  grey: 0x808080,
  honeydew: 0xf0fff0,
  hotpink: 0xff69b4,
  indianred: 0xcd5c5c,
  indigo: 0x4b0082,
  ivory: 0xfffff0,
  khaki: 0xf0e68c,
  lavender: 0xe6e6fa,
  lavenderblush: 0xfff0f5,
  lawngreen: 0x7cfc00,
  lemonchiffon: 0xfffacd,
  lightblue: 0xadd8e6,
  lightcoral: 0xf08080,
  lightcyan: 0xe0ffff,
  lightgoldenrodyellow: 0xfafad2,
  lightgray: 0xd3d3d3,
  lightgreen: 0x90ee90,
  lightgrey: 0xd3d3d3,
  lightpink: 0xffb6c1,
  lightsalmon: 0xffa07a,
  lightseagreen: 0x20b2aa,
  lightskyblue: 0x87cefa,
  lightslategray: 0x778899,
  lightslategrey: 0x778899,
  lightsteelblue: 0xb0c4de,
  lightyellow: 0xffffe0,
  lime: 0x00ff00,
  limegreen: 0x32cd32,
  linen: 0xfaf0e6,
  magenta: 0xff00ff,
  maroon: 0x800000,
  mediumaquamarine: 0x66cdaa,
  mediumblue: 0x0000cd,
  mediumorchid: 0xba55d3,
  mediumpurple: 0x9370db,
  mediumseagreen: 0x3cb371,
  mediumslateblue: 0x7b68ee,
  mediumspringgreen: 0x00fa9a,
  mediumturquoise: 0x48d1cc,
  mediumvioletred: 0xc71585,
  midnightblue: 0x191970,
  mintcream: 0xf5fffa,
  mistyrose: 0xffe4e1,
  moccasin: 0xffe4b5,
  navajowhite: 0xffdead,
  navy: 0x000080,
  oldlace: 0xfdf5e6,
  olive: 0x808000,
  olivedrab: 0x6b8e23,
  orange: 0xffa500,
  orangered: 0xff4500,
  orchid: 0xda70d6,
  palegoldenrod: 0xeee8aa,
  palegreen: 0x98fb98,
  paleturquoise: 0xafeeee,
  palevioletred: 0xdb7093,
  papayawhip: 0xffefd5,
  peachpuff: 0xffdab9,
  peru: 0xcd853f,
  pink: 0xffc0cb,
  plum: 0xdda0dd,
  powderblue: 0xb0e0e6,
  purple: 0x800080,
  rebeccapurple: 0x663399,
  red: 0xff0000,
  rosybrown: 0xbc8f8f,
  royalblue: 0x4169e1,
  saddlebrown: 0x8b4513,
  salmon: 0xfa8072,
  sandybrown: 0xf4a460,
  seagreen: 0x2e8b57,
  seashell: 0xfff5ee,
  sienna: 0xa0522d,
  silver: 0xc0c0c0,
  skyblue: 0x87ceeb,
  slateblue: 0x6a5acd,
  slategray: 0x708090,
  slategrey: 0x708090,
  snow: 0xfffafa,
  springgreen: 0x00ff7f,
  steelblue: 0x4682b4,
  tan: 0xd2b48c,
  teal: 0x008080,
  thistle: 0xd8bfd8,
  tomato: 0xff6347,
  turquoise: 0x40e0d0,
  violet: 0xee82ee,
  wheat: 0xf5deb3,
  white: 0xffffff,
  whitesmoke: 0xf5f5f5,
  yellow: 0xffff00,
  yellowgreen: 0x9acd32
};

define(Color, color, {
  copy(channels) {
    return Object.assign(new this.constructor, this, channels);
  },
  displayable() {
    return this.rgb().displayable();
  },
  hex: color_formatHex, // Deprecated! Use color.formatHex.
  formatHex: color_formatHex,
  formatHex8: color_formatHex8,
  formatHsl: color_formatHsl,
  formatRgb: color_formatRgb,
  toString: color_formatRgb
});

function color_formatHex() {
  return this.rgb().formatHex();
}

function color_formatHex8() {
  return this.rgb().formatHex8();
}

function color_formatHsl() {
  return hslConvert(this).formatHsl();
}

function color_formatRgb() {
  return this.rgb().formatRgb();
}

function color(format) {
  var m, l;
  format = (format + "").trim().toLowerCase();
  return (m = reHex.exec(format)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) // #ff0000
      : l === 3 ? new Rgb((m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), ((m & 0xf) << 4) | (m & 0xf), 1) // #f00
      : l === 8 ? rgba(m >> 24 & 0xff, m >> 16 & 0xff, m >> 8 & 0xff, (m & 0xff) / 0xff) // #ff000000
      : l === 4 ? rgba((m >> 12 & 0xf) | (m >> 8 & 0xf0), (m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), (((m & 0xf) << 4) | (m & 0xf)) / 0xff) // #f000
      : null) // invalid hex
      : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) // rgb(255, 0, 0)
      : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) // rgb(100%, 0%, 0%)
      : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) // rgba(255, 0, 0, 1)
      : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) // rgb(100%, 0%, 0%, 1)
      : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) // hsl(120, 50%, 50%)
      : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) // hsla(120, 50%, 50%, 1)
      : named.hasOwnProperty(format) ? rgbn(named[format]) // eslint-disable-line no-prototype-builtins
      : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0)
      : null;
}

function rgbn(n) {
  return new Rgb(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff, 1);
}

function rgba(r, g, b, a) {
  if (a <= 0) r = g = b = NaN;
  return new Rgb(r, g, b, a);
}

function rgbConvert(o) {
  if (!(o instanceof Color)) o = color(o);
  if (!o) return new Rgb;
  o = o.rgb();
  return new Rgb(o.r, o.g, o.b, o.opacity);
}

function rgb(r, g, b, opacity) {
  return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
}

function Rgb(r, g, b, opacity) {
  this.r = +r;
  this.g = +g;
  this.b = +b;
  this.opacity = +opacity;
}

define(Rgb, rgb, extend(Color, {
  brighter(k) {
    k = k == null ? brighter : Math.pow(brighter, k);
    return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
  },
  darker(k) {
    k = k == null ? darker : Math.pow(darker, k);
    return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
  },
  rgb() {
    return this;
  },
  clamp() {
    return new Rgb(clampi(this.r), clampi(this.g), clampi(this.b), clampa(this.opacity));
  },
  displayable() {
    return (-0.5 <= this.r && this.r < 255.5)
        && (-0.5 <= this.g && this.g < 255.5)
        && (-0.5 <= this.b && this.b < 255.5)
        && (0 <= this.opacity && this.opacity <= 1);
  },
  hex: rgb_formatHex, // Deprecated! Use color.formatHex.
  formatHex: rgb_formatHex,
  formatHex8: rgb_formatHex8,
  formatRgb: rgb_formatRgb,
  toString: rgb_formatRgb
}));

function rgb_formatHex() {
  return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}`;
}

function rgb_formatHex8() {
  return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}${hex((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
}

function rgb_formatRgb() {
  const a = clampa(this.opacity);
  return `${a === 1 ? "rgb(" : "rgba("}${clampi(this.r)}, ${clampi(this.g)}, ${clampi(this.b)}${a === 1 ? ")" : `, ${a})`}`;
}

function clampa(opacity) {
  return isNaN(opacity) ? 1 : Math.max(0, Math.min(1, opacity));
}

function clampi(value) {
  return Math.max(0, Math.min(255, Math.round(value) || 0));
}

function hex(value) {
  value = clampi(value);
  return (value < 16 ? "0" : "") + value.toString(16);
}

function hsla(h, s, l, a) {
  if (a <= 0) h = s = l = NaN;
  else if (l <= 0 || l >= 1) h = s = NaN;
  else if (s <= 0) h = NaN;
  return new Hsl(h, s, l, a);
}

function hslConvert(o) {
  if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
  if (!(o instanceof Color)) o = color(o);
  if (!o) return new Hsl;
  if (o instanceof Hsl) return o;
  o = o.rgb();
  var r = o.r / 255,
      g = o.g / 255,
      b = o.b / 255,
      min = Math.min(r, g, b),
      max = Math.max(r, g, b),
      h = NaN,
      s = max - min,
      l = (max + min) / 2;
  if (s) {
    if (r === max) h = (g - b) / s + (g < b) * 6;
    else if (g === max) h = (b - r) / s + 2;
    else h = (r - g) / s + 4;
    s /= l < 0.5 ? max + min : 2 - max - min;
    h *= 60;
  } else {
    s = l > 0 && l < 1 ? 0 : h;
  }
  return new Hsl(h, s, l, o.opacity);
}

function hsl(h, s, l, opacity) {
  return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
}

function Hsl(h, s, l, opacity) {
  this.h = +h;
  this.s = +s;
  this.l = +l;
  this.opacity = +opacity;
}

define(Hsl, hsl, extend(Color, {
  brighter(k) {
    k = k == null ? brighter : Math.pow(brighter, k);
    return new Hsl(this.h, this.s, this.l * k, this.opacity);
  },
  darker(k) {
    k = k == null ? darker : Math.pow(darker, k);
    return new Hsl(this.h, this.s, this.l * k, this.opacity);
  },
  rgb() {
    var h = this.h % 360 + (this.h < 0) * 360,
        s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
        l = this.l,
        m2 = l + (l < 0.5 ? l : 1 - l) * s,
        m1 = 2 * l - m2;
    return new Rgb(
      hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
      hsl2rgb(h, m1, m2),
      hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
      this.opacity
    );
  },
  clamp() {
    return new Hsl(clamph(this.h), clampt(this.s), clampt(this.l), clampa(this.opacity));
  },
  displayable() {
    return (0 <= this.s && this.s <= 1 || isNaN(this.s))
        && (0 <= this.l && this.l <= 1)
        && (0 <= this.opacity && this.opacity <= 1);
  },
  formatHsl() {
    const a = clampa(this.opacity);
    return `${a === 1 ? "hsl(" : "hsla("}${clamph(this.h)}, ${clampt(this.s) * 100}%, ${clampt(this.l) * 100}%${a === 1 ? ")" : `, ${a})`}`;
  }
}));

function clamph(value) {
  value = (value || 0) % 360;
  return value < 0 ? value + 360 : value;
}

function clampt(value) {
  return Math.max(0, Math.min(1, value || 0));
}

/* From FvD 13.37, CSS Color Module Level 3 */
function hsl2rgb(h, m1, m2) {
  return (h < 60 ? m1 + (m2 - m1) * h / 60
      : h < 180 ? m2
      : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60
      : m1) * 255;
}

const radians = Math.PI / 180;
const degrees$1 = 180 / Math.PI;

// https://observablehq.com/@mbostock/lab-and-rgb
const K = 18,
    Xn = 0.96422,
    Yn = 1,
    Zn = 0.82521,
    t0$1 = 4 / 29,
    t1$1 = 6 / 29,
    t2 = 3 * t1$1 * t1$1,
    t3 = t1$1 * t1$1 * t1$1;

function labConvert(o) {
  if (o instanceof Lab) return new Lab(o.l, o.a, o.b, o.opacity);
  if (o instanceof Hcl) return hcl2lab(o);
  if (!(o instanceof Rgb)) o = rgbConvert(o);
  var r = rgb2lrgb(o.r),
      g = rgb2lrgb(o.g),
      b = rgb2lrgb(o.b),
      y = xyz2lab((0.2225045 * r + 0.7168786 * g + 0.0606169 * b) / Yn), x, z;
  if (r === g && g === b) x = z = y; else {
    x = xyz2lab((0.4360747 * r + 0.3850649 * g + 0.1430804 * b) / Xn);
    z = xyz2lab((0.0139322 * r + 0.0971045 * g + 0.7141733 * b) / Zn);
  }
  return new Lab(116 * y - 16, 500 * (x - y), 200 * (y - z), o.opacity);
}

function lab(l, a, b, opacity) {
  return arguments.length === 1 ? labConvert(l) : new Lab(l, a, b, opacity == null ? 1 : opacity);
}

function Lab(l, a, b, opacity) {
  this.l = +l;
  this.a = +a;
  this.b = +b;
  this.opacity = +opacity;
}

define(Lab, lab, extend(Color, {
  brighter(k) {
    return new Lab(this.l + K * (k == null ? 1 : k), this.a, this.b, this.opacity);
  },
  darker(k) {
    return new Lab(this.l - K * (k == null ? 1 : k), this.a, this.b, this.opacity);
  },
  rgb() {
    var y = (this.l + 16) / 116,
        x = isNaN(this.a) ? y : y + this.a / 500,
        z = isNaN(this.b) ? y : y - this.b / 200;
    x = Xn * lab2xyz(x);
    y = Yn * lab2xyz(y);
    z = Zn * lab2xyz(z);
    return new Rgb(
      lrgb2rgb( 3.1338561 * x - 1.6168667 * y - 0.4906146 * z),
      lrgb2rgb(-0.9787684 * x + 1.9161415 * y + 0.0334540 * z),
      lrgb2rgb( 0.0719453 * x - 0.2289914 * y + 1.4052427 * z),
      this.opacity
    );
  }
}));

function xyz2lab(t) {
  return t > t3 ? Math.pow(t, 1 / 3) : t / t2 + t0$1;
}

function lab2xyz(t) {
  return t > t1$1 ? t * t * t : t2 * (t - t0$1);
}

function lrgb2rgb(x) {
  return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
}

function rgb2lrgb(x) {
  return (x /= 255) <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

function hclConvert(o) {
  if (o instanceof Hcl) return new Hcl(o.h, o.c, o.l, o.opacity);
  if (!(o instanceof Lab)) o = labConvert(o);
  if (o.a === 0 && o.b === 0) return new Hcl(NaN, 0 < o.l && o.l < 100 ? 0 : NaN, o.l, o.opacity);
  var h = Math.atan2(o.b, o.a) * degrees$1;
  return new Hcl(h < 0 ? h + 360 : h, Math.sqrt(o.a * o.a + o.b * o.b), o.l, o.opacity);
}

function hcl(h, c, l, opacity) {
  return arguments.length === 1 ? hclConvert(h) : new Hcl(h, c, l, opacity == null ? 1 : opacity);
}

function Hcl(h, c, l, opacity) {
  this.h = +h;
  this.c = +c;
  this.l = +l;
  this.opacity = +opacity;
}

function hcl2lab(o) {
  if (isNaN(o.h)) return new Lab(o.l, 0, 0, o.opacity);
  var h = o.h * radians;
  return new Lab(o.l, Math.cos(h) * o.c, Math.sin(h) * o.c, o.opacity);
}

define(Hcl, hcl, extend(Color, {
  brighter(k) {
    return new Hcl(this.h, this.c, this.l + K * (k == null ? 1 : k), this.opacity);
  },
  darker(k) {
    return new Hcl(this.h, this.c, this.l - K * (k == null ? 1 : k), this.opacity);
  },
  rgb() {
    return hcl2lab(this).rgb();
  }
}));

var A = -0.14861,
    B = +1.78277,
    C = -0.29227,
    D = -0.90649,
    E = +1.97294,
    ED = E * D,
    EB = E * B,
    BC_DA = B * C - D * A;

function cubehelixConvert(o) {
  if (o instanceof Cubehelix) return new Cubehelix(o.h, o.s, o.l, o.opacity);
  if (!(o instanceof Rgb)) o = rgbConvert(o);
  var r = o.r / 255,
      g = o.g / 255,
      b = o.b / 255,
      l = (BC_DA * b + ED * r - EB * g) / (BC_DA + ED - EB),
      bl = b - l,
      k = (E * (g - l) - C * bl) / D,
      s = Math.sqrt(k * k + bl * bl) / (E * l * (1 - l)), // NaN if l=0 or l=1
      h = s ? Math.atan2(k, bl) * degrees$1 - 120 : NaN;
  return new Cubehelix(h < 0 ? h + 360 : h, s, l, o.opacity);
}

function cubehelix(h, s, l, opacity) {
  return arguments.length === 1 ? cubehelixConvert(h) : new Cubehelix(h, s, l, opacity == null ? 1 : opacity);
}

function Cubehelix(h, s, l, opacity) {
  this.h = +h;
  this.s = +s;
  this.l = +l;
  this.opacity = +opacity;
}

define(Cubehelix, cubehelix, extend(Color, {
  brighter(k) {
    k = k == null ? brighter : Math.pow(brighter, k);
    return new Cubehelix(this.h, this.s, this.l * k, this.opacity);
  },
  darker(k) {
    k = k == null ? darker : Math.pow(darker, k);
    return new Cubehelix(this.h, this.s, this.l * k, this.opacity);
  },
  rgb() {
    var h = isNaN(this.h) ? 0 : (this.h + 120) * radians,
        l = +this.l,
        a = isNaN(this.s) ? 0 : this.s * l * (1 - l),
        cosh = Math.cos(h),
        sinh = Math.sin(h);
    return new Rgb(
      255 * (l + a * (A * cosh + B * sinh)),
      255 * (l + a * (C * cosh + D * sinh)),
      255 * (l + a * (E * cosh)),
      this.opacity
    );
  }
}));

var noop = {value: () => {}};

function dispatch() {
  for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
    if (!(t = arguments[i] + "") || (t in _) || /[\s.]/.test(t)) throw new Error("illegal type: " + t);
    _[t] = [];
  }
  return new Dispatch(_);
}

function Dispatch(_) {
  this._ = _;
}

function parseTypenames$1(typenames, types) {
  return typenames.trim().split(/^|\s+/).map(function(t) {
    var name = "", i = t.indexOf(".");
    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
    if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
    return {type: t, name: name};
  });
}

Dispatch.prototype = dispatch.prototype = {
  constructor: Dispatch,
  on: function(typename, callback) {
    var _ = this._,
        T = parseTypenames$1(typename + "", _),
        t,
        i = -1,
        n = T.length;

    // If no callback was specified, return the callback of the given type and name.
    if (arguments.length < 2) {
      while (++i < n) if ((t = (typename = T[i]).type) && (t = get$1(_[t], typename.name))) return t;
      return;
    }

    // If a type was specified, set the callback for the given type and name.
    // Otherwise, if a null callback was specified, remove callbacks of the given name.
    if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
    while (++i < n) {
      if (t = (typename = T[i]).type) _[t] = set$1(_[t], typename.name, callback);
      else if (callback == null) for (t in _) _[t] = set$1(_[t], typename.name, null);
    }

    return this;
  },
  copy: function() {
    var copy = {}, _ = this._;
    for (var t in _) copy[t] = _[t].slice();
    return new Dispatch(copy);
  },
  call: function(type, that) {
    if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
    for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
  },
  apply: function(type, that, args) {
    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
    for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
  }
};

function get$1(type, name) {
  for (var i = 0, n = type.length, c; i < n; ++i) {
    if ((c = type[i]).name === name) {
      return c.value;
    }
  }
}

function set$1(type, name, callback) {
  for (var i = 0, n = type.length; i < n; ++i) {
    if (type[i].name === name) {
      type[i] = noop, type = type.slice(0, i).concat(type.slice(i + 1));
      break;
    }
  }
  if (callback != null) type.push({name: name, value: callback});
  return type;
}

var xhtml = "http://www.w3.org/1999/xhtml";

var namespaces = {
  svg: "http://www.w3.org/2000/svg",
  xhtml: xhtml,
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace",
  xmlns: "http://www.w3.org/2000/xmlns/"
};

function namespace(name) {
  var prefix = name += "", i = prefix.indexOf(":");
  if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
  return namespaces.hasOwnProperty(prefix) ? {space: namespaces[prefix], local: name} : name; // eslint-disable-line no-prototype-builtins
}

function creatorInherit(name) {
  return function() {
    var document = this.ownerDocument,
        uri = this.namespaceURI;
    return uri === xhtml && document.documentElement.namespaceURI === xhtml
        ? document.createElement(name)
        : document.createElementNS(uri, name);
  };
}

function creatorFixed(fullname) {
  return function() {
    return this.ownerDocument.createElementNS(fullname.space, fullname.local);
  };
}

function creator(name) {
  var fullname = namespace(name);
  return (fullname.local
      ? creatorFixed
      : creatorInherit)(fullname);
}

function none() {}

function selector(selector) {
  return selector == null ? none : function() {
    return this.querySelector(selector);
  };
}

function selection_select(select) {
  if (typeof select !== "function") select = selector(select);

  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
      if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
        if ("__data__" in node) subnode.__data__ = node.__data__;
        subgroup[i] = subnode;
      }
    }
  }

  return new Selection$1(subgroups, this._parents);
}

// Given something array like (or null), returns something that is strictly an
// array. This is used to ensure that array-like objects passed to d3.selectAll
// or selection.selectAll are converted into proper arrays when creating a
// selection; we don’t ever want to create a selection backed by a live
// HTMLCollection or NodeList. However, note that selection.selectAll will use a
// static NodeList as a group, since it safely derived from querySelectorAll.
function array(x) {
  return x == null ? [] : Array.isArray(x) ? x : Array.from(x);
}

function empty() {
  return [];
}

function selectorAll(selector) {
  return selector == null ? empty : function() {
    return this.querySelectorAll(selector);
  };
}

function arrayAll(select) {
  return function() {
    return array(select.apply(this, arguments));
  };
}

function selection_selectAll(select) {
  if (typeof select === "function") select = arrayAll(select);
  else select = selectorAll(select);

  for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        subgroups.push(select.call(node, node.__data__, i, group));
        parents.push(node);
      }
    }
  }

  return new Selection$1(subgroups, parents);
}

function matcher(selector) {
  return function() {
    return this.matches(selector);
  };
}

function childMatcher(selector) {
  return function(node) {
    return node.matches(selector);
  };
}

var find = Array.prototype.find;

function childFind(match) {
  return function() {
    return find.call(this.children, match);
  };
}

function childFirst() {
  return this.firstElementChild;
}

function selection_selectChild(match) {
  return this.select(match == null ? childFirst
      : childFind(typeof match === "function" ? match : childMatcher(match)));
}

var filter = Array.prototype.filter;

function children() {
  return Array.from(this.children);
}

function childrenFilter(match) {
  return function() {
    return filter.call(this.children, match);
  };
}

function selection_selectChildren(match) {
  return this.selectAll(match == null ? children
      : childrenFilter(typeof match === "function" ? match : childMatcher(match)));
}

function selection_filter(match) {
  if (typeof match !== "function") match = matcher(match);

  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
      if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
        subgroup.push(node);
      }
    }
  }

  return new Selection$1(subgroups, this._parents);
}

function sparse(update) {
  return new Array(update.length);
}

function selection_enter() {
  return new Selection$1(this._enter || this._groups.map(sparse), this._parents);
}

function EnterNode(parent, datum) {
  this.ownerDocument = parent.ownerDocument;
  this.namespaceURI = parent.namespaceURI;
  this._next = null;
  this._parent = parent;
  this.__data__ = datum;
}

EnterNode.prototype = {
  constructor: EnterNode,
  appendChild: function(child) { return this._parent.insertBefore(child, this._next); },
  insertBefore: function(child, next) { return this._parent.insertBefore(child, next); },
  querySelector: function(selector) { return this._parent.querySelector(selector); },
  querySelectorAll: function(selector) { return this._parent.querySelectorAll(selector); }
};

function constant$3(x) {
  return function() {
    return x;
  };
}

function bindIndex(parent, group, enter, update, exit, data) {
  var i = 0,
      node,
      groupLength = group.length,
      dataLength = data.length;

  // Put any non-null nodes that fit into update.
  // Put any null nodes into enter.
  // Put any remaining data into enter.
  for (; i < dataLength; ++i) {
    if (node = group[i]) {
      node.__data__ = data[i];
      update[i] = node;
    } else {
      enter[i] = new EnterNode(parent, data[i]);
    }
  }

  // Put any non-null nodes that don’t fit into exit.
  for (; i < groupLength; ++i) {
    if (node = group[i]) {
      exit[i] = node;
    }
  }
}

function bindKey(parent, group, enter, update, exit, data, key) {
  var i,
      node,
      nodeByKeyValue = new Map,
      groupLength = group.length,
      dataLength = data.length,
      keyValues = new Array(groupLength),
      keyValue;

  // Compute the key for each node.
  // If multiple nodes have the same key, the duplicates are added to exit.
  for (i = 0; i < groupLength; ++i) {
    if (node = group[i]) {
      keyValues[i] = keyValue = key.call(node, node.__data__, i, group) + "";
      if (nodeByKeyValue.has(keyValue)) {
        exit[i] = node;
      } else {
        nodeByKeyValue.set(keyValue, node);
      }
    }
  }

  // Compute the key for each datum.
  // If there a node associated with this key, join and add it to update.
  // If there is not (or the key is a duplicate), add it to enter.
  for (i = 0; i < dataLength; ++i) {
    keyValue = key.call(parent, data[i], i, data) + "";
    if (node = nodeByKeyValue.get(keyValue)) {
      update[i] = node;
      node.__data__ = data[i];
      nodeByKeyValue.delete(keyValue);
    } else {
      enter[i] = new EnterNode(parent, data[i]);
    }
  }

  // Add any remaining nodes that were not bound to data to exit.
  for (i = 0; i < groupLength; ++i) {
    if ((node = group[i]) && (nodeByKeyValue.get(keyValues[i]) === node)) {
      exit[i] = node;
    }
  }
}

function datum(node) {
  return node.__data__;
}

function selection_data(value, key) {
  if (!arguments.length) return Array.from(this, datum);

  var bind = key ? bindKey : bindIndex,
      parents = this._parents,
      groups = this._groups;

  if (typeof value !== "function") value = constant$3(value);

  for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
    var parent = parents[j],
        group = groups[j],
        groupLength = group.length,
        data = arraylike(value.call(parent, parent && parent.__data__, j, parents)),
        dataLength = data.length,
        enterGroup = enter[j] = new Array(dataLength),
        updateGroup = update[j] = new Array(dataLength),
        exitGroup = exit[j] = new Array(groupLength);

    bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);

    // Now connect the enter nodes to their following update node, such that
    // appendChild can insert the materialized enter node before this node,
    // rather than at the end of the parent node.
    for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
      if (previous = enterGroup[i0]) {
        if (i0 >= i1) i1 = i0 + 1;
        while (!(next = updateGroup[i1]) && ++i1 < dataLength);
        previous._next = next || null;
      }
    }
  }

  update = new Selection$1(update, parents);
  update._enter = enter;
  update._exit = exit;
  return update;
}

// Given some data, this returns an array-like view of it: an object that
// exposes a length property and allows numeric indexing. Note that unlike
// selectAll, this isn’t worried about “live” collections because the resulting
// array will only be used briefly while data is being bound. (It is possible to
// cause the data to change while iterating by using a key function, but please
// don’t; we’d rather avoid a gratuitous copy.)
function arraylike(data) {
  return typeof data === "object" && "length" in data
    ? data // Array, TypedArray, NodeList, array-like
    : Array.from(data); // Map, Set, iterable, string, or anything else
}

function selection_exit() {
  return new Selection$1(this._exit || this._groups.map(sparse), this._parents);
}

function selection_join(onenter, onupdate, onexit) {
  var enter = this.enter(), update = this, exit = this.exit();
  if (typeof onenter === "function") {
    enter = onenter(enter);
    if (enter) enter = enter.selection();
  } else {
    enter = enter.append(onenter + "");
  }
  if (onupdate != null) {
    update = onupdate(update);
    if (update) update = update.selection();
  }
  if (onexit == null) exit.remove(); else onexit(exit);
  return enter && update ? enter.merge(update).order() : update;
}

function selection_merge(context) {
  var selection = context.selection ? context.selection() : context;

  for (var groups0 = this._groups, groups1 = selection._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
    for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group0[i] || group1[i]) {
        merge[i] = node;
      }
    }
  }

  for (; j < m0; ++j) {
    merges[j] = groups0[j];
  }

  return new Selection$1(merges, this._parents);
}

function selection_order() {

  for (var groups = this._groups, j = -1, m = groups.length; ++j < m;) {
    for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0;) {
      if (node = group[i]) {
        if (next && node.compareDocumentPosition(next) ^ 4) next.parentNode.insertBefore(node, next);
        next = node;
      }
    }
  }

  return this;
}

function selection_sort(compare) {
  if (!compare) compare = ascending$1;

  function compareNode(a, b) {
    return a && b ? compare(a.__data__, b.__data__) : !a - !b;
  }

  for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        sortgroup[i] = node;
      }
    }
    sortgroup.sort(compareNode);
  }

  return new Selection$1(sortgroups, this._parents).order();
}

function ascending$1(a, b) {
  return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
}

function selection_call() {
  var callback = arguments[0];
  arguments[0] = this;
  callback.apply(null, arguments);
  return this;
}

function selection_nodes() {
  return Array.from(this);
}

function selection_node() {

  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
      var node = group[i];
      if (node) return node;
    }
  }

  return null;
}

function selection_size() {
  let size = 0;
  for (const node of this) ++size; // eslint-disable-line no-unused-vars
  return size;
}

function selection_empty() {
  return !this.node();
}

function selection_each(callback) {

  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
      if (node = group[i]) callback.call(node, node.__data__, i, group);
    }
  }

  return this;
}

function attrRemove$1(name) {
  return function() {
    this.removeAttribute(name);
  };
}

function attrRemoveNS$1(fullname) {
  return function() {
    this.removeAttributeNS(fullname.space, fullname.local);
  };
}

function attrConstant$1(name, value) {
  return function() {
    this.setAttribute(name, value);
  };
}

function attrConstantNS$1(fullname, value) {
  return function() {
    this.setAttributeNS(fullname.space, fullname.local, value);
  };
}

function attrFunction$1(name, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.removeAttribute(name);
    else this.setAttribute(name, v);
  };
}

function attrFunctionNS$1(fullname, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.removeAttributeNS(fullname.space, fullname.local);
    else this.setAttributeNS(fullname.space, fullname.local, v);
  };
}

function selection_attr(name, value) {
  var fullname = namespace(name);

  if (arguments.length < 2) {
    var node = this.node();
    return fullname.local
        ? node.getAttributeNS(fullname.space, fullname.local)
        : node.getAttribute(fullname);
  }

  return this.each((value == null
      ? (fullname.local ? attrRemoveNS$1 : attrRemove$1) : (typeof value === "function"
      ? (fullname.local ? attrFunctionNS$1 : attrFunction$1)
      : (fullname.local ? attrConstantNS$1 : attrConstant$1)))(fullname, value));
}

function defaultView(node) {
  return (node.ownerDocument && node.ownerDocument.defaultView) // node is a Node
      || (node.document && node) // node is a Window
      || node.defaultView; // node is a Document
}

function styleRemove$1(name) {
  return function() {
    this.style.removeProperty(name);
  };
}

function styleConstant$1(name, value, priority) {
  return function() {
    this.style.setProperty(name, value, priority);
  };
}

function styleFunction$1(name, value, priority) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.style.removeProperty(name);
    else this.style.setProperty(name, v, priority);
  };
}

function selection_style(name, value, priority) {
  return arguments.length > 1
      ? this.each((value == null
            ? styleRemove$1 : typeof value === "function"
            ? styleFunction$1
            : styleConstant$1)(name, value, priority == null ? "" : priority))
      : styleValue(this.node(), name);
}

function styleValue(node, name) {
  return node.style.getPropertyValue(name)
      || defaultView(node).getComputedStyle(node, null).getPropertyValue(name);
}

function propertyRemove(name) {
  return function() {
    delete this[name];
  };
}

function propertyConstant(name, value) {
  return function() {
    this[name] = value;
  };
}

function propertyFunction(name, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) delete this[name];
    else this[name] = v;
  };
}

function selection_property(name, value) {
  return arguments.length > 1
      ? this.each((value == null
          ? propertyRemove : typeof value === "function"
          ? propertyFunction
          : propertyConstant)(name, value))
      : this.node()[name];
}

function classArray(string) {
  return string.trim().split(/^|\s+/);
}

function classList(node) {
  return node.classList || new ClassList(node);
}

function ClassList(node) {
  this._node = node;
  this._names = classArray(node.getAttribute("class") || "");
}

ClassList.prototype = {
  add: function(name) {
    var i = this._names.indexOf(name);
    if (i < 0) {
      this._names.push(name);
      this._node.setAttribute("class", this._names.join(" "));
    }
  },
  remove: function(name) {
    var i = this._names.indexOf(name);
    if (i >= 0) {
      this._names.splice(i, 1);
      this._node.setAttribute("class", this._names.join(" "));
    }
  },
  contains: function(name) {
    return this._names.indexOf(name) >= 0;
  }
};

function classedAdd(node, names) {
  var list = classList(node), i = -1, n = names.length;
  while (++i < n) list.add(names[i]);
}

function classedRemove(node, names) {
  var list = classList(node), i = -1, n = names.length;
  while (++i < n) list.remove(names[i]);
}

function classedTrue(names) {
  return function() {
    classedAdd(this, names);
  };
}

function classedFalse(names) {
  return function() {
    classedRemove(this, names);
  };
}

function classedFunction(names, value) {
  return function() {
    (value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
  };
}

function selection_classed(name, value) {
  var names = classArray(name + "");

  if (arguments.length < 2) {
    var list = classList(this.node()), i = -1, n = names.length;
    while (++i < n) if (!list.contains(names[i])) return false;
    return true;
  }

  return this.each((typeof value === "function"
      ? classedFunction : value
      ? classedTrue
      : classedFalse)(names, value));
}

function textRemove() {
  this.textContent = "";
}

function textConstant$1(value) {
  return function() {
    this.textContent = value;
  };
}

function textFunction$1(value) {
  return function() {
    var v = value.apply(this, arguments);
    this.textContent = v == null ? "" : v;
  };
}

function selection_text(value) {
  return arguments.length
      ? this.each(value == null
          ? textRemove : (typeof value === "function"
          ? textFunction$1
          : textConstant$1)(value))
      : this.node().textContent;
}

function htmlRemove() {
  this.innerHTML = "";
}

function htmlConstant(value) {
  return function() {
    this.innerHTML = value;
  };
}

function htmlFunction(value) {
  return function() {
    var v = value.apply(this, arguments);
    this.innerHTML = v == null ? "" : v;
  };
}

function selection_html(value) {
  return arguments.length
      ? this.each(value == null
          ? htmlRemove : (typeof value === "function"
          ? htmlFunction
          : htmlConstant)(value))
      : this.node().innerHTML;
}

function raise() {
  if (this.nextSibling) this.parentNode.appendChild(this);
}

function selection_raise() {
  return this.each(raise);
}

function lower() {
  if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
}

function selection_lower() {
  return this.each(lower);
}

function selection_append(name) {
  var create = typeof name === "function" ? name : creator(name);
  return this.select(function() {
    return this.appendChild(create.apply(this, arguments));
  });
}

function constantNull() {
  return null;
}

function selection_insert(name, before) {
  var create = typeof name === "function" ? name : creator(name),
      select = before == null ? constantNull : typeof before === "function" ? before : selector(before);
  return this.select(function() {
    return this.insertBefore(create.apply(this, arguments), select.apply(this, arguments) || null);
  });
}

function remove() {
  var parent = this.parentNode;
  if (parent) parent.removeChild(this);
}

function selection_remove() {
  return this.each(remove);
}

function selection_cloneShallow() {
  var clone = this.cloneNode(false), parent = this.parentNode;
  return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
}

function selection_cloneDeep() {
  var clone = this.cloneNode(true), parent = this.parentNode;
  return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
}

function selection_clone(deep) {
  return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
}

function selection_datum(value) {
  return arguments.length
      ? this.property("__data__", value)
      : this.node().__data__;
}

function contextListener(listener) {
  return function(event) {
    listener.call(this, event, this.__data__);
  };
}

function parseTypenames(typenames) {
  return typenames.trim().split(/^|\s+/).map(function(t) {
    var name = "", i = t.indexOf(".");
    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
    return {type: t, name: name};
  });
}

function onRemove(typename) {
  return function() {
    var on = this.__on;
    if (!on) return;
    for (var j = 0, i = -1, m = on.length, o; j < m; ++j) {
      if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
        this.removeEventListener(o.type, o.listener, o.options);
      } else {
        on[++i] = o;
      }
    }
    if (++i) on.length = i;
    else delete this.__on;
  };
}

function onAdd(typename, value, options) {
  return function() {
    var on = this.__on, o, listener = contextListener(value);
    if (on) for (var j = 0, m = on.length; j < m; ++j) {
      if ((o = on[j]).type === typename.type && o.name === typename.name) {
        this.removeEventListener(o.type, o.listener, o.options);
        this.addEventListener(o.type, o.listener = listener, o.options = options);
        o.value = value;
        return;
      }
    }
    this.addEventListener(typename.type, listener, options);
    o = {type: typename.type, name: typename.name, value: value, listener: listener, options: options};
    if (!on) this.__on = [o];
    else on.push(o);
  };
}

function selection_on(typename, value, options) {
  var typenames = parseTypenames(typename + ""), i, n = typenames.length, t;

  if (arguments.length < 2) {
    var on = this.node().__on;
    if (on) for (var j = 0, m = on.length, o; j < m; ++j) {
      for (i = 0, o = on[j]; i < n; ++i) {
        if ((t = typenames[i]).type === o.type && t.name === o.name) {
          return o.value;
        }
      }
    }
    return;
  }

  on = value ? onAdd : onRemove;
  for (i = 0; i < n; ++i) this.each(on(typenames[i], value, options));
  return this;
}

function dispatchEvent(node, type, params) {
  var window = defaultView(node),
      event = window.CustomEvent;

  if (typeof event === "function") {
    event = new event(type, params);
  } else {
    event = window.document.createEvent("Event");
    if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
    else event.initEvent(type, false, false);
  }

  node.dispatchEvent(event);
}

function dispatchConstant(type, params) {
  return function() {
    return dispatchEvent(this, type, params);
  };
}

function dispatchFunction(type, params) {
  return function() {
    return dispatchEvent(this, type, params.apply(this, arguments));
  };
}

function selection_dispatch(type, params) {
  return this.each((typeof params === "function"
      ? dispatchFunction
      : dispatchConstant)(type, params));
}

function* selection_iterator() {
  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
      if (node = group[i]) yield node;
    }
  }
}

var root$1 = [null];

function Selection$1(groups, parents) {
  this._groups = groups;
  this._parents = parents;
}

function selection() {
  return new Selection$1([[document.documentElement]], root$1);
}

function selection_selection() {
  return this;
}

Selection$1.prototype = selection.prototype = {
  constructor: Selection$1,
  select: selection_select,
  selectAll: selection_selectAll,
  selectChild: selection_selectChild,
  selectChildren: selection_selectChildren,
  filter: selection_filter,
  data: selection_data,
  enter: selection_enter,
  exit: selection_exit,
  join: selection_join,
  merge: selection_merge,
  selection: selection_selection,
  order: selection_order,
  sort: selection_sort,
  call: selection_call,
  nodes: selection_nodes,
  node: selection_node,
  size: selection_size,
  empty: selection_empty,
  each: selection_each,
  attr: selection_attr,
  style: selection_style,
  property: selection_property,
  classed: selection_classed,
  text: selection_text,
  html: selection_html,
  raise: selection_raise,
  lower: selection_lower,
  append: selection_append,
  insert: selection_insert,
  remove: selection_remove,
  clone: selection_clone,
  datum: selection_datum,
  on: selection_on,
  dispatch: selection_dispatch,
  [Symbol.iterator]: selection_iterator
};

function select(selector) {
  return typeof selector === "string"
      ? new Selection$1([[document.querySelector(selector)]], [document.documentElement])
      : new Selection$1([[selector]], root$1);
}

var nextId = 0;

function Local() {
  this._ = "@" + (++nextId).toString(36);
}

Local.prototype = {
  constructor: Local,
  get: function(node) {
    var id = this._;
    while (!(id in node)) if (!(node = node.parentNode)) return;
    return node[id];
  },
  set: function(node, value) {
    return node[this._] = value;
  },
  remove: function(node) {
    return this._ in node && delete node[this._];
  },
  toString: function() {
    return this._;
  }
};

function ascending(a, b) {
  return a == null || b == null ? NaN : a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
}

function descending(a, b) {
  return a == null || b == null ? NaN
    : b < a ? -1
    : b > a ? 1
    : b >= a ? 0
    : NaN;
}

function bisector(f) {
  let compare1, compare2, delta;

  // If an accessor is specified, promote it to a comparator. In this case we
  // can test whether the search value is (self-) comparable. We can’t do this
  // for a comparator (except for specific, known comparators) because we can’t
  // tell if the comparator is symmetric, and an asymmetric comparator can’t be
  // used to test whether a single value is comparable.
  if (f.length !== 2) {
    compare1 = ascending;
    compare2 = (d, x) => ascending(f(d), x);
    delta = (d, x) => f(d) - x;
  } else {
    compare1 = f === ascending || f === descending ? f : zero$1;
    compare2 = f;
    delta = f;
  }

  function left(a, x, lo = 0, hi = a.length) {
    if (lo < hi) {
      if (compare1(x, x) !== 0) return hi;
      do {
        const mid = (lo + hi) >>> 1;
        if (compare2(a[mid], x) < 0) lo = mid + 1;
        else hi = mid;
      } while (lo < hi);
    }
    return lo;
  }

  function right(a, x, lo = 0, hi = a.length) {
    if (lo < hi) {
      if (compare1(x, x) !== 0) return hi;
      do {
        const mid = (lo + hi) >>> 1;
        if (compare2(a[mid], x) <= 0) lo = mid + 1;
        else hi = mid;
      } while (lo < hi);
    }
    return lo;
  }

  function center(a, x, lo = 0, hi = a.length) {
    const i = left(a, x, lo, hi - 1);
    return i > lo && delta(a[i - 1], x) > -delta(a[i], x) ? i - 1 : i;
  }

  return {left, center, right};
}

function zero$1() {
  return 0;
}

function number$2(x) {
  return x === null ? NaN : +x;
}

bisector(ascending);
bisector(number$2).center;

var constant$1 = x => () => x;

function linear$1(a, d) {
  return function(t) {
    return a + t * d;
  };
}

function exponential(a, b, y) {
  return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
    return Math.pow(a + t * b, y);
  };
}

function gamma(y) {
  return (y = +y) === 1 ? nogamma : function(a, b) {
    return b - a ? exponential(a, b, y) : constant$1(isNaN(a) ? b : a);
  };
}

function nogamma(a, b) {
  var d = b - a;
  return d ? linear$1(a, d) : constant$1(isNaN(a) ? b : a);
}

var interpolateRgb = (function rgbGamma(y) {
  var color = gamma(y);

  function rgb$1(start, end) {
    var r = color((start = rgb(start)).r, (end = rgb(end)).r),
        g = color(start.g, end.g),
        b = color(start.b, end.b),
        opacity = nogamma(start.opacity, end.opacity);
    return function(t) {
      start.r = r(t);
      start.g = g(t);
      start.b = b(t);
      start.opacity = opacity(t);
      return start + "";
    };
  }

  rgb$1.gamma = rgbGamma;

  return rgb$1;
})(1);

function interpolateNumber(a, b) {
  return a = +a, b = +b, function(t) {
    return a * (1 - t) + b * t;
  };
}

var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,
    reB = new RegExp(reA.source, "g");

function zero(b) {
  return function() {
    return b;
  };
}

function one(b) {
  return function(t) {
    return b(t) + "";
  };
}

function interpolateString(a, b) {
  var bi = reA.lastIndex = reB.lastIndex = 0, // scan index for next number in b
      am, // current match in a
      bm, // current match in b
      bs, // string preceding current number in b, if any
      i = -1, // index in s
      s = [], // string constants and placeholders
      q = []; // number interpolators

  // Coerce inputs to strings.
  a = a + "", b = b + "";

  // Interpolate pairs of numbers in a & b.
  while ((am = reA.exec(a))
      && (bm = reB.exec(b))) {
    if ((bs = bm.index) > bi) { // a string precedes the next number in b
      bs = b.slice(bi, bs);
      if (s[i]) s[i] += bs; // coalesce with previous string
      else s[++i] = bs;
    }
    if ((am = am[0]) === (bm = bm[0])) { // numbers in a & b match
      if (s[i]) s[i] += bm; // coalesce with previous string
      else s[++i] = bm;
    } else { // interpolate non-matching numbers
      s[++i] = null;
      q.push({i: i, x: interpolateNumber(am, bm)});
    }
    bi = reB.lastIndex;
  }

  // Add remains of b.
  if (bi < b.length) {
    bs = b.slice(bi);
    if (s[i]) s[i] += bs; // coalesce with previous string
    else s[++i] = bs;
  }

  // Special optimization for only a single match.
  // Otherwise, interpolate each of the numbers and rejoin the string.
  return s.length < 2 ? (q[0]
      ? one(q[0].x)
      : zero(b))
      : (b = q.length, function(t) {
          for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
          return s.join("");
        });
}

var degrees = 180 / Math.PI;

var identity$3 = {
  translateX: 0,
  translateY: 0,
  rotate: 0,
  skewX: 0,
  scaleX: 1,
  scaleY: 1
};

function decompose(a, b, c, d, e, f) {
  var scaleX, scaleY, skewX;
  if (scaleX = Math.sqrt(a * a + b * b)) a /= scaleX, b /= scaleX;
  if (skewX = a * c + b * d) c -= a * skewX, d -= b * skewX;
  if (scaleY = Math.sqrt(c * c + d * d)) c /= scaleY, d /= scaleY, skewX /= scaleY;
  if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
  return {
    translateX: e,
    translateY: f,
    rotate: Math.atan2(b, a) * degrees,
    skewX: Math.atan(skewX) * degrees,
    scaleX: scaleX,
    scaleY: scaleY
  };
}

var svgNode;

/* eslint-disable no-undef */
function parseCss(value) {
  const m = new (typeof DOMMatrix === "function" ? DOMMatrix : WebKitCSSMatrix)(value + "");
  return m.isIdentity ? identity$3 : decompose(m.a, m.b, m.c, m.d, m.e, m.f);
}

function parseSvg(value) {
  if (value == null) return identity$3;
  if (!svgNode) svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
  svgNode.setAttribute("transform", value);
  if (!(value = svgNode.transform.baseVal.consolidate())) return identity$3;
  value = value.matrix;
  return decompose(value.a, value.b, value.c, value.d, value.e, value.f);
}

function interpolateTransform(parse, pxComma, pxParen, degParen) {

  function pop(s) {
    return s.length ? s.pop() + " " : "";
  }

  function translate(xa, ya, xb, yb, s, q) {
    if (xa !== xb || ya !== yb) {
      var i = s.push("translate(", null, pxComma, null, pxParen);
      q.push({i: i - 4, x: interpolateNumber(xa, xb)}, {i: i - 2, x: interpolateNumber(ya, yb)});
    } else if (xb || yb) {
      s.push("translate(" + xb + pxComma + yb + pxParen);
    }
  }

  function rotate(a, b, s, q) {
    if (a !== b) {
      if (a - b > 180) b += 360; else if (b - a > 180) a += 360; // shortest path
      q.push({i: s.push(pop(s) + "rotate(", null, degParen) - 2, x: interpolateNumber(a, b)});
    } else if (b) {
      s.push(pop(s) + "rotate(" + b + degParen);
    }
  }

  function skewX(a, b, s, q) {
    if (a !== b) {
      q.push({i: s.push(pop(s) + "skewX(", null, degParen) - 2, x: interpolateNumber(a, b)});
    } else if (b) {
      s.push(pop(s) + "skewX(" + b + degParen);
    }
  }

  function scale(xa, ya, xb, yb, s, q) {
    if (xa !== xb || ya !== yb) {
      var i = s.push(pop(s) + "scale(", null, ",", null, ")");
      q.push({i: i - 4, x: interpolateNumber(xa, xb)}, {i: i - 2, x: interpolateNumber(ya, yb)});
    } else if (xb !== 1 || yb !== 1) {
      s.push(pop(s) + "scale(" + xb + "," + yb + ")");
    }
  }

  return function(a, b) {
    var s = [], // string constants and placeholders
        q = []; // number interpolators
    a = parse(a), b = parse(b);
    translate(a.translateX, a.translateY, b.translateX, b.translateY, s, q);
    rotate(a.rotate, b.rotate, s, q);
    skewX(a.skewX, b.skewX, s, q);
    scale(a.scaleX, a.scaleY, b.scaleX, b.scaleY, s, q);
    a = b = null; // gc
    return function(t) {
      var i = -1, n = q.length, o;
      while (++i < n) s[(o = q[i]).i] = o.x(t);
      return s.join("");
    };
  };
}

var interpolateTransformCss = interpolateTransform(parseCss, "px, ", "px)", "deg)");
var interpolateTransformSvg = interpolateTransform(parseSvg, ", ", ")", ")");

function formatDecimal(x) {
  return Math.abs(x = Math.round(x)) >= 1e21
      ? x.toLocaleString("en").replace(/,/g, "")
      : x.toString(10);
}

// Computes the decimal coefficient and exponent of the specified number x with
// significant digits p, where x is positive and p is in [1, 21] or undefined.
// For example, formatDecimalParts(1.23) returns ["123", 0].
function formatDecimalParts(x, p) {
  if ((i = (x = p ? x.toExponential(p - 1) : x.toExponential()).indexOf("e")) < 0) return null; // NaN, ±Infinity
  var i, coefficient = x.slice(0, i);

  // The string returned by toExponential either has the form \d\.\d+e[-+]\d+
  // (e.g., 1.2e+3) or the form \de[-+]\d+ (e.g., 1e+3).
  return [
    coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient,
    +x.slice(i + 1)
  ];
}

function exponent(x) {
  return x = formatDecimalParts(Math.abs(x)), x ? x[1] : NaN;
}

function formatGroup(grouping, thousands) {
  return function(value, width) {
    var i = value.length,
        t = [],
        j = 0,
        g = grouping[0],
        length = 0;

    while (i > 0 && g > 0) {
      if (length + g + 1 > width) g = Math.max(1, width - length);
      t.push(value.substring(i -= g, i + g));
      if ((length += g + 1) > width) break;
      g = grouping[j = (j + 1) % grouping.length];
    }

    return t.reverse().join(thousands);
  };
}

function formatNumerals(numerals) {
  return function(value) {
    return value.replace(/[0-9]/g, function(i) {
      return numerals[+i];
    });
  };
}

// [[fill]align][sign][symbol][0][width][,][.precision][~][type]
var re = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;

function formatSpecifier(specifier) {
  if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);
  var match;
  return new FormatSpecifier({
    fill: match[1],
    align: match[2],
    sign: match[3],
    symbol: match[4],
    zero: match[5],
    width: match[6],
    comma: match[7],
    precision: match[8] && match[8].slice(1),
    trim: match[9],
    type: match[10]
  });
}

formatSpecifier.prototype = FormatSpecifier.prototype; // instanceof

function FormatSpecifier(specifier) {
  this.fill = specifier.fill === undefined ? " " : specifier.fill + "";
  this.align = specifier.align === undefined ? ">" : specifier.align + "";
  this.sign = specifier.sign === undefined ? "-" : specifier.sign + "";
  this.symbol = specifier.symbol === undefined ? "" : specifier.symbol + "";
  this.zero = !!specifier.zero;
  this.width = specifier.width === undefined ? undefined : +specifier.width;
  this.comma = !!specifier.comma;
  this.precision = specifier.precision === undefined ? undefined : +specifier.precision;
  this.trim = !!specifier.trim;
  this.type = specifier.type === undefined ? "" : specifier.type + "";
}

FormatSpecifier.prototype.toString = function() {
  return this.fill
      + this.align
      + this.sign
      + this.symbol
      + (this.zero ? "0" : "")
      + (this.width === undefined ? "" : Math.max(1, this.width | 0))
      + (this.comma ? "," : "")
      + (this.precision === undefined ? "" : "." + Math.max(0, this.precision | 0))
      + (this.trim ? "~" : "")
      + this.type;
};

// Trims insignificant zeros, e.g., replaces 1.2000k with 1.2k.
function formatTrim(s) {
  out: for (var n = s.length, i = 1, i0 = -1, i1; i < n; ++i) {
    switch (s[i]) {
      case ".": i0 = i1 = i; break;
      case "0": if (i0 === 0) i0 = i; i1 = i; break;
      default: if (!+s[i]) break out; if (i0 > 0) i0 = 0; break;
    }
  }
  return i0 > 0 ? s.slice(0, i0) + s.slice(i1 + 1) : s;
}

var prefixExponent;

function formatPrefixAuto(x, p) {
  var d = formatDecimalParts(x, p);
  if (!d) return x + "";
  var coefficient = d[0],
      exponent = d[1],
      i = exponent - (prefixExponent = Math.max(-8, Math.min(8, Math.floor(exponent / 3))) * 3) + 1,
      n = coefficient.length;
  return i === n ? coefficient
      : i > n ? coefficient + new Array(i - n + 1).join("0")
      : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i)
      : "0." + new Array(1 - i).join("0") + formatDecimalParts(x, Math.max(0, p + i - 1))[0]; // less than 1y!
}

function formatRounded(x, p) {
  var d = formatDecimalParts(x, p);
  if (!d) return x + "";
  var coefficient = d[0],
      exponent = d[1];
  return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient
      : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1)
      : coefficient + new Array(exponent - coefficient.length + 2).join("0");
}

var formatTypes = {
  "%": (x, p) => (x * 100).toFixed(p),
  "b": (x) => Math.round(x).toString(2),
  "c": (x) => x + "",
  "d": formatDecimal,
  "e": (x, p) => x.toExponential(p),
  "f": (x, p) => x.toFixed(p),
  "g": (x, p) => x.toPrecision(p),
  "o": (x) => Math.round(x).toString(8),
  "p": (x, p) => formatRounded(x * 100, p),
  "r": formatRounded,
  "s": formatPrefixAuto,
  "X": (x) => Math.round(x).toString(16).toUpperCase(),
  "x": (x) => Math.round(x).toString(16)
};

function identity$1(x) {
  return x;
}

var map = Array.prototype.map,
    prefixes = ["y","z","a","f","p","n","µ","m","","k","M","G","T","P","E","Z","Y"];

function formatLocale$1(locale) {
  var group = locale.grouping === undefined || locale.thousands === undefined ? identity$1 : formatGroup(map.call(locale.grouping, Number), locale.thousands + ""),
      currencyPrefix = locale.currency === undefined ? "" : locale.currency[0] + "",
      currencySuffix = locale.currency === undefined ? "" : locale.currency[1] + "",
      decimal = locale.decimal === undefined ? "." : locale.decimal + "",
      numerals = locale.numerals === undefined ? identity$1 : formatNumerals(map.call(locale.numerals, String)),
      percent = locale.percent === undefined ? "%" : locale.percent + "",
      minus = locale.minus === undefined ? "−" : locale.minus + "",
      nan = locale.nan === undefined ? "NaN" : locale.nan + "";

  function newFormat(specifier) {
    specifier = formatSpecifier(specifier);

    var fill = specifier.fill,
        align = specifier.align,
        sign = specifier.sign,
        symbol = specifier.symbol,
        zero = specifier.zero,
        width = specifier.width,
        comma = specifier.comma,
        precision = specifier.precision,
        trim = specifier.trim,
        type = specifier.type;

    // The "n" type is an alias for ",g".
    if (type === "n") comma = true, type = "g";

    // The "" type, and any invalid type, is an alias for ".12~g".
    else if (!formatTypes[type]) precision === undefined && (precision = 12), trim = true, type = "g";

    // If zero fill is specified, padding goes after sign and before digits.
    if (zero || (fill === "0" && align === "=")) zero = true, fill = "0", align = "=";

    // Compute the prefix and suffix.
    // For SI-prefix, the suffix is lazily computed.
    var prefix = symbol === "$" ? currencyPrefix : symbol === "#" && /[boxX]/.test(type) ? "0" + type.toLowerCase() : "",
        suffix = symbol === "$" ? currencySuffix : /[%p]/.test(type) ? percent : "";

    // What format function should we use?
    // Is this an integer type?
    // Can this type generate exponential notation?
    var formatType = formatTypes[type],
        maybeSuffix = /[defgprs%]/.test(type);

    // Set the default precision if not specified,
    // or clamp the specified precision to the supported range.
    // For significant precision, it must be in [1, 21].
    // For fixed precision, it must be in [0, 20].
    precision = precision === undefined ? 6
        : /[gprs]/.test(type) ? Math.max(1, Math.min(21, precision))
        : Math.max(0, Math.min(20, precision));

    function format(value) {
      var valuePrefix = prefix,
          valueSuffix = suffix,
          i, n, c;

      if (type === "c") {
        valueSuffix = formatType(value) + valueSuffix;
        value = "";
      } else {
        value = +value;

        // Determine the sign. -0 is not less than 0, but 1 / -0 is!
        var valueNegative = value < 0 || 1 / value < 0;

        // Perform the initial formatting.
        value = isNaN(value) ? nan : formatType(Math.abs(value), precision);

        // Trim insignificant zeros.
        if (trim) value = formatTrim(value);

        // If a negative value rounds to zero after formatting, and no explicit positive sign is requested, hide the sign.
        if (valueNegative && +value === 0 && sign !== "+") valueNegative = false;

        // Compute the prefix and suffix.
        valuePrefix = (valueNegative ? (sign === "(" ? sign : minus) : sign === "-" || sign === "(" ? "" : sign) + valuePrefix;
        valueSuffix = (type === "s" ? prefixes[8 + prefixExponent / 3] : "") + valueSuffix + (valueNegative && sign === "(" ? ")" : "");

        // Break the formatted value into the integer “value” part that can be
        // grouped, and fractional or exponential “suffix” part that is not.
        if (maybeSuffix) {
          i = -1, n = value.length;
          while (++i < n) {
            if (c = value.charCodeAt(i), 48 > c || c > 57) {
              valueSuffix = (c === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
              value = value.slice(0, i);
              break;
            }
          }
        }
      }

      // If the fill character is not "0", grouping is applied before padding.
      if (comma && !zero) value = group(value, Infinity);

      // Compute the padding.
      var length = valuePrefix.length + value.length + valueSuffix.length,
          padding = length < width ? new Array(width - length + 1).join(fill) : "";

      // If the fill character is "0", grouping is applied after padding.
      if (comma && zero) value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";

      // Reconstruct the final output based on the desired alignment.
      switch (align) {
        case "<": value = valuePrefix + value + valueSuffix + padding; break;
        case "=": value = valuePrefix + padding + value + valueSuffix; break;
        case "^": value = padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length); break;
        default: value = padding + valuePrefix + value + valueSuffix; break;
      }

      return numerals(value);
    }

    format.toString = function() {
      return specifier + "";
    };

    return format;
  }

  function formatPrefix(specifier, value) {
    var f = newFormat((specifier = formatSpecifier(specifier), specifier.type = "f", specifier)),
        e = Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3,
        k = Math.pow(10, -e),
        prefix = prefixes[8 + e / 3];
    return function(value) {
      return f(k * value) + prefix;
    };
  }

  return {
    format: newFormat,
    formatPrefix: formatPrefix
  };
}

var locale$1;

defaultLocale$1({
  thousands: ",",
  grouping: [3],
  currency: ["$", ""]
});

function defaultLocale$1(definition) {
  locale$1 = formatLocale$1(definition);
  locale$1.format;
  locale$1.formatPrefix;
  return locale$1;
}

const t0 = new Date, t1 = new Date;

function timeInterval(floori, offseti, count, field) {

  function interval(date) {
    return floori(date = arguments.length === 0 ? new Date : new Date(+date)), date;
  }

  interval.floor = (date) => {
    return floori(date = new Date(+date)), date;
  };

  interval.ceil = (date) => {
    return floori(date = new Date(date - 1)), offseti(date, 1), floori(date), date;
  };

  interval.round = (date) => {
    const d0 = interval(date), d1 = interval.ceil(date);
    return date - d0 < d1 - date ? d0 : d1;
  };

  interval.offset = (date, step) => {
    return offseti(date = new Date(+date), step == null ? 1 : Math.floor(step)), date;
  };

  interval.range = (start, stop, step) => {
    const range = [];
    start = interval.ceil(start);
    step = step == null ? 1 : Math.floor(step);
    if (!(start < stop) || !(step > 0)) return range; // also handles Invalid Date
    let previous;
    do range.push(previous = new Date(+start)), offseti(start, step), floori(start);
    while (previous < start && start < stop);
    return range;
  };

  interval.filter = (test) => {
    return timeInterval((date) => {
      if (date >= date) while (floori(date), !test(date)) date.setTime(date - 1);
    }, (date, step) => {
      if (date >= date) {
        if (step < 0) while (++step <= 0) {
          while (offseti(date, -1), !test(date)) {} // eslint-disable-line no-empty
        } else while (--step >= 0) {
          while (offseti(date, +1), !test(date)) {} // eslint-disable-line no-empty
        }
      }
    });
  };

  if (count) {
    interval.count = (start, end) => {
      t0.setTime(+start), t1.setTime(+end);
      floori(t0), floori(t1);
      return Math.floor(count(t0, t1));
    };

    interval.every = (step) => {
      step = Math.floor(step);
      return !isFinite(step) || !(step > 0) ? null
          : !(step > 1) ? interval
          : interval.filter(field
              ? (d) => field(d) % step === 0
              : (d) => interval.count(0, d) % step === 0);
    };
  }

  return interval;
}

const millisecond = timeInterval(() => {
  // noop
}, (date, step) => {
  date.setTime(+date + step);
}, (start, end) => {
  return end - start;
});

// An optimized implementation for this simple case.
millisecond.every = (k) => {
  k = Math.floor(k);
  if (!isFinite(k) || !(k > 0)) return null;
  if (!(k > 1)) return millisecond;
  return timeInterval((date) => {
    date.setTime(Math.floor(date / k) * k);
  }, (date, step) => {
    date.setTime(+date + step * k);
  }, (start, end) => {
    return (end - start) / k;
  });
};

millisecond.range;

const durationSecond = 1000;
const durationMinute = durationSecond * 60;
const durationHour = durationMinute * 60;
const durationDay = durationHour * 24;
const durationWeek = durationDay * 7;

const second = timeInterval((date) => {
  date.setTime(date - date.getMilliseconds());
}, (date, step) => {
  date.setTime(+date + step * durationSecond);
}, (start, end) => {
  return (end - start) / durationSecond;
}, (date) => {
  return date.getUTCSeconds();
});

second.range;

const timeMinute = timeInterval((date) => {
  date.setTime(date - date.getMilliseconds() - date.getSeconds() * durationSecond);
}, (date, step) => {
  date.setTime(+date + step * durationMinute);
}, (start, end) => {
  return (end - start) / durationMinute;
}, (date) => {
  return date.getMinutes();
});

timeMinute.range;

const utcMinute = timeInterval((date) => {
  date.setUTCSeconds(0, 0);
}, (date, step) => {
  date.setTime(+date + step * durationMinute);
}, (start, end) => {
  return (end - start) / durationMinute;
}, (date) => {
  return date.getUTCMinutes();
});

utcMinute.range;

const timeHour = timeInterval((date) => {
  date.setTime(date - date.getMilliseconds() - date.getSeconds() * durationSecond - date.getMinutes() * durationMinute);
}, (date, step) => {
  date.setTime(+date + step * durationHour);
}, (start, end) => {
  return (end - start) / durationHour;
}, (date) => {
  return date.getHours();
});

timeHour.range;

const utcHour = timeInterval((date) => {
  date.setUTCMinutes(0, 0, 0);
}, (date, step) => {
  date.setTime(+date + step * durationHour);
}, (start, end) => {
  return (end - start) / durationHour;
}, (date) => {
  return date.getUTCHours();
});

utcHour.range;

const timeDay = timeInterval(
  date => date.setHours(0, 0, 0, 0),
  (date, step) => date.setDate(date.getDate() + step),
  (start, end) => (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationDay,
  date => date.getDate() - 1
);

timeDay.range;

const utcDay = timeInterval((date) => {
  date.setUTCHours(0, 0, 0, 0);
}, (date, step) => {
  date.setUTCDate(date.getUTCDate() + step);
}, (start, end) => {
  return (end - start) / durationDay;
}, (date) => {
  return date.getUTCDate() - 1;
});

utcDay.range;

const unixDay = timeInterval((date) => {
  date.setUTCHours(0, 0, 0, 0);
}, (date, step) => {
  date.setUTCDate(date.getUTCDate() + step);
}, (start, end) => {
  return (end - start) / durationDay;
}, (date) => {
  return Math.floor(date / durationDay);
});

unixDay.range;

function timeWeekday(i) {
  return timeInterval((date) => {
    date.setDate(date.getDate() - (date.getDay() + 7 - i) % 7);
    date.setHours(0, 0, 0, 0);
  }, (date, step) => {
    date.setDate(date.getDate() + step * 7);
  }, (start, end) => {
    return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationWeek;
  });
}

const timeSunday = timeWeekday(0);
const timeMonday = timeWeekday(1);
const timeTuesday = timeWeekday(2);
const timeWednesday = timeWeekday(3);
const timeThursday = timeWeekday(4);
const timeFriday = timeWeekday(5);
const timeSaturday = timeWeekday(6);

timeSunday.range;
timeMonday.range;
timeTuesday.range;
timeWednesday.range;
timeThursday.range;
timeFriday.range;
timeSaturday.range;

function utcWeekday(i) {
  return timeInterval((date) => {
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 7 - i) % 7);
    date.setUTCHours(0, 0, 0, 0);
  }, (date, step) => {
    date.setUTCDate(date.getUTCDate() + step * 7);
  }, (start, end) => {
    return (end - start) / durationWeek;
  });
}

const utcSunday = utcWeekday(0);
const utcMonday = utcWeekday(1);
const utcTuesday = utcWeekday(2);
const utcWednesday = utcWeekday(3);
const utcThursday = utcWeekday(4);
const utcFriday = utcWeekday(5);
const utcSaturday = utcWeekday(6);

utcSunday.range;
utcMonday.range;
utcTuesday.range;
utcWednesday.range;
utcThursday.range;
utcFriday.range;
utcSaturday.range;

const timeMonth = timeInterval((date) => {
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
}, (date, step) => {
  date.setMonth(date.getMonth() + step);
}, (start, end) => {
  return end.getMonth() - start.getMonth() + (end.getFullYear() - start.getFullYear()) * 12;
}, (date) => {
  return date.getMonth();
});

timeMonth.range;

const utcMonth = timeInterval((date) => {
  date.setUTCDate(1);
  date.setUTCHours(0, 0, 0, 0);
}, (date, step) => {
  date.setUTCMonth(date.getUTCMonth() + step);
}, (start, end) => {
  return end.getUTCMonth() - start.getUTCMonth() + (end.getUTCFullYear() - start.getUTCFullYear()) * 12;
}, (date) => {
  return date.getUTCMonth();
});

utcMonth.range;

const timeYear = timeInterval((date) => {
  date.setMonth(0, 1);
  date.setHours(0, 0, 0, 0);
}, (date, step) => {
  date.setFullYear(date.getFullYear() + step);
}, (start, end) => {
  return end.getFullYear() - start.getFullYear();
}, (date) => {
  return date.getFullYear();
});

// An optimized implementation for this simple case.
timeYear.every = (k) => {
  return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : timeInterval((date) => {
    date.setFullYear(Math.floor(date.getFullYear() / k) * k);
    date.setMonth(0, 1);
    date.setHours(0, 0, 0, 0);
  }, (date, step) => {
    date.setFullYear(date.getFullYear() + step * k);
  });
};

timeYear.range;

const utcYear = timeInterval((date) => {
  date.setUTCMonth(0, 1);
  date.setUTCHours(0, 0, 0, 0);
}, (date, step) => {
  date.setUTCFullYear(date.getUTCFullYear() + step);
}, (start, end) => {
  return end.getUTCFullYear() - start.getUTCFullYear();
}, (date) => {
  return date.getUTCFullYear();
});

// An optimized implementation for this simple case.
utcYear.every = (k) => {
  return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : timeInterval((date) => {
    date.setUTCFullYear(Math.floor(date.getUTCFullYear() / k) * k);
    date.setUTCMonth(0, 1);
    date.setUTCHours(0, 0, 0, 0);
  }, (date, step) => {
    date.setUTCFullYear(date.getUTCFullYear() + step * k);
  });
};

utcYear.range;

function localDate(d) {
  if (0 <= d.y && d.y < 100) {
    var date = new Date(-1, d.m, d.d, d.H, d.M, d.S, d.L);
    date.setFullYear(d.y);
    return date;
  }
  return new Date(d.y, d.m, d.d, d.H, d.M, d.S, d.L);
}

function utcDate(d) {
  if (0 <= d.y && d.y < 100) {
    var date = new Date(Date.UTC(-1, d.m, d.d, d.H, d.M, d.S, d.L));
    date.setUTCFullYear(d.y);
    return date;
  }
  return new Date(Date.UTC(d.y, d.m, d.d, d.H, d.M, d.S, d.L));
}

function newDate(y, m, d) {
  return {y: y, m: m, d: d, H: 0, M: 0, S: 0, L: 0};
}

function formatLocale(locale) {
  var locale_dateTime = locale.dateTime,
      locale_date = locale.date,
      locale_time = locale.time,
      locale_periods = locale.periods,
      locale_weekdays = locale.days,
      locale_shortWeekdays = locale.shortDays,
      locale_months = locale.months,
      locale_shortMonths = locale.shortMonths;

  var periodRe = formatRe(locale_periods),
      periodLookup = formatLookup(locale_periods),
      weekdayRe = formatRe(locale_weekdays),
      weekdayLookup = formatLookup(locale_weekdays),
      shortWeekdayRe = formatRe(locale_shortWeekdays),
      shortWeekdayLookup = formatLookup(locale_shortWeekdays),
      monthRe = formatRe(locale_months),
      monthLookup = formatLookup(locale_months),
      shortMonthRe = formatRe(locale_shortMonths),
      shortMonthLookup = formatLookup(locale_shortMonths);

  var formats = {
    "a": formatShortWeekday,
    "A": formatWeekday,
    "b": formatShortMonth,
    "B": formatMonth,
    "c": null,
    "d": formatDayOfMonth,
    "e": formatDayOfMonth,
    "f": formatMicroseconds,
    "g": formatYearISO,
    "G": formatFullYearISO,
    "H": formatHour24,
    "I": formatHour12,
    "j": formatDayOfYear,
    "L": formatMilliseconds,
    "m": formatMonthNumber,
    "M": formatMinutes,
    "p": formatPeriod,
    "q": formatQuarter,
    "Q": formatUnixTimestamp,
    "s": formatUnixTimestampSeconds,
    "S": formatSeconds,
    "u": formatWeekdayNumberMonday,
    "U": formatWeekNumberSunday,
    "V": formatWeekNumberISO,
    "w": formatWeekdayNumberSunday,
    "W": formatWeekNumberMonday,
    "x": null,
    "X": null,
    "y": formatYear,
    "Y": formatFullYear,
    "Z": formatZone,
    "%": formatLiteralPercent
  };

  var utcFormats = {
    "a": formatUTCShortWeekday,
    "A": formatUTCWeekday,
    "b": formatUTCShortMonth,
    "B": formatUTCMonth,
    "c": null,
    "d": formatUTCDayOfMonth,
    "e": formatUTCDayOfMonth,
    "f": formatUTCMicroseconds,
    "g": formatUTCYearISO,
    "G": formatUTCFullYearISO,
    "H": formatUTCHour24,
    "I": formatUTCHour12,
    "j": formatUTCDayOfYear,
    "L": formatUTCMilliseconds,
    "m": formatUTCMonthNumber,
    "M": formatUTCMinutes,
    "p": formatUTCPeriod,
    "q": formatUTCQuarter,
    "Q": formatUnixTimestamp,
    "s": formatUnixTimestampSeconds,
    "S": formatUTCSeconds,
    "u": formatUTCWeekdayNumberMonday,
    "U": formatUTCWeekNumberSunday,
    "V": formatUTCWeekNumberISO,
    "w": formatUTCWeekdayNumberSunday,
    "W": formatUTCWeekNumberMonday,
    "x": null,
    "X": null,
    "y": formatUTCYear,
    "Y": formatUTCFullYear,
    "Z": formatUTCZone,
    "%": formatLiteralPercent
  };

  var parses = {
    "a": parseShortWeekday,
    "A": parseWeekday,
    "b": parseShortMonth,
    "B": parseMonth,
    "c": parseLocaleDateTime,
    "d": parseDayOfMonth,
    "e": parseDayOfMonth,
    "f": parseMicroseconds,
    "g": parseYear,
    "G": parseFullYear,
    "H": parseHour24,
    "I": parseHour24,
    "j": parseDayOfYear,
    "L": parseMilliseconds,
    "m": parseMonthNumber,
    "M": parseMinutes,
    "p": parsePeriod,
    "q": parseQuarter,
    "Q": parseUnixTimestamp,
    "s": parseUnixTimestampSeconds,
    "S": parseSeconds,
    "u": parseWeekdayNumberMonday,
    "U": parseWeekNumberSunday,
    "V": parseWeekNumberISO,
    "w": parseWeekdayNumberSunday,
    "W": parseWeekNumberMonday,
    "x": parseLocaleDate,
    "X": parseLocaleTime,
    "y": parseYear,
    "Y": parseFullYear,
    "Z": parseZone,
    "%": parseLiteralPercent
  };

  // These recursive directive definitions must be deferred.
  formats.x = newFormat(locale_date, formats);
  formats.X = newFormat(locale_time, formats);
  formats.c = newFormat(locale_dateTime, formats);
  utcFormats.x = newFormat(locale_date, utcFormats);
  utcFormats.X = newFormat(locale_time, utcFormats);
  utcFormats.c = newFormat(locale_dateTime, utcFormats);

  function newFormat(specifier, formats) {
    return function(date) {
      var string = [],
          i = -1,
          j = 0,
          n = specifier.length,
          c,
          pad,
          format;

      if (!(date instanceof Date)) date = new Date(+date);

      while (++i < n) {
        if (specifier.charCodeAt(i) === 37) {
          string.push(specifier.slice(j, i));
          if ((pad = pads[c = specifier.charAt(++i)]) != null) c = specifier.charAt(++i);
          else pad = c === "e" ? " " : "0";
          if (format = formats[c]) c = format(date, pad);
          string.push(c);
          j = i + 1;
        }
      }

      string.push(specifier.slice(j, i));
      return string.join("");
    };
  }

  function newParse(specifier, Z) {
    return function(string) {
      var d = newDate(1900, undefined, 1),
          i = parseSpecifier(d, specifier, string += "", 0),
          week, day;
      if (i != string.length) return null;

      // If a UNIX timestamp is specified, return it.
      if ("Q" in d) return new Date(d.Q);
      if ("s" in d) return new Date(d.s * 1000 + ("L" in d ? d.L : 0));

      // If this is utcParse, never use the local timezone.
      if (Z && !("Z" in d)) d.Z = 0;

      // The am-pm flag is 0 for AM, and 1 for PM.
      if ("p" in d) d.H = d.H % 12 + d.p * 12;

      // If the month was not specified, inherit from the quarter.
      if (d.m === undefined) d.m = "q" in d ? d.q : 0;

      // Convert day-of-week and week-of-year to day-of-year.
      if ("V" in d) {
        if (d.V < 1 || d.V > 53) return null;
        if (!("w" in d)) d.w = 1;
        if ("Z" in d) {
          week = utcDate(newDate(d.y, 0, 1)), day = week.getUTCDay();
          week = day > 4 || day === 0 ? utcMonday.ceil(week) : utcMonday(week);
          week = utcDay.offset(week, (d.V - 1) * 7);
          d.y = week.getUTCFullYear();
          d.m = week.getUTCMonth();
          d.d = week.getUTCDate() + (d.w + 6) % 7;
        } else {
          week = localDate(newDate(d.y, 0, 1)), day = week.getDay();
          week = day > 4 || day === 0 ? timeMonday.ceil(week) : timeMonday(week);
          week = timeDay.offset(week, (d.V - 1) * 7);
          d.y = week.getFullYear();
          d.m = week.getMonth();
          d.d = week.getDate() + (d.w + 6) % 7;
        }
      } else if ("W" in d || "U" in d) {
        if (!("w" in d)) d.w = "u" in d ? d.u % 7 : "W" in d ? 1 : 0;
        day = "Z" in d ? utcDate(newDate(d.y, 0, 1)).getUTCDay() : localDate(newDate(d.y, 0, 1)).getDay();
        d.m = 0;
        d.d = "W" in d ? (d.w + 6) % 7 + d.W * 7 - (day + 5) % 7 : d.w + d.U * 7 - (day + 6) % 7;
      }

      // If a time zone is specified, all fields are interpreted as UTC and then
      // offset according to the specified time zone.
      if ("Z" in d) {
        d.H += d.Z / 100 | 0;
        d.M += d.Z % 100;
        return utcDate(d);
      }

      // Otherwise, all fields are in local time.
      return localDate(d);
    };
  }

  function parseSpecifier(d, specifier, string, j) {
    var i = 0,
        n = specifier.length,
        m = string.length,
        c,
        parse;

    while (i < n) {
      if (j >= m) return -1;
      c = specifier.charCodeAt(i++);
      if (c === 37) {
        c = specifier.charAt(i++);
        parse = parses[c in pads ? specifier.charAt(i++) : c];
        if (!parse || ((j = parse(d, string, j)) < 0)) return -1;
      } else if (c != string.charCodeAt(j++)) {
        return -1;
      }
    }

    return j;
  }

  function parsePeriod(d, string, i) {
    var n = periodRe.exec(string.slice(i));
    return n ? (d.p = periodLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }

  function parseShortWeekday(d, string, i) {
    var n = shortWeekdayRe.exec(string.slice(i));
    return n ? (d.w = shortWeekdayLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }

  function parseWeekday(d, string, i) {
    var n = weekdayRe.exec(string.slice(i));
    return n ? (d.w = weekdayLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }

  function parseShortMonth(d, string, i) {
    var n = shortMonthRe.exec(string.slice(i));
    return n ? (d.m = shortMonthLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }

  function parseMonth(d, string, i) {
    var n = monthRe.exec(string.slice(i));
    return n ? (d.m = monthLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }

  function parseLocaleDateTime(d, string, i) {
    return parseSpecifier(d, locale_dateTime, string, i);
  }

  function parseLocaleDate(d, string, i) {
    return parseSpecifier(d, locale_date, string, i);
  }

  function parseLocaleTime(d, string, i) {
    return parseSpecifier(d, locale_time, string, i);
  }

  function formatShortWeekday(d) {
    return locale_shortWeekdays[d.getDay()];
  }

  function formatWeekday(d) {
    return locale_weekdays[d.getDay()];
  }

  function formatShortMonth(d) {
    return locale_shortMonths[d.getMonth()];
  }

  function formatMonth(d) {
    return locale_months[d.getMonth()];
  }

  function formatPeriod(d) {
    return locale_periods[+(d.getHours() >= 12)];
  }

  function formatQuarter(d) {
    return 1 + ~~(d.getMonth() / 3);
  }

  function formatUTCShortWeekday(d) {
    return locale_shortWeekdays[d.getUTCDay()];
  }

  function formatUTCWeekday(d) {
    return locale_weekdays[d.getUTCDay()];
  }

  function formatUTCShortMonth(d) {
    return locale_shortMonths[d.getUTCMonth()];
  }

  function formatUTCMonth(d) {
    return locale_months[d.getUTCMonth()];
  }

  function formatUTCPeriod(d) {
    return locale_periods[+(d.getUTCHours() >= 12)];
  }

  function formatUTCQuarter(d) {
    return 1 + ~~(d.getUTCMonth() / 3);
  }

  return {
    format: function(specifier) {
      var f = newFormat(specifier += "", formats);
      f.toString = function() { return specifier; };
      return f;
    },
    parse: function(specifier) {
      var p = newParse(specifier += "", false);
      p.toString = function() { return specifier; };
      return p;
    },
    utcFormat: function(specifier) {
      var f = newFormat(specifier += "", utcFormats);
      f.toString = function() { return specifier; };
      return f;
    },
    utcParse: function(specifier) {
      var p = newParse(specifier += "", true);
      p.toString = function() { return specifier; };
      return p;
    }
  };
}

var pads = {"-": "", "_": " ", "0": "0"},
    numberRe = /^\s*\d+/, // note: ignores next directive
    percentRe = /^%/,
    requoteRe = /[\\^$*+?|[\]().{}]/g;

function pad(value, fill, width) {
  var sign = value < 0 ? "-" : "",
      string = (sign ? -value : value) + "",
      length = string.length;
  return sign + (length < width ? new Array(width - length + 1).join(fill) + string : string);
}

function requote(s) {
  return s.replace(requoteRe, "\\$&");
}

function formatRe(names) {
  return new RegExp("^(?:" + names.map(requote).join("|") + ")", "i");
}

function formatLookup(names) {
  return new Map(names.map((name, i) => [name.toLowerCase(), i]));
}

function parseWeekdayNumberSunday(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 1));
  return n ? (d.w = +n[0], i + n[0].length) : -1;
}

function parseWeekdayNumberMonday(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 1));
  return n ? (d.u = +n[0], i + n[0].length) : -1;
}

function parseWeekNumberSunday(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.U = +n[0], i + n[0].length) : -1;
}

function parseWeekNumberISO(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.V = +n[0], i + n[0].length) : -1;
}

function parseWeekNumberMonday(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.W = +n[0], i + n[0].length) : -1;
}

function parseFullYear(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 4));
  return n ? (d.y = +n[0], i + n[0].length) : -1;
}

function parseYear(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.y = +n[0] + (+n[0] > 68 ? 1900 : 2000), i + n[0].length) : -1;
}

function parseZone(d, string, i) {
  var n = /^(Z)|([+-]\d\d)(?::?(\d\d))?/.exec(string.slice(i, i + 6));
  return n ? (d.Z = n[1] ? 0 : -(n[2] + (n[3] || "00")), i + n[0].length) : -1;
}

function parseQuarter(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 1));
  return n ? (d.q = n[0] * 3 - 3, i + n[0].length) : -1;
}

function parseMonthNumber(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.m = n[0] - 1, i + n[0].length) : -1;
}

function parseDayOfMonth(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.d = +n[0], i + n[0].length) : -1;
}

function parseDayOfYear(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 3));
  return n ? (d.m = 0, d.d = +n[0], i + n[0].length) : -1;
}

function parseHour24(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.H = +n[0], i + n[0].length) : -1;
}

function parseMinutes(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.M = +n[0], i + n[0].length) : -1;
}

function parseSeconds(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.S = +n[0], i + n[0].length) : -1;
}

function parseMilliseconds(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 3));
  return n ? (d.L = +n[0], i + n[0].length) : -1;
}

function parseMicroseconds(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 6));
  return n ? (d.L = Math.floor(n[0] / 1000), i + n[0].length) : -1;
}

function parseLiteralPercent(d, string, i) {
  var n = percentRe.exec(string.slice(i, i + 1));
  return n ? i + n[0].length : -1;
}

function parseUnixTimestamp(d, string, i) {
  var n = numberRe.exec(string.slice(i));
  return n ? (d.Q = +n[0], i + n[0].length) : -1;
}

function parseUnixTimestampSeconds(d, string, i) {
  var n = numberRe.exec(string.slice(i));
  return n ? (d.s = +n[0], i + n[0].length) : -1;
}

function formatDayOfMonth(d, p) {
  return pad(d.getDate(), p, 2);
}

function formatHour24(d, p) {
  return pad(d.getHours(), p, 2);
}

function formatHour12(d, p) {
  return pad(d.getHours() % 12 || 12, p, 2);
}

function formatDayOfYear(d, p) {
  return pad(1 + timeDay.count(timeYear(d), d), p, 3);
}

function formatMilliseconds(d, p) {
  return pad(d.getMilliseconds(), p, 3);
}

function formatMicroseconds(d, p) {
  return formatMilliseconds(d, p) + "000";
}

function formatMonthNumber(d, p) {
  return pad(d.getMonth() + 1, p, 2);
}

function formatMinutes(d, p) {
  return pad(d.getMinutes(), p, 2);
}

function formatSeconds(d, p) {
  return pad(d.getSeconds(), p, 2);
}

function formatWeekdayNumberMonday(d) {
  var day = d.getDay();
  return day === 0 ? 7 : day;
}

function formatWeekNumberSunday(d, p) {
  return pad(timeSunday.count(timeYear(d) - 1, d), p, 2);
}

function dISO(d) {
  var day = d.getDay();
  return (day >= 4 || day === 0) ? timeThursday(d) : timeThursday.ceil(d);
}

function formatWeekNumberISO(d, p) {
  d = dISO(d);
  return pad(timeThursday.count(timeYear(d), d) + (timeYear(d).getDay() === 4), p, 2);
}

function formatWeekdayNumberSunday(d) {
  return d.getDay();
}

function formatWeekNumberMonday(d, p) {
  return pad(timeMonday.count(timeYear(d) - 1, d), p, 2);
}

function formatYear(d, p) {
  return pad(d.getFullYear() % 100, p, 2);
}

function formatYearISO(d, p) {
  d = dISO(d);
  return pad(d.getFullYear() % 100, p, 2);
}

function formatFullYear(d, p) {
  return pad(d.getFullYear() % 10000, p, 4);
}

function formatFullYearISO(d, p) {
  var day = d.getDay();
  d = (day >= 4 || day === 0) ? timeThursday(d) : timeThursday.ceil(d);
  return pad(d.getFullYear() % 10000, p, 4);
}

function formatZone(d) {
  var z = d.getTimezoneOffset();
  return (z > 0 ? "-" : (z *= -1, "+"))
      + pad(z / 60 | 0, "0", 2)
      + pad(z % 60, "0", 2);
}

function formatUTCDayOfMonth(d, p) {
  return pad(d.getUTCDate(), p, 2);
}

function formatUTCHour24(d, p) {
  return pad(d.getUTCHours(), p, 2);
}

function formatUTCHour12(d, p) {
  return pad(d.getUTCHours() % 12 || 12, p, 2);
}

function formatUTCDayOfYear(d, p) {
  return pad(1 + utcDay.count(utcYear(d), d), p, 3);
}

function formatUTCMilliseconds(d, p) {
  return pad(d.getUTCMilliseconds(), p, 3);
}

function formatUTCMicroseconds(d, p) {
  return formatUTCMilliseconds(d, p) + "000";
}

function formatUTCMonthNumber(d, p) {
  return pad(d.getUTCMonth() + 1, p, 2);
}

function formatUTCMinutes(d, p) {
  return pad(d.getUTCMinutes(), p, 2);
}

function formatUTCSeconds(d, p) {
  return pad(d.getUTCSeconds(), p, 2);
}

function formatUTCWeekdayNumberMonday(d) {
  var dow = d.getUTCDay();
  return dow === 0 ? 7 : dow;
}

function formatUTCWeekNumberSunday(d, p) {
  return pad(utcSunday.count(utcYear(d) - 1, d), p, 2);
}

function UTCdISO(d) {
  var day = d.getUTCDay();
  return (day >= 4 || day === 0) ? utcThursday(d) : utcThursday.ceil(d);
}

function formatUTCWeekNumberISO(d, p) {
  d = UTCdISO(d);
  return pad(utcThursday.count(utcYear(d), d) + (utcYear(d).getUTCDay() === 4), p, 2);
}

function formatUTCWeekdayNumberSunday(d) {
  return d.getUTCDay();
}

function formatUTCWeekNumberMonday(d, p) {
  return pad(utcMonday.count(utcYear(d) - 1, d), p, 2);
}

function formatUTCYear(d, p) {
  return pad(d.getUTCFullYear() % 100, p, 2);
}

function formatUTCYearISO(d, p) {
  d = UTCdISO(d);
  return pad(d.getUTCFullYear() % 100, p, 2);
}

function formatUTCFullYear(d, p) {
  return pad(d.getUTCFullYear() % 10000, p, 4);
}

function formatUTCFullYearISO(d, p) {
  var day = d.getUTCDay();
  d = (day >= 4 || day === 0) ? utcThursday(d) : utcThursday.ceil(d);
  return pad(d.getUTCFullYear() % 10000, p, 4);
}

function formatUTCZone() {
  return "+0000";
}

function formatLiteralPercent() {
  return "%";
}

function formatUnixTimestamp(d) {
  return +d;
}

function formatUnixTimestampSeconds(d) {
  return Math.floor(+d / 1000);
}

var locale;
var utcFormat;
var utcParse;

defaultLocale({
  dateTime: "%x, %X",
  date: "%-m/%-d/%Y",
  time: "%-I:%M:%S %p",
  periods: ["AM", "PM"],
  days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
});

function defaultLocale(definition) {
  locale = formatLocale(definition);
  locale.format;
  locale.parse;
  utcFormat = locale.utcFormat;
  utcParse = locale.utcParse;
  return locale;
}

var isoSpecifier = "%Y-%m-%dT%H:%M:%S.%LZ";

function formatIsoNative(date) {
  return date.toISOString();
}

Date.prototype.toISOString
    ? formatIsoNative
    : utcFormat(isoSpecifier);

function parseIsoNative(string) {
  var date = new Date(string);
  return isNaN(date) ? null : date;
}

+new Date("2000-01-01T00:00:00.000Z")
    ? parseIsoNative
    : utcParse(isoSpecifier);

var frame = 0, // is an animation frame pending?
    timeout$1 = 0, // is a timeout pending?
    interval = 0, // are any timers active?
    pokeDelay = 1000, // how frequently we check for clock skew
    taskHead,
    taskTail,
    clockLast = 0,
    clockNow = 0,
    clockSkew = 0,
    clock = typeof performance === "object" && performance.now ? performance : Date,
    setFrame = typeof window === "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(f) { setTimeout(f, 17); };

function now() {
  return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
}

function clearNow() {
  clockNow = 0;
}

function Timer() {
  this._call =
  this._time =
  this._next = null;
}

Timer.prototype = timer.prototype = {
  constructor: Timer,
  restart: function(callback, delay, time) {
    if (typeof callback !== "function") throw new TypeError("callback is not a function");
    time = (time == null ? now() : +time) + (delay == null ? 0 : +delay);
    if (!this._next && taskTail !== this) {
      if (taskTail) taskTail._next = this;
      else taskHead = this;
      taskTail = this;
    }
    this._call = callback;
    this._time = time;
    sleep();
  },
  stop: function() {
    if (this._call) {
      this._call = null;
      this._time = Infinity;
      sleep();
    }
  }
};

function timer(callback, delay, time) {
  var t = new Timer;
  t.restart(callback, delay, time);
  return t;
}

function timerFlush() {
  now(); // Get the current time, if not already set.
  ++frame; // Pretend we’ve set an alarm, if we haven’t already.
  var t = taskHead, e;
  while (t) {
    if ((e = clockNow - t._time) >= 0) t._call.call(undefined, e);
    t = t._next;
  }
  --frame;
}

function wake() {
  clockNow = (clockLast = clock.now()) + clockSkew;
  frame = timeout$1 = 0;
  try {
    timerFlush();
  } finally {
    frame = 0;
    nap();
    clockNow = 0;
  }
}

function poke() {
  var now = clock.now(), delay = now - clockLast;
  if (delay > pokeDelay) clockSkew -= delay, clockLast = now;
}

function nap() {
  var t0, t1 = taskHead, t2, time = Infinity;
  while (t1) {
    if (t1._call) {
      if (time > t1._time) time = t1._time;
      t0 = t1, t1 = t1._next;
    } else {
      t2 = t1._next, t1._next = null;
      t1 = t0 ? t0._next = t2 : taskHead = t2;
    }
  }
  taskTail = t0;
  sleep(time);
}

function sleep(time) {
  if (frame) return; // Soonest alarm already set, or will be.
  if (timeout$1) timeout$1 = clearTimeout(timeout$1);
  var delay = time - clockNow; // Strictly less than if we recomputed clockNow.
  if (delay > 24) {
    if (time < Infinity) timeout$1 = setTimeout(wake, time - clock.now() - clockSkew);
    if (interval) interval = clearInterval(interval);
  } else {
    if (!interval) clockLast = clock.now(), interval = setInterval(poke, pokeDelay);
    frame = 1, setFrame(wake);
  }
}

function timeout(callback, delay, time) {
  var t = new Timer;
  delay = delay == null ? 0 : +delay;
  t.restart(elapsed => {
    t.stop();
    callback(elapsed + delay);
  }, delay, time);
  return t;
}

var emptyOn = dispatch("start", "end", "cancel", "interrupt");
var emptyTween = [];

var CREATED = 0;
var SCHEDULED = 1;
var STARTING = 2;
var STARTED = 3;
var RUNNING = 4;
var ENDING = 5;
var ENDED = 6;

function schedule(node, name, id, index, group, timing) {
  var schedules = node.__transition;
  if (!schedules) node.__transition = {};
  else if (id in schedules) return;
  create(node, id, {
    name: name,
    index: index, // For context during callback.
    group: group, // For context during callback.
    on: emptyOn,
    tween: emptyTween,
    time: timing.time,
    delay: timing.delay,
    duration: timing.duration,
    ease: timing.ease,
    timer: null,
    state: CREATED
  });
}

function init(node, id) {
  var schedule = get(node, id);
  if (schedule.state > CREATED) throw new Error("too late; already scheduled");
  return schedule;
}

function set(node, id) {
  var schedule = get(node, id);
  if (schedule.state > STARTED) throw new Error("too late; already running");
  return schedule;
}

function get(node, id) {
  var schedule = node.__transition;
  if (!schedule || !(schedule = schedule[id])) throw new Error("transition not found");
  return schedule;
}

function create(node, id, self) {
  var schedules = node.__transition,
      tween;

  // Initialize the self timer when the transition is created.
  // Note the actual delay is not known until the first callback!
  schedules[id] = self;
  self.timer = timer(schedule, 0, self.time);

  function schedule(elapsed) {
    self.state = SCHEDULED;
    self.timer.restart(start, self.delay, self.time);

    // If the elapsed delay is less than our first sleep, start immediately.
    if (self.delay <= elapsed) start(elapsed - self.delay);
  }

  function start(elapsed) {
    var i, j, n, o;

    // If the state is not SCHEDULED, then we previously errored on start.
    if (self.state !== SCHEDULED) return stop();

    for (i in schedules) {
      o = schedules[i];
      if (o.name !== self.name) continue;

      // While this element already has a starting transition during this frame,
      // defer starting an interrupting transition until that transition has a
      // chance to tick (and possibly end); see d3/d3-transition#54!
      if (o.state === STARTED) return timeout(start);

      // Interrupt the active transition, if any.
      if (o.state === RUNNING) {
        o.state = ENDED;
        o.timer.stop();
        o.on.call("interrupt", node, node.__data__, o.index, o.group);
        delete schedules[i];
      }

      // Cancel any pre-empted transitions.
      else if (+i < id) {
        o.state = ENDED;
        o.timer.stop();
        o.on.call("cancel", node, node.__data__, o.index, o.group);
        delete schedules[i];
      }
    }

    // Defer the first tick to end of the current frame; see d3/d3#1576.
    // Note the transition may be canceled after start and before the first tick!
    // Note this must be scheduled before the start event; see d3/d3-transition#16!
    // Assuming this is successful, subsequent callbacks go straight to tick.
    timeout(function() {
      if (self.state === STARTED) {
        self.state = RUNNING;
        self.timer.restart(tick, self.delay, self.time);
        tick(elapsed);
      }
    });

    // Dispatch the start event.
    // Note this must be done before the tween are initialized.
    self.state = STARTING;
    self.on.call("start", node, node.__data__, self.index, self.group);
    if (self.state !== STARTING) return; // interrupted
    self.state = STARTED;

    // Initialize the tween, deleting null tween.
    tween = new Array(n = self.tween.length);
    for (i = 0, j = -1; i < n; ++i) {
      if (o = self.tween[i].value.call(node, node.__data__, self.index, self.group)) {
        tween[++j] = o;
      }
    }
    tween.length = j + 1;
  }

  function tick(elapsed) {
    var t = elapsed < self.duration ? self.ease.call(null, elapsed / self.duration) : (self.timer.restart(stop), self.state = ENDING, 1),
        i = -1,
        n = tween.length;

    while (++i < n) {
      tween[i].call(node, t);
    }

    // Dispatch the end event.
    if (self.state === ENDING) {
      self.on.call("end", node, node.__data__, self.index, self.group);
      stop();
    }
  }

  function stop() {
    self.state = ENDED;
    self.timer.stop();
    delete schedules[id];
    for (var i in schedules) return; // eslint-disable-line no-unused-vars
    delete node.__transition;
  }
}

function interrupt(node, name) {
  var schedules = node.__transition,
      schedule,
      active,
      empty = true,
      i;

  if (!schedules) return;

  name = name == null ? null : name + "";

  for (i in schedules) {
    if ((schedule = schedules[i]).name !== name) { empty = false; continue; }
    active = schedule.state > STARTING && schedule.state < ENDING;
    schedule.state = ENDED;
    schedule.timer.stop();
    schedule.on.call(active ? "interrupt" : "cancel", node, node.__data__, schedule.index, schedule.group);
    delete schedules[i];
  }

  if (empty) delete node.__transition;
}

function selection_interrupt(name) {
  return this.each(function() {
    interrupt(this, name);
  });
}

function tweenRemove(id, name) {
  var tween0, tween1;
  return function() {
    var schedule = set(this, id),
        tween = schedule.tween;

    // If this node shared tween with the previous node,
    // just assign the updated shared tween and we’re done!
    // Otherwise, copy-on-write.
    if (tween !== tween0) {
      tween1 = tween0 = tween;
      for (var i = 0, n = tween1.length; i < n; ++i) {
        if (tween1[i].name === name) {
          tween1 = tween1.slice();
          tween1.splice(i, 1);
          break;
        }
      }
    }

    schedule.tween = tween1;
  };
}

function tweenFunction(id, name, value) {
  var tween0, tween1;
  if (typeof value !== "function") throw new Error;
  return function() {
    var schedule = set(this, id),
        tween = schedule.tween;

    // If this node shared tween with the previous node,
    // just assign the updated shared tween and we’re done!
    // Otherwise, copy-on-write.
    if (tween !== tween0) {
      tween1 = (tween0 = tween).slice();
      for (var t = {name: name, value: value}, i = 0, n = tween1.length; i < n; ++i) {
        if (tween1[i].name === name) {
          tween1[i] = t;
          break;
        }
      }
      if (i === n) tween1.push(t);
    }

    schedule.tween = tween1;
  };
}

function transition_tween(name, value) {
  var id = this._id;

  name += "";

  if (arguments.length < 2) {
    var tween = get(this.node(), id).tween;
    for (var i = 0, n = tween.length, t; i < n; ++i) {
      if ((t = tween[i]).name === name) {
        return t.value;
      }
    }
    return null;
  }

  return this.each((value == null ? tweenRemove : tweenFunction)(id, name, value));
}

function tweenValue(transition, name, value) {
  var id = transition._id;

  transition.each(function() {
    var schedule = set(this, id);
    (schedule.value || (schedule.value = {}))[name] = value.apply(this, arguments);
  });

  return function(node) {
    return get(node, id).value[name];
  };
}

function interpolate(a, b) {
  var c;
  return (typeof b === "number" ? interpolateNumber
      : b instanceof color ? interpolateRgb
      : (c = color(b)) ? (b = c, interpolateRgb)
      : interpolateString)(a, b);
}

function attrRemove(name) {
  return function() {
    this.removeAttribute(name);
  };
}

function attrRemoveNS(fullname) {
  return function() {
    this.removeAttributeNS(fullname.space, fullname.local);
  };
}

function attrConstant(name, interpolate, value1) {
  var string00,
      string1 = value1 + "",
      interpolate0;
  return function() {
    var string0 = this.getAttribute(name);
    return string0 === string1 ? null
        : string0 === string00 ? interpolate0
        : interpolate0 = interpolate(string00 = string0, value1);
  };
}

function attrConstantNS(fullname, interpolate, value1) {
  var string00,
      string1 = value1 + "",
      interpolate0;
  return function() {
    var string0 = this.getAttributeNS(fullname.space, fullname.local);
    return string0 === string1 ? null
        : string0 === string00 ? interpolate0
        : interpolate0 = interpolate(string00 = string0, value1);
  };
}

function attrFunction(name, interpolate, value) {
  var string00,
      string10,
      interpolate0;
  return function() {
    var string0, value1 = value(this), string1;
    if (value1 == null) return void this.removeAttribute(name);
    string0 = this.getAttribute(name);
    string1 = value1 + "";
    return string0 === string1 ? null
        : string0 === string00 && string1 === string10 ? interpolate0
        : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
  };
}

function attrFunctionNS(fullname, interpolate, value) {
  var string00,
      string10,
      interpolate0;
  return function() {
    var string0, value1 = value(this), string1;
    if (value1 == null) return void this.removeAttributeNS(fullname.space, fullname.local);
    string0 = this.getAttributeNS(fullname.space, fullname.local);
    string1 = value1 + "";
    return string0 === string1 ? null
        : string0 === string00 && string1 === string10 ? interpolate0
        : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
  };
}

function transition_attr(name, value) {
  var fullname = namespace(name), i = fullname === "transform" ? interpolateTransformSvg : interpolate;
  return this.attrTween(name, typeof value === "function"
      ? (fullname.local ? attrFunctionNS : attrFunction)(fullname, i, tweenValue(this, "attr." + name, value))
      : value == null ? (fullname.local ? attrRemoveNS : attrRemove)(fullname)
      : (fullname.local ? attrConstantNS : attrConstant)(fullname, i, value));
}

function attrInterpolate(name, i) {
  return function(t) {
    this.setAttribute(name, i.call(this, t));
  };
}

function attrInterpolateNS(fullname, i) {
  return function(t) {
    this.setAttributeNS(fullname.space, fullname.local, i.call(this, t));
  };
}

function attrTweenNS(fullname, value) {
  var t0, i0;
  function tween() {
    var i = value.apply(this, arguments);
    if (i !== i0) t0 = (i0 = i) && attrInterpolateNS(fullname, i);
    return t0;
  }
  tween._value = value;
  return tween;
}

function attrTween(name, value) {
  var t0, i0;
  function tween() {
    var i = value.apply(this, arguments);
    if (i !== i0) t0 = (i0 = i) && attrInterpolate(name, i);
    return t0;
  }
  tween._value = value;
  return tween;
}

function transition_attrTween(name, value) {
  var key = "attr." + name;
  if (arguments.length < 2) return (key = this.tween(key)) && key._value;
  if (value == null) return this.tween(key, null);
  if (typeof value !== "function") throw new Error;
  var fullname = namespace(name);
  return this.tween(key, (fullname.local ? attrTweenNS : attrTween)(fullname, value));
}

function delayFunction(id, value) {
  return function() {
    init(this, id).delay = +value.apply(this, arguments);
  };
}

function delayConstant(id, value) {
  return value = +value, function() {
    init(this, id).delay = value;
  };
}

function transition_delay(value) {
  var id = this._id;

  return arguments.length
      ? this.each((typeof value === "function"
          ? delayFunction
          : delayConstant)(id, value))
      : get(this.node(), id).delay;
}

function durationFunction(id, value) {
  return function() {
    set(this, id).duration = +value.apply(this, arguments);
  };
}

function durationConstant(id, value) {
  return value = +value, function() {
    set(this, id).duration = value;
  };
}

function transition_duration(value) {
  var id = this._id;

  return arguments.length
      ? this.each((typeof value === "function"
          ? durationFunction
          : durationConstant)(id, value))
      : get(this.node(), id).duration;
}

function easeConstant(id, value) {
  if (typeof value !== "function") throw new Error;
  return function() {
    set(this, id).ease = value;
  };
}

function transition_ease(value) {
  var id = this._id;

  return arguments.length
      ? this.each(easeConstant(id, value))
      : get(this.node(), id).ease;
}

function easeVarying(id, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (typeof v !== "function") throw new Error;
    set(this, id).ease = v;
  };
}

function transition_easeVarying(value) {
  if (typeof value !== "function") throw new Error;
  return this.each(easeVarying(this._id, value));
}

function transition_filter(match) {
  if (typeof match !== "function") match = matcher(match);

  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
      if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
        subgroup.push(node);
      }
    }
  }

  return new Transition(subgroups, this._parents, this._name, this._id);
}

function transition_merge(transition) {
  if (transition._id !== this._id) throw new Error;

  for (var groups0 = this._groups, groups1 = transition._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
    for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group0[i] || group1[i]) {
        merge[i] = node;
      }
    }
  }

  for (; j < m0; ++j) {
    merges[j] = groups0[j];
  }

  return new Transition(merges, this._parents, this._name, this._id);
}

function start(name) {
  return (name + "").trim().split(/^|\s+/).every(function(t) {
    var i = t.indexOf(".");
    if (i >= 0) t = t.slice(0, i);
    return !t || t === "start";
  });
}

function onFunction(id, name, listener) {
  var on0, on1, sit = start(name) ? init : set;
  return function() {
    var schedule = sit(this, id),
        on = schedule.on;

    // If this node shared a dispatch with the previous node,
    // just assign the updated shared dispatch and we’re done!
    // Otherwise, copy-on-write.
    if (on !== on0) (on1 = (on0 = on).copy()).on(name, listener);

    schedule.on = on1;
  };
}

function transition_on(name, listener) {
  var id = this._id;

  return arguments.length < 2
      ? get(this.node(), id).on.on(name)
      : this.each(onFunction(id, name, listener));
}

function removeFunction(id) {
  return function() {
    var parent = this.parentNode;
    for (var i in this.__transition) if (+i !== id) return;
    if (parent) parent.removeChild(this);
  };
}

function transition_remove() {
  return this.on("end.remove", removeFunction(this._id));
}

function transition_select(select) {
  var name = this._name,
      id = this._id;

  if (typeof select !== "function") select = selector(select);

  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
      if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
        if ("__data__" in node) subnode.__data__ = node.__data__;
        subgroup[i] = subnode;
        schedule(subgroup[i], name, id, i, subgroup, get(node, id));
      }
    }
  }

  return new Transition(subgroups, this._parents, name, id);
}

function transition_selectAll(select) {
  var name = this._name,
      id = this._id;

  if (typeof select !== "function") select = selectorAll(select);

  for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        for (var children = select.call(node, node.__data__, i, group), child, inherit = get(node, id), k = 0, l = children.length; k < l; ++k) {
          if (child = children[k]) {
            schedule(child, name, id, k, children, inherit);
          }
        }
        subgroups.push(children);
        parents.push(node);
      }
    }
  }

  return new Transition(subgroups, parents, name, id);
}

var Selection = selection.prototype.constructor;

function transition_selection() {
  return new Selection(this._groups, this._parents);
}

function styleNull(name, interpolate) {
  var string00,
      string10,
      interpolate0;
  return function() {
    var string0 = styleValue(this, name),
        string1 = (this.style.removeProperty(name), styleValue(this, name));
    return string0 === string1 ? null
        : string0 === string00 && string1 === string10 ? interpolate0
        : interpolate0 = interpolate(string00 = string0, string10 = string1);
  };
}

function styleRemove(name) {
  return function() {
    this.style.removeProperty(name);
  };
}

function styleConstant(name, interpolate, value1) {
  var string00,
      string1 = value1 + "",
      interpolate0;
  return function() {
    var string0 = styleValue(this, name);
    return string0 === string1 ? null
        : string0 === string00 ? interpolate0
        : interpolate0 = interpolate(string00 = string0, value1);
  };
}

function styleFunction(name, interpolate, value) {
  var string00,
      string10,
      interpolate0;
  return function() {
    var string0 = styleValue(this, name),
        value1 = value(this),
        string1 = value1 + "";
    if (value1 == null) string1 = value1 = (this.style.removeProperty(name), styleValue(this, name));
    return string0 === string1 ? null
        : string0 === string00 && string1 === string10 ? interpolate0
        : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
  };
}

function styleMaybeRemove(id, name) {
  var on0, on1, listener0, key = "style." + name, event = "end." + key, remove;
  return function() {
    var schedule = set(this, id),
        on = schedule.on,
        listener = schedule.value[key] == null ? remove || (remove = styleRemove(name)) : undefined;

    // If this node shared a dispatch with the previous node,
    // just assign the updated shared dispatch and we’re done!
    // Otherwise, copy-on-write.
    if (on !== on0 || listener0 !== listener) (on1 = (on0 = on).copy()).on(event, listener0 = listener);

    schedule.on = on1;
  };
}

function transition_style(name, value, priority) {
  var i = (name += "") === "transform" ? interpolateTransformCss : interpolate;
  return value == null ? this
      .styleTween(name, styleNull(name, i))
      .on("end.style." + name, styleRemove(name))
    : typeof value === "function" ? this
      .styleTween(name, styleFunction(name, i, tweenValue(this, "style." + name, value)))
      .each(styleMaybeRemove(this._id, name))
    : this
      .styleTween(name, styleConstant(name, i, value), priority)
      .on("end.style." + name, null);
}

function styleInterpolate(name, i, priority) {
  return function(t) {
    this.style.setProperty(name, i.call(this, t), priority);
  };
}

function styleTween(name, value, priority) {
  var t, i0;
  function tween() {
    var i = value.apply(this, arguments);
    if (i !== i0) t = (i0 = i) && styleInterpolate(name, i, priority);
    return t;
  }
  tween._value = value;
  return tween;
}

function transition_styleTween(name, value, priority) {
  var key = "style." + (name += "");
  if (arguments.length < 2) return (key = this.tween(key)) && key._value;
  if (value == null) return this.tween(key, null);
  if (typeof value !== "function") throw new Error;
  return this.tween(key, styleTween(name, value, priority == null ? "" : priority));
}

function textConstant(value) {
  return function() {
    this.textContent = value;
  };
}

function textFunction(value) {
  return function() {
    var value1 = value(this);
    this.textContent = value1 == null ? "" : value1;
  };
}

function transition_text(value) {
  return this.tween("text", typeof value === "function"
      ? textFunction(tweenValue(this, "text", value))
      : textConstant(value == null ? "" : value + ""));
}

function textInterpolate(i) {
  return function(t) {
    this.textContent = i.call(this, t);
  };
}

function textTween(value) {
  var t0, i0;
  function tween() {
    var i = value.apply(this, arguments);
    if (i !== i0) t0 = (i0 = i) && textInterpolate(i);
    return t0;
  }
  tween._value = value;
  return tween;
}

function transition_textTween(value) {
  var key = "text";
  if (arguments.length < 1) return (key = this.tween(key)) && key._value;
  if (value == null) return this.tween(key, null);
  if (typeof value !== "function") throw new Error;
  return this.tween(key, textTween(value));
}

function transition_transition() {
  var name = this._name,
      id0 = this._id,
      id1 = newId();

  for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        var inherit = get(node, id0);
        schedule(node, name, id1, i, group, {
          time: inherit.time + inherit.delay + inherit.duration,
          delay: 0,
          duration: inherit.duration,
          ease: inherit.ease
        });
      }
    }
  }

  return new Transition(groups, this._parents, name, id1);
}

function transition_end() {
  var on0, on1, that = this, id = that._id, size = that.size();
  return new Promise(function(resolve, reject) {
    var cancel = {value: reject},
        end = {value: function() { if (--size === 0) resolve(); }};

    that.each(function() {
      var schedule = set(this, id),
          on = schedule.on;

      // If this node shared a dispatch with the previous node,
      // just assign the updated shared dispatch and we’re done!
      // Otherwise, copy-on-write.
      if (on !== on0) {
        on1 = (on0 = on).copy();
        on1._.cancel.push(cancel);
        on1._.interrupt.push(cancel);
        on1._.end.push(end);
      }

      schedule.on = on1;
    });

    // The selection was empty, resolve end immediately
    if (size === 0) resolve();
  });
}

var id = 0;

function Transition(groups, parents, name, id) {
  this._groups = groups;
  this._parents = parents;
  this._name = name;
  this._id = id;
}

function newId() {
  return ++id;
}

var selection_prototype = selection.prototype;

Transition.prototype = {
  constructor: Transition,
  select: transition_select,
  selectAll: transition_selectAll,
  selectChild: selection_prototype.selectChild,
  selectChildren: selection_prototype.selectChildren,
  filter: transition_filter,
  merge: transition_merge,
  selection: transition_selection,
  transition: transition_transition,
  call: selection_prototype.call,
  nodes: selection_prototype.nodes,
  node: selection_prototype.node,
  size: selection_prototype.size,
  empty: selection_prototype.empty,
  each: selection_prototype.each,
  on: transition_on,
  attr: transition_attr,
  attrTween: transition_attrTween,
  style: transition_style,
  styleTween: transition_styleTween,
  text: transition_text,
  textTween: transition_textTween,
  remove: transition_remove,
  tween: transition_tween,
  delay: transition_delay,
  duration: transition_duration,
  ease: transition_ease,
  easeVarying: transition_easeVarying,
  end: transition_end,
  [Symbol.iterator]: selection_prototype[Symbol.iterator]
};

function cubicInOut(t) {
  return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
}

var defaultTiming = {
  time: null, // Set on use.
  delay: 0,
  duration: 250,
  ease: cubicInOut
};

function inherit(node, id) {
  var timing;
  while (!(timing = node.__transition) || !(timing = timing[id])) {
    if (!(node = node.parentNode)) {
      throw new Error(`transition ${id} not found`);
    }
  }
  return timing;
}

function selection_transition(name) {
  var id,
      timing;

  if (name instanceof Transition) {
    id = name._id, name = name._name;
  } else {
    id = newId(), (timing = defaultTiming).time = now(), name = name == null ? null : name + "";
  }

  for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        schedule(node, name, id, i, group, timing || inherit(node, id));
      }
    }
  }

  return new Transition(groups, this._parents, name, id);
}

selection.prototype.interrupt = selection_interrupt;
selection.prototype.transition = selection_transition;

const kArial = 'Arial', kTimes = 'Times New Roman', kCourier = 'Courier New', kVerdana = 'Verdana', kSymbol = 'Symbol', kWingdings = 'Wingdings',
// average width taken from symbols.html, counted only for letters and digits
root_fonts = [null,  // index 0 not exists
      { n: kTimes, s: 'italic', aw: 0.5314 },
      { n: kTimes, w: 'bold', aw: 0.5809 },
      { n: kTimes, s: 'italic', w: 'bold', aw: 0.5540 },
      { n: kArial, aw: 0.5778 },
      { n: kArial, s: 'oblique', aw: 0.5783 },
      { n: kArial, w: 'bold', aw: 0.6034 },
      { n: kArial, s: 'oblique', w: 'bold', aw: 0.6030 },
      { n: kCourier, aw: 0.6003 },
      { n: kCourier, s: 'oblique', aw: 0.6004 },
      { n: kCourier, w: 'bold', aw: 0.6003 },
      { n: kCourier, s: 'oblique', w: 'bold', aw: 0.6005 },
      { n: kSymbol, aw: 0.5521 },
      { n: kTimes, aw: 0.5521 },
      { n: kWingdings, aw: 0.5664 },
      { n: kSymbol, s: 'italic', aw: 0.5314 },
      { n: kVerdana, aw: 0.5664 },
      { n: kVerdana, s: 'italic', aw: 0.5495 },
      { n: kVerdana, w: 'bold', aw: 0.5748 },
      { n: kVerdana, s: 'italic', w: 'bold', aw: 0.5578 }];

/**
 * @summary Helper class for font handling
 * @private
 */

class FontHandler {

   /** @summary constructor */
   constructor(fontIndex, size, scale) {
      if (scale && (size < 1)) {
         size *= scale;
         this.scaled = true;
      }

      this.size = Math.round(size || 11);
      this.scale = scale;

      this.func = this.setFont.bind(this);

      const indx = (fontIndex && Number.isInteger(fontIndex)) ? Math.floor(fontIndex / 10) : 0,
            cfg = root_fonts[indx];

      if (cfg)
         this.setNameStyleWeight(cfg.n, cfg.s, cfg.w, cfg.aw, cfg.format, cfg.base64);
      else
         this.setNameStyleWeight(kArial);
   }

   /** @summary Directly set name, style and weight for the font
    * @private */
   setNameStyleWeight(name, style, weight, aver_width, format, base64) {
      this.name = name;
      this.style = style || null;
      this.weight = weight || null;
      this.aver_width = aver_width || (weight ? 0.58 : 0.55);
      this.format = format; // format of custom font, ttf by default
      this.base64 = base64; // indication of custom font
      if ((this.name === kSymbol) || (this.name === kWingdings)) {
         this.isSymbol = this.name;
         this.name = kTimes;
      } else
         this.isSymbol = '';
   }

   /** @summary Set painter for which font will be applied */
   setPainter(painter) {
      this.painter = painter;
   }

   /** @summary Force setting of style and weight, used in latex */
   setUseFullStyle(flag) {
      this.full_style = flag;
   }

   /** @summary Assigns font-related attributes */
   addCustomFontToSvg(svg) {
      if (!this.base64 || !this.name)
         return;
      const clname = 'custom_font_' + this.name, fmt = 'ttf';
      let defs = svg.selectChild('.canvas_defs');
      if (defs.empty())
         defs = svg.insert('svg:defs', ':first-child').attr('class', 'canvas_defs');
      const entry = defs.selectChild('.' + clname);
      if (entry.empty()) {
         console.log('Adding style entry for class', clname);
         defs.append('style')
               .attr('class', clname)
               .property('$fonthandler', this)
               .text(`@font-face { font-family: "${this.name}"; font-weight: normal; font-style: normal; src: url(data:application/font-${fmt};charset=utf-8;base64,${this.base64}); }`);
      }
   }

   /** @summary Assigns font-related attributes */
   setFont(selection) {
      if (this.base64 && this.painter)
         this.addCustomFontToSvg(this.painter.getCanvSvg());

      selection.attr('font-family', this.name)
               .attr('font-size', this.size)
               .attr('xml:space', 'preserve')
               .attr('font-weight', this.weight || (this.full_style ? 'normal' : null))
               .attr('font-style', this.style || (this.full_style ? 'normal' : null));
   }

   /** @summary Set font size (optional) */
   setSize(size) { this.size = Math.round(size); }

   /** @summary Set text color (optional) */
   setColor(color) { this.color = color; }

   /** @summary Set text align (optional) */
   setAlign(align) { this.align = align; }

   /** @summary Set text angle (optional) */
   setAngle(angle) { this.angle = angle; }

   /** @summary Allign angle to step raster, add optional offset */
   roundAngle(step, offset) {
      this.angle = parseInt(this.angle || 0);
      if (!Number.isInteger(this.angle)) this.angle = 0;
      this.angle = Math.round(this.angle/step) * step + (offset || 0);
      if (this.angle < 0)
         this.angle += 360;
      else if (this.angle >= 360)
         this.angle -= 360;
   }

   /** @summary Clears all font-related attributes */
   clearFont(selection) {
      selection.attr('font-family', null)
               .attr('font-size', null)
               .attr('xml:space', null)
               .attr('font-weight', null)
               .attr('font-style', null);
   }

   /** @summary Returns true in case of monospace font
     * @private */
   isMonospace() {
      const n = this.name.toLowerCase();
      return (n.indexOf('courier') === 0) || (n === 'monospace') || (n === 'monaco');
   }

   /** @summary Return full font declaration which can be set as font property like '12pt Arial bold'
     * @private */
   getFontHtml() {
      let res = Math.round(this.size) + 'pt ' + this.name;
      if (this.weight) res += ' ' + this.weight;
      if (this.style) res += ' ' + this.style;
      return res;
   }

   /** @summary Returns font name */
   getFontName() {
      return this.isSymbol || this.name || 'none';
   }

} // class FontHandler

const symbols_map = {
   // greek letters from symbols.ttf
   '#alpha': '\u03B1',
   '#beta': '\u03B2',
   '#chi': '\u03C7',
   '#delta': '\u03B4',
   '#varepsilon': '\u03B5',
   '#phi': '\u03C6',
   '#gamma': '\u03B3',
   '#eta': '\u03B7',
   '#iota': '\u03B9',
   '#varphi': '\u03C6',
   '#kappa': '\u03BA',
   '#lambda': '\u03BB',
   '#mu': '\u03BC',
   '#nu': '\u03BD',
   '#omicron': '\u03BF',
   '#pi': '\u03C0',
   '#theta': '\u03B8',
   '#rho': '\u03C1',
   '#sigma': '\u03C3',
   '#tau': '\u03C4',
   '#upsilon': '\u03C5',
   '#varomega': '\u03D6',
   '#omega': '\u03C9',
   '#xi': '\u03BE',
   '#psi': '\u03C8',
   '#zeta': '\u03B6',
   '#Alpha': '\u0391',
   '#Beta': '\u0392',
   '#Chi': '\u03A7',
   '#Delta': '\u0394',
   '#Epsilon': '\u0395',
   '#Phi': '\u03A6',
   '#Gamma': '\u0393',
   '#Eta': '\u0397',
   '#Iota': '\u0399',
   '#vartheta': '\u03D1',
   '#Kappa': '\u039A',
   '#Lambda': '\u039B',
   '#Mu': '\u039C',
   '#Nu': '\u039D',
   '#Omicron': '\u039F',
   '#Pi': '\u03A0',
   '#Theta': '\u0398',
   '#Rho': '\u03A1',
   '#Sigma': '\u03A3',
   '#Tau': '\u03A4',
   '#Upsilon': '\u03A5',
   '#varsigma': '\u03C2',
   '#Omega': '\u03A9',
   '#Xi': '\u039E',
   '#Psi': '\u03A8',
   '#Zeta': '\u0396',
   '#varUpsilon': '\u03D2',
   '#epsilon': '\u03B5',

    // second set from symbols.ttf
   '#leq': '\u2264',
   '#/': '\u2044',
   '#infty': '\u221E',
   '#voidb': '\u0192',
   '#club': '\u2663',
   '#diamond': '\u2666',
   '#heart': '\u2665',
   '#spade': '\u2660',
   '#leftrightarrow': '\u2194',
   '#leftarrow': '\u2190',
   '#uparrow': '\u2191',
   '#rightarrow': '\u2192',
   '#downarrow': '\u2193',
   '#circ': '\u2E30',
   '#pm': '\xB1',
   '#doublequote': '\u2033',
   '#geq': '\u2265',
   '#times': '\xD7',
   '#propto': '\u221D',
   '#partial': '\u2202',
   '#bullet': '\u2022',
   '#divide': '\xF7',
   '#neq': '\u2260',
   '#equiv': '\u2261',
   '#approx': '\u2248', // should be \u2245 ?
   '#3dots': '\u2026',
   '#cbar': '\x7C',
   '#topbar': '\xAF',
   '#downleftarrow': '\u21B5',
   '#aleph': '\u2135',
   '#Jgothic': '\u2111',
   '#Rgothic': '\u211C',
   '#voidn': '\u2118',
   '#otimes': '\u2297',
   '#oplus': '\u2295',
   '#oslash': '\u2205',
   '#cap': '\u2229',
   '#cup': '\u222A',
   '#supset': '\u2283',
   '#supseteq': '\u2287',
   '#notsubset': '\u2284',
   '#subset': '\u2282',
   '#subseteq': '\u2286',
   '#in': '\u2208',
   '#notin': '\u2209',
   '#angle': '\u2220',
   '#nabla': '\u2207',
   '#oright': '\xAE',
   '#ocopyright': '\xA9',
   '#trademark': '\u2122',
   '#prod': '\u220F',
   '#surd': '\u221A',
   '#upoint': '\u2027',
   '#corner': '\xAC',
   '#wedge': '\u2227',
   '#vee': '\u2228',
   '#Leftrightarrow': '\u21D4',
   '#Leftarrow': '\u21D0',
   '#Uparrow': '\u21D1',
   '#Rightarrow': '\u21D2',
   '#Downarrow': '\u21D3',
   '#void2': '', // dummy, placeholder
   '#LT': '\x3C',
   '#void1': '\xAE',
   '#copyright': '\xA9',
   '#void3': '\u2122',  // it is dummy placeholder, TM
   '#sum': '\u2211',
   '#arctop': '\u239B',
   '#lbar': '\u23A2',
   '#arcbottom': '\u239D',
   '#void4': '', // dummy, placeholder
   '#void8': '\u23A2', // same as lbar
   '#bottombar': '\u230A',
   '#arcbar': '\u23A7',
   '#ltbar': '\u23A8',
   '#AA': '\u212B',
   '#aa': '\xE5',
   '#void06': '',
   '#GT': '\x3E',
   '#int': '\u222B',
   '#forall': '\u2200',
   '#exists': '\u2203',
   // here ends second set from symbols.ttf

   // more greek symbols
   '#koppa': '\u03DF',
   '#sampi': '\u03E1',
   '#stigma': '\u03DB',
   '#san': '\u03FB',
   '#sho': '\u03F8',
   '#varcoppa': '\u03D9',
   '#digamma': '\u03DD',
   '#Digamma': '\u03DC',
   '#Koppa': '\u03DE',
   '#varKoppa': '\u03D8',
   '#Sampi': '\u03E0',
   '#Stigma': '\u03DA',
   '#San': '\u03FA',
   '#Sho': '\u03F7',

   '#vec': '',
   '#dot': '\u22C5',
   '#hat': '\xB7',
   '#ddot': '',
   '#acute': '',
   '#grave': '',
   '#check': '\u2713',
   '#tilde': '\u02DC',
   '#slash': '\u2044',
   '#hbar': '\u0127',
   '#box': '\u25FD',
   '#Box': '\u2610',
   '#parallel': '\u2225',
   '#perp': '\u22A5',
   '#odot': '\u2299',
   '#left': '',
   '#right': '',
   '{}': '',

   '#mp': '\u2213',

   '#P': '\u00B6', // paragraph

    // only required for MathJax to provide correct replacement
   '#sqrt': '\u221A',
   '#bar': '',
   '#overline': '',
   '#underline': '',
   '#strike': ''
};



/** @summary Create a single regex to detect any symbol to replace, apply longer symbols first
  * @private */
new RegExp(Object.keys(symbols_map).sort((a, b) => (a.length < b.length ? 1 : (a.length > b.length ? -1 : 0))).join('|'), 'g');

/** @summary list of global root colors
  * @private */
let gbl_colors_list = [];

/** @summary Generates all root colors, used also in jstests to reset colors
  * @private */
function createRootColors() {
   const colorMap = ['white', 'black', 'red', 'green', 'blue', 'yellow', 'magenta', 'cyan', '#59d454', '#5954d9', 'white'];
   colorMap[110] = 'white';

   const moreCol = [
      { n: 11, s: 'c1b7ad4d4d4d6666668080809a9a9ab3b3b3cdcdcde6e6e6f3f3f3cdc8accdc8acc3c0a9bbb6a4b3a697b8a49cae9a8d9c8f83886657b1cfc885c3a48aa9a1839f8daebdc87b8f9a768a926983976e7b857d9ad280809caca6c0d4cf88dfbb88bd9f83c89a7dc08378cf5f61ac8f94a6787b946971d45a549300ff7b00ff6300ff4b00ff3300ff1b00ff0300ff0014ff002cff0044ff005cff0074ff008cff00a4ff00bcff00d4ff00ecff00fffd00ffe500ffcd00ffb500ff9d00ff8500ff6d00ff5500ff3d00ff2600ff0e0aff0022ff003aff0052ff006aff0082ff009aff00b1ff00c9ff00e1ff00f9ff00ffef00ffd700ffbf00ffa700ff8f00ff7700ff6000ff4800ff3000ff1800ff0000' },
      { n: 201, s: '5c5c5c7b7b7bb8b8b8d7d7d78a0f0fb81414ec4848f176760f8a0f14b81448ec4876f1760f0f8a1414b84848ec7676f18a8a0fb8b814ecec48f1f1768a0f8ab814b8ec48ecf176f10f8a8a14b8b848ecec76f1f1' },
      { n: 390, s: 'ffffcdffff9acdcd9affff66cdcd669a9a66ffff33cdcd339a9a33666633ffff00cdcd009a9a00666600333300' },
      { n: 406, s: 'cdffcd9aff9a9acd9a66ff6666cd66669a6633ff3333cd33339a3333663300ff0000cd00009a00006600003300' },
      { n: 422, s: 'cdffff9affff9acdcd66ffff66cdcd669a9a33ffff33cdcd339a9a33666600ffff00cdcd009a9a006666003333' },
      { n: 590, s: 'cdcdff9a9aff9a9acd6666ff6666cd66669a3333ff3333cd33339a3333660000ff0000cd00009a000066000033' },
      { n: 606, s: 'ffcdffff9affcd9acdff66ffcd66cd9a669aff33ffcd33cd9a339a663366ff00ffcd00cd9a009a660066330033' },
      { n: 622, s: 'ffcdcdff9a9acd9a9aff6666cd66669a6666ff3333cd33339a3333663333ff0000cd00009a0000660000330000' },
      { n: 791, s: 'ffcd9acd9a669a66339a6600cd9a33ffcd66ff9a00ffcd33cd9a00ffcd00ff9a33cd66006633009a3300cd6633ff9a66ff6600ff6633cd3300ff33009aff3366cd00336600339a0066cd339aff6666ff0066ff3333cd0033ff00cdff9a9acd66669a33669a009acd33cdff669aff00cdff339acd00cdff009affcd66cd9a339a66009a6633cd9a66ffcd00ff6633ffcd00cd9a00ffcd33ff9a00cd66006633009a3333cd6666ff9a00ff9a33ff6600cd3300ff339acdff669acd33669a00339a3366cd669aff0066ff3366ff0033cd0033ff339aff0066cd00336600669a339acd66cdff009aff33cdff009acd00cdffcd9aff9a66cd66339a66009a9a33cdcd66ff9a00ffcd33ff9a00cdcd00ff9a33ff6600cd33006633009a6633cd9a66ff6600ff6633ff3300cd3300ffff339acd00666600339a0033cd3366ff669aff0066ff3366cd0033ff0033ff9acdcd669a9a33669a0066cd339aff66cdff009acd009aff33cdff009a' },
      { n: 920, s: 'cdcdcd9a9a9a666666333333' }];

   moreCol.forEach(entry => {
      const s = entry.s;
      for (let n = 0; n < s.length; n += 6) {
         const num = entry.n + n / 6;
         colorMap[num] = '#' + s.slice(n, n+6);
      }
   });

   gbl_colors_list = colorMap;
}

/** @summary Get list of colors
  * @private */
function getRootColors() {
   return gbl_colors_list;
}

/** @summary Return ROOT color by index
  * @desc Color numbering corresponds typical ROOT colors
  * @return {String} with RGB color code or existing color name like 'cyan'
  * @private */
function getColor(indx) {
   return gbl_colors_list[indx];
}


createRootColors();

const root_markers = [
      0, 1, 2, 3, 4,           //  0..4
      5, 106, 107, 104, 1,     //  5..9
      1, 1, 1, 1, 1,           // 10..14
      1, 1, 1, 1, 1,           // 15..19
      104, 125, 126, 132, 4,   // 20..24
      25, 26, 27, 28, 130,     // 25..29
      30, 3, 32, 127, 128,     // 30..34
      35, 36, 37, 38, 137,     // 35..39
      40, 140, 42, 142, 44,    // 40..44
      144, 46, 146, 148, 149]; // 45..49


/**
  * @summary Handle for marker attributes
  * @private
  */

class TAttMarkerHandler {

   /** @summary constructor
     * @param {object} args - attributes, see {@link TAttMarkerHandler#setArgs} for details */
   constructor(args) {
      this.x0 = this.y0 = 0;
      this.color = 'black';
      this.style = 1;
      this.size = 8;
      this.scale = 1;
      this.stroke = true;
      this.fill = true;
      this.marker = '';
      this.ndig = 0;
      this.used = true;
      this.changed = false;
      this.func = this.apply.bind(this);
      this.setArgs(args);
      this.changed = false;
   }

   /** @summary Set marker attributes.
     * @param {object} args - arguments can be
     * @param {object} args.attr - instance of TAttrMarker (or derived class) or
     * @param {string} args.color - color in HTML form like grb(1,4,5) or 'green'
     * @param {number} args.style - marker style
     * @param {number} args.size - marker size
     * @param {number} [args.refsize] - when specified and marker size < 1, marker size will be calculated relative to that size */
   setArgs(args) {
      if (isObject(args) && (typeof args.fMarkerStyle === 'number')) args = { attr: args };

      if (args.attr) {
         if (args.color === undefined)
            args.color = args.painter ? args.painter.getColor(args.attr.fMarkerColor) : getColor(args.attr.fMarkerColor);
         if (!args.style || (args.style < 0)) args.style = args.attr.fMarkerStyle;
         if (!args.size) args.size = args.attr.fMarkerSize;
      }

      this.color = args.color;
      this.style = args.style;
      this.size = args.size;
      this.refsize = args.refsize;

      this._configure();
   }

   /** @summary Set usage flag of attribute */
   setUsed(flag) {
      this.used = flag;
   }

   /** @summary Reset position, used for optimization of drawing of multiple markers
    * @private */
   resetPos() { this.lastx = this.lasty = null; }

   /** @summary Create marker path for given position.
     * @desc When drawing many elementary points, created path may depend from previously produced markers.
     * @param {number} x - first coordinate
     * @param {number} y - second coordinate
     * @return {string} path string */
   create(x, y) {
      if (!this.optimized)
         return `M${(x + this.x0).toFixed(this.ndig)},${(y + this.y0).toFixed(this.ndig)}${this.marker}`;

      // use optimized handling with relative position
      const xx = Math.round(x), yy = Math.round(y);
      let mv = `M${xx},${yy}`;
      if (this.lastx !== null) {
         if ((xx === this.lastx) && (yy === this.lasty))
            mv = ''; // pathological case, but let exclude it
         else {
            const m2 = `m${xx-this.lastx},${yy - this.lasty}`;
            if (m2.length < mv.length) mv = m2;
         }
      }
      this.lastx = xx + 1; this.lasty = yy;
      return mv + 'h1';
   }

   /** @summary Returns full size of marker */
   getFullSize() { return this.scale * this.size; }

   /** @summary Returns approximate length of produced marker string */
   getMarkerLength() { return this.marker ? this.marker.length : 10; }

   /** @summary Change marker attributes.
    *  @param {string} color - marker color
    *  @param {number} style - marker style
    *  @param {number} size - marker size */
   change(color, style, size) {
      this.changed = true;

      if (color !== undefined) this.color = color;
      if ((style !== undefined) && (style >= 0)) this.style = style;
      if (size !== undefined) this.size = size;

      this._configure();
   }

   /** @summary Prepare object to create marker
     * @private */
   _configure() {
      this.x0 = this.y0 = 0;

      if ((this.style === 1) || (this.style === 777)) {
         this.fill = false;
         this.marker = 'h1';
         this.size = 1;
         this.optimized = true;
         this.resetPos();
         return true;
      }

      this.optimized = false;

      const marker_kind = root_markers[this.style] ?? 104,
            shape = marker_kind % 100;

      this.fill = (marker_kind >= 100);

      this.scale = this.refsize || 8; // v7 defines refsize as 1 or pad height

      const size = this.getFullSize();

      this.ndig = (size > 7) ? 0 : ((size > 2) ? 1 : 2);
      if (shape === 30) this.ndig++; // increase precision for star
      let s1 = size.toFixed(this.ndig);
      const s2 = (size/2).toFixed(this.ndig),
            s3 = (size/3).toFixed(this.ndig),
            s4 = (size/4).toFixed(this.ndig),
            s8 = (size/8).toFixed(this.ndig),
            s38 = (size*3/8).toFixed(this.ndig);

      switch (shape) {
         case 1: // dot
            this.marker = 'h1';
            break;
         case 2: // plus
            this.y0 = -size / 2;
            this.marker = `v${s1}m-${s2},-${s2}h${s1}`;
            break;
         case 3: // asterisk
            this.x0 = this.y0 = -size / 2;
            this.marker = `l${s1},${s1}m0,-${s1}l-${s1},${s1}m0,-${s2}h${s1}m-${s2},-${s2}v${s1}`;
            break;
         case 4: // circle
            this.x0 = -parseFloat(s2);
            s1 = (parseFloat(s2) * 2).toFixed(this.ndig);
            this.marker = `a${s2},${s2},0,1,0,${s1},0a${s2},${s2},0,1,0,-${s1},0z`;
            break;
         case 5: // mult
            this.x0 = this.y0 = -size / 2;
            this.marker = `l${s1},${s1}m0,-${s1}l-${s1},${s1}`;
            break;
         case 6: // small dot
            this.x0 = -1;
            this.marker = 'a1,1,0,1,0,2,0a1,1,0,1,0,-2,0z';
            break;
         case 7: // medium dot
            this.x0 = -1.5;
            this.marker = 'a1.5,1.5,0,1,0,3,0a1.5,1.5,0,1,0,-3,0z';
            break;
         case 25: // square
            this.x0 = this.y0 = -size / 2;
            this.marker = `v${s1}h${s1}v-${s1}z`;
            break;
         case 26: // triangle-up
            this.y0 = -size / 2;
            this.marker = `l-${s2},${s1}h${s1}z`;
            break;
         case 27: // diamand
            this.y0 = -size / 2;
            this.marker = `l${s3},${s2}l-${s3},${s2}l-${s3},-${s2}z`;
            break;
         case 28: // cross
            this.x0 = this.y0 = size / 6;
            this.marker = `h${s3}v-${s3}h-${s3}v-${s3}h-${s3}v${s3}h-${s3}v${s3}h${s3}v${s3}h${s3}z`;
            break;
         case 30: { // star
            this.y0 = -size / 2;
            const s56 = (size*5/6).toFixed(this.ndig), s58 = (size*5/8).toFixed(this.ndig);
            this.marker = `l${s3},${s1}l-${s56},-${s58}h${s1}l-${s56},${s58}z`;
            break;
         }
         case 32: // triangle-down
            this.y0 = size / 2;
            this.marker = `l-${s2},-${s1}h${s1}z`;
            break;
         case 35:
            this.x0 = -size / 2;
            this.marker = `l${s2},${s2}l${s2},-${s2}l-${s2},-${s2}zh${s1}m-${s2},-${s2}v${s1}`;
            break;
         case 36:
            this.x0 = this.y0 = -size / 2;
            this.marker = `h${s1}v${s1}h-${s1}zl${s1},${s1}m0,-${s1}l-${s1},${s1}`;
            break;
         case 37:
            this.x0 = -size/2;
            this.marker = `h${s1}l-${s4},-${s2}l-${s2},${s1}h${s2}l-${s2},-${s1}z`;
            break;
         case 38:
            this.x0 = -size/4; this.y0 = -size/2;
            this.marker = `h${s2}l${s4},${s4}v${s2}l-${s4},${s4}h-${s2}l-${s4},-${s4}v-${s2}zm${s4},0v${s1}m-${s2},-${s2}h${s1}`;
            break;
         case 40:
            this.x0 = -size/4; this.y0 = -size/2;
            this.marker = `l${s2},${s1}l${s4},-${s4}l-${s1},-${s2}zm${s2},0l-${s2},${s1}l-${s4},-${s4}l${s1},-${s2}z`;
            break;
         case 42:
            this.y0 = -size/2;
            this.marker = `l${s8},${s38}l${s38},${s8}l-${s38},${s8}l-${s8},${s38}l-${s8},-${s38}l-${s38},-${s8}l${s38},-${s8}z`;
            break;
         case 44:
            this.x0 = -size/4; this.y0 = -size/2;
            this.marker = `h${s2}l-${s8},${s38}l${s38},-${s8}v${s2}l-${s38},-${s8}l${s8},${s38}h-${s2}l${s8},-${s38}l-${s38},${s8}v-${s2}l${s38},${s8}z`;
            break;
         case 46:
            this.x0 = -size/4; this.y0 = -size/2;
            this.marker = `l${s4},${s4}l${s4},-${s4}l${s4},${s4}l-${s4},${s4}l${s4},${s4}l-${s4},${s4}l-${s4},-${s4}l-${s4},${s4}l-${s4},-${s4}l${s4},-${s4}l-${s4},-${s4}z`;
            break;
         case 48:
            this.x0 = -size/4; this.y0 = -size/2;
            this.marker = `l${s4},${s4}l-${s4},${s4}l-${s4},-${s4}zm${s2},0l${s4},${s4}l-${s4},${s4}l-${s4},-${s4}zm0,${s2}l${s4},${s4}l-${s4},${s4}l-${s4},-${s4}zm-${s2},0l${s4},${s4}l-${s4},${s4}l-${s4},-${s4}z`;
            break;
         case 49:
            this.x0 = -size/6; this.y0 = -size/2;
            this.marker = `h${s3}v${s3}h-${s3}zm${s3},${s3}h${s3}v${s3}h-${s3}zm-${s3},${s3}h${s3}v${s3}h-${s3}zm-${s3},-${s3}h${s3}v${s3}h-${s3}z`;
            break;
         default: // diamand
            this.y0 = -size / 2;
            this.marker = `l${s3},${s2}l-${s3},${s2}l-${s3},-${s2}z`;
            break;
      }

      return true;
   }

   /** @summary get stroke color */
   getStrokeColor() { return this.stroke ? this.color : 'none'; }

   /** @summary get fill color */
   getFillColor() { return this.fill ? this.color : 'none'; }

   /** @summary returns true if marker attributes will produce empty (invisible) output */
   empty() { return (this.color === 'none') || (!this.fill && !this.stroke); }

   /** @summary Apply marker styles to created element */
   apply(selection) {
      this.used = true;
      selection.style('stroke', this.stroke ? this.color : 'none')
               .style('fill', this.fill ? this.color : 'none');
   }

   /** @summary Method used when color or pattern were changed with OpenUi5 widgets.
     * @private */
   verifyDirectChange(/* painter */) {
      this.change(this.color, parseInt(this.style), parseFloat(this.size));
   }

   /** @summary Create sample with marker in given SVG element
     * @param {selection} svg - SVG element
     * @param {number} width - width of sample SVG
     * @param {number} height - height of sample SVG
     * @private */
   createSample(svg, width, height, plain) {
      if (plain) svg = select(svg);
      this.resetPos();
      svg.append('path')
         .attr('d', this.create(width / 2, height / 2))
         .call(this.func);
   }

} // class TAttMarkerHandler

const root_line_styles = [
      '', '', '3,3', '1,2',
      '3,4,1,4', '5,3,1,3', '5,3,1,3,1,3,1,3', '5,5',
      '5,3,1,3,1,3', '20,5', '20,10,1,10', '1,3'];

/** @summary Get svg string for specified line style
  * @private */
function getSvgLineStyle(indx) {
   if ((indx < 0) || (indx >= root_line_styles.length)) indx = 11;
   return root_line_styles[indx];
}

/** @summary Select predefined style
  * @private */
function selectgStyle(name) {
   gStyle.fName = name;
   switch (name) {
      case 'Modern': Object.assign(gStyle, { fFrameBorderMode: 0, fFrameFillColor: 0,
         fCanvasBorderMode: 0, fCanvasColor: 0, fPadBorderMode: 0, fPadColor: 0, fStatColor: 0,
         fTitleAlign: 23, fTitleX: 0.5, fTitleBorderSize: 0, fTitleColor: 0, fTitleStyle: 0,
         fOptStat: 1111, fStatY: 0.935,
         fLegendBorderSize: 1, fLegendFont: 42, fLegendTextSize: 0, fLegendFillColor: 0 });
         break;
      case 'Plain': Object.assign(gStyle, { fFrameBorderMode: 0,
         fCanvasBorderMode: 0, fPadBorderMode: 0, fPadColor: 0, fCanvasColor: 0,
         fTitleColor: 0, fTitleBorderSize: 0, fStatColor: 0, fStatBorderSize: 1, fLegendBorderSize: 1 });
         break;
      case 'Bold': Object.assign(gStyle, { fCanvasColor: 10, fCanvasBorderMode: 0,
         fFrameLineWidth: 3, fFrameFillColor: 10,
         fPadColor: 10, fPadTickX: 1, fPadTickY: 1, fPadBottomMargin: 0.15, fPadLeftMargin: 0.15,
         fTitleColor: 10, fTitleTextColor: 600, fStatColor: 10 });
         break;
   }
}

let _storage_prefix = 'jsroot_';

/** @summary Save object in local storage
  * @private */
function saveLocalStorage(obj, expires, name) {
   if (typeof localStorage === 'undefined')
      return;
   if (Number.isFinite(expires) && (expires < 0))
      localStorage.removeItem(_storage_prefix + name);
   else
      localStorage.setItem(_storage_prefix + name, btoa_func(JSON.stringify(obj)));
}

/** @summary Read object from storage with specified name
  * @private */
function readLocalStorage(name) {
   if (typeof localStorage === 'undefined')
      return null;
   const v = localStorage.getItem(_storage_prefix + name),
         s = v ? JSON.parse(atob_func(v)) : null;
   return isObject(s) ? s : null;
}

/** @summary Save JSROOT settings in local storage
  * @param {Number} [expires] - delete settings when negative
  * @param {String} [name] - storage name, 'settings' by default
  * @private */
function saveSettings(expires = 365, name = 'settings') {
   saveLocalStorage(settings, expires, name);
}

/** @summary Read JSROOT settings from specified cookie parameter
  * @param {Boolean} only_check - when true just checks if settings were stored before with provided name
  * @param {String} [name] - storage name, 'settings' by default
  * @private */
function readSettings(only_check = false, name = 'settings') {
   const s = readLocalStorage(name);
   if (!s) return false;
   if (!only_check)
      Object.assign(settings, s);
   return true;
}

/** @summary Save JSROOT gStyle object in local storage
  * @param {Number} [expires] - delete style when negative
  * @param {String} [name] - storage name, 'style' by default
  * @private */
function saveStyle(expires = 365, name = 'style') {
   saveLocalStorage(gStyle, expires, name);
}

/** @summary Returns color id for the color
  * @private */
function getColorId(col) {
   const arr = getRootColors();
   let id = -1;
   if (isStr(col)) {
      if (!col || (col === 'none'))
         id = 0;
       else {
         for (let k = 1; k < arr.length; ++k)
            if (arr[k] === col) { id = k; break; }
      }
      if ((id < 0) && (col.indexOf('rgb') === 0))
         id = 9999;
   } else if (Number.isInteger(col) && arr[col]) {
      id = col;
      col = arr[id];
   }

   return { id, col };
}

/** @summary Produce exec string for WebCanas to set color value
  * @desc Color can be id or string, but should belong to list of known colors
  * For higher color numbers TColor::GetColor(r,g,b) will be invoked to ensure color is exists
  * @private */
function getColorExec(col, method) {
   const d = getColorId(col);

   if (d.id < 0)
      return '';

   // for higher color numbers ensure that such color exists
   if (d.id >= 50) {
      const c = color(d.col);
      d.id = `TColor::GetColor(${c.r},${c.g},${c.b})`;
    }

   return `exec:${method}(${d.id})`;
}

/** @summary Change object member in the painter
  * @desc Used when interactively change in the menu
  * Special handling for color is provided
  * @private */
function changeObjectMember(painter, member, val, is_color) {
   if (is_color) {
      const d = getColorId(val);
      if ((d.id < 0) || (d.id === 9999))
         return;
      val = d.id;
   }

   const obj = painter?.getObject();
   if (obj && (obj[member] !== undefined))
      obj[member] = val;
}

/** @ummary Create three.js Font with Helvetica
  * @private */
function createHelveticaFont() {
// eslint-disable-next-line
const glyphs={"0":{x_min:73,x_max:715,ha:792,o:"m 394 -29 q 153 129 242 -29 q 73 479 73 272 q 152 829 73 687 q 394 989 241 989 q 634 829 545 989 q 715 479 715 684 q 635 129 715 270 q 394 -29 546 -29 m 394 89 q 546 211 489 89 q 598 479 598 322 q 548 748 598 640 q 394 871 491 871 q 241 748 298 871 q 190 479 190 637 q 239 211 190 319 q 394 89 296 89 "},"1":{x_min:215.671875,x_max:574,ha:792,o:"m 574 0 l 442 0 l 442 697 l 215 697 l 215 796 q 386 833 330 796 q 475 986 447 875 l 574 986 l 574 0 "},"2":{x_min:59,x_max:731,ha:792,o:"m 731 0 l 59 0 q 197 314 59 188 q 457 487 199 315 q 598 691 598 580 q 543 819 598 772 q 411 867 488 867 q 272 811 328 867 q 209 630 209 747 l 81 630 q 182 901 81 805 q 408 986 271 986 q 629 909 536 986 q 731 694 731 826 q 613 449 731 541 q 378 316 495 383 q 201 122 235 234 l 731 122 l 731 0 "},"3":{x_min:54,x_max:737,ha:792,o:"m 737 284 q 635 55 737 141 q 399 -25 541 -25 q 156 52 248 -25 q 54 308 54 140 l 185 308 q 245 147 185 202 q 395 96 302 96 q 539 140 484 96 q 602 280 602 190 q 510 429 602 390 q 324 454 451 454 l 324 565 q 487 584 441 565 q 565 719 565 617 q 515 835 565 791 q 395 879 466 879 q 255 824 307 879 q 203 661 203 769 l 78 661 q 166 909 78 822 q 387 992 250 992 q 603 921 513 992 q 701 723 701 844 q 669 607 701 656 q 578 524 637 558 q 696 434 655 499 q 737 284 737 369 "},"4":{x_min:48,x_max:742.453125,ha:792,o:"m 742 243 l 602 243 l 602 0 l 476 0 l 476 243 l 48 243 l 48 368 l 476 958 l 602 958 l 602 354 l 742 354 l 742 243 m 476 354 l 476 792 l 162 354 l 476 354 "},"5":{x_min:54.171875,x_max:738,ha:792,o:"m 738 314 q 626 60 738 153 q 382 -23 526 -23 q 155 47 248 -23 q 54 256 54 125 l 183 256 q 259 132 204 174 q 382 91 314 91 q 533 149 471 91 q 602 314 602 213 q 538 469 602 411 q 386 528 475 528 q 284 506 332 528 q 197 439 237 484 l 81 439 l 159 958 l 684 958 l 684 840 l 254 840 l 214 579 q 306 627 258 612 q 407 643 354 643 q 636 552 540 643 q 738 314 738 457 "},"6":{x_min:53,x_max:739,ha:792,o:"m 739 312 q 633 62 739 162 q 400 -31 534 -31 q 162 78 257 -31 q 53 439 53 206 q 178 859 53 712 q 441 986 284 986 q 643 912 559 986 q 732 713 732 833 l 601 713 q 544 830 594 786 q 426 875 494 875 q 268 793 331 875 q 193 517 193 697 q 301 597 240 570 q 427 624 362 624 q 643 540 552 624 q 739 312 739 451 m 603 298 q 540 461 603 400 q 404 516 484 516 q 268 461 323 516 q 207 300 207 401 q 269 137 207 198 q 405 83 325 83 q 541 137 486 83 q 603 298 603 197 "},"7":{x_min:58.71875,x_max:730.953125,ha:792,o:"m 730 839 q 469 448 560 641 q 335 0 378 255 l 192 0 q 328 441 235 252 q 593 830 421 630 l 58 830 l 58 958 l 730 958 l 730 839 "},"8":{x_min:55,x_max:736,ha:792,o:"m 571 527 q 694 424 652 491 q 736 280 736 358 q 648 71 736 158 q 395 -26 551 -26 q 142 69 238 -26 q 55 279 55 157 q 96 425 55 359 q 220 527 138 491 q 120 615 153 562 q 88 726 88 668 q 171 904 88 827 q 395 986 261 986 q 618 905 529 986 q 702 727 702 830 q 670 616 702 667 q 571 527 638 565 m 394 565 q 519 610 475 565 q 563 717 563 655 q 521 823 563 781 q 392 872 474 872 q 265 824 312 872 q 224 720 224 783 q 265 613 224 656 q 394 565 312 565 m 395 91 q 545 150 488 91 q 597 280 597 204 q 546 408 597 355 q 395 465 492 465 q 244 408 299 465 q 194 280 194 356 q 244 150 194 203 q 395 91 299 91 "},"9":{x_min:53,x_max:739,ha:792,o:"m 739 524 q 619 94 739 241 q 362 -32 516 -32 q 150 47 242 -32 q 59 244 59 126 l 191 244 q 246 129 191 176 q 373 82 301 82 q 526 161 466 82 q 597 440 597 255 q 363 334 501 334 q 130 432 216 334 q 53 650 53 521 q 134 880 53 786 q 383 986 226 986 q 659 841 566 986 q 739 524 739 719 m 388 449 q 535 514 480 449 q 585 658 585 573 q 535 805 585 744 q 388 873 480 873 q 242 809 294 873 q 191 658 191 745 q 239 514 191 572 q 388 449 292 449 "},"ο":{x_min:0,x_max:712,ha:815,o:"m 356 -25 q 96 88 192 -25 q 0 368 0 201 q 92 642 0 533 q 356 761 192 761 q 617 644 517 761 q 712 368 712 533 q 619 91 712 201 q 356 -25 520 -25 m 356 85 q 527 175 465 85 q 583 369 583 255 q 528 562 583 484 q 356 651 466 651 q 189 560 250 651 q 135 369 135 481 q 187 177 135 257 q 356 85 250 85 "},S:{x_min:0,x_max:788,ha:890,o:"m 788 291 q 662 54 788 144 q 397 -26 550 -26 q 116 68 226 -26 q 0 337 0 168 l 131 337 q 200 152 131 220 q 384 85 269 85 q 557 129 479 85 q 650 270 650 183 q 490 429 650 379 q 194 513 341 470 q 33 739 33 584 q 142 964 33 881 q 388 1041 242 1041 q 644 957 543 1041 q 756 716 756 867 l 625 716 q 561 874 625 816 q 395 933 497 933 q 243 891 309 933 q 164 759 164 841 q 325 609 164 656 q 625 526 475 568 q 788 291 788 454 "},"¦":{x_min:343,x_max:449,ha:792,o:"m 449 462 l 343 462 l 343 986 l 449 986 l 449 462 m 449 -242 l 343 -242 l 343 280 l 449 280 l 449 -242 "},"/":{x_min:183.25,x_max:608.328125,ha:792,o:"m 608 1041 l 266 -129 l 183 -129 l 520 1041 l 608 1041 "},"Τ":{x_min:-0.4375,x_max:777.453125,ha:839,o:"m 777 893 l 458 893 l 458 0 l 319 0 l 319 892 l 0 892 l 0 1013 l 777 1013 l 777 893 "},y:{x_min:0,x_max:684.78125,ha:771,o:"m 684 738 l 388 -83 q 311 -216 356 -167 q 173 -279 252 -279 q 97 -266 133 -279 l 97 -149 q 132 -155 109 -151 q 168 -160 155 -160 q 240 -114 213 -160 q 274 -26 248 -98 l 0 738 l 137 737 l 341 139 l 548 737 l 684 738 "},"Π":{x_min:0,x_max:803,ha:917,o:"m 803 0 l 667 0 l 667 886 l 140 886 l 140 0 l 0 0 l 0 1012 l 803 1012 l 803 0 "},"ΐ":{x_min:-111,x_max:339,ha:361,o:"m 339 800 l 229 800 l 229 925 l 339 925 l 339 800 m -1 800 l -111 800 l -111 925 l -1 925 l -1 800 m 284 3 q 233 -10 258 -5 q 182 -15 207 -15 q 85 26 119 -15 q 42 200 42 79 l 42 737 l 167 737 l 168 215 q 172 141 168 157 q 226 101 183 101 q 248 103 239 101 q 284 112 257 104 l 284 3 m 302 1040 l 113 819 l 30 819 l 165 1040 l 302 1040 "},g:{x_min:0,x_max:686,ha:838,o:"m 686 34 q 586 -213 686 -121 q 331 -306 487 -306 q 131 -252 216 -306 q 31 -84 31 -190 l 155 -84 q 228 -174 166 -138 q 345 -207 284 -207 q 514 -109 454 -207 q 564 89 564 -27 q 461 6 521 36 q 335 -23 401 -23 q 88 100 184 -23 q 0 370 0 215 q 87 634 0 522 q 330 758 183 758 q 457 728 398 758 q 564 644 515 699 l 564 737 l 686 737 l 686 34 m 582 367 q 529 560 582 481 q 358 652 468 652 q 189 561 250 652 q 135 369 135 482 q 189 176 135 255 q 361 85 251 85 q 529 176 468 85 q 582 367 582 255 "},"²":{x_min:0,x_max:442,ha:539,o:"m 442 383 l 0 383 q 91 566 0 492 q 260 668 176 617 q 354 798 354 727 q 315 875 354 845 q 227 905 277 905 q 136 869 173 905 q 99 761 99 833 l 14 761 q 82 922 14 864 q 232 974 141 974 q 379 926 316 974 q 442 797 442 878 q 351 635 442 704 q 183 539 321 611 q 92 455 92 491 l 442 455 l 442 383 "},"–":{x_min:0,x_max:705.5625,ha:803,o:"m 705 334 l 0 334 l 0 410 l 705 410 l 705 334 "},"Κ":{x_min:0,x_max:819.5625,ha:893,o:"m 819 0 l 650 0 l 294 509 l 139 356 l 139 0 l 0 0 l 0 1013 l 139 1013 l 139 526 l 626 1013 l 809 1013 l 395 600 l 819 0 "},"ƒ":{x_min:-46.265625,x_max:392,ha:513,o:"m 392 651 l 259 651 l 79 -279 l -46 -278 l 134 651 l 14 651 l 14 751 l 135 751 q 151 948 135 900 q 304 1041 185 1041 q 334 1040 319 1041 q 392 1034 348 1039 l 392 922 q 337 931 360 931 q 271 883 287 931 q 260 793 260 853 l 260 751 l 392 751 l 392 651 "},e:{x_min:0,x_max:714,ha:813,o:"m 714 326 l 140 326 q 200 157 140 227 q 359 87 260 87 q 488 130 431 87 q 561 245 545 174 l 697 245 q 577 48 670 123 q 358 -26 484 -26 q 97 85 195 -26 q 0 363 0 197 q 94 642 0 529 q 358 765 195 765 q 626 627 529 765 q 714 326 714 503 m 576 429 q 507 583 564 522 q 355 650 445 650 q 206 583 266 650 q 140 429 152 522 l 576 429 "},"ό":{x_min:0,x_max:712,ha:815,o:"m 356 -25 q 94 91 194 -25 q 0 368 0 202 q 92 642 0 533 q 356 761 192 761 q 617 644 517 761 q 712 368 712 533 q 619 91 712 201 q 356 -25 520 -25 m 356 85 q 527 175 465 85 q 583 369 583 255 q 528 562 583 484 q 356 651 466 651 q 189 560 250 651 q 135 369 135 481 q 187 177 135 257 q 356 85 250 85 m 576 1040 l 387 819 l 303 819 l 438 1040 l 576 1040 "},J:{x_min:0,x_max:588,ha:699,o:"m 588 279 q 287 -26 588 -26 q 58 73 126 -26 q 0 327 0 158 l 133 327 q 160 172 133 227 q 288 96 198 96 q 426 171 391 96 q 449 336 449 219 l 449 1013 l 588 1013 l 588 279 "},"»":{x_min:-1,x_max:503,ha:601,o:"m 503 302 l 280 136 l 281 256 l 429 373 l 281 486 l 280 608 l 503 440 l 503 302 m 221 302 l 0 136 l 0 255 l 145 372 l 0 486 l -1 608 l 221 440 l 221 302 "},"©":{x_min:-3,x_max:1008,ha:1106,o:"m 502 -7 q 123 151 263 -7 q -3 501 -3 294 q 123 851 -3 706 q 502 1011 263 1011 q 881 851 739 1011 q 1008 501 1008 708 q 883 151 1008 292 q 502 -7 744 -7 m 502 60 q 830 197 709 60 q 940 501 940 322 q 831 805 940 681 q 502 944 709 944 q 174 805 296 944 q 65 501 65 680 q 173 197 65 320 q 502 60 294 60 m 741 394 q 661 246 731 302 q 496 190 591 190 q 294 285 369 190 q 228 497 228 370 q 295 714 228 625 q 499 813 370 813 q 656 762 588 813 q 733 625 724 711 l 634 625 q 589 704 629 673 q 498 735 550 735 q 377 666 421 735 q 334 504 334 597 q 374 340 334 408 q 490 272 415 272 q 589 304 549 272 q 638 394 628 337 l 741 394 "},"ώ":{x_min:0,x_max:922,ha:1030,o:"m 687 1040 l 498 819 l 415 819 l 549 1040 l 687 1040 m 922 339 q 856 97 922 203 q 650 -26 780 -26 q 538 9 587 -26 q 461 103 489 44 q 387 12 436 46 q 277 -22 339 -22 q 69 97 147 -22 q 0 338 0 202 q 45 551 0 444 q 161 737 84 643 l 302 737 q 175 552 219 647 q 124 336 124 446 q 155 179 124 248 q 275 88 197 88 q 375 163 341 88 q 400 294 400 219 l 400 572 l 524 572 l 524 294 q 561 135 524 192 q 643 88 591 88 q 762 182 719 88 q 797 341 797 257 q 745 555 797 450 q 619 737 705 637 l 760 737 q 874 551 835 640 q 922 339 922 444 "},"^":{x_min:193.0625,x_max:598.609375,ha:792,o:"m 598 772 l 515 772 l 395 931 l 277 772 l 193 772 l 326 1013 l 462 1013 l 598 772 "},"«":{x_min:0,x_max:507.203125,ha:604,o:"m 506 136 l 284 302 l 284 440 l 506 608 l 507 485 l 360 371 l 506 255 l 506 136 m 222 136 l 0 302 l 0 440 l 222 608 l 221 486 l 73 373 l 222 256 l 222 136 "},D:{x_min:0,x_max:828,ha:935,o:"m 389 1013 q 714 867 593 1013 q 828 521 828 729 q 712 161 828 309 q 382 0 587 0 l 0 0 l 0 1013 l 389 1013 m 376 124 q 607 247 523 124 q 681 510 681 355 q 607 771 681 662 q 376 896 522 896 l 139 896 l 139 124 l 376 124 "},"∙":{x_min:0,x_max:142,ha:239,o:"m 142 585 l 0 585 l 0 738 l 142 738 l 142 585 "},"ÿ":{x_min:0,x_max:47,ha:125,o:"m 47 3 q 37 -7 47 -7 q 28 0 30 -7 q 39 -4 32 -4 q 45 3 45 -1 l 37 0 q 28 9 28 0 q 39 19 28 19 l 47 16 l 47 19 l 47 3 m 37 1 q 44 8 44 1 q 37 16 44 16 q 30 8 30 16 q 37 1 30 1 m 26 1 l 23 22 l 14 0 l 3 22 l 3 3 l 0 25 l 13 1 l 22 25 l 26 1 "},w:{x_min:0,x_max:1009.71875,ha:1100,o:"m 1009 738 l 783 0 l 658 0 l 501 567 l 345 0 l 222 0 l 0 738 l 130 738 l 284 174 l 432 737 l 576 738 l 721 173 l 881 737 l 1009 738 "},$:{x_min:0,x_max:700,ha:793,o:"m 664 717 l 542 717 q 490 825 531 785 q 381 872 450 865 l 381 551 q 620 446 540 522 q 700 241 700 370 q 618 45 700 116 q 381 -25 536 -25 l 381 -152 l 307 -152 l 307 -25 q 81 62 162 -25 q 0 297 0 149 l 124 297 q 169 146 124 204 q 307 81 215 89 l 307 441 q 80 536 148 469 q 13 725 13 603 q 96 910 13 839 q 307 982 180 982 l 307 1077 l 381 1077 l 381 982 q 574 917 494 982 q 664 717 664 845 m 307 565 l 307 872 q 187 831 233 872 q 142 724 142 791 q 180 618 142 656 q 307 565 218 580 m 381 76 q 562 237 562 96 q 517 361 562 313 q 381 423 472 409 l 381 76 "},"\\":{x_min:-0.015625,x_max:425.0625,ha:522,o:"m 425 -129 l 337 -129 l 0 1041 l 83 1041 l 425 -129 "},"µ":{x_min:0,x_max:697.21875,ha:747,o:"m 697 -4 q 629 -14 658 -14 q 498 97 513 -14 q 422 9 470 41 q 313 -23 374 -23 q 207 4 258 -23 q 119 81 156 32 l 119 -278 l 0 -278 l 0 738 l 124 738 l 124 343 q 165 173 124 246 q 308 83 216 83 q 452 178 402 83 q 493 359 493 255 l 493 738 l 617 738 l 617 214 q 623 136 617 160 q 673 92 637 92 q 697 96 684 92 l 697 -4 "},"Ι":{x_min:42,x_max:181,ha:297,o:"m 181 0 l 42 0 l 42 1013 l 181 1013 l 181 0 "},"Ύ":{x_min:0,x_max:1144.5,ha:1214,o:"m 1144 1012 l 807 416 l 807 0 l 667 0 l 667 416 l 325 1012 l 465 1012 l 736 533 l 1004 1012 l 1144 1012 m 277 1040 l 83 799 l 0 799 l 140 1040 l 277 1040 "},"’":{x_min:0,x_max:139,ha:236,o:"m 139 851 q 102 737 139 784 q 0 669 65 690 l 0 734 q 59 787 42 741 q 72 873 72 821 l 0 873 l 0 1013 l 139 1013 l 139 851 "},"Ν":{x_min:0,x_max:801,ha:915,o:"m 801 0 l 651 0 l 131 822 l 131 0 l 0 0 l 0 1013 l 151 1013 l 670 191 l 670 1013 l 801 1013 l 801 0 "},"-":{x_min:8.71875,x_max:350.390625,ha:478,o:"m 350 317 l 8 317 l 8 428 l 350 428 l 350 317 "},Q:{x_min:0,x_max:968,ha:1072,o:"m 954 5 l 887 -79 l 744 35 q 622 -11 687 2 q 483 -26 556 -26 q 127 130 262 -26 q 0 504 0 279 q 127 880 0 728 q 484 1041 262 1041 q 841 884 708 1041 q 968 507 968 735 q 933 293 968 398 q 832 104 899 188 l 954 5 m 723 191 q 802 330 777 248 q 828 499 828 412 q 744 790 828 673 q 483 922 650 922 q 228 791 322 922 q 142 505 142 673 q 227 221 142 337 q 487 91 323 91 q 632 123 566 91 l 520 215 l 587 301 l 723 191 "},"ς":{x_min:1,x_max:676.28125,ha:740,o:"m 676 460 l 551 460 q 498 595 542 546 q 365 651 448 651 q 199 578 263 651 q 136 401 136 505 q 266 178 136 241 q 508 106 387 142 q 640 -50 640 62 q 625 -158 640 -105 q 583 -278 611 -211 l 465 -278 q 498 -182 490 -211 q 515 -80 515 -126 q 381 12 515 -15 q 134 91 197 51 q 1 388 1 179 q 100 651 1 542 q 354 761 199 761 q 587 680 498 761 q 676 460 676 599 "},M:{x_min:0,x_max:954,ha:1067,o:"m 954 0 l 819 0 l 819 869 l 537 0 l 405 0 l 128 866 l 128 0 l 0 0 l 0 1013 l 200 1013 l 472 160 l 757 1013 l 954 1013 l 954 0 "},"Ψ":{x_min:0,x_max:1006,ha:1094,o:"m 1006 678 q 914 319 1006 429 q 571 200 814 200 l 571 0 l 433 0 l 433 200 q 92 319 194 200 q 0 678 0 429 l 0 1013 l 139 1013 l 139 679 q 191 417 139 492 q 433 326 255 326 l 433 1013 l 571 1013 l 571 326 l 580 326 q 813 423 747 326 q 868 679 868 502 l 868 1013 l 1006 1013 l 1006 678 "},C:{x_min:0,x_max:886,ha:944,o:"m 886 379 q 760 87 886 201 q 455 -26 634 -26 q 112 136 236 -26 q 0 509 0 283 q 118 882 0 737 q 469 1041 245 1041 q 748 955 630 1041 q 879 708 879 859 l 745 708 q 649 862 724 805 q 473 920 573 920 q 219 791 312 920 q 136 509 136 675 q 217 229 136 344 q 470 99 311 99 q 672 179 591 99 q 753 379 753 259 l 886 379 "},"!":{x_min:0,x_max:138,ha:236,o:"m 138 684 q 116 409 138 629 q 105 244 105 299 l 33 244 q 16 465 33 313 q 0 684 0 616 l 0 1013 l 138 1013 l 138 684 m 138 0 l 0 0 l 0 151 l 138 151 l 138 0 "},"{":{x_min:0,x_max:480.5625,ha:578,o:"m 480 -286 q 237 -213 303 -286 q 187 -45 187 -159 q 194 48 187 -15 q 201 141 201 112 q 164 264 201 225 q 0 314 118 314 l 0 417 q 164 471 119 417 q 201 605 201 514 q 199 665 201 644 q 193 772 193 769 q 241 941 193 887 q 480 1015 308 1015 l 480 915 q 336 866 375 915 q 306 742 306 828 q 310 662 306 717 q 314 577 314 606 q 288 452 314 500 q 176 365 256 391 q 289 275 257 337 q 314 143 314 226 q 313 84 314 107 q 310 -11 310 -5 q 339 -131 310 -94 q 480 -182 377 -182 l 480 -286 "},X:{x_min:-0.015625,x_max:854.15625,ha:940,o:"m 854 0 l 683 0 l 423 409 l 166 0 l 0 0 l 347 519 l 18 1013 l 186 1013 l 428 637 l 675 1013 l 836 1013 l 504 520 l 854 0 "},"#":{x_min:0,x_max:963.890625,ha:1061,o:"m 963 690 l 927 590 l 719 590 l 655 410 l 876 410 l 840 310 l 618 310 l 508 -3 l 393 -2 l 506 309 l 329 310 l 215 -2 l 102 -3 l 212 310 l 0 310 l 36 410 l 248 409 l 312 590 l 86 590 l 120 690 l 347 690 l 459 1006 l 573 1006 l 462 690 l 640 690 l 751 1006 l 865 1006 l 754 690 l 963 690 m 606 590 l 425 590 l 362 410 l 543 410 l 606 590 "},"ι":{x_min:42,x_max:284,ha:361,o:"m 284 3 q 233 -10 258 -5 q 182 -15 207 -15 q 85 26 119 -15 q 42 200 42 79 l 42 738 l 167 738 l 168 215 q 172 141 168 157 q 226 101 183 101 q 248 103 239 101 q 284 112 257 104 l 284 3 "},"Ά":{x_min:0,x_max:906.953125,ha:982,o:"m 283 1040 l 88 799 l 5 799 l 145 1040 l 283 1040 m 906 0 l 756 0 l 650 303 l 251 303 l 143 0 l 0 0 l 376 1012 l 529 1012 l 906 0 m 609 421 l 452 866 l 293 421 l 609 421 "},")":{x_min:0,x_max:318,ha:415,o:"m 318 365 q 257 25 318 191 q 87 -290 197 -141 l 0 -290 q 140 21 93 -128 q 193 360 193 189 q 141 704 193 537 q 0 1024 97 850 l 87 1024 q 257 706 197 871 q 318 365 318 542 "},"ε":{x_min:0,x_max:634.71875,ha:714,o:"m 634 234 q 527 38 634 110 q 300 -25 433 -25 q 98 29 183 -25 q 0 204 0 93 q 37 314 0 265 q 128 390 67 353 q 56 460 82 419 q 26 555 26 505 q 114 712 26 654 q 295 763 191 763 q 499 700 416 763 q 589 515 589 631 l 478 515 q 419 618 464 580 q 307 657 374 657 q 207 630 253 657 q 151 547 151 598 q 238 445 151 469 q 389 434 280 434 l 389 331 l 349 331 q 206 315 255 331 q 125 210 125 287 q 183 107 125 145 q 302 76 233 76 q 436 117 379 76 q 509 234 493 159 l 634 234 "},"Δ":{x_min:0,x_max:952.78125,ha:1028,o:"m 952 0 l 0 0 l 400 1013 l 551 1013 l 952 0 m 762 124 l 476 867 l 187 124 l 762 124 "},"}":{x_min:0,x_max:481,ha:578,o:"m 481 314 q 318 262 364 314 q 282 136 282 222 q 284 65 282 97 q 293 -58 293 -48 q 241 -217 293 -166 q 0 -286 174 -286 l 0 -182 q 143 -130 105 -182 q 171 -2 171 -93 q 168 81 171 22 q 165 144 165 140 q 188 275 165 229 q 306 365 220 339 q 191 455 224 391 q 165 588 165 505 q 168 681 165 624 q 171 742 171 737 q 141 865 171 827 q 0 915 102 915 l 0 1015 q 243 942 176 1015 q 293 773 293 888 q 287 675 293 741 q 282 590 282 608 q 318 466 282 505 q 481 417 364 417 l 481 314 "},"‰":{x_min:-3,x_max:1672,ha:1821,o:"m 846 0 q 664 76 732 0 q 603 244 603 145 q 662 412 603 344 q 846 489 729 489 q 1027 412 959 489 q 1089 244 1089 343 q 1029 76 1089 144 q 846 0 962 0 m 845 103 q 945 143 910 103 q 981 243 981 184 q 947 340 981 301 q 845 385 910 385 q 745 342 782 385 q 709 243 709 300 q 742 147 709 186 q 845 103 781 103 m 888 986 l 284 -25 l 199 -25 l 803 986 l 888 986 m 241 468 q 58 545 126 468 q -3 715 -3 615 q 56 881 -3 813 q 238 958 124 958 q 421 881 353 958 q 483 712 483 813 q 423 544 483 612 q 241 468 356 468 m 241 855 q 137 811 175 855 q 100 710 100 768 q 136 612 100 653 q 240 572 172 572 q 344 614 306 572 q 382 713 382 656 q 347 810 382 771 q 241 855 308 855 m 1428 0 q 1246 76 1314 0 q 1185 244 1185 145 q 1244 412 1185 344 q 1428 489 1311 489 q 1610 412 1542 489 q 1672 244 1672 343 q 1612 76 1672 144 q 1428 0 1545 0 m 1427 103 q 1528 143 1492 103 q 1564 243 1564 184 q 1530 340 1564 301 q 1427 385 1492 385 q 1327 342 1364 385 q 1291 243 1291 300 q 1324 147 1291 186 q 1427 103 1363 103 "},a:{x_min:0,x_max:698.609375,ha:794,o:"m 698 0 q 661 -12 679 -7 q 615 -17 643 -17 q 536 12 564 -17 q 500 96 508 41 q 384 6 456 37 q 236 -25 312 -25 q 65 31 130 -25 q 0 194 0 88 q 118 390 0 334 q 328 435 180 420 q 488 483 476 451 q 495 523 495 504 q 442 619 495 584 q 325 654 389 654 q 209 617 257 654 q 152 513 161 580 l 33 513 q 123 705 33 633 q 332 772 207 772 q 528 712 448 772 q 617 531 617 645 l 617 163 q 624 108 617 126 q 664 90 632 90 l 698 94 l 698 0 m 491 262 l 491 372 q 272 329 350 347 q 128 201 128 294 q 166 113 128 144 q 264 83 205 83 q 414 130 346 83 q 491 262 491 183 "},"—":{x_min:0,x_max:941.671875,ha:1039,o:"m 941 334 l 0 334 l 0 410 l 941 410 l 941 334 "},"=":{x_min:8.71875,x_max:780.953125,ha:792,o:"m 780 510 l 8 510 l 8 606 l 780 606 l 780 510 m 780 235 l 8 235 l 8 332 l 780 332 l 780 235 "},N:{x_min:0,x_max:801,ha:914,o:"m 801 0 l 651 0 l 131 823 l 131 0 l 0 0 l 0 1013 l 151 1013 l 670 193 l 670 1013 l 801 1013 l 801 0 "},"ρ":{x_min:0,x_max:712,ha:797,o:"m 712 369 q 620 94 712 207 q 362 -26 521 -26 q 230 2 292 -26 q 119 83 167 30 l 119 -278 l 0 -278 l 0 362 q 91 643 0 531 q 355 764 190 764 q 617 647 517 764 q 712 369 712 536 m 583 366 q 530 559 583 480 q 359 651 469 651 q 190 562 252 651 q 135 370 135 483 q 189 176 135 257 q 359 85 250 85 q 528 175 466 85 q 583 366 583 254 "},"¯":{x_min:0,x_max:941.671875,ha:938,o:"m 941 1033 l 0 1033 l 0 1109 l 941 1109 l 941 1033 "},Z:{x_min:0,x_max:779,ha:849,o:"m 779 0 l 0 0 l 0 113 l 621 896 l 40 896 l 40 1013 l 779 1013 l 778 887 l 171 124 l 779 124 l 779 0 "},u:{x_min:0,x_max:617,ha:729,o:"m 617 0 l 499 0 l 499 110 q 391 10 460 45 q 246 -25 322 -25 q 61 58 127 -25 q 0 258 0 136 l 0 738 l 125 738 l 125 284 q 156 148 125 202 q 273 82 197 82 q 433 165 369 82 q 493 340 493 243 l 493 738 l 617 738 l 617 0 "},k:{x_min:0,x_max:612.484375,ha:697,o:"m 612 738 l 338 465 l 608 0 l 469 0 l 251 382 l 121 251 l 121 0 l 0 0 l 0 1013 l 121 1013 l 121 402 l 456 738 l 612 738 "},"Η":{x_min:0,x_max:803,ha:917,o:"m 803 0 l 667 0 l 667 475 l 140 475 l 140 0 l 0 0 l 0 1013 l 140 1013 l 140 599 l 667 599 l 667 1013 l 803 1013 l 803 0 "},"Α":{x_min:0,x_max:906.953125,ha:985,o:"m 906 0 l 756 0 l 650 303 l 251 303 l 143 0 l 0 0 l 376 1013 l 529 1013 l 906 0 m 609 421 l 452 866 l 293 421 l 609 421 "},s:{x_min:0,x_max:604,ha:697,o:"m 604 217 q 501 36 604 104 q 292 -23 411 -23 q 86 43 166 -23 q 0 238 0 114 l 121 237 q 175 122 121 164 q 300 85 223 85 q 415 112 363 85 q 479 207 479 147 q 361 309 479 276 q 140 372 141 370 q 21 544 21 426 q 111 708 21 647 q 298 761 190 761 q 492 705 413 761 q 583 531 583 643 l 462 531 q 412 625 462 594 q 298 657 363 657 q 199 636 242 657 q 143 558 143 608 q 262 454 143 486 q 484 394 479 397 q 604 217 604 341 "},B:{x_min:0,x_max:778,ha:876,o:"m 580 546 q 724 469 670 535 q 778 311 778 403 q 673 83 778 171 q 432 0 575 0 l 0 0 l 0 1013 l 411 1013 q 629 957 541 1013 q 732 768 732 892 q 691 633 732 693 q 580 546 650 572 m 393 899 l 139 899 l 139 588 l 379 588 q 521 624 462 588 q 592 744 592 667 q 531 859 592 819 q 393 899 471 899 m 419 124 q 566 169 504 124 q 635 303 635 219 q 559 436 635 389 q 402 477 494 477 l 139 477 l 139 124 l 419 124 "},"…":{x_min:0,x_max:614,ha:708,o:"m 142 0 l 0 0 l 0 151 l 142 151 l 142 0 m 378 0 l 236 0 l 236 151 l 378 151 l 378 0 m 614 0 l 472 0 l 472 151 l 614 151 l 614 0 "},"?":{x_min:0,x_max:607,ha:704,o:"m 607 777 q 543 599 607 674 q 422 474 482 537 q 357 272 357 391 l 236 272 q 297 487 236 395 q 411 619 298 490 q 474 762 474 691 q 422 885 474 838 q 301 933 371 933 q 179 880 228 933 q 124 706 124 819 l 0 706 q 94 963 0 872 q 302 1044 177 1044 q 511 973 423 1044 q 607 777 607 895 m 370 0 l 230 0 l 230 151 l 370 151 l 370 0 "},H:{x_min:0,x_max:803,ha:915,o:"m 803 0 l 667 0 l 667 475 l 140 475 l 140 0 l 0 0 l 0 1013 l 140 1013 l 140 599 l 667 599 l 667 1013 l 803 1013 l 803 0 "},"ν":{x_min:0,x_max:675,ha:761,o:"m 675 738 l 404 0 l 272 0 l 0 738 l 133 738 l 340 147 l 541 738 l 675 738 "},c:{x_min:1,x_max:701.390625,ha:775,o:"m 701 264 q 584 53 681 133 q 353 -26 487 -26 q 91 91 188 -26 q 1 370 1 201 q 92 645 1 537 q 353 761 190 761 q 572 688 479 761 q 690 493 666 615 l 556 493 q 487 606 545 562 q 356 650 428 650 q 186 563 246 650 q 134 372 134 487 q 188 179 134 258 q 359 88 250 88 q 492 136 437 88 q 566 264 548 185 l 701 264 "},"¶":{x_min:0,x_max:566.671875,ha:678,o:"m 21 892 l 52 892 l 98 761 l 145 892 l 176 892 l 178 741 l 157 741 l 157 867 l 108 741 l 88 741 l 40 871 l 40 741 l 21 741 l 21 892 m 308 854 l 308 731 q 252 691 308 691 q 227 691 240 691 q 207 696 213 695 l 207 712 l 253 706 q 288 733 288 706 l 288 763 q 244 741 279 741 q 193 797 193 741 q 261 860 193 860 q 287 860 273 860 q 308 854 302 855 m 288 842 l 263 843 q 213 796 213 843 q 248 756 213 756 q 288 796 288 756 l 288 842 m 566 988 l 502 988 l 502 -1 l 439 -1 l 439 988 l 317 988 l 317 -1 l 252 -1 l 252 602 q 81 653 155 602 q 0 805 0 711 q 101 989 0 918 q 309 1053 194 1053 l 566 1053 l 566 988 "},"β":{x_min:0,x_max:660,ha:745,o:"m 471 550 q 610 450 561 522 q 660 280 660 378 q 578 64 660 151 q 367 -22 497 -22 q 239 5 299 -22 q 126 82 178 32 l 126 -278 l 0 -278 l 0 593 q 54 903 0 801 q 318 1042 127 1042 q 519 964 436 1042 q 603 771 603 887 q 567 644 603 701 q 471 550 532 586 m 337 79 q 476 138 418 79 q 535 279 535 198 q 427 437 535 386 q 226 477 344 477 l 226 583 q 398 620 329 583 q 486 762 486 668 q 435 884 486 833 q 312 935 384 935 q 169 861 219 935 q 126 698 126 797 l 126 362 q 170 169 126 242 q 337 79 224 79 "},"Μ":{x_min:0,x_max:954,ha:1068,o:"m 954 0 l 819 0 l 819 868 l 537 0 l 405 0 l 128 865 l 128 0 l 0 0 l 0 1013 l 199 1013 l 472 158 l 758 1013 l 954 1013 l 954 0 "},"Ό":{x_min:0.109375,x_max:1120,ha:1217,o:"m 1120 505 q 994 132 1120 282 q 642 -29 861 -29 q 290 130 422 -29 q 167 505 167 280 q 294 883 167 730 q 650 1046 430 1046 q 999 882 868 1046 q 1120 505 1120 730 m 977 504 q 896 784 977 669 q 644 915 804 915 q 391 785 484 915 q 307 504 307 669 q 391 224 307 339 q 644 95 486 95 q 894 224 803 95 q 977 504 977 339 m 277 1040 l 83 799 l 0 799 l 140 1040 l 277 1040 "},"Ή":{x_min:0,x_max:1158,ha:1275,o:"m 1158 0 l 1022 0 l 1022 475 l 496 475 l 496 0 l 356 0 l 356 1012 l 496 1012 l 496 599 l 1022 599 l 1022 1012 l 1158 1012 l 1158 0 m 277 1040 l 83 799 l 0 799 l 140 1040 l 277 1040 "},"•":{x_min:0,x_max:663.890625,ha:775,o:"m 663 529 q 566 293 663 391 q 331 196 469 196 q 97 294 194 196 q 0 529 0 393 q 96 763 0 665 q 331 861 193 861 q 566 763 469 861 q 663 529 663 665 "},"¥":{x_min:0.1875,x_max:819.546875,ha:886,o:"m 563 561 l 697 561 l 696 487 l 520 487 l 482 416 l 482 380 l 697 380 l 695 308 l 482 308 l 482 0 l 342 0 l 342 308 l 125 308 l 125 380 l 342 380 l 342 417 l 303 487 l 125 487 l 125 561 l 258 561 l 0 1013 l 140 1013 l 411 533 l 679 1013 l 819 1013 l 563 561 "},"(":{x_min:0,x_max:318.0625,ha:415,o:"m 318 -290 l 230 -290 q 61 23 122 -142 q 0 365 0 190 q 62 712 0 540 q 230 1024 119 869 l 318 1024 q 175 705 219 853 q 125 360 125 542 q 176 22 125 187 q 318 -290 223 -127 "},U:{x_min:0,x_max:796,ha:904,o:"m 796 393 q 681 93 796 212 q 386 -25 566 -25 q 101 95 208 -25 q 0 393 0 211 l 0 1013 l 138 1013 l 138 391 q 204 191 138 270 q 394 107 276 107 q 586 191 512 107 q 656 391 656 270 l 656 1013 l 796 1013 l 796 393 "},"γ":{x_min:0.5,x_max:744.953125,ha:822,o:"m 744 737 l 463 54 l 463 -278 l 338 -278 l 338 54 l 154 495 q 104 597 124 569 q 13 651 67 651 l 0 651 l 0 751 l 39 753 q 168 711 121 753 q 242 594 207 676 l 403 208 l 617 737 l 744 737 "},"α":{x_min:0,x_max:765.5625,ha:809,o:"m 765 -4 q 698 -14 726 -14 q 564 97 586 -14 q 466 7 525 40 q 337 -26 407 -26 q 88 98 186 -26 q 0 369 0 212 q 88 637 0 525 q 337 760 184 760 q 465 728 407 760 q 563 637 524 696 l 563 739 l 685 739 l 685 222 q 693 141 685 168 q 748 94 708 94 q 765 96 760 94 l 765 -4 m 584 371 q 531 562 584 485 q 360 653 470 653 q 192 566 254 653 q 135 379 135 489 q 186 181 135 261 q 358 84 247 84 q 528 176 465 84 q 584 371 584 260 "},F:{x_min:0,x_max:683.328125,ha:717,o:"m 683 888 l 140 888 l 140 583 l 613 583 l 613 458 l 140 458 l 140 0 l 0 0 l 0 1013 l 683 1013 l 683 888 "},"­":{x_min:0,x_max:705.5625,ha:803,o:"m 705 334 l 0 334 l 0 410 l 705 410 l 705 334 "},":":{x_min:0,x_max:142,ha:239,o:"m 142 585 l 0 585 l 0 738 l 142 738 l 142 585 m 142 0 l 0 0 l 0 151 l 142 151 l 142 0 "},"Χ":{x_min:0,x_max:854.171875,ha:935,o:"m 854 0 l 683 0 l 423 409 l 166 0 l 0 0 l 347 519 l 18 1013 l 186 1013 l 427 637 l 675 1013 l 836 1013 l 504 521 l 854 0 "},"*":{x_min:116,x_max:674,ha:792,o:"m 674 768 l 475 713 l 610 544 l 517 477 l 394 652 l 272 478 l 178 544 l 314 713 l 116 766 l 153 876 l 341 812 l 342 1013 l 446 1013 l 446 811 l 635 874 l 674 768 "},"†":{x_min:0,x_max:777,ha:835,o:"m 458 804 l 777 804 l 777 683 l 458 683 l 458 0 l 319 0 l 319 681 l 0 683 l 0 804 l 319 804 l 319 1015 l 458 1013 l 458 804 "},"°":{x_min:0,x_max:347,ha:444,o:"m 173 802 q 43 856 91 802 q 0 977 0 905 q 45 1101 0 1049 q 173 1153 90 1153 q 303 1098 255 1153 q 347 977 347 1049 q 303 856 347 905 q 173 802 256 802 m 173 884 q 238 910 214 884 q 262 973 262 937 q 239 1038 262 1012 q 173 1064 217 1064 q 108 1037 132 1064 q 85 973 85 1010 q 108 910 85 937 q 173 884 132 884 "},V:{x_min:0,x_max:862.71875,ha:940,o:"m 862 1013 l 505 0 l 361 0 l 0 1013 l 143 1013 l 434 165 l 718 1012 l 862 1013 "},"Ξ":{x_min:0,x_max:734.71875,ha:763,o:"m 723 889 l 9 889 l 9 1013 l 723 1013 l 723 889 m 673 463 l 61 463 l 61 589 l 673 589 l 673 463 m 734 0 l 0 0 l 0 124 l 734 124 l 734 0 "}," ":{x_min:0,x_max:0,ha:853},"Ϋ":{x_min:0.328125,x_max:819.515625,ha:889,o:"m 588 1046 l 460 1046 l 460 1189 l 588 1189 l 588 1046 m 360 1046 l 232 1046 l 232 1189 l 360 1189 l 360 1046 m 819 1012 l 482 416 l 482 0 l 342 0 l 342 416 l 0 1012 l 140 1012 l 411 533 l 679 1012 l 819 1012 "},"”":{x_min:0,x_max:347,ha:454,o:"m 139 851 q 102 737 139 784 q 0 669 65 690 l 0 734 q 59 787 42 741 q 72 873 72 821 l 0 873 l 0 1013 l 139 1013 l 139 851 m 347 851 q 310 737 347 784 q 208 669 273 690 l 208 734 q 267 787 250 741 q 280 873 280 821 l 208 873 l 208 1013 l 347 1013 l 347 851 "},"@":{x_min:0,x_max:1260,ha:1357,o:"m 1098 -45 q 877 -160 1001 -117 q 633 -203 752 -203 q 155 -29 327 -203 q 0 360 0 127 q 176 802 0 616 q 687 1008 372 1008 q 1123 854 969 1008 q 1260 517 1260 718 q 1155 216 1260 341 q 868 82 1044 82 q 772 106 801 82 q 737 202 737 135 q 647 113 700 144 q 527 82 594 82 q 367 147 420 82 q 314 312 314 212 q 401 565 314 452 q 639 690 498 690 q 810 588 760 690 l 849 668 l 938 668 q 877 441 900 532 q 833 226 833 268 q 853 182 833 198 q 902 167 873 167 q 1088 272 1012 167 q 1159 512 1159 372 q 1051 793 1159 681 q 687 925 925 925 q 248 747 415 925 q 97 361 97 586 q 226 26 97 159 q 627 -122 370 -122 q 856 -87 737 -122 q 1061 8 976 -53 l 1098 -45 m 786 488 q 738 580 777 545 q 643 615 700 615 q 483 517 548 615 q 425 322 425 430 q 457 203 425 250 q 552 156 490 156 q 722 273 665 156 q 786 488 738 309 "},"Ί":{x_min:0,x_max:499,ha:613,o:"m 277 1040 l 83 799 l 0 799 l 140 1040 l 277 1040 m 499 0 l 360 0 l 360 1012 l 499 1012 l 499 0 "},i:{x_min:14,x_max:136,ha:275,o:"m 136 873 l 14 873 l 14 1013 l 136 1013 l 136 873 m 136 0 l 14 0 l 14 737 l 136 737 l 136 0 "},"Β":{x_min:0,x_max:778,ha:877,o:"m 580 545 q 724 468 671 534 q 778 310 778 402 q 673 83 778 170 q 432 0 575 0 l 0 0 l 0 1013 l 411 1013 q 629 957 541 1013 q 732 768 732 891 q 691 632 732 692 q 580 545 650 571 m 393 899 l 139 899 l 139 587 l 379 587 q 521 623 462 587 q 592 744 592 666 q 531 859 592 819 q 393 899 471 899 m 419 124 q 566 169 504 124 q 635 302 635 219 q 559 435 635 388 q 402 476 494 476 l 139 476 l 139 124 l 419 124 "},"υ":{x_min:0,x_max:617,ha:725,o:"m 617 352 q 540 94 617 199 q 308 -24 455 -24 q 76 94 161 -24 q 0 352 0 199 l 0 739 l 126 739 l 126 355 q 169 185 126 257 q 312 98 220 98 q 451 185 402 98 q 492 355 492 257 l 492 739 l 617 739 l 617 352 "},"]":{x_min:0,x_max:275,ha:372,o:"m 275 -281 l 0 -281 l 0 -187 l 151 -187 l 151 920 l 0 920 l 0 1013 l 275 1013 l 275 -281 "},m:{x_min:0,x_max:1019,ha:1128,o:"m 1019 0 l 897 0 l 897 454 q 860 591 897 536 q 739 660 816 660 q 613 586 659 660 q 573 436 573 522 l 573 0 l 447 0 l 447 455 q 412 591 447 535 q 294 657 372 657 q 165 586 213 657 q 122 437 122 521 l 122 0 l 0 0 l 0 738 l 117 738 l 117 640 q 202 730 150 697 q 316 763 254 763 q 437 730 381 763 q 525 642 494 697 q 621 731 559 700 q 753 763 682 763 q 943 694 867 763 q 1019 512 1019 625 l 1019 0 "},"χ":{x_min:8.328125,x_max:780.5625,ha:815,o:"m 780 -278 q 715 -294 747 -294 q 616 -257 663 -294 q 548 -175 576 -227 l 379 133 l 143 -277 l 9 -277 l 313 254 l 163 522 q 127 586 131 580 q 36 640 91 640 q 8 637 27 640 l 8 752 l 52 757 q 162 719 113 757 q 236 627 200 690 l 383 372 l 594 737 l 726 737 l 448 250 l 625 -69 q 670 -153 647 -110 q 743 -188 695 -188 q 780 -184 759 -188 l 780 -278 "},"ί":{x_min:42,x_max:326.71875,ha:361,o:"m 284 3 q 233 -10 258 -5 q 182 -15 207 -15 q 85 26 119 -15 q 42 200 42 79 l 42 737 l 167 737 l 168 215 q 172 141 168 157 q 226 101 183 101 q 248 102 239 101 q 284 112 257 104 l 284 3 m 326 1040 l 137 819 l 54 819 l 189 1040 l 326 1040 "},"Ζ":{x_min:0,x_max:779.171875,ha:850,o:"m 779 0 l 0 0 l 0 113 l 620 896 l 40 896 l 40 1013 l 779 1013 l 779 887 l 170 124 l 779 124 l 779 0 "},R:{x_min:0,x_max:781.953125,ha:907,o:"m 781 0 l 623 0 q 587 242 590 52 q 407 433 585 433 l 138 433 l 138 0 l 0 0 l 0 1013 l 396 1013 q 636 946 539 1013 q 749 731 749 868 q 711 597 749 659 q 608 502 674 534 q 718 370 696 474 q 729 207 722 352 q 781 26 736 62 l 781 0 m 373 551 q 533 594 465 551 q 614 731 614 645 q 532 859 614 815 q 373 896 465 896 l 138 896 l 138 551 l 373 551 "},o:{x_min:0,x_max:713,ha:821,o:"m 357 -25 q 94 91 194 -25 q 0 368 0 202 q 93 642 0 533 q 357 761 193 761 q 618 644 518 761 q 713 368 713 533 q 619 91 713 201 q 357 -25 521 -25 m 357 85 q 528 175 465 85 q 584 369 584 255 q 529 562 584 484 q 357 651 467 651 q 189 560 250 651 q 135 369 135 481 q 187 177 135 257 q 357 85 250 85 "},K:{x_min:0,x_max:819.46875,ha:906,o:"m 819 0 l 649 0 l 294 509 l 139 355 l 139 0 l 0 0 l 0 1013 l 139 1013 l 139 526 l 626 1013 l 809 1013 l 395 600 l 819 0 "},",":{x_min:0,x_max:142,ha:239,o:"m 142 -12 q 105 -132 142 -82 q 0 -205 68 -182 l 0 -138 q 57 -82 40 -124 q 70 0 70 -51 l 0 0 l 0 151 l 142 151 l 142 -12 "},d:{x_min:0,x_max:683,ha:796,o:"m 683 0 l 564 0 l 564 93 q 456 6 516 38 q 327 -25 395 -25 q 87 100 181 -25 q 0 365 0 215 q 90 639 0 525 q 343 763 187 763 q 564 647 486 763 l 564 1013 l 683 1013 l 683 0 m 582 373 q 529 562 582 484 q 361 653 468 653 q 190 561 253 653 q 135 365 135 479 q 189 175 135 254 q 358 85 251 85 q 529 178 468 85 q 582 373 582 258 "},"¨":{x_min:-109,x_max:247,ha:232,o:"m 247 1046 l 119 1046 l 119 1189 l 247 1189 l 247 1046 m 19 1046 l -109 1046 l -109 1189 l 19 1189 l 19 1046 "},E:{x_min:0,x_max:736.109375,ha:789,o:"m 736 0 l 0 0 l 0 1013 l 725 1013 l 725 889 l 139 889 l 139 585 l 677 585 l 677 467 l 139 467 l 139 125 l 736 125 l 736 0 "},Y:{x_min:0,x_max:820,ha:886,o:"m 820 1013 l 482 416 l 482 0 l 342 0 l 342 416 l 0 1013 l 140 1013 l 411 534 l 679 1012 l 820 1013 "},"\"":{x_min:0,x_max:299,ha:396,o:"m 299 606 l 203 606 l 203 988 l 299 988 l 299 606 m 96 606 l 0 606 l 0 988 l 96 988 l 96 606 "},"‹":{x_min:17.984375,x_max:773.609375,ha:792,o:"m 773 40 l 18 376 l 17 465 l 773 799 l 773 692 l 159 420 l 773 149 l 773 40 "},"„":{x_min:0,x_max:364,ha:467,o:"m 141 -12 q 104 -132 141 -82 q 0 -205 67 -182 l 0 -138 q 56 -82 40 -124 q 69 0 69 -51 l 0 0 l 0 151 l 141 151 l 141 -12 m 364 -12 q 327 -132 364 -82 q 222 -205 290 -182 l 222 -138 q 279 -82 262 -124 q 292 0 292 -51 l 222 0 l 222 151 l 364 151 l 364 -12 "},"δ":{x_min:1,x_max:710,ha:810,o:"m 710 360 q 616 87 710 196 q 356 -28 518 -28 q 99 82 197 -28 q 1 356 1 192 q 100 606 1 509 q 355 703 199 703 q 180 829 288 754 q 70 903 124 866 l 70 1012 l 643 1012 l 643 901 l 258 901 q 462 763 422 794 q 636 592 577 677 q 710 360 710 485 m 584 365 q 552 501 584 447 q 451 602 521 555 q 372 611 411 611 q 197 541 258 611 q 136 355 136 472 q 190 171 136 245 q 358 85 252 85 q 528 173 465 85 q 584 365 584 252 "},"έ":{x_min:0,x_max:634.71875,ha:714,o:"m 634 234 q 527 38 634 110 q 300 -25 433 -25 q 98 29 183 -25 q 0 204 0 93 q 37 313 0 265 q 128 390 67 352 q 56 459 82 419 q 26 555 26 505 q 114 712 26 654 q 295 763 191 763 q 499 700 416 763 q 589 515 589 631 l 478 515 q 419 618 464 580 q 307 657 374 657 q 207 630 253 657 q 151 547 151 598 q 238 445 151 469 q 389 434 280 434 l 389 331 l 349 331 q 206 315 255 331 q 125 210 125 287 q 183 107 125 145 q 302 76 233 76 q 436 117 379 76 q 509 234 493 159 l 634 234 m 520 1040 l 331 819 l 248 819 l 383 1040 l 520 1040 "},"ω":{x_min:0,x_max:922,ha:1031,o:"m 922 339 q 856 97 922 203 q 650 -26 780 -26 q 538 9 587 -26 q 461 103 489 44 q 387 12 436 46 q 277 -22 339 -22 q 69 97 147 -22 q 0 339 0 203 q 45 551 0 444 q 161 738 84 643 l 302 738 q 175 553 219 647 q 124 336 124 446 q 155 179 124 249 q 275 88 197 88 q 375 163 341 88 q 400 294 400 219 l 400 572 l 524 572 l 524 294 q 561 135 524 192 q 643 88 591 88 q 762 182 719 88 q 797 342 797 257 q 745 556 797 450 q 619 738 705 638 l 760 738 q 874 551 835 640 q 922 339 922 444 "},"´":{x_min:0,x_max:96,ha:251,o:"m 96 606 l 0 606 l 0 988 l 96 988 l 96 606 "},"±":{x_min:11,x_max:781,ha:792,o:"m 781 490 l 446 490 l 446 255 l 349 255 l 349 490 l 11 490 l 11 586 l 349 586 l 349 819 l 446 819 l 446 586 l 781 586 l 781 490 m 781 21 l 11 21 l 11 115 l 781 115 l 781 21 "},"|":{x_min:343,x_max:449,ha:792,o:"m 449 462 l 343 462 l 343 986 l 449 986 l 449 462 m 449 -242 l 343 -242 l 343 280 l 449 280 l 449 -242 "},"ϋ":{x_min:0,x_max:617,ha:725,o:"m 482 800 l 372 800 l 372 925 l 482 925 l 482 800 m 239 800 l 129 800 l 129 925 l 239 925 l 239 800 m 617 352 q 540 93 617 199 q 308 -24 455 -24 q 76 93 161 -24 q 0 352 0 199 l 0 738 l 126 738 l 126 354 q 169 185 126 257 q 312 98 220 98 q 451 185 402 98 q 492 354 492 257 l 492 738 l 617 738 l 617 352 "},"§":{x_min:0,x_max:593,ha:690,o:"m 593 425 q 554 312 593 369 q 467 233 516 254 q 537 83 537 172 q 459 -74 537 -12 q 288 -133 387 -133 q 115 -69 184 -133 q 47 96 47 -6 l 166 96 q 199 7 166 40 q 288 -26 232 -26 q 371 -5 332 -26 q 420 60 420 21 q 311 201 420 139 q 108 309 210 255 q 0 490 0 383 q 33 602 0 551 q 124 687 66 654 q 75 743 93 712 q 58 812 58 773 q 133 984 58 920 q 300 1043 201 1043 q 458 987 394 1043 q 529 814 529 925 l 411 814 q 370 908 404 877 q 289 939 336 939 q 213 911 246 939 q 180 841 180 883 q 286 720 180 779 q 484 612 480 615 q 593 425 593 534 m 467 409 q 355 544 467 473 q 196 630 228 612 q 146 587 162 609 q 124 525 124 558 q 239 387 124 462 q 398 298 369 315 q 448 345 429 316 q 467 409 467 375 "},b:{x_min:0,x_max:685,ha:783,o:"m 685 372 q 597 99 685 213 q 347 -25 501 -25 q 219 5 277 -25 q 121 93 161 36 l 121 0 l 0 0 l 0 1013 l 121 1013 l 121 634 q 214 723 157 692 q 341 754 272 754 q 591 637 493 754 q 685 372 685 526 m 554 356 q 499 550 554 470 q 328 644 437 644 q 162 556 223 644 q 108 369 108 478 q 160 176 108 256 q 330 83 221 83 q 498 169 435 83 q 554 356 554 245 "},q:{x_min:0,x_max:683,ha:876,o:"m 683 -278 l 564 -278 l 564 97 q 474 8 533 39 q 345 -23 415 -23 q 91 93 188 -23 q 0 364 0 203 q 87 635 0 522 q 337 760 184 760 q 466 727 408 760 q 564 637 523 695 l 564 737 l 683 737 l 683 -278 m 582 375 q 527 564 582 488 q 358 652 466 652 q 190 565 253 652 q 135 377 135 488 q 189 179 135 261 q 361 84 251 84 q 530 179 469 84 q 582 375 582 260 "},"Ω":{x_min:-0.171875,x_max:969.5625,ha:1068,o:"m 969 0 l 555 0 l 555 123 q 744 308 675 194 q 814 558 814 423 q 726 812 814 709 q 484 922 633 922 q 244 820 334 922 q 154 567 154 719 q 223 316 154 433 q 412 123 292 199 l 412 0 l 0 0 l 0 124 l 217 124 q 68 327 122 210 q 15 572 15 444 q 144 911 15 781 q 484 1041 274 1041 q 822 909 691 1041 q 953 569 953 777 q 899 326 953 443 q 750 124 846 210 l 969 124 l 969 0 "},"ύ":{x_min:0,x_max:617,ha:725,o:"m 617 352 q 540 93 617 199 q 308 -24 455 -24 q 76 93 161 -24 q 0 352 0 199 l 0 738 l 126 738 l 126 354 q 169 185 126 257 q 312 98 220 98 q 451 185 402 98 q 492 354 492 257 l 492 738 l 617 738 l 617 352 m 535 1040 l 346 819 l 262 819 l 397 1040 l 535 1040 "},z:{x_min:-0.015625,x_max:613.890625,ha:697,o:"m 613 0 l 0 0 l 0 100 l 433 630 l 20 630 l 20 738 l 594 738 l 593 636 l 163 110 l 613 110 l 613 0 "},"™":{x_min:0,x_max:894,ha:1000,o:"m 389 951 l 229 951 l 229 503 l 160 503 l 160 951 l 0 951 l 0 1011 l 389 1011 l 389 951 m 894 503 l 827 503 l 827 939 l 685 503 l 620 503 l 481 937 l 481 503 l 417 503 l 417 1011 l 517 1011 l 653 580 l 796 1010 l 894 1011 l 894 503 "},"ή":{x_min:0.78125,x_max:697,ha:810,o:"m 697 -278 l 572 -278 l 572 454 q 540 587 572 536 q 425 650 501 650 q 271 579 337 650 q 206 420 206 509 l 206 0 l 81 0 l 81 489 q 73 588 81 562 q 0 644 56 644 l 0 741 q 68 755 38 755 q 158 721 124 755 q 200 630 193 687 q 297 726 234 692 q 434 761 359 761 q 620 692 544 761 q 697 516 697 624 l 697 -278 m 479 1040 l 290 819 l 207 819 l 341 1040 l 479 1040 "},"Θ":{x_min:0,x_max:960,ha:1056,o:"m 960 507 q 833 129 960 280 q 476 -32 698 -32 q 123 129 255 -32 q 0 507 0 280 q 123 883 0 732 q 476 1045 255 1045 q 832 883 696 1045 q 960 507 960 732 m 817 500 q 733 789 817 669 q 476 924 639 924 q 223 792 317 924 q 142 507 142 675 q 222 222 142 339 q 476 89 315 89 q 730 218 636 89 q 817 500 817 334 m 716 449 l 243 449 l 243 571 l 716 571 l 716 449 "},"®":{x_min:-3,x_max:1008,ha:1106,o:"m 503 532 q 614 562 566 532 q 672 658 672 598 q 614 747 672 716 q 503 772 569 772 l 338 772 l 338 532 l 503 532 m 502 -7 q 123 151 263 -7 q -3 501 -3 294 q 123 851 -3 706 q 502 1011 263 1011 q 881 851 739 1011 q 1008 501 1008 708 q 883 151 1008 292 q 502 -7 744 -7 m 502 60 q 830 197 709 60 q 940 501 940 322 q 831 805 940 681 q 502 944 709 944 q 174 805 296 944 q 65 501 65 680 q 173 197 65 320 q 502 60 294 60 m 788 146 l 678 146 q 653 316 655 183 q 527 449 652 449 l 338 449 l 338 146 l 241 146 l 241 854 l 518 854 q 688 808 621 854 q 766 658 766 755 q 739 563 766 607 q 668 497 713 519 q 751 331 747 472 q 788 164 756 190 l 788 146 "},"~":{x_min:0,x_max:833,ha:931,o:"m 833 958 q 778 753 833 831 q 594 665 716 665 q 402 761 502 665 q 240 857 302 857 q 131 795 166 857 q 104 665 104 745 l 0 665 q 54 867 0 789 q 237 958 116 958 q 429 861 331 958 q 594 765 527 765 q 704 827 670 765 q 729 958 729 874 l 833 958 "},"Ε":{x_min:0,x_max:736.21875,ha:778,o:"m 736 0 l 0 0 l 0 1013 l 725 1013 l 725 889 l 139 889 l 139 585 l 677 585 l 677 467 l 139 467 l 139 125 l 736 125 l 736 0 "},"³":{x_min:0,x_max:450,ha:547,o:"m 450 552 q 379 413 450 464 q 220 366 313 366 q 69 414 130 366 q 0 567 0 470 l 85 567 q 126 470 85 504 q 225 437 168 437 q 320 467 280 437 q 360 552 360 498 q 318 632 360 608 q 213 657 276 657 q 195 657 203 657 q 176 657 181 657 l 176 722 q 279 733 249 722 q 334 815 334 752 q 300 881 334 856 q 220 907 267 907 q 133 875 169 907 q 97 781 97 844 l 15 781 q 78 926 15 875 q 220 972 135 972 q 364 930 303 972 q 426 817 426 888 q 344 697 426 733 q 421 642 392 681 q 450 552 450 603 "},"[":{x_min:0,x_max:273.609375,ha:371,o:"m 273 -281 l 0 -281 l 0 1013 l 273 1013 l 273 920 l 124 920 l 124 -187 l 273 -187 l 273 -281 "},L:{x_min:0,x_max:645.828125,ha:696,o:"m 645 0 l 0 0 l 0 1013 l 140 1013 l 140 126 l 645 126 l 645 0 "},"σ":{x_min:0,x_max:803.390625,ha:894,o:"m 803 628 l 633 628 q 713 368 713 512 q 618 93 713 204 q 357 -25 518 -25 q 94 91 194 -25 q 0 368 0 201 q 94 644 0 533 q 356 761 194 761 q 481 750 398 761 q 608 739 564 739 l 803 739 l 803 628 m 360 85 q 529 180 467 85 q 584 374 584 262 q 527 566 584 490 q 352 651 463 651 q 187 559 247 651 q 135 368 135 478 q 189 175 135 254 q 360 85 251 85 "},"ζ":{x_min:0,x_max:573,ha:642,o:"m 573 -40 q 553 -162 573 -97 q 510 -278 543 -193 l 400 -278 q 441 -187 428 -219 q 462 -90 462 -132 q 378 -14 462 -14 q 108 45 197 -14 q 0 290 0 117 q 108 631 0 462 q 353 901 194 767 l 55 901 l 55 1012 l 561 1012 l 561 924 q 261 669 382 831 q 128 301 128 489 q 243 117 128 149 q 458 98 350 108 q 573 -40 573 80 "},"θ":{x_min:0,x_max:674,ha:778,o:"m 674 496 q 601 160 674 304 q 336 -26 508 -26 q 73 153 165 -26 q 0 485 0 296 q 72 840 0 683 q 343 1045 166 1045 q 605 844 516 1045 q 674 496 674 692 m 546 579 q 498 798 546 691 q 336 935 437 935 q 178 798 237 935 q 126 579 137 701 l 546 579 m 546 475 l 126 475 q 170 233 126 348 q 338 80 230 80 q 504 233 447 80 q 546 475 546 346 "},"Ο":{x_min:0,x_max:958,ha:1054,o:"m 485 1042 q 834 883 703 1042 q 958 511 958 735 q 834 136 958 287 q 481 -26 701 -26 q 126 130 261 -26 q 0 504 0 279 q 127 880 0 729 q 485 1042 263 1042 m 480 98 q 731 225 638 98 q 815 504 815 340 q 733 783 815 670 q 480 913 640 913 q 226 785 321 913 q 142 504 142 671 q 226 224 142 339 q 480 98 319 98 "},"Γ":{x_min:0,x_max:705.28125,ha:749,o:"m 705 886 l 140 886 l 140 0 l 0 0 l 0 1012 l 705 1012 l 705 886 "}," ":{x_min:0,x_max:0,ha:375},"%":{x_min:-3,x_max:1089,ha:1186,o:"m 845 0 q 663 76 731 0 q 602 244 602 145 q 661 412 602 344 q 845 489 728 489 q 1027 412 959 489 q 1089 244 1089 343 q 1029 76 1089 144 q 845 0 962 0 m 844 103 q 945 143 909 103 q 981 243 981 184 q 947 340 981 301 q 844 385 909 385 q 744 342 781 385 q 708 243 708 300 q 741 147 708 186 q 844 103 780 103 m 888 986 l 284 -25 l 199 -25 l 803 986 l 888 986 m 241 468 q 58 545 126 468 q -3 715 -3 615 q 56 881 -3 813 q 238 958 124 958 q 421 881 353 958 q 483 712 483 813 q 423 544 483 612 q 241 468 356 468 m 241 855 q 137 811 175 855 q 100 710 100 768 q 136 612 100 653 q 240 572 172 572 q 344 614 306 572 q 382 713 382 656 q 347 810 382 771 q 241 855 308 855 "},P:{x_min:0,x_max:726,ha:806,o:"m 424 1013 q 640 931 555 1013 q 726 719 726 850 q 637 506 726 587 q 413 426 548 426 l 140 426 l 140 0 l 0 0 l 0 1013 l 424 1013 m 379 889 l 140 889 l 140 548 l 372 548 q 522 589 459 548 q 593 720 593 637 q 528 845 593 801 q 379 889 463 889 "},"Έ":{x_min:0,x_max:1078.21875,ha:1118,o:"m 1078 0 l 342 0 l 342 1013 l 1067 1013 l 1067 889 l 481 889 l 481 585 l 1019 585 l 1019 467 l 481 467 l 481 125 l 1078 125 l 1078 0 m 277 1040 l 83 799 l 0 799 l 140 1040 l 277 1040 "},"Ώ":{x_min:0.125,x_max:1136.546875,ha:1235,o:"m 1136 0 l 722 0 l 722 123 q 911 309 842 194 q 981 558 981 423 q 893 813 981 710 q 651 923 800 923 q 411 821 501 923 q 321 568 321 720 q 390 316 321 433 q 579 123 459 200 l 579 0 l 166 0 l 166 124 l 384 124 q 235 327 289 210 q 182 572 182 444 q 311 912 182 782 q 651 1042 441 1042 q 989 910 858 1042 q 1120 569 1120 778 q 1066 326 1120 443 q 917 124 1013 210 l 1136 124 l 1136 0 m 277 1040 l 83 800 l 0 800 l 140 1041 l 277 1040 "},_:{x_min:0,x_max:705.5625,ha:803,o:"m 705 -334 l 0 -334 l 0 -234 l 705 -234 l 705 -334 "},"Ϊ":{x_min:-110,x_max:246,ha:275,o:"m 246 1046 l 118 1046 l 118 1189 l 246 1189 l 246 1046 m 18 1046 l -110 1046 l -110 1189 l 18 1189 l 18 1046 m 136 0 l 0 0 l 0 1012 l 136 1012 l 136 0 "},"+":{x_min:23,x_max:768,ha:792,o:"m 768 372 l 444 372 l 444 0 l 347 0 l 347 372 l 23 372 l 23 468 l 347 468 l 347 840 l 444 840 l 444 468 l 768 468 l 768 372 "},"½":{x_min:0,x_max:1050,ha:1149,o:"m 1050 0 l 625 0 q 712 178 625 108 q 878 277 722 187 q 967 385 967 328 q 932 456 967 429 q 850 484 897 484 q 759 450 798 484 q 721 352 721 416 l 640 352 q 706 502 640 448 q 851 551 766 551 q 987 509 931 551 q 1050 385 1050 462 q 976 251 1050 301 q 829 179 902 215 q 717 68 740 133 l 1050 68 l 1050 0 m 834 985 l 215 -28 l 130 -28 l 750 984 l 834 985 m 224 422 l 142 422 l 142 811 l 0 811 l 0 867 q 104 889 62 867 q 164 973 157 916 l 224 973 l 224 422 "},"Ρ":{x_min:0,x_max:720,ha:783,o:"m 424 1013 q 637 933 554 1013 q 720 723 720 853 q 633 508 720 591 q 413 426 546 426 l 140 426 l 140 0 l 0 0 l 0 1013 l 424 1013 m 378 889 l 140 889 l 140 548 l 371 548 q 521 589 458 548 q 592 720 592 637 q 527 845 592 801 q 378 889 463 889 "},"'":{x_min:0,x_max:139,ha:236,o:"m 139 851 q 102 737 139 784 q 0 669 65 690 l 0 734 q 59 787 42 741 q 72 873 72 821 l 0 873 l 0 1013 l 139 1013 l 139 851 "},"ª":{x_min:0,x_max:350,ha:397,o:"m 350 625 q 307 616 328 616 q 266 631 281 616 q 247 673 251 645 q 190 628 225 644 q 116 613 156 613 q 32 641 64 613 q 0 722 0 669 q 72 826 0 800 q 247 866 159 846 l 247 887 q 220 934 247 916 q 162 953 194 953 q 104 934 129 953 q 76 882 80 915 l 16 882 q 60 976 16 941 q 166 1011 104 1011 q 266 979 224 1011 q 308 891 308 948 l 308 706 q 311 679 308 688 q 331 670 315 670 l 350 672 l 350 625 m 247 757 l 247 811 q 136 790 175 798 q 64 726 64 773 q 83 682 64 697 q 132 667 103 667 q 207 690 174 667 q 247 757 247 718 "},"΅":{x_min:0,x_max:450,ha:553,o:"m 450 800 l 340 800 l 340 925 l 450 925 l 450 800 m 406 1040 l 212 800 l 129 800 l 269 1040 l 406 1040 m 110 800 l 0 800 l 0 925 l 110 925 l 110 800 "},T:{x_min:0,x_max:777,ha:835,o:"m 777 894 l 458 894 l 458 0 l 319 0 l 319 894 l 0 894 l 0 1013 l 777 1013 l 777 894 "},"Φ":{x_min:0,x_max:915,ha:997,o:"m 527 0 l 389 0 l 389 122 q 110 231 220 122 q 0 509 0 340 q 110 785 0 677 q 389 893 220 893 l 389 1013 l 527 1013 l 527 893 q 804 786 693 893 q 915 509 915 679 q 805 231 915 341 q 527 122 696 122 l 527 0 m 527 226 q 712 310 641 226 q 779 507 779 389 q 712 705 779 627 q 527 787 641 787 l 527 226 m 389 226 l 389 787 q 205 698 275 775 q 136 505 136 620 q 206 308 136 391 q 389 226 276 226 "},"⁋":{x_min:0,x_max:0,ha:694},j:{x_min:-77.78125,x_max:167,ha:349,o:"m 167 871 l 42 871 l 42 1013 l 167 1013 l 167 871 m 167 -80 q 121 -231 167 -184 q -26 -278 76 -278 l -77 -278 l -77 -164 l -41 -164 q 26 -143 11 -164 q 42 -65 42 -122 l 42 737 l 167 737 l 167 -80 "},"Σ":{x_min:0,x_max:756.953125,ha:819,o:"m 756 0 l 0 0 l 0 107 l 395 523 l 22 904 l 22 1013 l 745 1013 l 745 889 l 209 889 l 566 523 l 187 125 l 756 125 l 756 0 "},"›":{x_min:18.0625,x_max:774,ha:792,o:"m 774 376 l 18 40 l 18 149 l 631 421 l 18 692 l 18 799 l 774 465 l 774 376 "},"<":{x_min:17.984375,x_max:773.609375,ha:792,o:"m 773 40 l 18 376 l 17 465 l 773 799 l 773 692 l 159 420 l 773 149 l 773 40 "},"£":{x_min:0,x_max:704.484375,ha:801,o:"m 704 41 q 623 -10 664 5 q 543 -26 583 -26 q 359 15 501 -26 q 243 36 288 36 q 158 23 197 36 q 73 -21 119 10 l 6 76 q 125 195 90 150 q 175 331 175 262 q 147 443 175 383 l 0 443 l 0 512 l 108 512 q 43 734 43 623 q 120 929 43 854 q 358 1010 204 1010 q 579 936 487 1010 q 678 729 678 857 l 678 684 l 552 684 q 504 838 552 780 q 362 896 457 896 q 216 852 263 896 q 176 747 176 815 q 199 627 176 697 q 248 512 217 574 l 468 512 l 468 443 l 279 443 q 297 356 297 398 q 230 194 297 279 q 153 107 211 170 q 227 133 190 125 q 293 142 264 142 q 410 119 339 142 q 516 96 482 96 q 579 105 550 96 q 648 142 608 115 l 704 41 "},t:{x_min:0,x_max:367,ha:458,o:"m 367 0 q 312 -5 339 -2 q 262 -8 284 -8 q 145 28 183 -8 q 108 143 108 64 l 108 638 l 0 638 l 0 738 l 108 738 l 108 944 l 232 944 l 232 738 l 367 738 l 367 638 l 232 638 l 232 185 q 248 121 232 140 q 307 102 264 102 q 345 104 330 102 q 367 107 360 107 l 367 0 "},"¬":{x_min:0,x_max:706,ha:803,o:"m 706 411 l 706 158 l 630 158 l 630 335 l 0 335 l 0 411 l 706 411 "},"λ":{x_min:0,x_max:750,ha:803,o:"m 750 -7 q 679 -15 716 -15 q 538 59 591 -15 q 466 214 512 97 l 336 551 l 126 0 l 0 0 l 270 705 q 223 837 247 770 q 116 899 190 899 q 90 898 100 899 l 90 1004 q 152 1011 125 1011 q 298 938 244 1011 q 373 783 326 901 l 605 192 q 649 115 629 136 q 716 95 669 95 l 736 95 q 750 97 745 97 l 750 -7 "},W:{x_min:0,x_max:1263.890625,ha:1351,o:"m 1263 1013 l 995 0 l 859 0 l 627 837 l 405 0 l 265 0 l 0 1013 l 136 1013 l 342 202 l 556 1013 l 701 1013 l 921 207 l 1133 1012 l 1263 1013 "},">":{x_min:18.0625,x_max:774,ha:792,o:"m 774 376 l 18 40 l 18 149 l 631 421 l 18 692 l 18 799 l 774 465 l 774 376 "},v:{x_min:0,x_max:675.15625,ha:761,o:"m 675 738 l 404 0 l 272 0 l 0 738 l 133 737 l 340 147 l 541 737 l 675 738 "},"τ":{x_min:0.28125,x_max:644.5,ha:703,o:"m 644 628 l 382 628 l 382 179 q 388 120 382 137 q 436 91 401 91 q 474 94 447 91 q 504 97 501 97 l 504 0 q 454 -9 482 -5 q 401 -14 426 -14 q 278 67 308 -14 q 260 233 260 118 l 260 628 l 0 628 l 0 739 l 644 739 l 644 628 "},"ξ":{x_min:0,x_max:624.9375,ha:699,o:"m 624 -37 q 608 -153 624 -96 q 563 -278 593 -211 l 454 -278 q 491 -183 486 -200 q 511 -83 511 -126 q 484 -23 511 -44 q 370 1 452 1 q 323 0 354 1 q 283 -1 293 -1 q 84 76 169 -1 q 0 266 0 154 q 56 431 0 358 q 197 538 108 498 q 94 613 134 562 q 54 730 54 665 q 77 823 54 780 q 143 901 101 867 l 27 901 l 27 1012 l 576 1012 l 576 901 l 380 901 q 244 863 303 901 q 178 745 178 820 q 312 600 178 636 q 532 582 380 582 l 532 479 q 276 455 361 479 q 118 281 118 410 q 165 173 118 217 q 274 120 208 133 q 494 101 384 110 q 624 -37 624 76 "},"&":{x_min:-3,x_max:894.25,ha:992,o:"m 894 0 l 725 0 l 624 123 q 471 0 553 40 q 306 -41 390 -41 q 168 -7 231 -41 q 62 92 105 26 q 14 187 31 139 q -3 276 -3 235 q 55 433 -3 358 q 248 581 114 508 q 170 689 196 640 q 137 817 137 751 q 214 985 137 922 q 384 1041 284 1041 q 548 988 483 1041 q 622 824 622 928 q 563 666 622 739 q 431 556 516 608 l 621 326 q 649 407 639 361 q 663 493 653 426 l 781 493 q 703 229 781 352 l 894 0 m 504 818 q 468 908 504 877 q 384 940 433 940 q 293 907 331 940 q 255 818 255 875 q 289 714 255 767 q 363 628 313 678 q 477 729 446 682 q 504 818 504 771 m 556 209 l 314 499 q 179 395 223 449 q 135 283 135 341 q 146 222 135 253 q 183 158 158 192 q 333 80 241 80 q 556 209 448 80 "},"Λ":{x_min:0,x_max:862.5,ha:942,o:"m 862 0 l 719 0 l 426 847 l 143 0 l 0 0 l 356 1013 l 501 1013 l 862 0 "},I:{x_min:41,x_max:180,ha:293,o:"m 180 0 l 41 0 l 41 1013 l 180 1013 l 180 0 "},G:{x_min:0,x_max:921,ha:1011,o:"m 921 0 l 832 0 l 801 136 q 655 15 741 58 q 470 -28 568 -28 q 126 133 259 -28 q 0 499 0 284 q 125 881 0 731 q 486 1043 259 1043 q 763 957 647 1043 q 905 709 890 864 l 772 709 q 668 866 747 807 q 486 926 589 926 q 228 795 322 926 q 142 507 142 677 q 228 224 142 342 q 483 94 323 94 q 712 195 625 94 q 796 435 796 291 l 477 435 l 477 549 l 921 549 l 921 0 "},"ΰ":{x_min:0,x_max:617,ha:725,o:"m 524 800 l 414 800 l 414 925 l 524 925 l 524 800 m 183 800 l 73 800 l 73 925 l 183 925 l 183 800 m 617 352 q 540 93 617 199 q 308 -24 455 -24 q 76 93 161 -24 q 0 352 0 199 l 0 738 l 126 738 l 126 354 q 169 185 126 257 q 312 98 220 98 q 451 185 402 98 q 492 354 492 257 l 492 738 l 617 738 l 617 352 m 489 1040 l 300 819 l 216 819 l 351 1040 l 489 1040 "},"`":{x_min:0,x_max:138.890625,ha:236,o:"m 138 699 l 0 699 l 0 861 q 36 974 0 929 q 138 1041 72 1020 l 138 977 q 82 931 95 969 q 69 839 69 893 l 138 839 l 138 699 "},"·":{x_min:0,x_max:142,ha:239,o:"m 142 585 l 0 585 l 0 738 l 142 738 l 142 585 "},"Υ":{x_min:0.328125,x_max:819.515625,ha:889,o:"m 819 1013 l 482 416 l 482 0 l 342 0 l 342 416 l 0 1013 l 140 1013 l 411 533 l 679 1013 l 819 1013 "},r:{x_min:0,x_max:355.5625,ha:432,o:"m 355 621 l 343 621 q 179 569 236 621 q 122 411 122 518 l 122 0 l 0 0 l 0 737 l 117 737 l 117 604 q 204 719 146 686 q 355 753 262 753 l 355 621 "},x:{x_min:0,x_max:675,ha:764,o:"m 675 0 l 525 0 l 331 286 l 144 0 l 0 0 l 256 379 l 12 738 l 157 737 l 336 473 l 516 738 l 661 738 l 412 380 l 675 0 "},"μ":{x_min:0,x_max:696.609375,ha:747,o:"m 696 -4 q 628 -14 657 -14 q 498 97 513 -14 q 422 8 470 41 q 313 -24 374 -24 q 207 3 258 -24 q 120 80 157 31 l 120 -278 l 0 -278 l 0 738 l 124 738 l 124 343 q 165 172 124 246 q 308 82 216 82 q 451 177 402 82 q 492 358 492 254 l 492 738 l 616 738 l 616 214 q 623 136 616 160 q 673 92 636 92 q 696 95 684 92 l 696 -4 "},h:{x_min:0,x_max:615,ha:724,o:"m 615 472 l 615 0 l 490 0 l 490 454 q 456 590 490 535 q 338 654 416 654 q 186 588 251 654 q 122 436 122 522 l 122 0 l 0 0 l 0 1013 l 122 1013 l 122 633 q 218 727 149 694 q 362 760 287 760 q 552 676 484 760 q 615 472 615 600 "},".":{x_min:0,x_max:142,ha:239,o:"m 142 0 l 0 0 l 0 151 l 142 151 l 142 0 "},"φ":{x_min:-2,x_max:878,ha:974,o:"m 496 -279 l 378 -279 l 378 -17 q 101 88 204 -17 q -2 367 -2 194 q 68 626 -2 510 q 283 758 151 758 l 283 646 q 167 537 209 626 q 133 373 133 462 q 192 177 133 254 q 378 93 259 93 l 378 758 q 445 764 426 763 q 476 765 464 765 q 765 659 653 765 q 878 377 878 553 q 771 96 878 209 q 496 -17 665 -17 l 496 -279 m 496 93 l 514 93 q 687 183 623 93 q 746 380 746 265 q 691 569 746 491 q 522 658 629 658 l 496 656 l 496 93 "},";":{x_min:0,x_max:142,ha:239,o:"m 142 585 l 0 585 l 0 738 l 142 738 l 142 585 m 142 -12 q 105 -132 142 -82 q 0 -206 68 -182 l 0 -138 q 58 -82 43 -123 q 68 0 68 -56 l 0 0 l 0 151 l 142 151 l 142 -12 "},f:{x_min:0,x_max:378,ha:472,o:"m 378 638 l 246 638 l 246 0 l 121 0 l 121 638 l 0 638 l 0 738 l 121 738 q 137 935 121 887 q 290 1028 171 1028 q 320 1027 305 1028 q 378 1021 334 1026 l 378 908 q 323 918 346 918 q 257 870 273 918 q 246 780 246 840 l 246 738 l 378 738 l 378 638 "},"“":{x_min:1,x_max:348.21875,ha:454,o:"m 140 670 l 1 670 l 1 830 q 37 943 1 897 q 140 1011 74 990 l 140 947 q 82 900 97 940 q 68 810 68 861 l 140 810 l 140 670 m 348 670 l 209 670 l 209 830 q 245 943 209 897 q 348 1011 282 990 l 348 947 q 290 900 305 940 q 276 810 276 861 l 348 810 l 348 670 "},A:{x_min:0.03125,x_max:906.953125,ha:1008,o:"m 906 0 l 756 0 l 648 303 l 251 303 l 142 0 l 0 0 l 376 1013 l 529 1013 l 906 0 m 610 421 l 452 867 l 293 421 l 610 421 "},"‘":{x_min:1,x_max:139.890625,ha:236,o:"m 139 670 l 1 670 l 1 830 q 37 943 1 897 q 139 1011 74 990 l 139 947 q 82 900 97 940 q 68 810 68 861 l 139 810 l 139 670 "},"ϊ":{x_min:-70,x_max:283,ha:361,o:"m 283 800 l 173 800 l 173 925 l 283 925 l 283 800 m 40 800 l -70 800 l -70 925 l 40 925 l 40 800 m 283 3 q 232 -10 257 -5 q 181 -15 206 -15 q 84 26 118 -15 q 41 200 41 79 l 41 737 l 166 737 l 167 215 q 171 141 167 157 q 225 101 182 101 q 247 103 238 101 q 283 112 256 104 l 283 3 "},"π":{x_min:-0.21875,x_max:773.21875,ha:857,o:"m 773 -7 l 707 -11 q 575 40 607 -11 q 552 174 552 77 l 552 226 l 552 626 l 222 626 l 222 0 l 97 0 l 97 626 l 0 626 l 0 737 l 773 737 l 773 626 l 676 626 l 676 171 q 695 103 676 117 q 773 90 714 90 l 773 -7 "},"ά":{x_min:0,x_max:765.5625,ha:809,o:"m 765 -4 q 698 -14 726 -14 q 564 97 586 -14 q 466 7 525 40 q 337 -26 407 -26 q 88 98 186 -26 q 0 369 0 212 q 88 637 0 525 q 337 760 184 760 q 465 727 407 760 q 563 637 524 695 l 563 738 l 685 738 l 685 222 q 693 141 685 168 q 748 94 708 94 q 765 95 760 94 l 765 -4 m 584 371 q 531 562 584 485 q 360 653 470 653 q 192 566 254 653 q 135 379 135 489 q 186 181 135 261 q 358 84 247 84 q 528 176 465 84 q 584 371 584 260 m 604 1040 l 415 819 l 332 819 l 466 1040 l 604 1040 "},O:{x_min:0,x_max:958,ha:1057,o:"m 485 1041 q 834 882 702 1041 q 958 512 958 734 q 834 136 958 287 q 481 -26 702 -26 q 126 130 261 -26 q 0 504 0 279 q 127 880 0 728 q 485 1041 263 1041 m 480 98 q 731 225 638 98 q 815 504 815 340 q 733 783 815 669 q 480 912 640 912 q 226 784 321 912 q 142 504 142 670 q 226 224 142 339 q 480 98 319 98 "},n:{x_min:0,x_max:615,ha:724,o:"m 615 463 l 615 0 l 490 0 l 490 454 q 453 592 490 537 q 331 656 410 656 q 178 585 240 656 q 117 421 117 514 l 117 0 l 0 0 l 0 738 l 117 738 l 117 630 q 218 728 150 693 q 359 764 286 764 q 552 675 484 764 q 615 463 615 593 "},l:{x_min:41,x_max:166,ha:279,o:"m 166 0 l 41 0 l 41 1013 l 166 1013 l 166 0 "},"¤":{x_min:40.09375,x_max:728.796875,ha:825,o:"m 728 304 l 649 224 l 512 363 q 383 331 458 331 q 256 363 310 331 l 119 224 l 40 304 l 177 441 q 150 553 150 493 q 184 673 150 621 l 40 818 l 119 898 l 267 749 q 321 766 291 759 q 384 773 351 773 q 447 766 417 773 q 501 749 477 759 l 649 898 l 728 818 l 585 675 q 612 618 604 648 q 621 553 621 587 q 591 441 621 491 l 728 304 m 384 682 q 280 643 318 682 q 243 551 243 604 q 279 461 243 499 q 383 423 316 423 q 487 461 449 423 q 525 553 525 500 q 490 641 525 605 q 384 682 451 682 "},"κ":{x_min:0,x_max:632.328125,ha:679,o:"m 632 0 l 482 0 l 225 384 l 124 288 l 124 0 l 0 0 l 0 738 l 124 738 l 124 446 l 433 738 l 596 738 l 312 466 l 632 0 "},p:{x_min:0,x_max:685,ha:786,o:"m 685 364 q 598 96 685 205 q 350 -23 504 -23 q 121 89 205 -23 l 121 -278 l 0 -278 l 0 738 l 121 738 l 121 633 q 220 726 159 691 q 351 761 280 761 q 598 636 504 761 q 685 364 685 522 m 557 371 q 501 560 557 481 q 330 651 437 651 q 162 559 223 651 q 108 366 108 479 q 162 177 108 254 q 333 87 224 87 q 502 178 441 87 q 557 371 557 258 "},"‡":{x_min:0,x_max:777,ha:835,o:"m 458 238 l 458 0 l 319 0 l 319 238 l 0 238 l 0 360 l 319 360 l 319 681 l 0 683 l 0 804 l 319 804 l 319 1015 l 458 1013 l 458 804 l 777 804 l 777 683 l 458 683 l 458 360 l 777 360 l 777 238 l 458 238 "},"ψ":{x_min:0,x_max:808,ha:907,o:"m 465 -278 l 341 -278 l 341 -15 q 87 102 180 -15 q 0 378 0 210 l 0 739 l 133 739 l 133 379 q 182 195 133 275 q 341 98 242 98 l 341 922 l 465 922 l 465 98 q 623 195 563 98 q 675 382 675 278 l 675 742 l 808 742 l 808 381 q 720 104 808 213 q 466 -13 627 -13 l 465 -278 "},"η":{x_min:0.78125,x_max:697,ha:810,o:"m 697 -278 l 572 -278 l 572 454 q 540 587 572 536 q 425 650 501 650 q 271 579 337 650 q 206 420 206 509 l 206 0 l 81 0 l 81 489 q 73 588 81 562 q 0 644 56 644 l 0 741 q 68 755 38 755 q 158 720 124 755 q 200 630 193 686 q 297 726 234 692 q 434 761 359 761 q 620 692 544 761 q 697 516 697 624 l 697 -278 "}};
// eslint-disable-next-line
const cssFontWeight='normal', ascender=1189, underlinePosition=-100, cssFontStyle='normal', boundingBox={yMin:-334,xMin:-111,yMax:1189,xMax:1672}, resolution = 1000, original_font_information={postscript_name:"Helvetiker-Regular",version_string:"Version 1.00 2004 initial release",vendor_url:"http://www.magenta.gr/",full_font_name:"Helvetiker",font_family_name:"Helvetiker",copyright:"Copyright (c) Μagenta ltd, 2004",description:"",trademark:"",designer:"",designer_url:"",unique_font_identifier:"Μagenta ltd:Helvetiker:22-10-104",license_url:"http://www.ellak.gr/fonts/MgOpen/license.html",license_description:"Copyright (c) 2004 by MAGENTA Ltd. All Rights Reserved.\r\n\r\nPermission is hereby granted, free of charge, to any person obtaining a copy of the fonts accompanying this license (\"Fonts\") and associated documentation files (the \"Font Software\"), to reproduce and distribute the Font Software, including without limitation the rights to use, copy, merge, publish, distribute, and/or sell copies of the Font Software, and to permit persons to whom the Font Software is furnished to do so, subject to the following conditions: \r\n\r\nThe above copyright and this permission notice shall be included in all copies of one or more of the Font Software typefaces.\r\n\r\nThe Font Software may be modified, altered, or added to, and in particular the designs of glyphs or characters in the Fonts may be modified and additional glyphs or characters may be added to the Fonts, only if the fonts are renamed to names not containing the word \"MgOpen\", or if the modifications are accepted for inclusion in the Font Software itself by the each appointed Administrator.\r\n\r\nThis License becomes null and void to the extent applicable to Fonts or Font Software that has been modified and is distributed under the \"MgOpen\" name.\r\n\r\nThe Font Software may be sold as part of a larger software package but no copy of one or more of the Font Software typefaces may be sold by itself. \r\n\r\nTHE FONT SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL MAGENTA OR PERSONS OR BODIES IN CHARGE OF ADMINISTRATION AND MAINTENANCE OF THE FONT SOFTWARE BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM OTHER DEALINGS IN THE FONT SOFTWARE.",manufacturer_name:"Μagenta ltd",font_sub_family_name:"Regular"}, descender = -334, familyName = 'Helvetiker', lineHeight = 1522, underlineThickness = 50, helvetiker_regular_typeface = {glyphs, cssFontWeight, ascender, underlinePosition, cssFontStyle, boundingBox, resolution,original_font_information, descender, familyName, lineHeight, underlineThickness};

   return new Font({
      ascender, boundingBox, cssFontStyle, cssFontWeight, default: helvetiker_regular_typeface, descender, familyName, glyphs,
      lineHeight, original_font_information, resolution, underlinePosition, underlineThickness
   });
}

// eslint-disable-next-line
new createHelveticaFont();

/** @summary Help structures for calculating Box mesh
  * @private */
const Box3D = {
    Vertices: [new Vector3(1, 1, 1), new Vector3(1, 1, 0),
               new Vector3(1, 0, 1), new Vector3(1, 0, 0),
               new Vector3(0, 1, 0), new Vector3(0, 1, 1),
               new Vector3(0, 0, 0), new Vector3(0, 0, 1)],
    Indexes: [0, 2, 1, 2, 3, 1, 4, 6, 5, 6, 7, 5, 4, 5, 1, 5, 0, 1,
              7, 6, 2, 6, 3, 2, 5, 7, 0, 7, 2, 0, 1, 3, 4, 3, 6, 4],
    Normals: [1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1],
    Segments: [0, 2, 2, 7, 7, 5, 5, 0, 1, 3, 3, 6, 6, 4, 4, 1, 1, 0, 3, 2, 6, 7, 4, 5],  // segments addresses Vertices
    MeshSegments: undefined
};

// these segments address vertices from the mesh, we can use positions from box mesh
Box3D.MeshSegments = (function() {
   const arr = new Int32Array(Box3D.Segments.length);

   for (let n = 0; n < arr.length; ++n) {
      for (let k = 0; k < Box3D.Indexes.length; ++k) {
         if (Box3D.Segments[n] === Box3D.Indexes[k]) {
            arr[n] = k;
            break;
         }
      }
   }
   return arr;
})();

/**
 * @summary Abstract class for creating context menu
 *
 * @desc Use {@link createMenu} to create instance of the menu
 * @private
 */

class JSRootMenu {

   constructor(painter, menuname, show_event) {
      this.painter = painter;
      this.menuname = menuname;
      if (isObject(show_event) && (show_event.clientX !== undefined) && (show_event.clientY !== undefined))
         this.show_evnt = { clientX: show_event.clientX, clientY: show_event.clientY, skip_close: show_event.skip_close };

      this.remove_handler = () => this.remove();
      this.element = null;
      this.cnt = 0;
   }

   native() { return false; }

   async load() { return this; }

   /** @summary Returns object with mouse event position when context menu was actiavted
     * @desc Return object will have members 'clientX' and 'clientY' */
   getEventPosition() { return this.show_evnt; }

   add(/* name, arg, func, title */) {
      throw Error('add() method has to be implemented in the menu');
   }

   /** @summary Returns menu size */
   size() { return this.cnt; }

   /** @summary Close and remove menu */
   remove() {
      if (!this.element)
         return;

      if (this.show_evnt?.skip_close) {
         this.show_evnt.skip_close = 0;
         return;
      }

      this.element.remove();
      this.element = null;
      if (isFunc(this.resolveFunc)) {
         const func = this.resolveFunc;
         delete this.resolveFunc;
         func();
      }
      document.body.removeEventListener('click', this.remove_handler);
   }

   show(/* event */) {
      throw Error('show() method has to be implemented in the menu class');
   }

   /** @summary Add checked menu item
     * @param {boolean} flag - flag
     * @param {string} name - item name
     * @param {function} func - func called when item is selected */
   addchk(flag, name, arg, func, title) {
      let handler = func;
      if (isFunc(arg)) {
         title = func;
         func = arg;
         handler = res => func(res === '1');
         arg = flag ? '0' : '1';
      }
      this.add((flag ? 'chk:' : 'unk:') + name, arg, handler, title);
   }

   /** @summary Add draw sub-menu with draw options
     * @protected */
   addDrawMenu(top_name, opts, call_back, title) {
      if (!opts || !opts.length)
         return;

      let without_sub = false;
      if (top_name.indexOf('nosub:') === 0) {
         without_sub = true;
         top_name = top_name.slice(6);
      }

      if (opts.length === 1) {
         if (opts[0] === kInspect)
            top_name = top_name.replace('Draw', 'Inspect');
         this.add(top_name, opts[0], call_back);
         return;
      }

      if (!without_sub)
         this.add('sub:' + top_name, opts[0], call_back, title);

      for (let i = 1; i < opts.length; ++i) {
         let name = opts[i] || (this._use_plain_text ? '<dflt>' : '&lt;dflt&gt;'),
             group = i+1;
         if (opts.length > 5) {
            // check if there are similar options, which can be grouped once again
            while ((group < opts.length) && (opts[group].indexOf(name) === 0)) group++;
         }

         if (without_sub)
            name = top_name + ' ' + name;

         if (group >= i+2) {
            this.add('sub:' + name, opts[i], call_back);
            for (let k = i+1; k < group; ++k)
               this.add(opts[k], opts[k], call_back);
            this.add('endsub:');
            i = group - 1;
         } else if (name === kInspect) {
            this.add('sub:' + name, opts[i], call_back, 'Inspect object content');
            for (let k = 0; k < 10; ++k)
               this.add(k.toString(), kInspect + k, call_back, `Inspect object and expand to level ${k}`);
            this.add('endsub:');
         } else
            this.add(name, opts[i], call_back);
      }
      if (!without_sub) {
         this.add('<input>', () => {
            const opt = isFunc(this.painter?.getDrawOpt) ? this.painter.getDrawOpt() : opts[0];
            this.input('Provide draw option', opt, 'text').then(call_back);
         }, 'Enter draw option in dialog');
         this.add('endsub:');
      }
   }

   /** @summary Add color selection menu entries
     * @protected */
   addColorMenu(name, value, set_func, fill_kind) {
      if (value === undefined) return;
      const useid = !isStr(value);
      this.add('sub:' + name, () => {
         this.input('Enter color ' + (useid ? '(only id number)' : '(name or id)'), value, useid ? 'int' : 'text', useid ? 0 : undefined, useid ? 9999 : undefined).then(col => {
            const id = parseInt(col);
            if (Number.isInteger(id) && getColor(id))
               col = getColor(id);
             else
               if (useid) return;

            set_func(useid ? id : col);
         });
      });

      for (let ncolumn = 0; ncolumn < 5; ++ncolumn) {
         this.add('column:');

         for (let nrow = 0; nrow < 10; nrow++) {
            let n = ncolumn*10 + nrow;
            if (!useid) --n; // use -1 as none color

            let col = (n < 0) ? 'none' : getColor(n);
            if ((n === 0) && (fill_kind === 1)) col = 'none';
            const lbl = (n <= 0) || (col[0] !== '#') ? col : `col ${n}`,
                  fill = (n === 1) ? 'white' : 'black',
                  stroke = (n === 1) ? 'red' : 'black',
                  rect = (value === (useid ? n : col)) ? `<rect width="50" height="18" style="fill:none;stroke-width:3px;stroke:${stroke}"></rect>` : '',
                  svg = `<svg width="50" height="18" style="margin:0px;background-color:${col}">${rect}<text x="4" y="12" style='font-size:12px' fill="${fill}">${lbl}</text></svg>`;

            this.add(svg, (useid ? n : col), res => set_func(useid ? parseInt(res) : res), 'Select color ' + col);
         }

         this.add('endcolumn:');
         if (!this.native()) break;
      }

      this.add('endsub:');
   }

   /** @summary Add size selection menu entries
     * @protected */
   addSizeMenu(name, min, max, step, size_value, set_func, title) {
      if (size_value === undefined) return;

      let values = [], miss_current = false;
      if (isObject(step)) {
         values = step; step = 1;
      } else {
         for (let sz = min; sz <= max; sz += step)
            values.push(sz);
      }

      const match = v => Math.abs(v-size_value) < (max - min)*1e-5,
            conv = (v, more) => {
               if ((v === size_value) && miss_current) more = true;
               if (step >= 1) return v.toFixed(0);
               if (step >= 0.1) return v.toFixed(more ? 2 : 1);
               return v.toFixed(more ? 4 : 2);
           };

      if (values.findIndex(match) < 0) {
         miss_current = true;
         values.push(size_value);
         values = values.sort((a, b) => a > b);
      }

      this.add('sub:' + name, () => this.input('Enter value of ' + name, conv(size_value, true), (step >= 1) ? 'int' : 'float').then(set_func), title);
      values.forEach(v => this.addchk(match(v), conv(v), v, res => set_func((step >= 1) ? Number.parseInt(res) : Number.parseFloat(res))));
      this.add('endsub:');
   }

   /** @summary Add palette menu entries
     * @protected */
   addPaletteMenu(curr, set_func) {
      const add = (id, name, title, more) => {
         if (!name)
            name = `pal ${id}`;
         else if (!title)
            title = name;
         if (title) title += `, code ${id}`;
         this.addchk((id === curr) || more, '<nobr>' + name + '</nobr>', id, set_func, title || name);
      };

      this.add('sub:Palette', () => this.input('Enter palette code [1..113]', curr, 'int', 1, 113).then(set_func));

      this.add('column:');

      add(57, 'Bird', 'Default color palette', (curr > 113));
      add(55, 'Rainbow');
      add(51, 'Deep Sea');
      add(52, 'Grayscale', 'New gray scale');
      add(1, '', 'Old gray scale', (curr > 0) && (curr < 10));
      add(50, 'ROOT 5', 'Default color palette in ROOT 5', (curr >= 10) && (curr < 51));
      add(53, '', 'Dark body radiator');
      add(54, '', 'Two-color hue');
      add(56, '', 'Inverted dark body radiator');
      add(58, 'Cubehelix');
      add(59, '', 'Green Red Violet');
      add(60, '', 'Blue Red Yellow');
      add(61, 'Ocean');

      this.add('endcolumn:');

      if (!this.native())
         return this.add('endsub:');

      this.add('column:');

      add(62, '', 'Color Printable On Grey');
      add(63, 'Alpine');
      add(64, 'Aquamarine');
      add(65, 'Army');
      add(66, 'Atlantic');
      add(67, 'Aurora');
      add(68, 'Avocado');
      add(69, 'Beach');
      add(70, 'Black Body');
      add(71, '', 'Blue Green Yellow');
      add(72, 'Brown Cyan');
      add(73, 'CMYK');
      add(74, 'Candy');

      this.add('endcolumn:');
      this.add('column:');

      add(75, 'Cherry');
      add(76, 'Coffee');
      add(77, '', 'Dark Rain Bow');
      add(78, '', 'Dark Terrain');
      add(79, 'Fall');
      add(80, 'Fruit Punch');
      add(81, 'Fuchsia');
      add(82, 'Grey Yellow');
      add(83, '', 'Green Brown Terrain');
      add(84, 'Green Pink');
      add(85, 'Island');
      add(86, 'Lake');
      add(87, '', 'Light Temperature');

      this.add('endcolumn:');
      this.add('column:');

      add(88, '', 'Light Terrain');
      add(89, 'Mint');
      add(90, 'Neon');
      add(91, 'Pastel');
      add(92, 'Pearl');
      add(93, 'Pigeon');
      add(94, 'Plum');
      add(95, 'Red Blue');
      add(96, 'Rose');
      add(97, 'Rust');
      add(98, '', 'Sandy Terrain');
      add(99, 'Sienna');
      add(100, 'Solar');

      this.add('endcolumn:');
      this.add('column:');

      add(101, '', 'South West');
      add(102, '', 'Starry Night');
      add(103, '', 'Sunset');
      add(104, '', 'Temperature Map');
      add(105, '', 'Thermometer');
      add(106, 'Valentine');
      add(107, '', 'Visible Spectrum');
      add(108, '', 'Water Melon');
      add(109, 'Cool');
      add(110, 'Copper');
      add(111, '', 'Gist Earth');
      add(112, 'Viridis');
      add(113, 'Cividis');

      this.add('endcolumn:');

      this.add('endsub:');
   }

   /** @summary Add rebin menu entries
     * @protected */
   addRebinMenu(rebin_func) {
      this.add('sub:Rebin', () => this.input('Enter rebin value', 2, 'int', 2).then(rebin_func));
      for (let sz = 2; sz <= 7; sz++)
         this.add(sz.toString(), sz, res => rebin_func(parseInt(res)));
      this.add('endsub:');
   }

   /** @summary Add selection menu entries
     * @param {String} name - name of submenu
     * @param {Array} values - array of string entries used as list for selection
     * @param {String|Number} value - currently elected value, either name or index
     * @param {Function} set_func - function called when item selected, either name or index depending from value parameter
     * @protected */
   addSelectMenu(name, values, value, set_func) {
      const use_number = (typeof value === 'number');
      this.add('sub:' + name);
      for (let n = 0; n < values.length; ++n)
         this.addchk(use_number ? (n === value) : (values[n] === value), values[n], use_number ? n : values[n], res => set_func(use_number ? Number.parseInt(res) : res));
      this.add('endsub:');
   }

   /** @summary Add RColor selection menu entries
     * @protected */
   addRColorMenu(name, value, set_func) {
      // if (value === undefined) return;
      const colors = ['default', 'black', 'white', 'red', 'green', 'blue', 'yellow', 'magenta', 'cyan'];

      this.add('sub:' + name, () => {
         this.input('Enter color name - empty string will reset color', value).then(set_func);
      });
      let fillcol = 'black';
      for (let n = 0; n < colors.length; ++n) {
         const coltxt = colors[n];
         let match = false, bkgr = '';
         if (n > 0) {
            bkgr = 'background-color:' + coltxt;
            fillcol = (coltxt === 'white') ? 'black' : 'white';

            if (isStr(value) && value && (value !== 'auto') && (value[0] !== '['))
               match = (rgb(value).toString() === rgb(coltxt).toString());
         } else
            match = !value;

         const svg = `<svg width='100' height='18' style='margin:0px;${bkgr}'><text x='4' y='12' style='font-size:12px' fill='${fillcol}'>${coltxt}</text></svg>`;
         this.addchk(match, svg, coltxt, res => set_func(res === 'default' ? null : res));
      }
      this.add('endsub:');
   }

   /** @summary Add items to change RAttrText
     * @protected */
   addRAttrTextItems(fontHandler, opts, set_func) {
      if (!opts) opts = {};
      this.addRColorMenu('color', fontHandler.color, value => set_func({ name: 'color', value }));
      if (fontHandler.scaled)
         this.addSizeMenu('size', 0.01, 0.10, 0.01, fontHandler.size /fontHandler.scale, value => set_func({ name: 'size', value }));
      else
         this.addSizeMenu('size', 6, 20, 2, fontHandler.size, value => set_func({ name: 'size', value }));

      this.addSelectMenu('family', ['Arial', 'Times New Roman', 'Courier New', 'Symbol'], fontHandler.name, value => set_func({ name: 'font_family', value }));

      this.addSelectMenu('style', ['normal', 'italic', 'oblique'], fontHandler.style || 'normal', res => set_func({ name: 'font_style', value: res === 'normal' ? null : res }));

      this.addSelectMenu('weight', ['normal', 'lighter', 'bold', 'bolder'], fontHandler.weight || 'normal', res => set_func({ name: 'font_weight', value: res === 'normal' ? null : res }));

      if (!opts.noalign)
         this.add('align');
      if (!opts.noangle)
         this.add('angle');
   }

   /** @summary Add line style menu
     * @private */
   addLineStyleMenu(name, value, set_func) {
      this.add('sub:'+name, () => this.input('Enter line style id (1-solid)', value, 'int', 1, 11).then(val => {
         if (getSvgLineStyle(val)) set_func(val);
      }));
      for (let n = 1; n < 11; ++n) {
         const dash = getSvgLineStyle(n),
             svg = `<svg width='100' height='14'><text x='2' y='13' style='font-size:12px'>${n}</text><line x1='30' y1='7' x2='100' y2='7' stroke='black' stroke-width='3' stroke-dasharray='${dash}'></line></svg>`;

         this.addchk((value === n), svg, n, arg => set_func(parseInt(arg)));
      }
      this.add('endsub:');
   }

   /** @summary Add fill style menu
     * @private */
   addFillStyleMenu(name, value, color_index, painter, set_func) {
      this.add('sub:' + name, () => {
         this.input('Enter fill style id (1001-solid, 3000..3010)', value, 'int', 0, 4000).then(id => {
            if ((id >= 0) && (id <= 4000)) set_func(id);
         });
      });

      const supported = [1, 1001, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3010, 3021, 3022];

      for (let n = 0; n < supported.length; ++n) {
         let svg = supported[n];
         if (painter) {
            const sample = painter.createAttFill({ std: false, pattern: supported[n], color: color_index || 1 });
            svg = `<svg width='100' height='18'><text x='1' y='12' style='font-size:12px'>${supported[n].toString()}</text><rect x='40' y='0' width='60' height='18' stroke='none' fill='${sample.getFillColor()}'></rect></svg>`;
         }
         this.addchk(value === supported[n], svg, supported[n], arg => set_func(parseInt(arg)));
      }
      this.add('endsub:');
   }

   /** @summary Add font selection menu
     * @private */
   addFontMenu(name, value, set_func) {
      const prec = value && Number.isInteger(value) ? value % 10 : 2;

      this.add('sub:' + name, () => {
         this.input('Enter font id from [0..20]', Math.floor(value/10), 'int', 0, 20).then(id => {
            if ((id >= 0) && (id <= 20)) set_func(id*10 + prec);
         });
      });

      this.add('column:');

      const doc = getDocument();

      for (let n = 1; n < 20; ++n) {
         const id = n*10 + prec,
               handler = new FontHandler(id, 14),
               txt = select(doc.createElementNS('http://www.w3.org/2000/svg', 'text'));
         let fullname = handler.getFontName(), qual = '';
         if (handler.weight) { qual += 'b'; fullname += ' ' + handler.weight; }
         if (handler.style) { qual += handler.style[0]; fullname += ' ' + handler.style; }
         if (qual) qual = ' ' + qual;
         txt.attr('x', 1).attr('y', 15).text(fullname.split(' ')[0] + qual);
         handler.setFont(txt);

         const rect = (value !== id) ? '' : '<rect width=\'90\' height=\'18\' style=\'fill:none;stroke:black\'></rect>',
             svg = `<svg width='90' height='18'>${txt.node().outerHTML}${rect}</svg>`;
         this.add(svg, id, arg => set_func(parseInt(arg)), `${id}: ${fullname}`);

         if (n === 10) {
            this.add('endcolumn:');
            this.add('column:');
         }
      }

      this.add('endcolumn:');
      this.add('endsub:');
   }

   /** @summary Add align selection menu
     * @private */
   addAlignMenu(name, value, set_func) {
      this.add(`sub:${name}`, () => {
         this.input('Enter align like 12 or 31', value).then(arg => {
            const id = parseInt(arg);
            if ((id < 11) || (id > 33)) return;
            const h = Math.floor(id/10), v = id % 10;
            if ((h > 0) && (h < 4) && (v > 0) && (v < 4)) set_func(id);
         });
      });

      const hnames = ['left', 'middle', 'right'], vnames = ['bottom', 'centered', 'top'];
      for (let h = 1; h < 4; ++h) {
         for (let v = 1; v < 4; ++v)
            this.addchk(h*10+v === value, `${h*10+v}: ${hnames[h-1]} ${vnames[v-1]}`, h*10+v, arg => set_func(parseInt(arg)));
      }

      this.add('endsub:');
   }

   /** @summary Fill context menu for graphical attributes in painter
     * @desc this method used to fill entries for different attributes of the object
     * like TAttFill, TAttLine, TAttText
     * There is special handling for the frame where attributes handled by the pad
     * @private */
   addAttributesMenu(painter, preffix) {
      const is_frame = painter === painter.getFramePainter(),
            pp = is_frame ? painter.getPadPainter() : null;
      if (!preffix) preffix = '';

      if (painter.lineatt?.used) {
         this.add(`sub:${preffix}Line att`);
         this.addSizeMenu('width', 1, 10, 1, painter.lineatt.width, arg => {
            painter.lineatt.change(undefined, arg);
            changeObjectMember(painter, 'fLineWidth', arg);
            if (pp) changeObjectMember(pp, 'fFrameLineWidth', arg);
            painter.interactiveRedraw(true, `exec:SetLineWidth(${arg})`);
         });
         this.addColorMenu('color', painter.lineatt.color, arg => {
            painter.lineatt.change(arg);
            changeObjectMember(painter, 'fLineColor', arg, true);
            if (pp) changeObjectMember(pp, 'fFrameLineColor', arg, true);
            painter.interactiveRedraw(true, getColorExec(arg, 'SetLineColor'));
         });
         this.addLineStyleMenu('style', painter.lineatt.style, id => {
            painter.lineatt.change(undefined, undefined, id);
            changeObjectMember(painter, 'fLineStyle', id);
            if (pp) changeObjectMember(pp, 'fFrameLineStyle', id);
            painter.interactiveRedraw(true, `exec:SetLineStyle(${id})`);
         });
         this.add('endsub:');

         if (!is_frame && painter.lineatt?.excl_side) {
            this.add('sub:Exclusion');
            this.add('sub:side');
            for (let side = -1; side <= 1; ++side) {
               this.addchk((painter.lineatt.excl_side === side), side, side,
                  arg => { painter.lineatt.changeExcl(parseInt(arg)); painter.interactiveRedraw(); });
            }
            this.add('endsub:');

            this.addSizeMenu('width', 10, 100, 10, painter.lineatt.excl_width,
               arg => { painter.lineatt.changeExcl(undefined, arg); painter.interactiveRedraw(); });

            this.add('endsub:');
         }
      }

      if (painter.fillatt?.used) {
         this.add(`sub:${preffix}Fill att`);
         this.addColorMenu('color', painter.fillatt.colorindx, arg => {
            painter.fillatt.change(arg, undefined, painter.getCanvSvg());
            changeObjectMember(painter, 'fFillColor', arg, true);
            if (pp) changeObjectMember(pp, 'fFrameFillColor', arg, true);
            painter.interactiveRedraw(true, getColorExec(arg, 'SetFillColor'));
         }, painter.fillatt.kind);
         this.addFillStyleMenu('style', painter.fillatt.pattern, painter.fillatt.colorindx, painter, id => {
            painter.fillatt.change(undefined, id, painter.getCanvSvg());
            changeObjectMember(painter, 'fFillStyle', id);
            if (pp) changeObjectMember(pp, 'fFrameFillStyle', id);
            painter.interactiveRedraw(true, `exec:SetFillStyle(${id})`);
         });
         this.add('endsub:');
      }

      if (painter.markeratt?.used) {
         this.add(`sub:${preffix}Marker att`);
         this.addColorMenu('color', painter.markeratt.color, arg => {
            changeObjectMember(painter, 'fMarkerColor', arg, true);
            painter.markeratt.change(arg);
            painter.interactiveRedraw(true, getColorExec(arg, 'SetMarkerColor'));
         });
         this.addSizeMenu('size', 0.5, 6, 0.5, painter.markeratt.size, arg => {
            changeObjectMember(painter, 'fMarkerSize', arg);
            painter.markeratt.change(undefined, undefined, arg);
            painter.interactiveRedraw(true, `exec:SetMarkerSize(${arg})`);
         });

         this.add('sub:style');
         const supported = [1, 2, 3, 4, 5, 6, 7, 8, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34];

         for (let n = 0; n < supported.length; ++n) {
            const clone = new TAttMarkerHandler({ style: supported[n], color: painter.markeratt.color, size: 1.7 }),
                svg = `<svg width='60' height='18'><text x='1' y='12' style='font-size:12px'>${supported[n].toString()}</text><path stroke='black' fill='${clone.fill?'black':'none'}' d='${clone.create(40, 8)}'></path></svg>`;

            this.addchk(painter.markeratt.style === supported[n], svg, supported[n],
               arg => { painter.markeratt.change(undefined, parseInt(arg)); painter.interactiveRedraw(true, `exec:SetMarkerStyle(${arg})`); });
         }
         this.add('endsub:');
         this.add('endsub:');
      }

      if (painter.textatt?.used) {
         this.add(`sub:${preffix}Text att`);

         this.addFontMenu('font', painter.textatt.font, arg => {
            changeObjectMember(painter, 'fTextFont', arg);
            painter.textatt.change(arg);
            painter.interactiveRedraw(true, `exec:SetTextFont(${arg})`);
         });

         const rel = painter.textatt.size < 1.0;

         this.addSizeMenu('size', rel ? 0.03 : 6, rel ? 0.20 : 26, rel ? 0.01 : 2, painter.textatt.size, arg => {
            changeObjectMember(painter, 'fTextSize', arg);
            painter.textatt.change(undefined, arg);
            painter.interactiveRedraw(true, `exec:SetTextSize(${arg})`);
         });

         this.addColorMenu('color', painter.textatt.color, arg => {
            changeObjectMember(painter, 'fTextColor', arg, true);
            painter.textatt.change(undefined, undefined, arg);
            painter.interactiveRedraw(true, getColorExec(arg, 'SetTextColor'));
         });

         this.addAlignMenu('align', painter.textatt.align, arg => {
            changeObjectMember(painter, 'fTextAlign', arg);
            painter.textatt.change(undefined, undefined, undefined, arg);
            painter.interactiveRedraw(true, `exec:SetTextAlign(${arg})`);
         });

         if (painter.textatt.can_rotate) {
            this.addSizeMenu('angle', -180, 180, 45, painter.textatt.angle, arg => {
               changeObjectMember(painter, 'fTextAngle', arg);
               painter.textatt.change(undefined, undefined, undefined, undefined, arg);
               painter.interactiveRedraw(true, `exec:SetTextAngle(${arg})`);
            });
         }

         this.add('endsub:');
      }
   }

   /** @summary Fill context menu for axis
     * @private */
   addTAxisMenu(EAxisBits, painter, faxis, kind) {
      const is_gaxis = faxis._typename === clTGaxis;

      this.add('Divisions', () => this.input('Set Ndivisions', faxis.fNdivisions, 'int', 0).then(val => {
         faxis.fNdivisions = val; painter.interactiveRedraw('pad', `exec:SetNdivisions(${val})`, kind);
      }));

      this.add('sub:Labels');
      this.addchk(faxis.TestBit(EAxisBits.kCenterLabels), 'Center',
            arg => { faxis.InvertBit(EAxisBits.kCenterLabels); painter.interactiveRedraw('pad', `exec:CenterLabels(${arg})`, kind); });
      this.addchk(faxis.TestBit(EAxisBits.kLabelsVert), 'Rotate',
            arg => { faxis.InvertBit(EAxisBits.kLabelsVert); painter.interactiveRedraw('pad', `exec:SetBit(TAxis::kLabelsVert,${arg})`, kind); });
      this.addColorMenu('Color', faxis.fLabelColor,
            arg => { faxis.fLabelColor = arg; painter.interactiveRedraw('pad', getColorExec(arg, 'SetLabelColor'), kind); });
      this.addSizeMenu('Offset', -0.02, 0.1, 0.01, faxis.fLabelOffset,
            arg => { faxis.fLabelOffset = arg; painter.interactiveRedraw('pad', `exec:SetLabelOffset(${arg})`, kind); });
      let a = faxis.fLabelSize >= 1;
      this.addSizeMenu('Size', a ? 2 : 0.02, a ? 30 : 0.11, a ? 2 : 0.01, faxis.fLabelSize,
            arg => { faxis.fLabelSize = arg; painter.interactiveRedraw('pad', `exec:SetLabelSize(${arg})`, kind); });
      this.add('endsub:');
      this.add('sub:Title');
      this.add('SetTitle', () => {
         this.input('Enter axis title', faxis.fTitle).then(t => {
            faxis.fTitle = t;
            painter.interactiveRedraw('pad', `exec:SetTitle("${t}")`, kind);
         });
      });
      this.addchk(faxis.TestBit(EAxisBits.kCenterTitle), 'Center',
            arg => { faxis.InvertBit(EAxisBits.kCenterTitle); painter.interactiveRedraw('pad', `exec:CenterTitle(${arg})`, kind); });
      this.addchk(faxis.TestBit(EAxisBits.kOppositeTitle), 'Opposite',
             () => { faxis.InvertBit(EAxisBits.kOppositeTitle); painter.redrawPad(); });
      this.addchk(faxis.TestBit(EAxisBits.kRotateTitle), 'Rotate',
            arg => { faxis.InvertBit(EAxisBits.kRotateTitle); painter.interactiveRedraw('pad', is_gaxis ? `exec:SetBit(TAxis::kRotateTitle, ${arg})` : `exec:RotateTitle(${arg})`, kind); });
      if (is_gaxis) {
         this.addColorMenu('Color', faxis.fTextColor,
               arg => { faxis.fTextColor = arg; painter.interactiveRedraw('pad', getColorExec(arg, 'SetTitleColor'), kind); });
      } else {
         this.addColorMenu('Color', faxis.fTitleColor,
               arg => { faxis.fTitleColor = arg; painter.interactiveRedraw('pad', getColorExec(arg, 'SetTitleColor'), kind); });
      }
      this.addSizeMenu('Offset', 0, 3, 0.2, faxis.fTitleOffset,
                      arg => { faxis.fTitleOffset = arg; painter.interactiveRedraw('pad', `exec:SetTitleOffset(${arg})`, kind); });
      a = faxis.fTitleSize >= 1;
      this.addSizeMenu('Size', a ? 2 : 0.02, a ? 30 : 0.11, a ? 2 : 0.01, faxis.fTitleSize,
                      arg => { faxis.fTitleSize = arg; painter.interactiveRedraw('pad', `exec:SetTitleSize(${arg})`, kind); });
      this.add('endsub:');
      this.add('sub:Ticks');
      if (is_gaxis) {
         this.addColorMenu('Color', faxis.fLineColor,
                  arg => { faxis.fLineColor = arg; painter.interactiveRedraw('pad', getColorExec(arg, 'SetLineColor'), kind); });
         this.addSizeMenu('Size', -0.05, 0.055, 0.01, faxis.fTickSize,
                  arg => { faxis.fTickSize = arg; painter.interactiveRedraw('pad', `exec:SetTickLength(${arg})`, kind); });
      } else {
         this.addColorMenu('Color', faxis.fAxisColor,
                  arg => { faxis.fAxisColor = arg; painter.interactiveRedraw('pad', getColorExec(arg, 'SetAxisColor'), kind); });
         this.addSizeMenu('Size', -0.05, 0.055, 0.01, faxis.fTickLength,
                  arg => { faxis.fTickLength = arg; painter.interactiveRedraw('pad', `exec:SetTickLength(${arg})`, kind); });
      }
      this.add('endsub:');

      if (is_gaxis) {
         this.add('Options', () => this.input('Enter TGaxis options like +L or -G', faxis.fChopt, 'string').then(arg => {
             faxis.fChopt = arg; painter.interactiveRedraw('pad', `exec:SetOption("${arg}")`, kind);
         }));
      }
   }

   /** @summary Fill menu to edit settings properties
     * @private */
   addSettingsMenu(with_hierarchy, alone, handle_func) {
      if (alone)
         this.add('header:Settings');
      else
         this.add('sub:Settings');

      this.add('sub:Files');

      if (with_hierarchy) {
         this.addchk(settings.OnlyLastCycle, 'Last cycle', flag => {
            settings.OnlyLastCycle = flag;
            if (handle_func) handle_func('refresh');
         });

         this.addchk(!settings.SkipStreamerInfos, 'Streamer infos', flag => {
            settings.SkipStreamerInfos = !flag;
            if (handle_func) handle_func('refresh');
         });
      }

      this.addchk(settings.UseStamp, 'Use stamp arg', flag => { settings.UseStamp = flag; });
      this.addSizeMenu('Max ranges', 1, 1000, [1, 10, 20, 50, 200, 1000], settings.MaxRanges, value => { settings.MaxRanges = value; }, 'Maximal number of ranges in single http request');

      this.addchk(settings.HandleWrongHttpResponse, 'Handle wrong http response', flag => { settings.HandleWrongHttpResponse = flag; });
      this.addchk(settings.WithCredentials, 'With credentials', flag => { settings.WithCredentials = flag; }, 'Submit http request with user credentials');

      this.add('endsub:');

      this.add('sub:Toolbar');
      this.addchk(settings.ToolBar === false, 'Off', flag => { settings.ToolBar = !flag; });
      this.addchk(settings.ToolBar === true, 'On', flag => { settings.ToolBar = flag; });
      this.addchk(settings.ToolBar === 'popup', 'Popup', flag => { settings.ToolBar = flag ? 'popup' : false; });
      this.add('separator');
      this.addchk(settings.ToolBarSide === 'left', 'Left side', flag => { settings.ToolBarSide = flag ? 'left' : 'right'; });
      this.addchk(settings.ToolBarVert, 'Vertical', flag => { settings.ToolBarVert = flag; });
      this.add('endsub:');

      this.add('sub:Interactive');
      this.addchk(settings.Tooltip, 'Tooltip', flag => { settings.Tooltip = flag; });
      this.addchk(settings.ContextMenu, 'Context menus', flag => { settings.ContextMenu = flag; });
      this.add('sub:Zooming');
      this.addchk(settings.Zooming, 'Global', flag => { settings.Zooming = flag; });
      this.addchk(settings.ZoomMouse, 'Mouse', flag => { settings.ZoomMouse = flag; });
      this.addchk(settings.ZoomWheel, 'Wheel', flag => { settings.ZoomWheel = flag; });
      this.addchk(settings.ZoomTouch, 'Touch', flag => { settings.ZoomTouch = flag; });
      this.add('endsub:');
      this.addchk(settings.HandleKeys, 'Keypress handling', flag => { settings.HandleKeys = flag; });
      this.addchk(settings.MoveResize, 'Move and resize', flag => { settings.MoveResize = flag; });
      this.addchk(settings.DragAndDrop, 'Drag and drop', flag => { settings.DragAndDrop = flag; });
      this.addchk(settings.DragGraphs, 'Drag graph points', flag => { settings.DragGraphs = flag; });
      this.addSelectMenu('Progress box', ['off', 'on', 'modal'], isStr(settings.ProgressBox) ? settings.ProgressBox : (settings.ProgressBox ? 'on' : 'off'), value => {
         settings.ProgressBox = (value === 'off') ? false : (value === ' on' ? true : value);
      });
      this.add('endsub:');

      this.add('sub:Drawing');
      this.addSelectMenu('Optimize', ['None', 'Smart', 'Always'], settings.OptimizeDraw, value => { settings.OptimizeDraw = value; });
      this.addPaletteMenu(settings.Palette, pal => { settings.Palette = pal; });
      this.addchk(settings.AutoStat, 'Auto stat box', flag => { settings.AutoStat = flag; });
      this.addSelectMenu('Latex', ['Off', 'Symbols', 'Normal', 'MathJax', 'Force MathJax'], settings.Latex, value => { settings.Latex = value; });
      this.addSelectMenu('3D rendering', ['Default', 'WebGL', 'Image'], settings.Render3D, value => { settings.Render3D = value; });
      this.addSelectMenu('WebGL embeding', ['Default', 'Overlay', 'Embed'], settings.Embed3D, value => { settings.Embed3D = value; });

      this.add('endsub:');

      this.add('sub:Geometry');
      this.add('Grad per segment:  ' + settings.GeoGradPerSegm, () => this.input('Grad per segment in geometry', settings.GeoGradPerSegm, 'int', 1, 60).then(val => { settings.GeoGradPerSegm = val; }));
      this.addchk(settings.GeoCompressComp, 'Compress composites', flag => { settings.GeoCompressComp = flag; });
      this.add('endsub:');

      if (with_hierarchy) {
         this.add('sub:Browser');
         this.add('Hierarchy limit:  ' + settings.HierarchyLimit, () => this.input('Max number of items in hierarchy', settings.HierarchyLimit, 'int', 10, 100000).then(val => {
            settings.HierarchyLimit = val;
            if (handle_func) handle_func('refresh');
         }));
         this.add('Browser width:  ' + settings.BrowserWidth, () => this.input('Browser width in px', settings.BrowserWidth, 'int', 50, 2000).then(val => {
            settings.BrowserWidth = val;
            if (handle_func) handle_func('width');
         }));
         this.add('endsub:');
      }

      this.add('Dark mode: ' + (settings.DarkMode ? 'On' : 'Off'), () => {
         settings.DarkMode = !settings.DarkMode;
         if (handle_func) handle_func('dark');
      });

      const setStyleField = arg => { gStyle[arg.slice(1)] = parseInt(arg[0]); },
            addStyleIntField = (name, field, arr) => {
         this.add('sub:' + name);
         const curr = gStyle[field] >= arr.length ? 1 : gStyle[field];
         for (let v = 0; v < arr.length; ++v)
            this.addchk(curr === v, arr[v], `${v}${field}`, setStyleField);
         this.add('endsub:');
      };

      this.add('sub:gStyle');

      this.add('sub:Canvas');
      this.addColorMenu('Color', gStyle.fCanvasColor, col => { gStyle.fCanvasColor = col; });
      addStyleIntField('Draw date', 'fOptDate', ['Off', 'Current time', 'File create time', 'File modify time']);
      this.add(`Time zone: ${settings.TimeZone}`, () => this.input('Input time zone like UTC. empty string - local timezone', settings.TimeZone, 'string').then(val => { settings.TimeZone = val; }));
      addStyleIntField('Draw file', 'fOptFile', ['Off', 'File name', 'Full file URL', 'Item name']);
      this.addSizeMenu('Date X', 0.01, 0.1, 0.01, gStyle.fDateX, x => { gStyle.fDateX = x; }, 'configure gStyle.fDateX for date/item name drawings');
      this.addSizeMenu('Date Y', 0.01, 0.1, 0.01, gStyle.fDateY, y => { gStyle.fDateY = y; }, 'configure gStyle.fDateY for date/item name drawings');
      this.add('endsub:');

      this.add('sub:Pad');
      this.addColorMenu('Color', gStyle.fPadColor, col => { gStyle.fPadColor = col; });
      this.add('sub:Grid');
      this.addchk(gStyle.fPadGridX, 'X', flag => { gStyle.fPadGridX = flag; });
      this.addchk(gStyle.fPadGridY, 'Y', flag => { gStyle.fPadGridY = flag; });
      this.addColorMenu('Color', gStyle.fGridColor, col => { gStyle.fGridColor = col; });
      this.addSizeMenu('Width', 1, 10, 1, gStyle.fGridWidth, w => { gStyle.fGridWidth = w; });
      this.addLineStyleMenu('Style', gStyle.fGridStyle, st => { gStyle.fGridStyle = st; });
      this.add('endsub:');
      addStyleIntField('Ticks X', 'fPadTickX', ['normal', 'ticks on both sides', 'labels on both sides']);
      addStyleIntField('Ticks Y', 'fPadTickY', ['normal', 'ticks on both sides', 'labels on both sides']);
      addStyleIntField('Log X', 'fOptLogx', ['off', 'on', 'log 2']);
      addStyleIntField('Log Y', 'fOptLogy', ['off', 'on', 'log 2']);
      addStyleIntField('Log Z', 'fOptLogz', ['off', 'on', 'log 2']);
      this.add('endsub:');

      this.add('sub:Frame');
      this.addColorMenu('Fill color', gStyle.fFrameFillColor, col => { gStyle.fFrameFillColor = col; });
      this.addFillStyleMenu('Fill style', gStyle.fFrameFillStyle, gStyle.fFrameFillColor, null, id => { gStyle.fFrameFillStyle = id; });
      this.addColorMenu('Line color', gStyle.fFrameLineColor, col => { gStyle.fFrameLineColor = col; });
      this.addSizeMenu('Line width', 1, 10, 1, gStyle.fFrameLineWidth, w => { gStyle.fFrameLineWidth = w; });
      this.addLineStyleMenu('Line style', gStyle.fFrameLineStyle, st => { gStyle.fFrameLineStyle = st; });
      this.addSizeMenu('Border size', 0, 10, 1, gStyle.fFrameBorderSize, sz => { gStyle.fFrameBorderSize = sz; });
      // fFrameBorderMode: 0,
      this.add('sub:Margins');
      this.addSizeMenu('Bottom', 0, 0.5, 0.05, gStyle.fPadBottomMargin, v => { gStyle.fPadBottomMargin = v; });
      this.addSizeMenu('Top', 0, 0.5, 0.05, gStyle.fPadTopMargin, v => { gStyle.fPadTopMargin = v; });
      this.addSizeMenu('Left', 0, 0.5, 0.05, gStyle.fPadLeftMargin, v => { gStyle.fPadLeftMargin = v; });
      this.addSizeMenu('Right', 0, 0.5, 0.05, gStyle.fPadRightMargin, v => { gStyle.fPadRightMargin = v; });
      this.add('endsub:');
      this.add('endsub:');

      this.add('sub:Title');
      this.addColorMenu('Fill color', gStyle.fTitleColor, col => { gStyle.fTitleColor = col; });
      this.addFillStyleMenu('Fill style', gStyle.fTitleStyle, gStyle.fTitleColor, null, id => { gStyle.fTitleStyle = id; });
      this.addColorMenu('Text color', gStyle.fTitleTextColor, col => { gStyle.fTitleTextColor = col; });
      this.addSizeMenu('Border size', 0, 10, 1, gStyle.fTitleBorderSize, sz => { gStyle.fTitleBorderSize = sz; });
      this.addSizeMenu('Font size', 0.01, 0.1, 0.01, gStyle.fTitleFontSize, sz => { gStyle.fTitleFontSize = sz; });
      this.addFontMenu('Font', gStyle.fTitleFont, fnt => { gStyle.fTitleFont = fnt; });
      this.addSizeMenu('X: ' + gStyle.fTitleX.toFixed(2), 0.0, 1.0, 0.1, gStyle.fTitleX, v => { gStyle.fTitleX = v; });
      this.addSizeMenu('Y: ' + gStyle.fTitleY.toFixed(2), 0.0, 1.0, 0.1, gStyle.fTitleY, v => { gStyle.fTitleY = v; });
      this.addSizeMenu('W: ' + gStyle.fTitleW.toFixed(2), 0.0, 1.0, 0.1, gStyle.fTitleW, v => { gStyle.fTitleW = v; });
      this.addSizeMenu('H: ' + gStyle.fTitleH.toFixed(2), 0.0, 1.0, 0.1, gStyle.fTitleH, v => { gStyle.fTitleH = v; });
      this.add('endsub:');

      this.add('sub:Stat box');
      this.addColorMenu('Fill color', gStyle.fStatColor, col => { gStyle.fStatColor = col; });
      this.addFillStyleMenu('Fill style', gStyle.fStatStyle, gStyle.fStatColor, null, id => { gStyle.fStatStyle = id; });
      this.addColorMenu('Text color', gStyle.fStatTextColor, col => { gStyle.fStatTextColor = col; });
      this.addSizeMenu('Border size', 0, 10, 1, gStyle.fStatBorderSize, sz => { gStyle.fStatBorderSize = sz; });
      this.addSizeMenu('Font size', 0, 30, 5, gStyle.fStatFontSize, sz => { gStyle.fStatFontSize = sz; });
      this.addFontMenu('Font', gStyle.fStatFont, fnt => { gStyle.fStatFont = fnt; });
      this.add('Stat format', () => this.input('Stat format', gStyle.fStatFormat).then(fmt => { gStyle.fStatFormat = fmt; }));
      this.addSizeMenu('X: ' + gStyle.fStatX.toFixed(2), 0.2, 1.0, 0.1, gStyle.fStatX, v => { gStyle.fStatX = v; });
      this.addSizeMenu('Y: ' + gStyle.fStatY.toFixed(2), 0.2, 1.0, 0.1, gStyle.fStatY, v => { gStyle.fStatY = v; });
      this.addSizeMenu('Width: ' + gStyle.fStatW.toFixed(2), 0.1, 1.0, 0.1, gStyle.fStatW, v => { gStyle.fStatW = v; });
      this.addSizeMenu('Height: ' + gStyle.fStatH.toFixed(2), 0.1, 1.0, 0.1, gStyle.fStatH, v => { gStyle.fStatH = v; });
      this.add('endsub:');

      this.add('sub:Legend');
      this.addColorMenu('Fill color', gStyle.fLegendFillColor, col => { gStyle.fLegendFillColor = col; });
      this.addSizeMenu('Border size', 0, 10, 1, gStyle.fLegendBorderSize, sz => { gStyle.fLegendBorderSize = sz; });
      this.addFontMenu('Font', gStyle.fLegendFont, fnt => { gStyle.fLegendFont = fnt; });
      this.addSizeMenu('Text size', 0, 0.1, 0.01, gStyle.fLegendTextSize, v => { gStyle.fLegendTextSize = v; }, 'legend text size, when 0 - auto adjustment is used');
      this.add('endsub:');

      this.add('sub:Histogram');
      this.addchk(gStyle.fOptTitle === 1, 'Hist title', flag => { gStyle.fOptTitle = flag ? 1 : 0; });
      this.addchk(gStyle.fOrthoCamera, 'Orthographic camera', flag => { gStyle.fOrthoCamera = flag; });
      this.addchk(gStyle.fHistMinimumZero, 'Base0', flag => { gStyle.fHistMinimumZero = flag; }, 'when true, BAR and LEGO drawing using base = 0');
      this.add('Text format', () => this.input('Paint text format', gStyle.fPaintTextFormat).then(fmt => { gStyle.fPaintTextFormat = fmt; }));
      this.add('Time offset', () => this.input('Time offset in seconds, default is 788918400 for 1/1/1995', gStyle.fTimeOffset, 'int').then(ofset => { gStyle.fTimeOffset = ofset; }));
      this.addSizeMenu('ErrorX: ' + gStyle.fErrorX.toFixed(2), 0.0, 1.0, 0.1, gStyle.fErrorX, v => { gStyle.fErrorX = v; });
      this.addSizeMenu('End error', 0, 12, 1, gStyle.fEndErrorSize, v => { gStyle.fEndErrorSize = v; }, 'size in pixels of end error for E1 draw options, gStyle.fEndErrorSize');
      this.addSizeMenu('Top margin', 0.0, 0.5, 0.05, gStyle.fHistTopMargin, v => { gStyle.fHistTopMargin = v; }, 'Margin between histogram top and frame top');
      this.addColorMenu('Fill color', gStyle.fHistFillColor, col => { gStyle.fHistFillColor = col; });
      this.addFillStyleMenu('Fill style', gStyle.fHistFillStyle, gStyle.fHistFillColor, null, id => { gStyle.fHistFillStyle = id; });
      this.addColorMenu('Line color', gStyle.fHistLineColor, col => { gStyle.fHistLineColor = col; });
      this.addSizeMenu('Line width', 1, 10, 1, gStyle.fHistLineWidth, w => { gStyle.fHistLineWidth = w; });
      this.addLineStyleMenu('Line style', gStyle.fHistLineStyle, st => { gStyle.fHistLineStyle = st; });
      this.add('endsub:');

      this.add('separator');
      this.add('sub:Predefined');
      ['Modern', 'Plain', 'Bold'].forEach(name => this.addchk((gStyle.fName === name), name, name, selectgStyle));
      this.add('endsub:');

      this.add('endsub:'); // gStyle

      this.add('separator');

      this.add('Save settings', () => {
         const promise = readSettings(true) ? Promise.resolve(true) : this.confirm('Save settings', 'Pressing OK one agreess that JSROOT will store settings in browser local storage');
         promise.then(res => { if (res) { saveSettings(); saveStyle(); } });
      }, 'Store settings and gStyle in browser local storage');
      this.add('Delete settings', () => { saveSettings(-1); saveStyle(-1); }, 'Delete settings and gStyle from browser local storage');

      if (!alone) this.add('endsub:');
   }

   /** @summary Run modal dialog
     * @return {Promise} with html element inside dialg
     * @private */
   async runModal() {
      throw Error('runModal() must be reimplemented');
   }

   /** @summary Show modal info dialog
     * @param {String} title - title
     * @param {String} message - message
     * @protected */
   info(title, message) {
      return this.runModal(title, `<p>${message}</p>`, { height: 120, width: 400, resizable: true });
   }

   /** @summary Show confirm dialog
     * @param {String} title - title
     * @param {String} message - message
     * @return {Promise} with true when 'Ok' pressed or false when 'Cancel' pressed
     * @protected */
   async confirm(title, message) {
      return this.runModal(title, message, { btns: true, height: 120, width: 400 }).then(elem => { return !!elem; });
   }

   /** @summary Input value
     * @return {Promise} with input value
     * @param {string} title - input dialog title
     * @param value - initial value
     * @param {string} [kind] - use 'text' (default), 'number', 'float' or 'int'
     * @protected */
   async input(title, value, kind, min, max) {
      if (!kind) kind = 'text';
      const inp_type = (kind === 'int') ? 'number' : 'text';
      let ranges = '';
      if ((value === undefined) || (value === null)) value = '';
      if (kind === 'int') {
          if (min !== undefined) ranges += ` min="${min}"`;
          if (max !== undefined) ranges += ` max="${max}"`;
       }

      const main_content =
         '<form><fieldset style="padding:0; border:0">'+
            `<input type="${inp_type}" value="${value}" ${ranges} style="width:98%;display:block" class="jsroot_dlginp"/>`+
         '</fieldset></form>';

      return new Promise(resolveFunc => {
         this.runModal(title, main_content, { btns: true, height: 150, width: 400 }).then(element => {
            if (!element) return;
            let val = element.querySelector('.jsroot_dlginp').value;
            if (kind === 'float') {
               val = Number.parseFloat(val);
               if (Number.isFinite(val))
                  resolveFunc(val);
            } else if (kind === 'int') {
               val = parseInt(val);
               if (Number.isInteger(val))
                  resolveFunc(val);
            } else
               resolveFunc(val);
         });
      });
   }

   /** @summary Let input arguments from the method
     * @return {Promise} with method argument */
   async showMethodArgsDialog(method) {
      const dlg_id = this.menuname + '_dialog';
      let main_content = '<form> <fieldset style="padding:0; border:0">';

      for (let n = 0; n < method.fArgs.length; ++n) {
         const arg = method.fArgs[n];
         arg.fValue = arg.fDefault;
         if (arg.fValue === '""') arg.fValue = '';
         main_content += `<label for="${dlg_id}_inp${n}">${arg.fName}</label>
                          <input type='text' tabindex="${n+1}" id="${dlg_id}_inp${n}" value="${arg.fValue}" style="width:100%;display:block"/>`;
      }

      main_content += '</fieldset></form>';

      return new Promise(resolveFunc => {
         this.runModal(method.fClassName + '::' + method.fName, main_content, { btns: true, height: 100 + method.fArgs.length*60, width: 400, resizable: true }).then(element => {
            if (!element) return;
            let args = '';

            for (let k = 0; k < method.fArgs.length; ++k) {
               const arg = method.fArgs[k];
               let value = element.querySelector(`#${dlg_id}_inp${k}`).value;
               if (value === '') value = arg.fDefault;
               if ((arg.fTitle === 'Option_t*') || (arg.fTitle === 'const char*')) {
                  // check quotes,
                  // TODO: need to make more precise checking of escape characters
                  if (!value) value = '""';
                  if (value[0] !== '"') value = '"' + value;
                  if (value[value.length-1] !== '"') value += '"';
               }

               args += (k > 0 ? ',' : '') + value;
            }

            resolveFunc(args);
         });
      });
   }

   /** @summary Let input arguments from the Command
     * @return {Promise} with command argument */
   async showCommandArgsDialog(cmdname, args) {
      const dlg_id = this.menuname + '_dialog';
      let main_content = '<form> <fieldset style="padding:0; border:0">';

      for (let n = 0; n < args.length; ++n) {
         main_content += `<label for="${dlg_id}_inp${n}">arg${n+1}</label>`+
                         `<input type='text' id="${dlg_id}_inp${n}" value="${args[n]}" style="width:100%;display:block"/>`;
     }

      main_content += '</fieldset></form>';

      return new Promise(resolveFunc => {
         this.runModal('Arguments for command ' + cmdname, main_content, { btns: true, height: 110 + args.length*60, width: 400, resizable: true }).then(element => {
            if (!element)
               return resolveFunc(null);

            const resargs = [];
            for (let k = 0; k < args.length; ++k)
               resargs.push(element.querySelector(`#${dlg_id}_inp${k}`).value);
            resolveFunc(resargs);
         });
      });
   }

} // class JSRootMenu

/**
 * @summary Context menu class using plain HTML/JavaScript
 *
 * @desc Use {@link createMenu} to create instance of the menu
 * based on {@link https://github.com/L1quidH2O/ContextMenu.js}
 * @private
 */

class StandaloneMenu extends JSRootMenu {

   constructor(painter, menuname, show_event) {
      super(painter, menuname, show_event);

      this.code = [];
      this._use_plain_text = true;
      this.stack = [this.code];
   }

   native() { return true; }

   /** @summary Load required modules, noop for that menu class */
   async load() { return this; }

   /** @summary Add menu item
     * @param {string} name - item name
     * @param {function} func - func called when item is selected */
   add(name, arg, func, title) {
      let curr = this.stack[this.stack.length-1];

      if (name === 'separator')
         return curr.push({ divider: true });

      if (name.indexOf('header:') === 0)
         return curr.push({ text: name.slice(7), header: true });

      if (name === 'endsub:') {
         this.stack.pop();
         curr = this.stack[this.stack.length-1];
         if (curr[curr.length-1].sub.length === 0)
            curr[curr.length-1].sub = undefined;
         return;
      }

      if (name === 'endcolumn:')
         return this.stack.pop();


      if (isFunc(arg)) { title = func; func = arg; arg = name; }

      const elem = {};
      curr.push(elem);

      if (name === 'column:') {
         elem.column = true;
         elem.sub = [];
         this.stack.push(elem.sub);
         return;
      }

      if (name.indexOf('sub:') === 0) {
         name = name.slice(4);
         elem.sub = [];
         this.stack.push(elem.sub);
      }

      if (name.indexOf('chk:') === 0) {
         elem.checked = true;
         name = name.slice(4);
      } else if (name.indexOf('unk:') === 0) {
         elem.checked = false;
         name = name.slice(4);
      }

      elem.text = name;
      elem.title = title;
      elem.arg = arg;
      elem.func = func;
   }

   /** @summary Returns size of main menu */
   size() { return this.code.length; }

   /** @summary Build HTML elements of the menu
     * @private */
   _buildContextmenu(menu, left, top, loc) {
      const doc = getDocument(),
            outer = doc.createElement('div'),
            container_style =
         'position: absolute; top: 0; user-select: none; z-index: 100000; background-color: rgb(250, 250, 250); margin: 0; padding: 0px; width: auto;'+
         'min-width: 100px; box-shadow: 0px 0px 10px rgb(0, 0, 0, 0.2); border: 3px solid rgb(215, 215, 215); font-family: Arial, helvetica, sans-serif, serif;'+
         'font-size: 13px; color: rgb(0, 0, 0, 0.8); line-height: 15px;';

      // if loc !== doc.body then its a submenu, so it needs to have position: relative;
      if (loc === doc.body) {
         // delete all elements with className jsroot_ctxt_container
         const deleteElems = doc.getElementsByClassName('jsroot_ctxt_container');
         while (deleteElems.length > 0)
            deleteElems[0].parentNode.removeChild(deleteElems[0]);

         outer.className = 'jsroot_ctxt_container';
         outer.style = container_style;
         outer.style.position = 'fixed';
         outer.style.left = left + 'px';
         outer.style.top = top + 'px';
      } else if ((left < 0) && (top === left)) {
         // column
         outer.className = 'jsroot_ctxt_column';
         outer.style.float = 'left';
         outer.style.width = (100/-left).toFixed(1) + '%';
      } else {
         outer.className = 'jsroot_ctxt_container';
         outer.style = container_style;
         outer.style.left = -loc.offsetLeft + loc.offsetWidth + 'px';
      }

      let need_check_area = false, ncols = 0;
      menu.forEach(d => {
         if (d.checked) need_check_area = true;
         if (d.column) ncols++;
      });

      menu.forEach(d => {
         if (ncols > 0) {
            outer.style.display = 'flex';
            if (d.column) this._buildContextmenu(d.sub, -ncols, -ncols, outer);
            return;
         }

         if (d.divider) {
            const hr = doc.createElement('hr');
            hr.style = 'width: 85%; margin: 3px auto; border: 1px solid rgb(0, 0, 0, 0.15)';
            outer.appendChild(hr);
            return;
         }

         const item = doc.createElement('div');
         item.style.position = 'relative';
         outer.appendChild(item);

         if (d.header) {
            item.style = 'background-color: lightblue; padding: 3px 7px; font-weight: bold; border-bottom: 1px;';
            item.innerHTML = d.text;
            return;
         }

         const hovArea = doc.createElement('div');
         hovArea.style.width = '100%';
         hovArea.style.height = '100%';
         hovArea.style.display = 'flex';
         hovArea.style.justifyContent = 'space-between';
         hovArea.style.cursor = 'pointer';
         if (d.title) hovArea.setAttribute('title', d.title);

         item.appendChild(hovArea);
         if (!d.text) d.text = 'item';

         const text = doc.createElement('div');
         text.style = 'margin: 0; padding: 3px 7px; pointer-events: none; white-space: nowrap';

         if (d.text.indexOf('<svg') >= 0) {
            if (need_check_area) {
               text.style.display = 'flex';

               const chk = doc.createElement('span');
               chk.innerHTML = d.checked ? '\u2713' : '';
               chk.style.display = 'inline-block';
               chk.style.width = '1em';
               text.appendChild(chk);

               const sub = doc.createElement('div');
               sub.innerHTML = d.text;
               text.appendChild(sub);
            } else
               text.innerHTML = d.text;
         } else {
            if (need_check_area) {
               const chk = doc.createElement('span');
               chk.innerHTML = d.checked ? '\u2713' : '';
               chk.style.display = 'inline-block';
               chk.style.width = '1em';
               text.appendChild(chk);
            }

            const sub = doc.createElement('span');
            if (d.text.indexOf('<nobr>') === 0)
               sub.textContent = d.text.slice(6, d.text.length-7);
            else
               sub.textContent = d.text;
            text.appendChild(sub);
         }

         hovArea.appendChild(text);

         function changeFocus(item, on) {
            if (on) {
               item.classList.add('jsroot_ctxt_focus');
               item.style['background-color'] = 'rgb(220, 220, 220)';
            } else if (item.classList.contains('jsroot_ctxt_focus')) {
               item.style['background-color'] = null;
               item.classList.remove('jsroot_ctxt_focus');
               item.querySelector('.jsroot_ctxt_container')?.remove();
            }
         }

         if (d.extraText || d.sub) {
            const extraText = doc.createElement('span');
            extraText.className = 'jsroot_ctxt_extraText';
            extraText.style = 'margin: 0; padding: 3px 7px; color: rgb(0, 0, 0, 0.6);';
            extraText.textContent = d.sub ? '\u25B6' : d.extraText;
            hovArea.appendChild(extraText);

            if (d.sub && browser.touches) {
               extraText.addEventListener('click', evnt => {
                  evnt.preventDefault();
                  evnt.stopPropagation();
                  const was_active = item.parentNode.querySelector('.jsroot_ctxt_focus');

                  if (was_active)
                     changeFocus(was_active, false);

                  if (item !== was_active) {
                     changeFocus(item, true);
                     this._buildContextmenu(d.sub, 0, 0, item);
                  }
               });
            }
         }

         if (!browser.touches) {
            hovArea.addEventListener('mouseenter', () => {
               if (this.prevHovArea)
                  this.prevHovArea.style['background-color'] = null;
               hovArea.style['background-color'] = 'rgb(235, 235, 235)';
               this.prevHovArea = hovArea;

               outer.childNodes.forEach(chld => changeFocus(chld, false));

               if (d.sub) {
                  changeFocus(item, true);
                  this._buildContextmenu(d.sub, 0, 0, item);
               }
            });
         }

         if (d.func) {
            item.addEventListener('click', evnt => {
               const func = this.painter ? d.func.bind(this.painter) : d.func;
               func(d.arg);
               evnt.stopPropagation();
               this.remove();
            });
         }
      });

      loc.appendChild(outer);

      const docWidth = doc.documentElement.clientWidth, docHeight = doc.documentElement.clientHeight;

      // Now determine where the contextmenu will be
      if (loc === doc.body) {
         if (left + outer.offsetWidth > docWidth) {
            // Does sub-contextmenu overflow window width?
            outer.style.left = (docWidth - outer.offsetWidth) + 'px';
         }
         if (outer.offsetHeight > docHeight) {
            // is the contextmenu height larger than the window height?
            outer.style.top = 0;
            outer.style.overflowY = 'scroll';
            outer.style.overflowX = 'hidden';
            outer.style.height = docHeight + 'px';
         } else if (top + outer.offsetHeight > docHeight) {
            // Does contextmenu overflow window height?
            outer.style.top = (docHeight - outer.offsetHeight) + 'px';
         }
      } else if (outer.className !== 'jsroot_ctxt_column') {
         // if its sub-contextmenu
         const dimensionsLoc = loc.getBoundingClientRect(), dimensionsOuter = outer.getBoundingClientRect();

         // Does sub-contextmenu overflow window width?
         if (dimensionsOuter.left + dimensionsOuter.width > docWidth)
            outer.style.left = (-loc.offsetLeft - dimensionsOuter.width) + 'px';


         if (dimensionsOuter.height > docHeight) {
            // is the sub-contextmenu height larger than the window height?
            outer.style.top = -dimensionsOuter.top + 'px';
            outer.style.overflowY = 'scroll';
            outer.style.overflowX = 'hidden';
            outer.style.height = docHeight + 'px';
         } else if (dimensionsOuter.height < docHeight && dimensionsOuter.height > docHeight / 2) {
            // is the sub-contextmenu height smaller than the window height AND larger than half of window height?
            if (dimensionsOuter.top - docHeight / 2 >= 0) { // If sub-contextmenu is closer to bottom of the screen
               outer.style.top = (-dimensionsOuter.top - dimensionsOuter.height + docHeight) + 'px';
            } else { // If sub-contextmenu is closer to top of the screen
               outer.style.top = (-dimensionsOuter.top) + 'px';
            }
         } else if (dimensionsOuter.top + dimensionsOuter.height > docHeight) {
            // Does sub-contextmenu overflow window height?
            outer.style.top = (-dimensionsOuter.height + dimensionsLoc.height) + 'px';
         }
      }
      return outer;
   }

   /** @summary Show standalone menu */
   async show(event) {
      this.remove();

      if (!event && this.show_evnt) event = this.show_evnt;

      const doc = getDocument(),
            woffset = typeof window === 'undefined' ? { x: 0, y: 0 } : { x: window.scrollX, y: window.scrollY };

      doc.body.addEventListener('click', this.remove_handler);

      const oldmenu = doc.getElementById(this.menuname);
      if (oldmenu) oldmenu.remove();

      this.element = this._buildContextmenu(this.code, (event?.clientX || 0) + woffset.x, (event?.clientY || 0) + woffset.y, doc.body);

      this.element.setAttribute('id', this.menuname);

      return this;
   }

   /** @summary Run modal elements with standalone code */
   createModal(title, main_content, args) {
      if (!args) args = {};

      if (!args.Ok) args.Ok = 'Ok';

      const modal = { args }, dlg_id = (this?.menuname ?? 'root_modal') + '_dialog';
      select(`#${dlg_id}`).remove();
      select(`#${dlg_id}_block`).remove();

      const w = Math.min(args.width || 450, Math.round(0.9*browser.screenWidth));
      modal.block = select('body').append('div')
                                   .attr('id', `${dlg_id}_block`)
                                   .attr('class', 'jsroot_dialog_block')
                                   .attr('style', 'z-index: 100000; position: absolute; left: 0px; top: 0px; bottom: 0px; right: 0px; opacity: 0.2; background-color: white');
      modal.element = select('body')
                      .append('div')
                      .attr('id', dlg_id)
                      .attr('class', 'jsroot_dialog')
                      .style('position', 'absolute')
                      .style('width', `${w}px`)
                      .style('left', '50%')
                      .style('top', '50%')
                      .style('z-index', 100001)
                      .attr('tabindex', '0')
                      .html(
         '<div style=\'position: relative; left: -50%; top: -50%; border: solid green 3px; padding: 5px; display: flex; flex-flow: column; background-color: white\'>'+
           `<div style='flex: 0 1 auto; padding: 5px'>${title}</div>`+
           `<div class='jsroot_dialog_content' style='flex: 1 1 auto; padding: 5px'>${main_content}</div>`+
           '<div class=\'jsroot_dialog_footer\' style=\'flex: 0 1 auto; padding: 5px\'>'+
              `<button class='jsroot_dialog_button' style='float: right; width: fit-content; margin-right: 1em'>${args.Ok}</button>`+
              (args.btns ? '<button class=\'jsroot_dialog_button\' style=\'float: right; width: fit-content; margin-right: 1em\'>Cancel</button>' : '') +
         '</div></div>');

      modal.done = function(res) {
         if (this._done) return;
         this._done = true;
         if (isFunc(this.call_back))
            this.call_back(res);
         this.element.remove();
         this.block.remove();
      };

      modal.setContent = function(content, btn_text) {
         if (!this._done) {
            this.element.select('.jsroot_dialog_content').html(content);
            if (btn_text) {
               this.args.Ok = btn_text;
               this.element.select('.jsroot_dialog_button').text(btn_text);
            }
         }
      };

      modal.element.on('keyup', evnt => {
         if ((evnt.code === 'Enter') || (evnt.code === 'Escape')) {
            evnt.preventDefault();
            evnt.stopPropagation();
            modal.done(evnt.code === 'Enter' ? modal.element.node() : null);
         }
      });
      modal.element.on('keydown', evnt => {
         if ((evnt.code === 'Enter') || (evnt.code === 'Escape')) {
            evnt.preventDefault();
            evnt.stopPropagation();
         }
      });
      modal.element.selectAll('.jsroot_dialog_button').on('click', evnt => {
         modal.done(args.btns && (select(evnt.target).text() === args.Ok) ? modal.element.node() : null);
      });

      let f = modal.element.select('.jsroot_dialog_content').select('input');
      if (f.empty()) f = modal.element.select('.jsroot_dialog_footer').select('button');
      if (!f.empty()) f.node().focus();
      return modal;
   }

   /** @summary Run modal elements with standalone code */
   async runModal(title, main_content, args) {
      const modal = this.createModal(title, main_content, args);
      return new Promise(resolveFunc => {
         modal.call_back = resolveFunc;
      });
   }


} // class StandaloneMenu

/** @summary Internal method to implement modal progress
  * @private */
internals._modalProgress = function(msg, click_handle) {
   if (!msg || !isStr(msg)) {
      internals.modal?.done();
      delete internals.modal;
      return;
   }

   if (!internals.modal)
      internals.modal = StandaloneMenu.prototype.createModal('Progress', msg);

   internals.modal.setContent(msg, click_handle ? 'Abort' : 'Ok');

   internals.modal.call_back = click_handle;
};

/// CSG library for THREE.js


const EPSILON = 1e-5,
      COPLANAR = 0,
      FRONT = 1,
      BACK = 2,
      SPANNING = FRONT | BACK;

class Vertex {

   constructor(x, y, z, nx, ny, nz) {
      this.x = x;
      this.y = y;
      this.z = z;
      this.nx = nx;
      this.ny = ny;
      this.nz = nz;
   }

   setnormal(nx, ny, nz) {
      this.nx = nx;
      this.ny = ny;
      this.nz = nz;
   }

   clone() {
      return new Vertex(this.x, this.y, this.z, this.nx, this.ny, this.nz);
   }

   add(vertex) {
      this.x += vertex.x;
      this.y += vertex.y;
      this.z += vertex.z;
      return this;
   }

   subtract(vertex) {
      this.x -= vertex.x;
      this.y -= vertex.y;
      this.z -= vertex.z;
      return this;
   }

   // multiplyScalar( scalar ) {
   //   this.x *= scalar;
   //   this.y *= scalar;
   //   this.z *= scalar;
   //   return this;
   // }

   // cross( vertex ) {
   //    let x = this.x, y = this.y, z = this.z,
   //        vx = vertex.x, vy = vertex.y, vz = vertex.z;
   //
   //    this.x = y * vz - z * vy;
   //    this.y = z * vx - x * vz;
   //    this.z = x * vy - y * vx;
   //
   //    return this;
   // }

   cross3(vx, vy, vz) {
      const x = this.x, y = this.y, z = this.z;

      this.x = y * vz - z * vy;
      this.y = z * vx - x * vz;
      this.z = x * vy - y * vx;

      return this;
   }


   normalize() {
      const length = Math.sqrt(this.x**2 + this.y**2 + this.z**2);

      this.x /= length;
      this.y /= length;
      this.z /= length;

      return this;
   }

   dot(vertex) {
      return this.x*vertex.x + this.y*vertex.y + this.z*vertex.z;
   }

   diff(vertex) {
      const dx = (this.x - vertex.x),
          dy = (this.y - vertex.y),
          dz = (this.z - vertex.z),
          len2 = this.x**2 + this.y**2 + this.z**2;

      return (dx**2 + dy**2 + dz**2) / (len2 > 0 ? len2 : 1e-10);
   }

/*
   lerp( a, t ) {
      this.add(
         a.clone().subtract( this ).multiplyScalar( t )
      );

      this.normal.add(
         a.normal.clone().sub( this.normal ).multiplyScalar( t )
      );

      //this.uv.add(
      //   a.uv.clone().sub( this.uv ).multiplyScalar( t )
      //);

      return this;
   };

   interpolate( other, t ) {
      return this.clone().lerp( other, t );
   };
*/

   interpolate(a, t) {
      const t1 = 1 - t;
      return new Vertex(this.x*t1 + a.x*t, this.y*t1 + a.y*t, this.z*t1 + a.z*t,
                        this.nx*t1 + a.nx*t, this.ny*t1 + a.ny*t, this.nz*t1 + a.nz*t);
   }

   applyMatrix4(m) {
      // input: Matrix4 affine matrix

      let x = this.x, y = this.y, z = this.z;
      const e = m.elements;

      this.x = e[0] * x + e[4] * y + e[8] * z + e[12];
      this.y = e[1] * x + e[5] * y + e[9] * z + e[13];
      this.z = e[2] * x + e[6] * y + e[10] * z + e[14];

      x = this.nx; y = this.ny; z = this.nz;

      this.nx = e[0] * x + e[4] * y + e[8] * z;
      this.ny = e[1] * x + e[5] * y + e[9] * z;
      this.nz = e[2] * x + e[6] * y + e[10] * z;

      return this;
   }

} // class Vertex


class Polygon {

   constructor(vertices, parent, more) {
      this.vertices = vertices || [];
      this.nsign = 1;
      if (parent)
         this.copyProperties(parent, more);
      else if (this.vertices.length > 0)
         this.calculateProperties();
   }

   copyProperties(parent, more) {
      this.normal = parent.normal; // .clone();
      this.w = parent.w;
      this.nsign = parent.nsign;
      if (more && (parent.id !== undefined)) {
         this.id = parent.id;
         this.parent = parent;
      }
      return this;
   }

   calculateProperties(force) {
      if (this.normal && !force) return;

      const a = this.vertices[0],
          b = this.vertices[1],
          c = this.vertices[2];

      this.nsign = 1;

      // this.normal = b.clone().subtract(a).cross(c.clone().subtract(a)).normalize();

      this.normal = new Vertex(b.x - a.x, b.y - a.y, b.z - a.z, 0, 0, 0).cross3(c.x - a.x, c.y - a.y, c.z - a.z).normalize();

      this.w = this.normal.dot(a);
      return this;
   }

   clone() {
      const vertice_count = this.vertices.length,
          vertices = [];

      for (let i = 0; i < vertice_count; ++i)
         vertices.push(this.vertices[i].clone());

      return new Polygon(vertices, this);
   }

   flip() {
      /// normal is not changed, only sign variable
      // this.normal.multiplyScalar( -1 );
      // this.w *= -1;

      this.nsign *= -1;

      this.vertices.reverse();

      return this;
   }

   classifyVertex(vertex) {
      const side_value = this.nsign * (this.normal.dot(vertex) - this.w);

      if (side_value < -EPSILON) return BACK;
      if (side_value > EPSILON) return FRONT;
      return COPLANAR;
   }

   classifySide(polygon) {
      let num_positive = 0, num_negative = 0;
      const vertice_count = polygon.vertices.length;

      for (let i = 0; i < vertice_count; ++i) {
         const classification = this.classifyVertex(polygon.vertices[i]);
         if (classification === FRONT)
            ++num_positive;
          else if (classification === BACK)
            ++num_negative;
      }

      if (num_positive > 0 && num_negative === 0) return FRONT;
      if (num_positive === 0 && num_negative > 0) return BACK;
      if (num_positive === 0 && num_negative === 0) return COPLANAR;
      return SPANNING;
   }

   splitPolygon(polygon, coplanar_front, coplanar_back, front, back) {
      const classification = this.classifySide(polygon);

      if (classification === COPLANAR)

         ((this.nsign * polygon.nsign * this.normal.dot(polygon.normal) > 0) ? coplanar_front : coplanar_back).push(polygon);

       else if (classification === FRONT)

         front.push(polygon);

       else if (classification === BACK)

         back.push(polygon);

       else {
         const vertice_count = polygon.vertices.length,
               nnx = this.normal.x,
               nny = this.normal.y,
               nnz = this.normal.z,
               f = [], b = [];
          let i, j, ti, tj, vi, vj, t, v;

         for (i = 0; i < vertice_count; ++i) {
            j = (i + 1) % vertice_count;
            vi = polygon.vertices[i];
            vj = polygon.vertices[j];
            ti = this.classifyVertex(vi);
            tj = this.classifyVertex(vj);

            if (ti !== BACK) f.push(vi);
            if (ti !== FRONT) b.push(vi);
            if ((ti | tj) === SPANNING) {
               // t = (this.w - this.normal.dot(vi))/this.normal.dot(vj.clone().subtract(vi));
               // v = vi.clone().lerp( vj, t );

               t = (this.w - (nnx*vi.x + nny*vi.y + nnz*vi.z)) / (nnx*(vj.x-vi.x) + nny*(vj.y-vi.y) + nnz*(vj.z-vi.z));

               v = vi.interpolate(vj, t);
               f.push(v);
               b.push(v);
            }
         }

         // if ( f.length >= 3 ) front.push(new Polygon(f).calculateProperties());
         // if ( b.length >= 3 ) back.push(new Polygon(b).calculateProperties());
         if (f.length >= 3) front.push(new Polygon(f, polygon, true));
         if (b.length >= 3) back.push(new Polygon(b, polygon, true));
      }
   }

} // class Polygon


class Node {

   constructor(polygons, nodeid) {
      this.polygons = [];
      this.front = this.back = undefined;

      if (!polygons) return;

      this.divider = polygons[0].clone();

      const polygon_count = polygons.length,
          front = [], back = [];

      for (let i = 0; i < polygon_count; ++i) {
         if (nodeid !== undefined) {
            polygons[i].id = nodeid++;
            delete polygons[i].parent;
         }

         // by difinition polygon should be COPLANAR for itself
         if (i === 0)
            this.polygons.push(polygons[0]);
         else
            this.divider.splitPolygon(polygons[i], this.polygons, this.polygons, front, back);
      }

      if (nodeid !== undefined) this.maxnodeid = nodeid;

      if (front.length > 0)
         this.front = new Node(front);

      if (back.length > 0)
         this.back = new Node(back);
   }

   // isConvex(polygons) {
   //   let i, j, len = polygons.length;
   //   for ( i = 0; i < len; ++i )
   //      for ( j = 0; j < len; ++j )
   //         if ( i !== j && polygons[i].classifySide( polygons[j] ) !== BACK ) return false;
   //   return true;
   // }

   build(polygons) {
      const polygon_count = polygons.length,
            front = [], back = [];
      let first = 0;

      if (!this.divider) {
         this.divider = polygons[0].clone();
         this.polygons.push(polygons[0]);
         first = 1;
      }

      for (let i = first; i < polygon_count; ++i)
         this.divider.splitPolygon(polygons[i], this.polygons, this.polygons, front, back);

      if (front.length > 0) {
         if (!this.front) this.front = new Node();
         this.front.build(front);
      }

      if (back.length > 0) {
         if (!this.back) this.back = new Node();
         this.back.build(back);
      }
   }

   collectPolygons(arr) {
      if (arr === undefined)
         arr = [];
      const len = this.polygons.length;
      for (let i = 0; i < len; ++i)
         arr.push(this.polygons[i]);
      this.front?.collectPolygons(arr);
      this.back?.collectPolygons(arr);
      return arr;
   }

   numPolygons() {
      return this.polygons.length + (this.front?.numPolygons() || 0) + (this.back?.numPolygons() || 0);
   }

   clone() {
      const node = new Node();

      node.divider = this.divider?.clone();
      node.polygons = this.polygons.map(polygon => polygon.clone());
      node.front = this.front?.clone();
      node.back = this.back?.clone();

      return node;
   }

   invert() {
      const polygon_count = this.polygons.length;

      for (let i = 0; i < polygon_count; ++i)
         this.polygons[i].flip();

      this.divider.flip();
      if (this.front) this.front.invert();
      if (this.back) this.back.invert();

      const temp = this.front;
      this.front = this.back;
      this.back = temp;

      return this;
   }

   clipPolygons(polygons) {
      if (!this.divider) return polygons.slice();

      const polygon_count = polygons.length;
      let front = [], back = [];

      for (let i = 0; i < polygon_count; ++i)
         this.divider.splitPolygon(polygons[i], front, back, front, back);

      if (this.front) front = this.front.clipPolygons(front);
      if (this.back) back = this.back.clipPolygons(back);
      else back = [];

      return front.concat(back);
   }

   clipTo(node) {
      this.polygons = node.clipPolygons(this.polygons);
      if (this.front) this.front.clipTo(node);
      if (this.back) this.back.clipTo(node);
   }

 } // class Node


function createBufferGeometry(polygons) {
   const polygon_count = polygons.length;
   let i, j, buf_size = 0;

   for (i = 0; i < polygon_count; ++i)
      buf_size += (polygons[i].vertices.length - 2) * 9;

   const positions_buf = new Float32Array(buf_size),
         normals_buf = new Float32Array(buf_size);
   let iii = 0, polygon;

   function CopyVertex(vertex) {
      positions_buf[iii] = vertex.x;
      positions_buf[iii+1] = vertex.y;
      positions_buf[iii+2] = vertex.z;

      normals_buf[iii] = polygon.nsign * vertex.nx;
      normals_buf[iii+1] = polygon.nsign * vertex.ny;
      normals_buf[iii+2] = polygon.nsign * vertex.nz;
      iii+=3;
   }

   for (i = 0; i < polygon_count; ++i) {
      polygon = polygons[i];
      for (j = 2; j < polygon.vertices.length; ++j) {
         CopyVertex(polygon.vertices[0]);
         CopyVertex(polygon.vertices[j-1]);
         CopyVertex(polygon.vertices[j]);
      }
   }

   const geometry = new BufferGeometry();
   geometry.setAttribute('position', new BufferAttribute(positions_buf, 3));
   geometry.setAttribute('normal', new BufferAttribute(normals_buf, 3));

   // geometry.computeVertexNormals();
   return geometry;
}


class Geometry {

   constructor(geometry, transfer_matrix, nodeid, flippedMesh) {
      // Convert BufferGeometry to ThreeBSP

      if (geometry instanceof Mesh) {
         // #todo: add hierarchy support
         geometry.updateMatrix();
         transfer_matrix = this.matrix = geometry.matrix.clone();
         geometry = geometry.geometry;
      } else if (geometry instanceof Node) {
         this.tree = geometry;
         this.matrix = null; // new Matrix4;
         return this;
      } else if (geometry instanceof BufferGeometry) {
         const pos_buf = geometry.getAttribute('position').array,
               norm_buf = geometry.getAttribute('normal').array,
               polygons = [];
         let polygon, vert1, vert2, vert3;

         for (let i=0; i < pos_buf.length; i+=9) {
            polygon = new Polygon();

            vert1 = new Vertex(pos_buf[i], pos_buf[i+1], pos_buf[i+2], norm_buf[i], norm_buf[i+1], norm_buf[i+2]);
            if (transfer_matrix) vert1.applyMatrix4(transfer_matrix);

            vert2 = new Vertex(pos_buf[i+3], pos_buf[i+4], pos_buf[i+5], norm_buf[i+3], norm_buf[i+4], norm_buf[i+5]);
            if (transfer_matrix) vert2.applyMatrix4(transfer_matrix);

            vert3 = new Vertex(pos_buf[i+6], pos_buf[i+7], pos_buf[i+8], norm_buf[i+6], norm_buf[i+7], norm_buf[i+8]);
            if (transfer_matrix) vert3.applyMatrix4(transfer_matrix);

            if (flippedMesh) polygon.vertices.push(vert1, vert3, vert2);
                        else polygon.vertices.push(vert1, vert2, vert3);

            polygon.calculateProperties(true);
            polygons.push(polygon);
         }

         this.tree = new Node(polygons, nodeid);
         if (nodeid !== undefined) this.maxid = this.tree.maxnodeid;
         return this;
      } else if (geometry.polygons && (geometry.polygons[0] instanceof Polygon)) {
         const polygons = geometry.polygons;

         for (let i = 0; i < polygons.length; ++i) {
            const polygon = polygons[i];
            if (transfer_matrix) {
               const new_vertices = [];

               for (let n = 0; n < polygon.vertices.length; ++n)
                  new_vertices.push(polygon.vertices[n].clone().applyMatrix4(transfer_matrix));

               polygon.vertices = new_vertices;
            }

            polygon.calculateProperties(transfer_matrix);
         }

         this.tree = new Node(polygons, nodeid);
         if (nodeid !== undefined) this.maxid = this.tree.maxnodeid;
         return this;
      } else
         throw Error('ThreeBSP: Given geometry is unsupported');


      const polygons = [], nfaces = geometry.faces.length;
      let face, polygon, vertex, normal, useVertexNormals;

      for (let i = 0; i < nfaces; ++i) {
         face = geometry.faces[i];
         normal = face.normal;
         // faceVertexUvs = geometry.faceVertexUvs[0][i];
         polygon = new Polygon();

         useVertexNormals = face.vertexNormals && (face.vertexNormals.length === 3);

         vertex = geometry.vertices[face.a];
         if (useVertexNormals) normal = face.vertexNormals[0];
         // uvs = faceVertexUvs ? new Vector2( faceVertexUvs[0].x, faceVertexUvs[0].y ) : null;
         vertex = new Vertex(vertex.x, vertex.y, vertex.z, normal.x, normal.y, normal.z /* face.normal, uvs */);
         if (transfer_matrix) vertex.applyMatrix4(transfer_matrix);
         polygon.vertices.push(vertex);

         vertex = geometry.vertices[face.b];
         if (useVertexNormals) normal = face.vertexNormals[1];
         // uvs = faceVertexUvs ? new Vector2( faceVertexUvs[1].x, faceVertexUvs[1].y ) : null;
         vertex = new Vertex(vertex.x, vertex.y, vertex.z, normal.x, normal.y, normal.z /* face.normal, uvs */);
         if (transfer_matrix) vertex.applyMatrix4(transfer_matrix);
         polygon.vertices.push(vertex);

         vertex = geometry.vertices[face.c];
         if (useVertexNormals) normal = face.vertexNormals[2];
         // uvs = faceVertexUvs ? new Vector2( faceVertexUvs[2].x, faceVertexUvs[2].y ) : null;
         vertex = new Vertex(vertex.x, vertex.y, vertex.z, normal.x, normal.y, normal.z /* face.normal, uvs */);
         if (transfer_matrix) vertex.applyMatrix4(transfer_matrix);
         polygon.vertices.push(vertex);

         polygon.calculateProperties(true);
         polygons.push(polygon);
      }

      this.tree = new Node(polygons, nodeid);
      if (nodeid !== undefined) this.maxid = this.tree.maxnodeid;
   }

   subtract(other_tree) {
      let a = this.tree.clone();
      const b = other_tree.tree.clone();

      a.invert();
      a.clipTo(b);
      b.clipTo(a);
      b.invert();
      b.clipTo(a);
      b.invert();
      a.build(b.collectPolygons());
      a.invert();
      a = new Geometry(a);
      a.matrix = this.matrix;
      return a;
   }

   union(other_tree) {
      let a = this.tree.clone();
      const b = other_tree.tree.clone();

      a.clipTo(b);
      b.clipTo(a);
      b.invert();
      b.clipTo(a);
      b.invert();
      a.build(b.collectPolygons());
      a = new Geometry(a);
      a.matrix = this.matrix;
      return a;
   }

   intersect(other_tree) {
      let a = this.tree.clone();
      const b = other_tree.tree.clone();

      a.invert();
      b.clipTo(a);
      b.invert();
      a.clipTo(b);
      b.clipTo(a);
      a.build(b.collectPolygons());
      a.invert();
      a = new Geometry(a);
      a.matrix = this.matrix;
      return a;
   }

   tryToCompress(polygons) {
      if (this.maxid === undefined) return;

      const arr = [];
      let parts, foundpair,
          nreduce = 0, n, len = polygons.length,
          p, p1, p2, i1, i2;

      // sort out polygons
      for (n = 0; n < len; ++n) {
         p = polygons[n];
         if (p.id === undefined) continue;
         if (arr[p.id] === undefined) arr[p.id] = [];

         arr[p.id].push(p);
      }

      for (n = 0; n < arr.length; ++n) {
         parts = arr[n];
         if (parts === undefined) continue;

         len = parts.length;

         foundpair = (len > 1);

         while (foundpair) {
            foundpair = false;

            for (i1 = 0; i1 < len-1; ++i1) {
               p1 = parts[i1];
               if (!p1?.parent) continue;
               for (i2 = i1+1; i2 < len; ++i2) {
                  p2 = parts[i2];
                  if (p2 && (p1.parent === p2.parent) && (p1.nsign === p2.nsign)) {
                     if (p1.nsign !== p1.parent.nsign)
                        p1.parent.flip();
                     nreduce++;
                     parts[i1] = p1.parent;
                     parts[i2] = null;
                     if (p1.parent.vertices.length < 3) console.log('something wrong with parent');
                     foundpair = true;
                     break;
                  }
               }
            }
         }
      }

      if (nreduce > 0) {
         polygons.splice(0, polygons.length);

         for (n = 0; n < arr.length; ++n) {
            parts = arr[n];
            if (parts !== undefined) {
               for (i1 = 0, len = parts.length; i1 < len; ++i1)
                  if (parts[i1]) polygons.push(parts[i1]);
            }
         }
      }
   }

   direct_subtract(other_tree) {
      const a = this.tree,
            b = other_tree.tree;
      a.invert();
      a.clipTo(b);
      b.clipTo(a);
      b.invert();
      b.clipTo(a);
      b.invert();
      a.build(b.collectPolygons());
      a.invert();
      return this;
   }

   direct_union(other_tree) {
      const a = this.tree,
            b = other_tree.tree;

      a.clipTo(b);
      b.clipTo(a);
      b.invert();
      b.clipTo(a);
      b.invert();
      a.build(b.collectPolygons());
      return this;
   }

   direct_intersect(other_tree) {
      const a = this.tree,
            b = other_tree.tree;

      a.invert();
      b.clipTo(a);
      b.invert();
      a.clipTo(b);
      b.clipTo(a);
      a.build(b.collectPolygons());
      a.invert();
      return this;
   }

   cut_from_plane(other_tree) {
      // just cut peaces from second geometry, which just simple plane

      const a = this.tree,
            b = other_tree.tree;

      a.invert();
      b.clipTo(a);

      return this;
   }

   scale(x, y, z) {
      // try to scale as BufferGeometry
      const polygons = this.tree.collectPolygons();

      for (let i = 0; i < polygons.length; ++i) {
         const polygon = polygons[i];
         for (let k = 0; k < polygon.vertices.length; ++k) {
            const v = polygon.vertices[k];
            v.x *= x;
            v.y *= y;
            v.z *= z;
         }
         polygon.calculateProperties(true);
      }
   }

   toPolygons() {
      const polygons = this.tree.collectPolygons();

      this.tryToCompress(polygons);

      for (let i = 0; i < polygons.length; ++i) {
         delete polygons[i].id;
         delete polygons[i].parent;
      }

      return polygons;
   }

   toBufferGeometry() {
      return createBufferGeometry(this.toPolygons());
   }

   toMesh(material) {
      const geometry = this.toBufferGeometry(),
            mesh = new Mesh(geometry, material);

      if (this.matrix) {
         mesh.position.setFromMatrixPosition(this.matrix);
         mesh.rotation.setFromRotationMatrix(this.matrix);
      }

      return mesh;
   }

} // class Geometry

const cfg = {
   GradPerSegm: 6,       // grad per segment in cylinder/spherical symmetry shapes
   CompressComp: true    // use faces compression in composite shapes
};

const kindGeo = 0,    // TGeoNode / TGeoShape
      kindEve = 1,    // TEveShape / TEveGeoShapeExtract
      kindShape = 2,  // special kind for single shape handling

/** @summary TGeo-related bits
  * @private */
 geoBITS = {
   kVisOverride: BIT(0),  // volume's vis. attributes are overwritten
   kVisNone: BIT(1),  // the volume/node is invisible, as well as daughters
   kVisThis: BIT(2),  // this volume/node is visible
   kVisDaughters: BIT(3),  // all leaves are visible
   kVisOneLevel: BIT(4),  // first level daughters are visible (not used)
   kVisStreamed: BIT(5),  // true if attributes have been streamed
   kVisTouched: BIT(6),  // true if attributes are changed after closing geom
   kVisOnScreen: BIT(7),  // true if volume is visible on screen
   kVisContainers: BIT(12), // all containers visible
   kVisOnly: BIT(13), // just this visible
   kVisBranch: BIT(14), // only a given branch visible
   kVisRaytrace: BIT(15)  // raytracing flag
},

 clTGeoBBox = 'TGeoBBox',
      clTGeoArb8 = 'TGeoArb8',
      clTGeoCone = 'TGeoCone',
      clTGeoConeSeg = 'TGeoConeSeg',
      clTGeoTube = 'TGeoTube',
      clTGeoTubeSeg = 'TGeoTubeSeg',
      clTGeoCtub = 'TGeoCtub',
      clTGeoTrd1 = 'TGeoTrd1',
      clTGeoTrd2 = 'TGeoTrd2',
      clTGeoPara = 'TGeoPara',
      clTGeoParaboloid = 'TGeoParaboloid',
      clTGeoPcon = 'TGeoPcon',
      clTGeoPgon = 'TGeoPgon',
      clTGeoShapeAssembly = 'TGeoShapeAssembly',
      clTGeoSphere = 'TGeoSphere',
      clTGeoTorus = 'TGeoTorus',
      clTGeoXtru = 'TGeoXtru',
      clTGeoTrap = 'TGeoTrap',
      clTGeoGtra = 'TGeoGtra',
      clTGeoEltu = 'TGeoEltu',
      clTGeoHype = 'TGeoHype',
      clTGeoCompositeShape = 'TGeoCompositeShape',
      clTGeoHalfSpace = 'TGeoHalfSpace',
      clTGeoScaledShape = 'TGeoScaledShape';

/** @summary Test fGeoAtt bits
  * @private */
function testGeoBit(volume, f) {
   const att = volume.fGeoAtt;
   return att === undefined ? false : ((att & f) !== 0);
}

/** @summary Set fGeoAtt bit
  * @private */
function setGeoBit(volume, f, value) {
   if (volume.fGeoAtt === undefined) return;
   volume.fGeoAtt = value ? (volume.fGeoAtt | f) : (volume.fGeoAtt & ~f);
}

const _warn_msgs = {};

/** @summary method used to avoid duplication of warnings
 * @private */
function geoWarn(msg) {
   if (_warn_msgs[msg] !== undefined) return;
   _warn_msgs[msg] = true;
   console.warn(msg);
}

/** @summary Analyze TGeo node kind
 *  @desc  0 - TGeoNode
 *         1 - TEveGeoNode
 *        -1 - unsupported
 * @return detected node kind
 * @private */
function getNodeKind(obj) {
   if (!isObject(obj)) return -1;
   return ('fShape' in obj) && ('fTrans' in obj) ? kindEve : kindGeo;
}


/** @summary Returns geo object name
  * @desc Can appends some special suffixes
  * @private */
function getObjectName(obj) {
   return obj?.fName ? (obj.fName + (obj.$geo_suffix || '')) : '';
}

/** @summary Check duplicates
  * @private */
function checkDuplicates(parent, chlds) {
   if (parent) {
      if (parent.$geo_checked) return;
      parent.$geo_checked = true;
   }

   const names = [], cnts = [];
   for (let k = 0; k < chlds.length; ++k) {
      const chld = chlds[k];
      if (!chld?.fName) continue;
      if (!chld.$geo_suffix) {
         const indx = names.indexOf(chld.fName);
         if (indx >= 0) {
            let cnt = cnts[indx] || 1;
            while (names.indexOf(chld.fName+'#'+cnt) >= 0) ++cnt;
            chld.$geo_suffix = '#' + cnt;
            cnts[indx] = cnt+1;
         }
      }
      names.push(getObjectName(chld));
   }
}


/** @summary Create normal to plane, defined with three points
  * @private */
function produceNormal(x1, y1, z1, x2, y2, z2, x3, y3, z3) {
   const pA = new Vector3(x1, y1, z1),
       pB = new Vector3(x2, y2, z2),
       pC = new Vector3(x3, y3, z3),
       cb = new Vector3(),
       ab = new Vector3();

   cb.subVectors(pC, pB);
   ab.subVectors(pA, pB);
   cb.cross(ab);

   return cb;
}

// ==========================================================================

/**
  * @summary Helper class for geometry creation
  *
  * @private
  */

class GeometryCreator {

   /** @summary Constructor
     * @param numfaces - number of faces */
   constructor(numfaces) {
      this.nfaces = numfaces;
      this.indx = 0;
      this.pos = new Float32Array(numfaces*9);
      this.norm = new Float32Array(numfaces*9);
   }

   /** @summary Add face with 3 vertices */
   addFace3(x1, y1, z1, x2, y2, z2, x3, y3, z3) {
      const indx = this.indx, pos = this.pos;
      pos[indx] = x1;
      pos[indx+1] = y1;
      pos[indx+2] = z1;
      pos[indx+3] = x2;
      pos[indx+4] = y2;
      pos[indx+5] = z2;
      pos[indx+6] = x3;
      pos[indx+7] = y3;
      pos[indx+8] = z3;
      this.last4 = false;
      this.indx = indx + 9;
   }

   /** @summary Start polygon */
   startPolygon() {}

   /** @summary Stop polygon */
   stopPolygon() {}

   /** @summary Add face with 4 vertices
     * @desc From four vertices one normally creates two faces (1,2,3) and (1,3,4)
     * if (reduce === 1), first face is reduced
     * if (reduce === 2), second face is reduced */
   addFace4(x1, y1, z1, x2, y2, z2, x3, y3, z3, x4, y4, z4, reduce) {
      let indx = this.indx;
      const pos = this.pos;

      if (reduce !== 1) {
         pos[indx] = x1;
         pos[indx+1] = y1;
         pos[indx+2] = z1;
         pos[indx+3] = x2;
         pos[indx+4] = y2;
         pos[indx+5] = z2;
         pos[indx+6] = x3;
         pos[indx+7] = y3;
         pos[indx+8] = z3;
         indx+=9;
      }

      if (reduce !== 2) {
         pos[indx] = x1;
         pos[indx+1] = y1;
         pos[indx+2] = z1;
         pos[indx+3] = x3;
         pos[indx+4] = y3;
         pos[indx+5] = z3;
         pos[indx+6] = x4;
         pos[indx+7] = y4;
         pos[indx+8] = z4;
         indx+=9;
      }

      this.last4 = (indx !== this.indx + 9);
      this.indx = indx;
   }

   /** @summary Specify normal for face with 4 vertices
     * @desc same as addFace4, assign normals for each individual vertex
     * reduce has same meaning and should be the same */
   setNormal4(nx1, ny1, nz1, nx2, ny2, nz2, nx3, ny3, nz3, nx4, ny4, nz4, reduce) {
      if (this.last4 && reduce)
         return console.error('missmatch between addFace4 and setNormal4 calls');

      let indx = this.indx - (this.last4 ? 18 : 9);
      const norm = this.norm;

      if (reduce !== 1) {
         norm[indx] = nx1;
         norm[indx+1] = ny1;
         norm[indx+2] = nz1;
         norm[indx+3] = nx2;
         norm[indx+4] = ny2;
         norm[indx+5] = nz2;
         norm[indx+6] = nx3;
         norm[indx+7] = ny3;
         norm[indx+8] = nz3;
         indx+=9;
      }

      if (reduce !== 2) {
         norm[indx] = nx1;
         norm[indx+1] = ny1;
         norm[indx+2] = nz1;
         norm[indx+3] = nx3;
         norm[indx+4] = ny3;
         norm[indx+5] = nz3;
         norm[indx+6] = nx4;
         norm[indx+7] = ny4;
         norm[indx+8] = nz4;
      }
   }

   /** @summary Recalculate Z with provided func */
   recalcZ(func) {
      const pos = this.pos,
            last = this.indx;
      let indx = last - (this.last4 ? 18 : 9);

      while (indx < last) {
         pos[indx+2] = func(pos[indx], pos[indx+1], pos[indx+2]);
         indx+=3;
      }
   }

   /** @summary Caclualte normal */
   calcNormal() {
      if (!this.cb) {
         this.pA = new Vector3();
         this.pB = new Vector3();
         this.pC = new Vector3();
         this.cb = new Vector3();
         this.ab = new Vector3();
      }

      this.pA.fromArray(this.pos, this.indx - 9);
      this.pB.fromArray(this.pos, this.indx - 6);
      this.pC.fromArray(this.pos, this.indx - 3);

      this.cb.subVectors(this.pC, this.pB);
      this.ab.subVectors(this.pA, this.pB);
      this.cb.cross(this.ab);

      this.setNormal(this.cb.x, this.cb.y, this.cb.z);
   }

   /** @summary Set normal */
   setNormal(nx, ny, nz) {
      let indx = this.indx - 9;
      const norm = this.norm;

      norm[indx] = norm[indx+3] = norm[indx+6] = nx;
      norm[indx+1] = norm[indx+4] = norm[indx+7] = ny;
      norm[indx+2] = norm[indx+5] = norm[indx+8] = nz;

      if (this.last4) {
         indx -= 9;
         norm[indx] = norm[indx+3] = norm[indx+6] = nx;
         norm[indx+1] = norm[indx+4] = norm[indx+7] = ny;
         norm[indx+2] = norm[indx+5] = norm[indx+8] = nz;
      }
   }

   /** @summary Set normal
     * @desc special shortcut, when same normals can be applied for 1-2 point and 3-4 point */
   setNormal_12_34(nx12, ny12, nz12, nx34, ny34, nz34, reduce) {
      if (reduce === undefined) reduce = 0;

      let indx = this.indx - ((reduce > 0) ? 9 : 18);
      const norm = this.norm;

      if (reduce !== 1) {
         norm[indx] = nx12;
         norm[indx+1] = ny12;
         norm[indx+2] = nz12;
         norm[indx+3] = nx12;
         norm[indx+4] = ny12;
         norm[indx+5] = nz12;
         norm[indx+6] = nx34;
         norm[indx+7] = ny34;
         norm[indx+8] = nz34;
         indx += 9;
      }

      if (reduce !== 2) {
         norm[indx] = nx12;
         norm[indx+1] = ny12;
         norm[indx+2] = nz12;
         norm[indx+3] = nx34;
         norm[indx+4] = ny34;
         norm[indx+5] = nz34;
         norm[indx+6] = nx34;
         norm[indx+7] = ny34;
         norm[indx+8] = nz34;
      }
   }

   /** @summary Create geometry */
   create() {
      if (this.nfaces !== this.indx/9)
         console.error(`Mismatch with created ${this.nfaces} and filled ${this.indx/9} number of faces`);

      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(this.pos, 3));
      geometry.setAttribute('normal', new BufferAttribute(this.norm, 3));
      return geometry;
   }

}

// ================================================================================

/** @summary Helper class for CsgGeometry creation
  *
  * @private
  */

class PolygonsCreator {

   /** @summary constructor */
   constructor() {
      this.polygons = [];
   }

   /** @summary Start polygon */
   startPolygon(normal) {
      this.multi = 1;
      this.mnormal = normal;
   }

   /** @summary Stop polygon */
   stopPolygon() {
      if (!this.multi) return;
      this.multi = 0;
      console.error('Polygon should be already closed at this moment');
   }

   /** @summary Add face with 3 vertices */
   addFace3(x1, y1, z1, x2, y2, z2, x3, y3, z3) {
      this.addFace4(x1, y1, z1, x2, y2, z2, x3, y3, z3, x3, y3, z3, 2);
   }

   /** @summary Add face with 4 vertices
     * @desc From four vertices one normally creates two faces (1,2,3) and (1,3,4)
     * if (reduce === 1), first face is reduced
     * if (reduce === 2), second face is reduced */
   addFace4(x1, y1, z1, x2, y2, z2, x3, y3, z3, x4, y4, z4, reduce) {
      if (reduce === undefined) reduce = 0;

      this.v1 = new Vertex(x1, y1, z1, 0, 0, 0);
      this.v2 = (reduce === 1) ? null : new Vertex(x2, y2, z2, 0, 0, 0);
      this.v3 = new Vertex(x3, y3, z3, 0, 0, 0);
      this.v4 = (reduce === 2) ? null : new Vertex(x4, y4, z4, 0, 0, 0);

      this.reduce = reduce;

      if (this.multi) {
         if (reduce !== 2) console.error('polygon not supported for not-reduced faces');

         let polygon;

         if (this.multi++ === 1) {
            polygon = new Polygon();

            polygon.vertices.push(this.mnormal ? this.v2 : this.v3);
            this.polygons.push(polygon);
         } else {
            polygon = this.polygons[this.polygons.length-1];
            // check that last vertice equals to v2
            const last = this.mnormal ? polygon.vertices[polygon.vertices.length-1] : polygon.vertices[0],
                comp = this.mnormal ? this.v2 : this.v3;

            if (comp.diff(last) > 1e-12)
               console.error('vertex missmatch when building polygon');
         }

         const first = this.mnormal ? polygon.vertices[0] : polygon.vertices[polygon.vertices.length-1],
               next = this.mnormal ? this.v3 : this.v2;

         if (next.diff(first) < 1e-12) {
            // console.log(`polygon closed!!! nvertices = ${polygon.vertices.length}`);
            this.multi = 0;
         } else
         if (this.mnormal)
            polygon.vertices.push(this.v3);
          else
            polygon.vertices.unshift(this.v2);


         return;
      }

      const polygon = new Polygon();

      switch (reduce) {
         case 0: polygon.vertices.push(this.v1, this.v2, this.v3, this.v4); break;
         case 1: polygon.vertices.push(this.v1, this.v3, this.v4); break;
         case 2: polygon.vertices.push(this.v1, this.v2, this.v3); break;
      }

      this.polygons.push(polygon);
   }

   /** @summary Specify normal for face with 4 vertices
     * @desc same as addFace4, assign normals for each individual vertex
     * reduce has same meaning and should be the same */
   setNormal4(nx1, ny1, nz1, nx2, ny2, nz2, nx3, ny3, nz3, nx4, ny4, nz4) {
      this.v1.setnormal(nx1, ny1, nz1);
      if (this.v2) this.v2.setnormal(nx2, ny2, nz2);
      this.v3.setnormal(nx3, ny3, nz3);
      if (this.v4) this.v4.setnormal(nx4, ny4, nz4);
   }

   /** @summary Set normal
     * @desc special shortcut, when same normals can be applied for 1-2 point and 3-4 point */
   setNormal_12_34(nx12, ny12, nz12, nx34, ny34, nz34) {
      this.v1.setnormal(nx12, ny12, nz12);
      if (this.v2) this.v2.setnormal(nx12, ny12, nz12);
      this.v3.setnormal(nx34, ny34, nz34);
      if (this.v4) this.v4.setnormal(nx34, ny34, nz34);
   }

   /** @summary Calculate normal */
   calcNormal() {
      if (!this.cb) {
         this.pA = new Vector3();
         this.pB = new Vector3();
         this.pC = new Vector3();
         this.cb = new Vector3();
         this.ab = new Vector3();
      }

      this.pA.set(this.v1.x, this.v1.y, this.v1.z);

      if (this.reduce !== 1) {
         this.pB.set(this.v2.x, this.v2.y, this.v2.z);
         this.pC.set(this.v3.x, this.v3.y, this.v3.z);
      } else {
         this.pB.set(this.v3.x, this.v3.y, this.v3.z);
         this.pC.set(this.v4.x, this.v4.y, this.v4.z);
      }

      this.cb.subVectors(this.pC, this.pB);
      this.ab.subVectors(this.pA, this.pB);
      this.cb.cross(this.ab);

      this.setNormal(this.cb.x, this.cb.y, this.cb.z);
   }

   /** @summary Set normal */
   setNormal(nx, ny, nz) {
      this.v1.setnormal(nx, ny, nz);
      if (this.v2) this.v2.setnormal(nx, ny, nz);
      this.v3.setnormal(nx, ny, nz);
      if (this.v4) this.v4.setnormal(nx, ny, nz);
   }

   /** @summary Recalculate Z with provided func */
   recalcZ(func) {
      this.v1.z = func(this.v1.x, this.v1.y, this.v1.z);
      if (this.v2) this.v2.z = func(this.v2.x, this.v2.y, this.v2.z);
      this.v3.z = func(this.v3.x, this.v3.y, this.v3.z);
      if (this.v4) this.v4.z = func(this.v4.x, this.v4.y, this.v4.z);
   }

   /** @summary Create geometry
     * @private */
   create() {
      return { polygons: this.polygons };
   }

}

// ================= all functions to create geometry ===================================

/** @summary Creates cube geometrey
  * @private */
function createCubeBuffer(shape, faces_limit) {
   if (faces_limit < 0) return 12;

   const dx = shape.fDX, dy = shape.fDY, dz = shape.fDZ,
         creator = faces_limit ? new PolygonsCreator() : new GeometryCreator(12);

   creator.addFace4(dx, dy, dz, dx, -dy, dz, dx, -dy, -dz, dx, dy, -dz); creator.setNormal(1, 0, 0);

   creator.addFace4(-dx, dy, -dz, -dx, -dy, -dz, -dx, -dy, dz, -dx, dy, dz); creator.setNormal(-1, 0, 0);

   creator.addFace4(-dx, dy, -dz, -dx, dy, dz, dx, dy, dz, dx, dy, -dz); creator.setNormal(0, 1, 0);

   creator.addFace4(-dx, -dy, dz, -dx, -dy, -dz, dx, -dy, -dz, dx, -dy, dz); creator.setNormal(0, -1, 0);

   creator.addFace4(-dx, dy, dz, -dx, -dy, dz, dx, -dy, dz, dx, dy, dz); creator.setNormal(0, 0, 1);

   creator.addFace4(dx, dy, -dz, dx, -dy, -dz, -dx, -dy, -dz, -dx, dy, -dz); creator.setNormal(0, 0, -1);

   return creator.create();
}

/** @summary Creates 8 edges geometry
  * @private */
function create8edgesBuffer(v, faces_limit) {
   const indicies = [4, 7, 6, 5, 0, 3, 7, 4, 4, 5, 1, 0, 6, 2, 1, 5, 7, 3, 2, 6, 1, 2, 3, 0],
         creator = (faces_limit > 0) ? new PolygonsCreator() : new GeometryCreator(12);

   for (let n = 0; n < indicies.length; n += 4) {
      const i1 = indicies[n]*3,
            i2 = indicies[n+1]*3,
            i3 = indicies[n+2]*3,
            i4 = indicies[n+3]*3;
      creator.addFace4(v[i1], v[i1+1], v[i1+2], v[i2], v[i2+1], v[i2+2],
                       v[i3], v[i3+1], v[i3+2], v[i4], v[i4+1], v[i4+2]);
      if (n === 0)
         creator.setNormal(0, 0, 1);
      else if (n === 20)
         creator.setNormal(0, 0, -1);
      else
         creator.calcNormal();
   }

   return creator.create();
}

/** @summary Creates PARA geometrey
  * @private */
function createParaBuffer(shape, faces_limit) {
   if (faces_limit < 0) return 12;

   const txy = shape.fTxy, txz = shape.fTxz, tyz = shape.fTyz, v = [
       -shape.fZ*txz-txy*shape.fY-shape.fX, -shape.fY-shape.fZ*tyz, -shape.fZ,
       -shape.fZ*txz+txy*shape.fY-shape.fX, shape.fY-shape.fZ*tyz, -shape.fZ,
       -shape.fZ*txz+txy*shape.fY+shape.fX, shape.fY-shape.fZ*tyz, -shape.fZ,
       -shape.fZ*txz-txy*shape.fY+shape.fX, -shape.fY-shape.fZ*tyz, -shape.fZ,
        shape.fZ*txz-txy*shape.fY-shape.fX, -shape.fY+shape.fZ*tyz, shape.fZ,
        shape.fZ*txz+txy*shape.fY-shape.fX, shape.fY+shape.fZ*tyz, shape.fZ,
        shape.fZ*txz+txy*shape.fY+shape.fX, shape.fY+shape.fZ*tyz, shape.fZ,
        shape.fZ*txz-txy*shape.fY+shape.fX, -shape.fY+shape.fZ*tyz, shape.fZ];

   return create8edgesBuffer(v, faces_limit);
}

/** @summary Creates Ttrapezoid geometrey
  * @private */
function createTrapezoidBuffer(shape, faces_limit) {
   if (faces_limit < 0) return 12;

   let y1, y2;
   if (shape._typename === clTGeoTrd1)
      y1 = y2 = shape.fDY;
    else {
      y1 = shape.fDy1; y2 = shape.fDy2;
   }

   const v = [
      -shape.fDx1, y1, -shape.fDZ,
       shape.fDx1, y1, -shape.fDZ,
       shape.fDx1, -y1, -shape.fDZ,
      -shape.fDx1, -y1, -shape.fDZ,
      -shape.fDx2, y2, shape.fDZ,
       shape.fDx2, y2, shape.fDZ,
       shape.fDx2, -y2, shape.fDZ,
      -shape.fDx2, -y2, shape.fDZ
   ];

   return create8edgesBuffer(v, faces_limit);
}


/** @summary Creates arb8 geometrey
  * @private */
function createArb8Buffer(shape, faces_limit) {
   if (faces_limit < 0) return 12;

   const vertices = [
      shape.fXY[0][0], shape.fXY[0][1], -shape.fDZ,
      shape.fXY[1][0], shape.fXY[1][1], -shape.fDZ,
      shape.fXY[2][0], shape.fXY[2][1], -shape.fDZ,
      shape.fXY[3][0], shape.fXY[3][1], -shape.fDZ,
      shape.fXY[4][0], shape.fXY[4][1], shape.fDZ,
      shape.fXY[5][0], shape.fXY[5][1], shape.fDZ,
      shape.fXY[6][0], shape.fXY[6][1], shape.fDZ,
      shape.fXY[7][0], shape.fXY[7][1], shape.fDZ
   ],
    indicies = [
         4, 7, 6, 6, 5, 4, 3, 7, 4, 4, 0, 3,
         5, 1, 0, 0, 4, 5, 6, 2, 1, 1, 5, 6,
         7, 3, 2, 2, 6, 7, 1, 2, 3, 3, 0, 1];

   // detect same vertices on both Z-layers
   for (let side = 0; side < vertices.length; side += vertices.length/2) {
      for (let n1 = side; n1 < side + vertices.length/2 - 3; n1+=3) {
         for (let n2 = n1+3; n2 < side + vertices.length/2; n2+=3) {
             if ((vertices[n1] === vertices[n2]) &&
                (vertices[n1+1] === vertices[n2+1]) &&
                (vertices[n1+2] === vertices[n2+2])) {
                   for (let k=0; k<indicies.length; ++k)
                     if (indicies[k] === n2/3) indicies[k] = n1/3;
               }
         }
      }
   }

   const map = []; // list of existing faces (with all rotations)
   let numfaces = 0;

   for (let k = 0; k < indicies.length; k += 3) {
      const id1 = indicies[k]*100 + indicies[k+1]*10 + indicies[k+2],
            id2 = indicies[k+1]*100 + indicies[k+2]*10 + indicies[k],
            id3 = indicies[k+2]*100 + indicies[k]*10 + indicies[k+1];

      if ((indicies[k] === indicies[k+1]) || (indicies[k] === indicies[k+2]) || (indicies[k+1] === indicies[k+2]) ||
          (map.indexOf(id1) >= 0) || (map.indexOf(id2) >= 0) || (map.indexOf(id3) >= 0))
         indicies[k] = indicies[k+1] = indicies[k+2] = -1;
      else {
         map.push(id1, id2, id3);
         numfaces++;
      }
   }

   const creator = faces_limit ? new PolygonsCreator() : new GeometryCreator(numfaces);

   for (let n = 0; n < indicies.length; n += 6) {
      const i1 = indicies[n] * 3,
            i2 = indicies[n+1] * 3,
            i3 = indicies[n+2] * 3,
            i4 = indicies[n+3] * 3,
            i5 = indicies[n+4] * 3,
            i6 = indicies[n+5] * 3;
      let norm = null;

      if ((i1 >= 0) && (i4 >= 0) && faces_limit) {
         // try to identify two faces with same normal - very useful if one can create face4
         if (n === 0)
            norm = new Vector3(0, 0, 1);
         else if (n === 30)
            norm = new Vector3(0, 0, -1);
         else {
            const norm1 = produceNormal(vertices[i1], vertices[i1+1], vertices[i1+2],
                                      vertices[i2], vertices[i2+1], vertices[i2+2],
                                      vertices[i3], vertices[i3+1], vertices[i3+2]);

            norm1.normalize();

            const norm2 = produceNormal(vertices[i4], vertices[i4+1], vertices[i4+2],
                                      vertices[i5], vertices[i5+1], vertices[i5+2],
                                      vertices[i6], vertices[i6+1], vertices[i6+2]);

            norm2.normalize();

            if (norm1.distanceToSquared(norm2) < 1e-12) norm = norm1;
         }
      }

      if (norm !== null) {
         creator.addFace4(vertices[i1], vertices[i1+1], vertices[i1+2],
                          vertices[i2], vertices[i2+1], vertices[i2+2],
                          vertices[i3], vertices[i3+1], vertices[i3+2],
                          vertices[i5], vertices[i5+1], vertices[i5+2]);
         creator.setNormal(norm.x, norm.y, norm.z);
      } else {
         if (i1 >= 0) {
            creator.addFace3(vertices[i1], vertices[i1+1], vertices[i1+2],
                             vertices[i2], vertices[i2+1], vertices[i2+2],
                             vertices[i3], vertices[i3+1], vertices[i3+2]);
            creator.calcNormal();
         }
         if (i4 >= 0) {
            creator.addFace3(vertices[i4], vertices[i4+1], vertices[i4+2],
                             vertices[i5], vertices[i5+1], vertices[i5+2],
                             vertices[i6], vertices[i6+1], vertices[i6+2]);
            creator.calcNormal();
         }
      }
   }

   return creator.create();
}

/** @summary Creates sphere geometrey
  * @private */
function createSphereBuffer(shape, faces_limit) {
   const radius = [shape.fRmax, shape.fRmin],
         phiStart = shape.fPhi1,
         phiLength = shape.fPhi2 - shape.fPhi1,
         thetaStart = shape.fTheta1,
         thetaLength = shape.fTheta2 - shape.fTheta1,
         noInside = (radius[1] <= 0);
   let widthSegments = shape.fNseg,
       heightSegments = shape.fNz;

   if (faces_limit > 0) {
      const fact = (noInside ? 2 : 4) * widthSegments * heightSegments / faces_limit;

      if (fact > 1.0) {
         widthSegments = Math.max(4, Math.floor(widthSegments/Math.sqrt(fact)));
         heightSegments = Math.max(4, Math.floor(heightSegments/Math.sqrt(fact)));
      }
   }

   let numoutside = widthSegments * heightSegments * 2,
       numtop = widthSegments * (noInside ? 1 : 2),
       numbottom = widthSegments * (noInside ? 1 : 2);
   const numcut = (phiLength === 360) ? 0 : heightSegments * (noInside ? 2 : 4),
         epsilon = 1e-10;

   if (faces_limit < 0) return numoutside * (noInside ? 1 : 2) + numtop + numbottom + numcut;

   const _sinp = new Float32Array(widthSegments+1),
       _cosp = new Float32Array(widthSegments+1),
       _sint = new Float32Array(heightSegments+1),
       _cost = new Float32Array(heightSegments+1);

   for (let n = 0; n <= heightSegments; ++n) {
      const theta = (thetaStart + thetaLength/heightSegments*n)*Math.PI/180;
      _sint[n] = Math.sin(theta);
      _cost[n] = Math.cos(theta);
   }

   for (let n = 0; n <= widthSegments; ++n) {
      const phi = (phiStart + phiLength/widthSegments*n)*Math.PI/180;
      _sinp[n] = Math.sin(phi);
      _cosp[n] = Math.cos(phi);
   }

   if (Math.abs(_sint[0]) <= epsilon) { numoutside -= widthSegments; numtop = 0; }
   if (Math.abs(_sint[heightSegments]) <= epsilon) { numoutside -= widthSegments; numbottom = 0; }

   const numfaces = numoutside * (noInside ? 1 : 2) + numtop + numbottom + numcut,
         creator = faces_limit ? new PolygonsCreator() : new GeometryCreator(numfaces);

   for (let side = 0; side < 2; ++side) {
      if ((side === 1) && noInside) break;

      const r = radius[side],
            s = (side === 0) ? 1 : -1,
            d1 = 1 - side, d2 = 1 - d1;

      // use direct algorithm for the sphere - here normals and position can be calculated directly
      for (let k = 0; k < heightSegments; ++k) {
         const k1 = k + d1, k2 = k + d2;
         let skip = 0;
         if (Math.abs(_sint[k1]) <= epsilon) skip = 1; else
         if (Math.abs(_sint[k2]) <= epsilon) skip = 2;

         for (let n = 0; n < widthSegments; ++n) {
            creator.addFace4(
                  r*_sint[k1]*_cosp[n], r*_sint[k1] *_sinp[n], r*_cost[k1],
                  r*_sint[k1]*_cosp[n+1], r*_sint[k1] *_sinp[n+1], r*_cost[k1],
                  r*_sint[k2]*_cosp[n+1], r*_sint[k2] *_sinp[n+1], r*_cost[k2],
                  r*_sint[k2]*_cosp[n], r*_sint[k2] *_sinp[n], r*_cost[k2],
                  skip);
            creator.setNormal4(
                  s*_sint[k1]*_cosp[n], s*_sint[k1] *_sinp[n], s*_cost[k1],
                  s*_sint[k1]*_cosp[n+1], s*_sint[k1] *_sinp[n+1], s*_cost[k1],
                  s*_sint[k2]*_cosp[n+1], s*_sint[k2] *_sinp[n+1], s*_cost[k2],
                  s*_sint[k2]*_cosp[n], s*_sint[k2] *_sinp[n], s*_cost[k2],
                  skip);
         }
      }
   }

   // top/bottom
   for (let side = 0; side <= heightSegments; side += heightSegments) {
      if (Math.abs(_sint[side]) >= epsilon) {
         const ss = _sint[side], cc = _cost[side],
               d1 = (side === 0) ? 0 : 1, d2 = 1 - d1;
         for (let n = 0; n < widthSegments; ++n) {
            creator.addFace4(
                  radius[1] * ss * _cosp[n+d1], radius[1] * ss * _sinp[n+d1], radius[1] * cc,
                  radius[0] * ss * _cosp[n+d1], radius[0] * ss * _sinp[n+d1], radius[0] * cc,
                  radius[0] * ss * _cosp[n+d2], radius[0] * ss * _sinp[n+d2], radius[0] * cc,
                  radius[1] * ss * _cosp[n+d2], radius[1] * ss * _sinp[n+d2], radius[1] * cc,
                  noInside ? 2 : 0);
            creator.calcNormal();
         }
      }
   }

   // cut left/right sides
   if (phiLength < 360) {
      for (let side=0; side<=widthSegments; side+=widthSegments) {
         const ss = _sinp[side], cc = _cosp[side],
             d1 = (side === 0) ? 1 : 0, d2 = 1 - d1;

         for (let k=0; k<heightSegments; ++k) {
            creator.addFace4(
                  radius[1] * _sint[k+d1] * cc, radius[1] * _sint[k+d1] * ss, radius[1] * _cost[k+d1],
                  radius[0] * _sint[k+d1] * cc, radius[0] * _sint[k+d1] * ss, radius[0] * _cost[k+d1],
                  radius[0] * _sint[k+d2] * cc, radius[0] * _sint[k+d2] * ss, radius[0] * _cost[k+d2],
                  radius[1] * _sint[k+d2] * cc, radius[1] * _sint[k+d2] * ss, radius[1] * _cost[k+d2],
                  noInside ? 2 : 0);
            creator.calcNormal();
         }
      }
   }

   return creator.create();
}

/** @summary Creates tube geometrey
  * @private */
function createTubeBuffer(shape, faces_limit) {
   let outerR, innerR; // inner/outer tube radius
   if ((shape._typename === clTGeoCone) || (shape._typename === clTGeoConeSeg)) {
      outerR = [shape.fRmax2, shape.fRmax1];
      innerR = [shape.fRmin2, shape.fRmin1];
   } else {
      outerR = [shape.fRmax, shape.fRmax];
      innerR = [shape.fRmin, shape.fRmin];
   }

   const hasrmin = (innerR[0] > 0) || (innerR[1] > 0);
   let thetaStart = 0, thetaLength = 360;

   if ((shape._typename === clTGeoConeSeg) || (shape._typename === clTGeoTubeSeg) || (shape._typename === clTGeoCtub)) {
      thetaStart = shape.fPhi1;
      thetaLength = shape.fPhi2 - shape.fPhi1;
   }

   const radiusSegments = Math.max(4, Math.round(thetaLength/cfg.GradPerSegm));

   // external surface
   let numfaces = radiusSegments * (((outerR[0] <= 0) || (outerR[1] <= 0)) ? 1 : 2);

   // internal surface
   if (hasrmin)
      numfaces += radiusSegments * (((innerR[0] <= 0) || (innerR[1] <= 0)) ? 1 : 2);

   // upper cap
   if (outerR[0] > 0) numfaces += radiusSegments * ((innerR[0] > 0) ? 2 : 1);
   // bottom cup
   if (outerR[1] > 0) numfaces += radiusSegments * ((innerR[1] > 0) ? 2 : 1);

   if (thetaLength < 360)
      numfaces += ((outerR[0] > innerR[0]) ? 2 : 0) + ((outerR[1] > innerR[1]) ? 2 : 0);

   if (faces_limit < 0) return numfaces;

   const phi0 = thetaStart*Math.PI/180,
       dphi = thetaLength/radiusSegments*Math.PI/180,
       _sin = new Float32Array(radiusSegments+1),
       _cos = new Float32Array(radiusSegments+1);

   for (let seg = 0; seg <= radiusSegments; ++seg) {
      _cos[seg] = Math.cos(phi0+seg*dphi);
      _sin[seg] = Math.sin(phi0+seg*dphi);
   }

   const creator = faces_limit ? new PolygonsCreator() : new GeometryCreator(numfaces),
   calcZ = (shape._typename !== clTGeoCtub)
      ? null
      : (x, y, z) => {
      const arr = (z < 0) ? shape.fNlow : shape.fNhigh;
      return ((z < 0) ? -shape.fDz : shape.fDz) - (x*arr[0] + y*arr[1]) / arr[2];
   };

   // create outer/inner tube
   for (let side = 0; side < 2; ++side) {
      if ((side === 1) && !hasrmin) break;

      const R = (side === 0) ? outerR : innerR, d1 = side, d2 = 1 - side;
      let nxy = 1, nz = 0;

      if (R[0] !== R[1]) {
         const angle = Math.atan2((R[1]-R[0]), 2*shape.fDZ);
         nxy = Math.cos(angle);
         nz = Math.sin(angle);
      }

      if (side === 1) { nxy *= -1; nz *= -1; }

      const reduce = (R[0] <= 0) ? 2 : ((R[1] <= 0) ? 1 : 0);

      for (let seg = 0; seg < radiusSegments; ++seg) {
         creator.addFace4(
               R[0] * _cos[seg+d1], R[0] * _sin[seg+d1], shape.fDZ,
               R[1] * _cos[seg+d1], R[1] * _sin[seg+d1], -shape.fDZ,
               R[1] * _cos[seg+d2], R[1] * _sin[seg+d2], -shape.fDZ,
               R[0] * _cos[seg+d2], R[0] * _sin[seg+d2], shape.fDZ,
               reduce);

         if (calcZ) creator.recalcZ(calcZ);

         creator.setNormal_12_34(nxy*_cos[seg+d1], nxy*_sin[seg+d1], nz,
                                 nxy*_cos[seg+d2], nxy*_sin[seg+d2], nz,
                                 reduce);
      }
   }

   // create upper/bottom part
   for (let side = 0; side < 2; ++side) {
      if (outerR[side] <= 0) continue;

      const d1 = side, d2 = 1- side,
          sign = (side === 0) ? 1 : -1,
          reduce = (innerR[side] <= 0) ? 2 : 0;
      if ((reduce === 2) && (thetaLength === 360) && !calcZ)
         creator.startPolygon(side === 0);
      for (let seg = 0; seg < radiusSegments; ++seg) {
         creator.addFace4(
               innerR[side] * _cos[seg+d1], innerR[side] * _sin[seg+d1], sign*shape.fDZ,
               outerR[side] * _cos[seg+d1], outerR[side] * _sin[seg+d1], sign*shape.fDZ,
               outerR[side] * _cos[seg+d2], outerR[side] * _sin[seg+d2], sign*shape.fDZ,
               innerR[side] * _cos[seg+d2], innerR[side] * _sin[seg+d2], sign*shape.fDZ,
               reduce);
         if (calcZ) {
            creator.recalcZ(calcZ);
            creator.calcNormal();
         } else
            creator.setNormal(0, 0, sign);
      }

      creator.stopPolygon();
   }

   // create cut surfaces
   if (thetaLength < 360) {
      creator.addFace4(innerR[1] * _cos[0], innerR[1] * _sin[0], -shape.fDZ,
                       outerR[1] * _cos[0], outerR[1] * _sin[0], -shape.fDZ,
                       outerR[0] * _cos[0], outerR[0] * _sin[0], shape.fDZ,
                       innerR[0] * _cos[0], innerR[0] * _sin[0], shape.fDZ,
                       (outerR[0] === innerR[0]) ? 2 : ((innerR[1]===outerR[1]) ? 1 : 0));
      if (calcZ) creator.recalcZ(calcZ);
      creator.calcNormal();

      creator.addFace4(innerR[0] * _cos[radiusSegments], innerR[0] * _sin[radiusSegments], shape.fDZ,
                       outerR[0] * _cos[radiusSegments], outerR[0] * _sin[radiusSegments], shape.fDZ,
                       outerR[1] * _cos[radiusSegments], outerR[1] * _sin[radiusSegments], -shape.fDZ,
                       innerR[1] * _cos[radiusSegments], innerR[1] * _sin[radiusSegments], -shape.fDZ,
                       (outerR[0] === innerR[0]) ? 1 : ((innerR[1]===outerR[1]) ? 2 : 0));

      if (calcZ) creator.recalcZ(calcZ);
      creator.calcNormal();
   }

   return creator.create();
}

/** @summary Creates eltu geometrey
  * @private */
function createEltuBuffer(shape, faces_limit) {
   const radiusSegments = Math.max(4, Math.round(360/cfg.GradPerSegm));

   if (faces_limit < 0) return radiusSegments*4;

   // calculate all sin/cos tables in advance
   const x = new Float32Array(radiusSegments+1),
         y = new Float32Array(radiusSegments+1);
   for (let seg=0; seg<=radiusSegments; ++seg) {
       const phi = seg/radiusSegments*2*Math.PI;
       x[seg] = shape.fRmin*Math.cos(phi);
       y[seg] = shape.fRmax*Math.sin(phi);
   }

   const creator = faces_limit ? new PolygonsCreator() : new GeometryCreator(radiusSegments*4);
   let nx1, ny1, nx2 = 1, ny2 = 0;

   // create tube faces
   for (let seg = 0; seg < radiusSegments; ++seg) {
      creator.addFace4(x[seg], y[seg], +shape.fDZ,
                       x[seg], y[seg], -shape.fDZ,
                       x[seg+1], y[seg+1], -shape.fDZ,
                       x[seg+1], y[seg+1], shape.fDZ);

      // calculate normals ourself
      nx1 = nx2; ny1 = ny2;
      nx2 = x[seg+1] * shape.fRmax / shape.fRmin;
      ny2 = y[seg+1] * shape.fRmin / shape.fRmax;
      const dist = Math.sqrt(nx2**2 + ny2**2);
      nx2 = nx2 / dist; ny2 = ny2/dist;

      creator.setNormal_12_34(nx1, ny1, 0, nx2, ny2, 0);
   }

   // create top/bottom sides
   for (let side = 0; side < 2; ++side) {
      const sign = (side === 0) ? 1 : -1, d1 = side, d2 = 1 - side;
      for (let seg=0; seg<radiusSegments; ++seg) {
         creator.addFace3(0, 0, sign*shape.fDZ,
                          x[seg+d1], y[seg+d1], sign*shape.fDZ,
                          x[seg+d2], y[seg+d2], sign*shape.fDZ);
         creator.setNormal(0, 0, sign);
      }
   }

   return creator.create();
}

/** @summary Creates torus geometrey
  * @private */
function createTorusBuffer(shape, faces_limit) {
   const radius = shape.fR;
   let radialSegments = Math.max(6, Math.round(360/cfg.GradPerSegm)),
       tubularSegments = Math.max(8, Math.round(shape.fDphi/cfg.GradPerSegm)),
       numfaces = (shape.fRmin > 0 ? 4 : 2) * radialSegments * (tubularSegments + (shape.fDphi !== 360 ? 1 : 0));

   if (faces_limit < 0) return numfaces;

   if ((faces_limit > 0) && (numfaces > faces_limit)) {
      radialSegments = Math.floor(radialSegments/Math.sqrt(numfaces / faces_limit));
      tubularSegments = Math.floor(tubularSegments/Math.sqrt(numfaces / faces_limit));
      numfaces = (shape.fRmin > 0 ? 4 : 2) * radialSegments * (tubularSegments + (shape.fDphi !== 360 ? 1 : 0));
   }

   const _sinr = new Float32Array(radialSegments+1),
         _cosr = new Float32Array(radialSegments+1),
         _sint = new Float32Array(tubularSegments+1),
         _cost = new Float32Array(tubularSegments+1);

   for (let n = 0; n <= radialSegments; ++n) {
      _sinr[n] = Math.sin(n/radialSegments*2*Math.PI);
      _cosr[n] = Math.cos(n/radialSegments*2*Math.PI);
   }

   for (let t = 0; t <= tubularSegments; ++t) {
      const angle = (shape.fPhi1 + shape.fDphi*t/tubularSegments)/180*Math.PI;
      _sint[t] = Math.sin(angle);
      _cost[t] = Math.cos(angle);
   }

   const creator = faces_limit ? new PolygonsCreator() : new GeometryCreator(numfaces),
         // use vectors for normals calculation
         p1 = new Vector3(), p2 = new Vector3(), p3 = new Vector3(), p4 = new Vector3(),
         n1 = new Vector3(), n2 = new Vector3(), n3 = new Vector3(), n4 = new Vector3(),
         center1 = new Vector3(), center2 = new Vector3();

   for (let side = 0; side < 2; ++side) {
      if ((side > 0) && (shape.fRmin <= 0)) break;
      const tube = (side > 0) ? shape.fRmin : shape.fRmax,
            d1 = 1 - side, d2 = 1 - d1, ns = side > 0 ? -1 : 1;

      for (let t = 0; t < tubularSegments; ++t) {
         const t1 = t + d1, t2 = t + d2;
         center1.x = radius * _cost[t1]; center1.y = radius * _sint[t1];
         center2.x = radius * _cost[t2]; center2.y = radius * _sint[t2];

         for (let n = 0; n < radialSegments; ++n) {
            p1.x = (radius + tube * _cosr[n]) * _cost[t1]; p1.y = (radius + tube * _cosr[n]) * _sint[t1]; p1.z = tube*_sinr[n];
            p2.x = (radius + tube * _cosr[n+1]) * _cost[t1]; p2.y = (radius + tube * _cosr[n+1]) * _sint[t1]; p2.z = tube*_sinr[n+1];
            p3.x = (radius + tube * _cosr[n+1]) * _cost[t2]; p3.y = (radius + tube * _cosr[n+1]) * _sint[t2]; p3.z = tube*_sinr[n+1];
            p4.x = (radius + tube * _cosr[n]) * _cost[t2]; p4.y = (radius + tube * _cosr[n]) * _sint[t2]; p4.z = tube*_sinr[n];

            creator.addFace4(p1.x, p1.y, p1.z,
                             p2.x, p2.y, p2.z,
                             p3.x, p3.y, p3.z,
                             p4.x, p4.y, p4.z);

            n1.subVectors(p1, center1).normalize();
            n2.subVectors(p2, center1).normalize();
            n3.subVectors(p3, center2).normalize();
            n4.subVectors(p4, center2).normalize();

            creator.setNormal4(ns*n1.x, ns*n1.y, ns*n1.z,
                               ns*n2.x, ns*n2.y, ns*n2.z,
                               ns*n3.x, ns*n3.y, ns*n3.z,
                               ns*n4.x, ns*n4.y, ns*n4.z);
         }
      }
   }

   if (shape.fDphi !== 360) {
      for (let t = 0; t <= tubularSegments; t += tubularSegments) {
         const tube1 = shape.fRmax, tube2 = shape.fRmin,
             d1 = t > 0 ? 0 : 1, d2 = 1 - d1,
             skip = shape.fRmin > 0 ? 0 : 1,
             nsign = t > 0 ? 1 : -1;
         for (let n = 0; n < radialSegments; ++n) {
            creator.addFace4((radius + tube1 * _cosr[n+d1]) * _cost[t], (radius + tube1 * _cosr[n+d1]) * _sint[t], tube1*_sinr[n+d1],
                             (radius + tube2 * _cosr[n+d1]) * _cost[t], (radius + tube2 * _cosr[n+d1]) * _sint[t], tube2*_sinr[n+d1],
                             (radius + tube2 * _cosr[n+d2]) * _cost[t], (radius + tube2 * _cosr[n+d2]) * _sint[t], tube2*_sinr[n+d2],
                             (radius + tube1 * _cosr[n+d2]) * _cost[t], (radius + tube1 * _cosr[n+d2]) * _sint[t], tube1*_sinr[n+d2], skip);
            creator.setNormal(-nsign* _sint[t], nsign * _cost[t], 0);
         }
      }
   }

   return creator.create();
}


/** @summary Creates polygon geometrey
  * @private */
function createPolygonBuffer(shape, faces_limit) {
   const thetaStart = shape.fPhi1,
       thetaLength = shape.fDphi;
   let radiusSegments, factor;

   if (shape._typename === clTGeoPgon) {
      radiusSegments = shape.fNedges;
      factor = 1.0 / Math.cos(Math.PI/180 * thetaLength / radiusSegments / 2);
   } else {
      radiusSegments = Math.max(5, Math.round(thetaLength/cfg.GradPerSegm));
      factor = 1;
   }

   const usage = new Int16Array(2*shape.fNz);
   let numusedlayers = 0, hasrmin = false;

   for (let layer = 0; layer < shape.fNz; ++layer)
      if (shape.fRmin[layer] > 0) hasrmin = true;

   // return very rough estimation, number of faces may be much less
   if (faces_limit < 0) return (hasrmin ? 4 : 2) * radiusSegments * (shape.fNz-1);

   // coordinate of point on cut edge (x,z)
   const pnts = (thetaLength === 360) ? null : [];

   // first analyse levels - if we need to create all of them
   for (let side = 0; side < 2; ++side) {
      const rside = (side === 0) ? 'fRmax' : 'fRmin';

      for (let layer=0; layer < shape.fNz; ++layer) {
         // first create points for the layer
         const layerz = shape.fZ[layer], rad = shape[rside][layer];

         usage[layer*2+side] = 0;

         if ((layer > 0) && (layer < shape.fNz-1)) {
            if (((shape.fZ[layer-1] === layerz) && (shape[rside][layer-1] === rad)) ||
                ((shape[rside][layer+1] === rad) && (shape[rside][layer-1] === rad))) {
               // same Z and R as before - ignore
               // or same R before and after

               continue;
            }
         }

         if ((layer > 0) && ((side === 0) || hasrmin)) {
            usage[layer*2+side] = 1;
            numusedlayers++;
         }

         if (pnts !== null) {
            if (side === 0)
               pnts.push(new Vector2(factor*rad, layerz));
             else if (rad < shape.fRmax[layer])
               pnts.unshift(new Vector2(factor*rad, layerz));
         }
      }
   }

   let numfaces = numusedlayers*radiusSegments*2;
   if (shape.fRmin[0] !== shape.fRmax[0]) numfaces += radiusSegments * (hasrmin ? 2 : 1);
   if (shape.fRmin[shape.fNz-1] !== shape.fRmax[shape.fNz-1]) numfaces += radiusSegments * (hasrmin ? 2 : 1);

   let cut_faces = null;

   if (pnts !== null) {
      if (pnts.length === shape.fNz * 2) {
         // special case - all layers are there, create faces ourself
         cut_faces = [];
         for (let layer = shape.fNz-1; layer > 0; --layer) {
            if (shape.fZ[layer] === shape.fZ[layer-1]) continue;
            const right = 2*shape.fNz - 1 - layer;
            cut_faces.push([right, layer - 1, layer]);
            cut_faces.push([right, right + 1, layer-1]);
         }
      } else {
         // let three.js calculate our faces
         // console.log(`triangulate polygon ${shape.fShapeId}`);
         cut_faces = ShapeUtils.triangulateShape(pnts, []);
      }
      numfaces += cut_faces.length*2;
   }

   const phi0 = thetaStart*Math.PI/180, dphi = thetaLength/radiusSegments*Math.PI/180,
      // calculate all sin/cos tables in advance
      _sin = new Float32Array(radiusSegments+1),
      _cos = new Float32Array(radiusSegments+1);
   for (let seg = 0; seg <= radiusSegments; ++seg) {
      _cos[seg] = Math.cos(phi0+seg*dphi);
      _sin[seg] = Math.sin(phi0+seg*dphi);
   }

   const creator = faces_limit ? new PolygonsCreator() : new GeometryCreator(numfaces);

   // add sides
   for (let side = 0; side < 2; ++side) {
      const rside = (side === 0) ? 'fRmax' : 'fRmin',
            d1 = 1 - side, d2 = side;
      let z1 = shape.fZ[0], r1 = factor*shape[rside][0];

      for (let layer = 0; layer < shape.fNz; ++layer) {
         if (usage[layer*2+side] === 0) continue;

         const z2 = shape.fZ[layer], r2 = factor*shape[rside][layer];
         let nxy = 1, nz = 0;

         if ((r2 !== r1)) {
            const angle = Math.atan2((r2-r1), (z2-z1));
            nxy = Math.cos(angle);
            nz = Math.sin(angle);
         }

         if (side > 0) { nxy*=-1; nz*=-1; }

         for (let seg = 0; seg < radiusSegments; ++seg) {
            creator.addFace4(r1 * _cos[seg+d1], r1 * _sin[seg+d1], z1,
                             r2 * _cos[seg+d1], r2 * _sin[seg+d1], z2,
                             r2 * _cos[seg+d2], r2 * _sin[seg+d2], z2,
                             r1 * _cos[seg+d2], r1 * _sin[seg+d2], z1);
            creator.setNormal_12_34(nxy*_cos[seg+d1], nxy*_sin[seg+d1], nz, nxy*_cos[seg+d2], nxy*_sin[seg+d2], nz);
         }

         z1 = z2; r1 = r2;
      }
   }

   // add top/bottom
   for (let layer = 0; layer < shape.fNz; layer += (shape.fNz-1)) {
      const rmin = factor*shape.fRmin[layer], rmax = factor*shape.fRmax[layer];

      if (rmin === rmax) continue;

      const layerz = shape.fZ[layer],
            d1 = (layer === 0) ? 1 : 0, d2 = 1 - d1,
            normalz = (layer === 0) ? -1: 1;

      if (!hasrmin && !cut_faces)
         creator.startPolygon(layer > 0);

      for (let seg = 0; seg < radiusSegments; ++seg) {
         creator.addFace4(rmin * _cos[seg+d1], rmin * _sin[seg+d1], layerz,
                          rmax * _cos[seg+d1], rmax * _sin[seg+d1], layerz,
                          rmax * _cos[seg+d2], rmax * _sin[seg+d2], layerz,
                          rmin * _cos[seg+d2], rmin * _sin[seg+d2], layerz,
                          hasrmin ? 0 : 2);
         creator.setNormal(0, 0, normalz);
      }

      creator.stopPolygon();
   }

   if (cut_faces) {
      for (let seg = 0; seg <= radiusSegments; seg += radiusSegments) {
         const d1 = (seg === 0) ? 1 : 2, d2 = 3 - d1;
         for (let n=0; n<cut_faces.length; ++n) {
            const a = pnts[cut_faces[n][0]],
                b = pnts[cut_faces[n][d1]],
                c = pnts[cut_faces[n][d2]];

            creator.addFace3(a.x * _cos[seg], a.x * _sin[seg], a.y,
                             b.x * _cos[seg], b.x * _sin[seg], b.y,
                             c.x * _cos[seg], c.x * _sin[seg], c.y);

            creator.calcNormal();
         }
      }
   }

   return creator.create();
}

/** @summary Creates xtru geometrey
  * @private */
function createXtruBuffer(shape, faces_limit) {
   let nfaces = (shape.fNz-1) * shape.fNvert * 2;

   if (faces_limit < 0) return nfaces + shape.fNvert*3;

   // create points
   const pnts = [];
   for (let vert = 0; vert < shape.fNvert; ++vert)
      pnts.push(new Vector2(shape.fX[vert], shape.fY[vert]));

   let faces = ShapeUtils.triangulateShape(pnts, []);
   if (faces.length < pnts.length-2) {
      geoWarn(`Problem with XTRU shape ${shape.fName} with ${pnts.length} vertices`);
      faces = [];
   } else
      nfaces += faces.length * 2;

   const creator = faces_limit ? new PolygonsCreator() : new GeometryCreator(nfaces);

   for (let layer = 0; layer < shape.fNz-1; ++layer) {
      const z1 = shape.fZ[layer], scale1 = shape.fScale[layer],
            z2 = shape.fZ[layer+1], scale2 = shape.fScale[layer+1],
            x01 = shape.fX0[layer], x02 = shape.fX0[layer+1],
            y01 = shape.fY0[layer], y02 = shape.fY0[layer+1];

      for (let vert1 = 0; vert1 < shape.fNvert; ++vert1) {
         const vert2 = (vert1+1) % shape.fNvert;
         creator.addFace4(scale1 * shape.fX[vert1] + x01, scale1 * shape.fY[vert1] + y01, z1,
                          scale2 * shape.fX[vert1] + x02, scale2 * shape.fY[vert1] + y02, z2,
                          scale2 * shape.fX[vert2] + x02, scale2 * shape.fY[vert2] + y02, z2,
                          scale1 * shape.fX[vert2] + x01, scale1 * shape.fY[vert2] + y01, z1);
         creator.calcNormal();
      }
   }

   for (let layer = 0; layer <= shape.fNz-1; layer += (shape.fNz-1)) {
      const z = shape.fZ[layer], scale = shape.fScale[layer],
            x0 = shape.fX0[layer], y0 = shape.fY0[layer];

      for (let n = 0; n < faces.length; ++n) {
         const face = faces[n],
               pnt1 = pnts[face[0]],
               pnt2 = pnts[face[layer === 0 ? 2 : 1]],
               pnt3 = pnts[face[layer === 0 ? 1 : 2]];

         creator.addFace3(scale * pnt1.x + x0, scale * pnt1.y + y0, z,
                          scale * pnt2.x + x0, scale * pnt2.y + y0, z,
                          scale * pnt3.x + x0, scale * pnt3.y + y0, z);
         creator.setNormal(0, 0, layer === 0 ? -1 : 1);
      }
   }

   return creator.create();
}

/** @summary Creates para geometrey
  * @private */
function createParaboloidBuffer(shape, faces_limit) {
   let radiusSegments = Math.max(4, Math.round(360/cfg.GradPerSegm)),
       heightSegments = 30;

   if (faces_limit > 0) {
      const fact = 2*radiusSegments*(heightSegments+1) / faces_limit;
      if (fact > 1.0) {
         radiusSegments = Math.max(5, Math.floor(radiusSegments/Math.sqrt(fact)));
         heightSegments = Math.max(5, Math.floor(heightSegments/Math.sqrt(fact)));
      }
   }

   const rmin = shape.fRlo, rmax = shape.fRhi;
   let numfaces = (heightSegments+1) * radiusSegments*2;

   if (rmin === 0) numfaces -= radiusSegments*2; // complete layer
   if (rmax === 0) numfaces -= radiusSegments*2; // complete layer

   if (faces_limit < 0) return numfaces;

   let zmin = -shape.fDZ, zmax = shape.fDZ;

   // if no radius at -z, find intersection
   if (shape.fA >= 0) {
      if (shape.fB > zmin) zmin = shape.fB;
   } else
      if (shape.fB < zmax) zmax = shape.fB;


   const ttmin = Math.atan2(zmin, rmin), ttmax = Math.atan2(zmax, rmax),

   // calculate all sin/cos tables in advance
    _sin = new Float32Array(radiusSegments+1),
         _cos = new Float32Array(radiusSegments+1);
   for (let seg=0; seg<=radiusSegments; ++seg) {
      _cos[seg] = Math.cos(seg/radiusSegments*2*Math.PI);
      _sin[seg] = Math.sin(seg/radiusSegments*2*Math.PI);
   }

   const creator = faces_limit ? new PolygonsCreator() : new GeometryCreator(numfaces);
   let lastz = zmin, lastr = 0, lastnxy = 0, lastnz = -1;

   for (let layer = 0; layer <= heightSegments + 1; ++layer) {
      let layerz = 0, radius = 0, nxy = 0, nz = -1;

      if ((layer === 0) && (rmin === 0)) continue;

      if ((layer === heightSegments + 1) && (lastr === 0)) break;

      switch (layer) {
         case 0: layerz = zmin; radius = rmin; break;
         case heightSegments: layerz = zmax; radius = rmax; break;
         case heightSegments + 1: layerz = zmax; radius = 0; break;
         default: {
            const tt = Math.tan(ttmin + (ttmax-ttmin) * layer / heightSegments),
                  delta = tt**2 - 4*shape.fA*shape.fB; // should be always positive (a*b < 0)
            radius = 0.5*(tt+Math.sqrt(delta))/shape.fA;
            if (radius < 1e-6) radius = 0;
            layerz = radius*tt;
         }
      }

      nxy = shape.fA * radius;
      nz = (shape.fA > 0) ? -1 : 1;

      const skip = (lastr === 0) ? 1 : ((radius === 0) ? 2 : 0);

      for (let seg = 0; seg < radiusSegments; ++seg) {
         creator.addFace4(radius*_cos[seg], radius*_sin[seg], layerz,
                          lastr*_cos[seg], lastr*_sin[seg], lastz,
                          lastr*_cos[seg+1], lastr*_sin[seg+1], lastz,
                          radius*_cos[seg+1], radius*_sin[seg+1], layerz, skip);

         // use analytic normal values when open/closing paraboloid around 0
         // cut faces (top or bottom) set with simple normal
         if ((skip === 0) || ((layer === 1) && (rmin === 0)) || ((layer === heightSegments+1) && (rmax === 0))) {
            creator.setNormal4(nxy*_cos[seg], nxy*_sin[seg], nz,
                               lastnxy*_cos[seg], lastnxy*_sin[seg], lastnz,
                               lastnxy*_cos[seg+1], lastnxy*_sin[seg+1], lastnz,
                               nxy*_cos[seg+1], nxy*_sin[seg+1], nz, skip);
         } else
            creator.setNormal(0, 0, (layer < heightSegments) ? -1 : 1);
      }

      lastz = layerz; lastr = radius;
      lastnxy = nxy; lastnz = nz;
   }

   return creator.create();
}

/** @summary Creates hype geometrey
  * @private */
function createHypeBuffer(shape, faces_limit) {
   if ((shape.fTin === 0) && (shape.fTout === 0))
      return createTubeBuffer(shape, faces_limit);

   let radiusSegments = Math.max(4, Math.round(360/cfg.GradPerSegm)),
       heightSegments = 30,
       numfaces = radiusSegments * (heightSegments + 1) * ((shape.fRmin > 0) ? 4 : 2);

   if (faces_limit < 0) return numfaces;

   if ((faces_limit > 0) && (faces_limit > numfaces)) {
      radiusSegments = Math.max(4, Math.floor(radiusSegments/Math.sqrt(numfaces/faces_limit)));
      heightSegments = Math.max(4, Math.floor(heightSegments/Math.sqrt(numfaces/faces_limit)));
      numfaces = radiusSegments * (heightSegments + 1) * ((shape.fRmin > 0) ? 4 : 2);
   }

   // calculate all sin/cos tables in advance
   const _sin = new Float32Array(radiusSegments+1),
         _cos = new Float32Array(radiusSegments+1);
   for (let seg=0; seg<=radiusSegments; ++seg) {
      _cos[seg] = Math.cos(seg/radiusSegments*2*Math.PI);
      _sin[seg] = Math.sin(seg/radiusSegments*2*Math.PI);
   }

   const creator = faces_limit ? new PolygonsCreator() : new GeometryCreator(numfaces);

   // in-out side
   for (let side = 0; side < 2; ++side) {
      if ((side > 0) && (shape.fRmin <= 0)) break;

      const r0 = (side > 0) ? shape.fRmin : shape.fRmax,
            tsq = (side > 0) ? shape.fTinsq : shape.fToutsq,
            d1 = 1- side, d2 = 1 - d1;

      // vertical layers
      for (let layer = 0; layer < heightSegments; ++layer) {
         const z1 = -shape.fDz + layer/heightSegments*2*shape.fDz,
             z2 = -shape.fDz + (layer+1)/heightSegments*2*shape.fDz,
             r1 = Math.sqrt(r0**2 + tsq*z1**2),
             r2 = Math.sqrt(r0**2 + tsq*z2**2);

         for (let seg = 0; seg < radiusSegments; ++seg) {
            creator.addFace4(r1 * _cos[seg+d1], r1 * _sin[seg+d1], z1,
                             r2 * _cos[seg+d1], r2 * _sin[seg+d1], z2,
                             r2 * _cos[seg+d2], r2 * _sin[seg+d2], z2,
                             r1 * _cos[seg+d2], r1 * _sin[seg+d2], z1);
            creator.calcNormal();
         }
      }
   }

   // add caps
   for (let layer = 0; layer < 2; ++layer) {
      const z = (layer === 0) ? shape.fDz : -shape.fDz,
            r1 = Math.sqrt(shape.fRmax**2 + shape.fToutsq*z**2),
            r2 = (shape.fRmin > 0) ? Math.sqrt(shape.fRmin**2 + shape.fTinsq*z**2) : 0,
            skip = (shape.fRmin > 0) ? 0 : 1,
            d1 = 1 - layer, d2 = 1 - d1;
      for (let seg = 0; seg < radiusSegments; ++seg) {
          creator.addFace4(r1 * _cos[seg+d1], r1 * _sin[seg+d1], z,
                           r2 * _cos[seg+d1], r2 * _sin[seg+d1], z,
                           r2 * _cos[seg+d2], r2 * _sin[seg+d2], z,
                           r1 * _cos[seg+d2], r1 * _sin[seg+d2], z, skip);
          creator.setNormal(0, 0, (layer === 0) ? 1 : -1);
       }
   }

   return creator.create();
}

/** @summary Creates tessalated geometrey
  * @private */
function createTessellatedBuffer(shape, faces_limit) {
   let numfaces = 0;
   for (let i = 0; i < shape.fFacets.length; ++i)
      numfaces += (shape.fFacets[i].fNvert === 4) ? 2 : 1;
   if (faces_limit < 0) return numfaces;

   const creator = faces_limit ? new PolygonsCreator() : new GeometryCreator(numfaces);

   for (let i = 0; i < shape.fFacets.length; ++i) {
      const f = shape.fFacets[i],
            v0 = shape.fVertices[f.fIvert[0]].fVec,
            v1 = shape.fVertices[f.fIvert[1]].fVec,
            v2 = shape.fVertices[f.fIvert[2]].fVec;

      if (f.fNvert === 4) {
         const v3 = shape.fVertices[f.fIvert[3]].fVec;
         creator.addFace4(v0[0], v0[1], v0[2], v1[0], v1[1], v1[2], v2[0], v2[1], v2[2], v3[0], v3[1], v3[2]);
         creator.calcNormal();
      } else {
         creator.addFace3(v0[0], v0[1], v0[2], v1[0], v1[1], v1[2], v2[0], v2[1], v2[2]);
         creator.calcNormal();
      }
   }

   return creator.create();
}

/** @summary Creates Matrix4 from TGeoMatrix
  * @private */
function createMatrix(matrix) {
   if (!matrix) return null;

   let translation, rotation, scale;

   switch (matrix._typename) {
      case 'TGeoTranslation': translation = matrix.fTranslation; break;
      case 'TGeoRotation': rotation = matrix.fRotationMatrix; break;
      case 'TGeoScale': scale = matrix.fScale; break;
      case 'TGeoGenTrans':
         scale = matrix.fScale; // no break, translation and rotation follows
      // eslint-disable-next-line no-fallthrough
      case 'TGeoCombiTrans':
         translation = matrix.fTranslation;
         if (matrix.fRotation) rotation = matrix.fRotation.fRotationMatrix;
         break;
      case 'TGeoHMatrix':
         translation = matrix.fTranslation;
         rotation = matrix.fRotationMatrix;
         scale = matrix.fScale;
         break;
      case 'TGeoIdentity':
         break;
      default:
         console.warn(`unsupported matrix ${matrix._typename}`);
   }

   if (!translation && !rotation && !scale) return null;

   const res = new Matrix4();

   if (rotation) {
      res.set(rotation[0], rotation[1], rotation[2], 0,
              rotation[3], rotation[4], rotation[5], 0,
              rotation[6], rotation[7], rotation[8], 0,
                        0, 0, 0, 1);
   }

   if (translation)
      res.setPosition(translation[0], translation[1], translation[2]);

   if (scale)
      res.scale(new Vector3(scale[0], scale[1], scale[2]));

   return res;
}

/** @summary Creates transformation matrix for TGeoNode
  * @desc created after node visibility flag is checked and volume cut is performed
  * @private */
function getNodeMatrix(kind, node) {
   let matrix = null;

   if (kind === kindEve) {
      // special handling for EVE nodes

      matrix = new Matrix4();

      if (node.fTrans) {
         matrix.set(node.fTrans[0], node.fTrans[4], node.fTrans[8], 0,
                    node.fTrans[1], node.fTrans[5], node.fTrans[9], 0,
                    node.fTrans[2], node.fTrans[6], node.fTrans[10], 0,
                                 0, 0, 0, 1);
         // second - set position with proper sign
         matrix.setPosition(node.fTrans[12], node.fTrans[13], node.fTrans[14]);
      }
   } else if (node.fMatrix)
      matrix = createMatrix(node.fMatrix);
    else if ((node._typename === 'TGeoNodeOffset') && node.fFinder) {
      const kPatternReflected = BIT(14);
      if ((node.fFinder.fBits & kPatternReflected) !== 0)
         geoWarn('Unsupported reflected pattern ' + node.fFinder._typename);

      // if (node.fFinder._typename === 'TGeoPatternCylR') {}
      // if (node.fFinder._typename === 'TGeoPatternSphR') {}
      // if (node.fFinder._typename === 'TGeoPatternSphTheta') {}
      // if (node.fFinder._typename === 'TGeoPatternSphPhi') {}
      // if (node.fFinder._typename === 'TGeoPatternHoneycomb') {}
      switch (node.fFinder._typename) {
        case 'TGeoPatternX':
        case 'TGeoPatternY':
        case 'TGeoPatternZ':
        case 'TGeoPatternParaX':
        case 'TGeoPatternParaY':
        case 'TGeoPatternParaZ': {
           const _shift = node.fFinder.fStart + (node.fIndex + 0.5) * node.fFinder.fStep;

           matrix = new Matrix4();

           switch (node.fFinder._typename[node.fFinder._typename.length-1]) {
              case 'X': matrix.setPosition(_shift, 0, 0); break;
              case 'Y': matrix.setPosition(0, _shift, 0); break;
              case 'Z': matrix.setPosition(0, 0, _shift); break;
           }
           break;
        }

        case 'TGeoPatternCylPhi': {
           const phi = (Math.PI/180)*(node.fFinder.fStart+(node.fIndex+0.5)*node.fFinder.fStep),
               _cos = Math.cos(phi), _sin = Math.sin(phi);

           matrix = new Matrix4();

           matrix.set(_cos, -_sin, 0, 0,
                      _sin, _cos, 0, 0,
                         0, 0, 1, 0,
                         0, 0, 0, 1);
           break;
        }

        case 'TGeoPatternCylR':
            // seems to be, require no transformation
            matrix = new Matrix4();
            break;

        case 'TGeoPatternTrapZ': {
           const dz = node.fFinder.fStart + (node.fIndex+0.5)*node.fFinder.fStep;
           matrix = new Matrix4();
           matrix.setPosition(node.fFinder.fTxz*dz, node.fFinder.fTyz*dz, dz);
           break;
        }

        default:
           geoWarn(`Unsupported pattern type ${node.fFinder._typename}`);
           break;
      }
   }

   return matrix;
}

/** @summary Returns number of faces for provided geometry
  * @param {Object} geom  - can be BufferGeometry, CsgGeometry or interim array of polygons
  * @private */
function numGeometryFaces(geom) {
   if (!geom) return 0;

   if (geom instanceof Geometry)
      return geom.tree.numPolygons();

   // special array of polygons
   if (geom.polygons)
      return geom.polygons.length;

   const attr = geom.getAttribute('position');
   return attr?.count ? Math.round(attr.count / 3) : 0;
}

/** @summary Returns geometry bounding box
  * @private */
function geomBoundingBox(geom) {
   if (!geom) return null;

   let polygons = null;

   if (geom instanceof Geometry)
      polygons = geom.tree.collectPolygons();
   else if (geom.polygons)
      polygons = geom.polygons;

   if (polygons !== null) {
      const box = new Box3();
      for (let n = 0; n < polygons.length; ++n) {
         const polygon = polygons[n], nvert = polygon.vertices.length;
         for (let k = 0; k < nvert; ++k)
            box.expandByPoint(polygon.vertices[k]);
      }
      return box;
   }

   if (!geom.boundingBox)
      geom.computeBoundingBox();

   return geom.boundingBox.clone();
}

/** @summary Creates half-space geometry for given shape
  * @desc Just big-enough triangle to make BSP calculations
  * @private */
function createHalfSpace(shape, geom) {
   if (!shape?.fN || !shape?.fP) return null;

   const vertex = new Vector3(shape.fP[0], shape.fP[1], shape.fP[2]),
       normal = new Vector3(shape.fN[0], shape.fN[1], shape.fN[2]);

   normal.normalize();

   let sz = 1e10;
   if (geom) {
      // using real size of other geometry, we probably improve precision
      const box = geomBoundingBox(geom);
      if (box) sz = box.getSize(new Vector3()).length() * 1000;
   }

   const v0 = new Vector3(-sz, -sz/2, 0),
       v1 = new Vector3(0, sz, 0),
       v2 = new Vector3(sz, -sz/2, 0),
       v3 = new Vector3(0, 0, -sz),
       geometry = new BufferGeometry(),
       positions = new Float32Array([v0.x, v0.y, v0.z, v2.x, v2.y, v2.z, v1.x, v1.y, v1.z,
                                      v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v3.x, v3.y, v3.z,
                                      v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z,
                                      v2.x, v2.y, v2.z, v0.x, v0.y, v0.z, v3.x, v3.y, v3.z]);
   geometry.setAttribute('position', new BufferAttribute(positions, 3));
   geometry.computeVertexNormals();

   geometry.lookAt(normal);
   geometry.computeVertexNormals();

   for (let k = 0; k < positions.length; k += 3) {
      positions[k] = positions[k] + vertex.x;
      positions[k+1] = positions[k+1] + vertex.y;
      positions[k+2] = positions[k+2] + vertex.z;
   }

   return geometry;
}

/** @summary Returns number of faces for provided geometry
  * @param geom  - can be BufferGeometry, CsgGeometry or interim array of polygons
  * @private */
function countGeometryFaces(geom) {
   if (!geom) return 0;

   if (geom instanceof Geometry)
      return geom.tree.numPolygons();

   // special array of polygons
   if (geom.polygons)
      return geom.polygons.length;

   const attr = geom.getAttribute('position');
   return attr?.count ? Math.round(attr.count / 3) : 0;
}

/** @summary Creates geometrey for composite shape
  * @private */
function createComposite(shape, faces_limit) {
   if (faces_limit < 0) {
      return createGeometry(shape.fNode.fLeft, -1) +
             createGeometry(shape.fNode.fRight, -1);
   }

   let geom1, geom2, return_bsp = false;
   const matrix1 = createMatrix(shape.fNode.fLeftMat),
         matrix2 = createMatrix(shape.fNode.fRightMat);

   if (faces_limit === 0) faces_limit = 4000;
                     else return_bsp = true;

   if (matrix1 && (matrix1.determinant() < -0.9))
      geoWarn('Axis reflection in left composite shape - not supported');

   if (matrix2 && (matrix2.determinant() < -0.9))
      geoWarn('Axis reflections in right composite shape - not supported');

   if (shape.fNode.fLeft._typename === clTGeoHalfSpace)
      geom1 = createHalfSpace(shape.fNode.fLeft);
    else
      geom1 = createGeometry(shape.fNode.fLeft, faces_limit);

   if (!geom1) return null;

   let n1 = countGeometryFaces(geom1), n2 = 0;
   if (geom1._exceed_limit) n1 += faces_limit;

   if (n1 < faces_limit) {
      if (shape.fNode.fRight._typename === clTGeoHalfSpace)
         geom2 = createHalfSpace(shape.fNode.fRight, geom1);
       else
         geom2 = createGeometry(shape.fNode.fRight, faces_limit);


      n2 = countGeometryFaces(geom2);
   }

   if ((n1 + n2 >= faces_limit) || !geom2) {
      if (geom1.polygons)
         geom1 = createBufferGeometry(geom1.polygons);
      if (matrix1) geom1.applyMatrix4(matrix1);
      geom1._exceed_limit = true;
      return geom1;
   }

   let bsp1 = new Geometry(geom1, matrix1, 0 );

   const bsp2 = new Geometry(geom2, matrix2, bsp1.maxid);

   // take over maxid from both geometries
   bsp1.maxid = bsp2.maxid;

   switch (shape.fNode._typename) {
      case 'TGeoIntersection': bsp1.direct_intersect(bsp2); break; // '*'
      case 'TGeoUnion': bsp1.direct_union(bsp2); break;   // '+'
      case 'TGeoSubtraction': bsp1.direct_subtract(bsp2); break; // '/'
      default:
         geoWarn('unsupported bool operation ' + shape.fNode._typename + ', use first geom');
   }

   if (countGeometryFaces(bsp1) === 0) {
      geoWarn('Zero faces in comp shape' +
             ` left: ${shape.fNode.fLeft._typename} ${countGeometryFaces(geom1)} faces` +
             ` right: ${shape.fNode.fRight._typename} ${countGeometryFaces(geom2)} faces` +
             '  use first');
      bsp1 = new Geometry(geom1, matrix1);
   }

   return return_bsp ? { polygons: bsp1.toPolygons() } : bsp1.toBufferGeometry();
}

/** @summary Creates geometry model for the provided shape
  * @param {Object} shape - instance of TGeoShape object
  * @param {Number} limit - defines return value, see details
  * @desc
  *  - if limit === 0 (or undefined) returns BufferGeometry
  *  - if limit < 0 just returns estimated number of faces
  *  - if limit > 0 return list of CsgPolygons (used only for composite shapes)
  * @private */
function createGeometry(shape, limit) {
   if (limit === undefined) limit = 0;

   try {
      switch (shape._typename) {
         case clTGeoBBox: return createCubeBuffer(shape, limit);
         case clTGeoPara: return createParaBuffer(shape, limit);
         case clTGeoTrd1:
         case clTGeoTrd2: return createTrapezoidBuffer(shape, limit);
         case clTGeoArb8:
         case clTGeoTrap:
         case clTGeoGtra: return createArb8Buffer(shape, limit);
         case clTGeoSphere: return createSphereBuffer(shape, limit);
         case clTGeoCone:
         case clTGeoConeSeg:
         case clTGeoTube:
         case clTGeoTubeSeg:
         case clTGeoCtub: return createTubeBuffer(shape, limit);
         case clTGeoEltu: return createEltuBuffer(shape, limit);
         case clTGeoTorus: return createTorusBuffer(shape, limit);
         case clTGeoPcon:
         case clTGeoPgon: return createPolygonBuffer(shape, limit);
         case clTGeoXtru: return createXtruBuffer(shape, limit);
         case clTGeoParaboloid: return createParaboloidBuffer(shape, limit);
         case clTGeoHype: return createHypeBuffer(shape, limit);
         case 'TGeoTessellated': return createTessellatedBuffer(shape, limit);
         case clTGeoCompositeShape: return createComposite(shape, limit);
         case clTGeoShapeAssembly: break;
         case clTGeoScaledShape: {
            const res = createGeometry(shape.fShape, limit);
            if (shape.fScale && (limit >= 0) && isFunc(res?.scale))
               res.scale(shape.fScale.fScale[0], shape.fScale.fScale[1], shape.fScale.fScale[2]);
            return res;
         }
         case clTGeoHalfSpace:
            if (limit < 0) return 1; // half space if just plane used in composite
            // no break here - warning should appear
         // eslint-disable-next-line no-fallthrough
         default:
            geoWarn(`unsupported shape type ${shape._typename}`);
      }
   } catch (e) {
      let place = '';
      if (e.stack !== undefined) {
         place = e.stack.split('\n')[0];
         if (place.indexOf(e.message) >= 0) place = e.stack.split('\n')[1];
                                       else place = 'at: ' + place;
      }
      geoWarn(`${shape._typename} err: ${e.message} ${place}`);
   }

   return limit < 0 ? 0 : null;
}


/** @summary Create single shape from EVE7 render date
  * @private */
function makeEveGeometry(rd) {
   let off = 0;

   if (rd.sz[0]) {
      rd.vtxBuff = new Float32Array(rd.raw.buffer, off, rd.sz[0]);
      off += rd.sz[0]*4;
   }

   if (rd.sz[1]) {
      // normals were not used
      // rd.nrmBuff = new Float32Array(rd.raw.buffer, off, rd.sz[1]);
      off += rd.sz[1]*4;
   }

   if (rd.sz[2]) {
      // these are special values in the buffer begin
      rd.prefixBuf = new Uint32Array(rd.raw.buffer, off, 2);
      off += 2*4;
      rd.idxBuff = new Uint32Array(rd.raw.buffer, off, rd.sz[2]-2);
      // off += (rd.sz[2]-2)*4;
   }

   const GL_TRIANGLES = 4; // same as in EVE7

   if (rd.prefixBuf[0] !== GL_TRIANGLES)
      throw Error('Expect triangles first.');

   const nVert = 3 * rd.prefixBuf[1]; // number of vertices to draw

   if (rd.idxBuff.length !== nVert)
      throw Error('Expect single list of triangles in index buffer.');

   const body = new BufferGeometry();
   body.setAttribute('position', new BufferAttribute(rd.vtxBuff, 3));
   body.setIndex(new BufferAttribute(rd.idxBuff, 1));
   body.computeVertexNormals();

   return body;
}

/** @summary Create single shape from geometry veiwer render date
  * @private */
function makeViewerGeometry(rd) {
   const vtxBuff = new Float32Array(rd.raw.buffer, 0, rd.raw.buffer.byteLength/4),

    body = new BufferGeometry();
   body.setAttribute('position', new BufferAttribute(vtxBuff, 3));
   body.setIndex(new BufferAttribute(new Uint32Array(rd.idx), 1));
   body.computeVertexNormals();
   return body;
}

/** @summary Create single shape from provided raw data from web viewer.
  * @desc If nsegm changed, shape will be recreated
  * @private */
function createServerGeometry(rd, nsegm) {
   if (rd.server_shape && ((rd.nsegm === nsegm) || !rd.shape))
      return rd.server_shape;

   rd.nsegm = nsegm;

   let g = null;

   if (rd.shape) {
      // case when TGeoShape provided as is
      g = createGeometry(rd.shape);
   } else {
      if (!rd.raw?.buffer) {
         console.error('No raw data at all');
         return null;
      }

      if (rd.sz)
         g = makeEveGeometry(rd);
      else
         g = makeViewerGeometry(rd);
   }

   // shape handle is similar to created in TGeoPainter
   return {
      _typename: '$$Shape$$', // indicate that shape can be used as is
      ready: true,
      geom: g,
      nfaces: numGeometryFaces(g)
   };
}

/** @summary Create node material
  * @private */
function createMaterial(cfg, args0) {
   if (!cfg) cfg = { material_kind: 'lambert' };

   const args = Object.assign({}, args0);

   if (args.opacity === undefined)
      args.opacity = 1;

   if (cfg.transparency)
      args.opacity = Math.min(1 - cfg.transparency, args.opacity);

   args.wireframe = cfg.wireframe ?? false;
   if (!args.color) args.color = 'red';
   args.side = FrontSide;
   args.transparent = args.opacity < 1;
   args.depthWrite = args.opactity === 1;

   let material;

   if (cfg.material_kind === 'basic')
      material = new MeshBasicMaterial(args);
    else if (cfg.material_kind === 'depth') {
      delete args.color;
      material = new MeshDepthMaterial(args);
   } else if (cfg.material_kind === 'toon')
      material = new MeshToonMaterial(args);
    else if (cfg.material_kind === 'matcap') {
      delete args.wireframe;
      material = new MeshMatcapMaterial(args);
   } else if (cfg.material_kind === 'standard') {
      args.metalness = cfg.metalness ?? 0.5;
      args.roughness = cfg.roughness ?? 0.1;
      material = new MeshStandardMaterial(args);
   } else if (cfg.material_kind === 'normal') {
      delete args.color;
      material = new MeshNormalMaterial(args);
   } else if (cfg.material_kind === 'physical') {
      args.metalness = cfg.metalness ?? 0.5;
      args.roughness = cfg.roughness ?? 0.1;
      args.reflectivity = cfg.reflectivity ?? 0.5;
      args.emissive = args.color;
      material = new MeshPhysicalMaterial(args);
   } else if (cfg.material_kind === 'phong') {
      args.shininess = cfg.shininess ?? 0.9;
      material = new MeshPhongMaterial(args);
   } else {
      args.vertexColors = false;
      material = new MeshLambertMaterial(args);
   }

   if ((material.flatShading !== undefined) && (cfg.flatShading !== undefined))
      material.flatShading = cfg.flatShading;
   material.inherentOpacity = args0.opacity ?? 1;
   material.inherentArgs = args0;

   return material;
}


/** @summary Compares two stacks.
  * @return {Number} 0 if same, -1 when stack1 < stack2, +1 when stack1 > stack2
  * @private */
function compare_stacks(stack1, stack2) {
   if (stack1 === stack2)
      return 0;
   const len1 = stack1?.length ?? 0,
         len2 = stack2?.length ?? 0,
         len = (len1 < len2) ? len1 : len2;
   let indx = 0;
   while (indx < len) {
      if (stack1[indx] < stack2[indx])
         return -1;
      if (stack1[indx] > stack2[indx])
         return 1;
      ++indx;
   }

   return (len1 < len2) ? -1 : ((len1 > len2) ? 1 : 0);
}


/**
  * @summary class for working with cloned nodes
  *
  * @private
  */

class ClonedNodes {

   /** @summary Constructor */
   constructor(obj, clones) {
      this.toplevel = true; // indicate if object creates top-level structure with Nodes and Volumes folder
      this.name_prefix = ''; // name prefix used for nodes names
      this.maxdepth = 1;  // maximal hierarchy depth, required for transparency
      this.vislevel = 4;  // maximal depth of nodes visibility aka gGeoManager->SetVisLevel, same default
      this.maxnodes = 10000; // maximal number of visisble nodes aka gGeoManager->fMaxVisNodes

      if (obj) {
         if (obj.$geoh) this.toplevel = false;
         this.createClones(obj);
      } else if (clones)
         this.nodes = clones;
   }

   /** @summary Set maximal depth for nodes visibility */
   setVisLevel(lvl) {
      this.vislevel = lvl && Number.isInteger(lvl) ? lvl : 4;
   }

   /** @summary Returns maximal depth for nodes visibility */
   getVisLevel() {
      return this.vislevel;
   }

   /** @summary Set maximal number of visible nodes */
   setMaxVisNodes(v, more) {
      this.maxnodes = Number.isFinite(v) ? v : 10000;
      if (more && Number.isFinite(more))
         this.maxnodes *= more;
   }

   /** @summary Returns configured maximal number of visible nodes */
   getMaxVisNodes() {
      return this.maxnodes;
   }

   /** @summary Set geo painter configuration - used for material creation */
   setConfig(cfg) {
      this._cfg = cfg;
   }

   /** @summary Insert node into existing array */
   updateNode(node) {
      if (node && Number.isInteger(node.id) && (node.id < this.nodes.length))
         this.nodes[node.id] = node;
   }

   /** @summary Returns TGeoShape for element with given indx */
   getNodeShape(indx) {
      if (!this.origin || !this.nodes) return null;
      const obj = this.origin[indx], clone = this.nodes[indx];
      if (!obj || !clone) return null;
      if (clone.kind === kindGeo) {
         if (obj.fVolume) return obj.fVolume.fShape;
      } else
         return obj.fShape;

      return null;
   }

   /** @summary function to cleanup as much as possible structures
     * @desc Provided parameters drawnodes and drawshapes are arrays created during building of geometry */
   cleanup(drawnodes, drawshapes) {
      if (drawnodes) {
         for (let n = 0; n < drawnodes.length; ++n) {
            delete drawnodes[n].stack;
            drawnodes[n] = undefined;
         }
      }

      if (drawshapes) {
         for (let n = 0; n < drawshapes.length; ++n) {
            delete drawshapes[n].geom;
            drawshapes[n] = undefined;
         }
      }

      if (this.nodes) {
         for (let n = 0; n < this.nodes.length; ++n) {
            if (this.nodes[n])
               delete this.nodes[n].chlds;
         }
      }

      delete this.nodes;
      delete this.origin;

      delete this.sortmap;
   }

   /** @summary Create complete description for provided Geo object */
   createClones(obj, sublevel, kind) {
      if (!sublevel) {
         if (obj?._typename === '$$Shape$$')
            return this.createClonesForShape(obj);

         this.origin = [];
         sublevel = 1;
         kind = getNodeKind(obj);
      }

      if ((kind < 0) || !obj || ('_refid' in obj)) return;

      obj._refid = this.origin.length;
      this.origin.push(obj);
      if (sublevel > this.maxdepth) this.maxdepth = sublevel;

      let chlds = null;
      if (kind === kindGeo)
         chlds = obj.fVolume?.fNodes?.arr || null;
      else
         chlds = obj.fElements?.arr || null;

      if (chlds !== null) {
         checkDuplicates(obj, chlds);
         for (let i = 0; i < chlds.length; ++i)
            this.createClones(chlds[i], sublevel + 1, kind);
      }

      if (sublevel > 1) return;

      this.nodes = [];

      const sortarr = [];

      // first create nodes objects
      for (let id = 0; id < this.origin.length; ++id) {
         // let obj = this.origin[id];
         const node = { id, kind, vol: 0, nfaces: 0 };
         this.nodes.push(node);
         sortarr.push(node); // array use to produce sortmap
      }

      // than fill children lists
      for (let n = 0; n < this.origin.length; ++n) {
         const obj = this.origin[n], clone = this.nodes[n];
         let chlds = null, shape = null;

         if (kind === kindEve) {
            shape = obj.fShape;
            if (obj.fElements) chlds = obj.fElements.arr;
         } else if (obj.fVolume) {
            shape = obj.fVolume.fShape;
            if (obj.fVolume.fNodes) chlds = obj.fVolume.fNodes.arr;
         }

         const matrix = getNodeMatrix(kind, obj);
         if (matrix) {
            clone.matrix = matrix.elements; // take only matrix elements, matrix will be constructed in worker
            if (clone.matrix[0] === 1) {
               let issimple = true;
               for (let k = 1; (k < clone.matrix.length) && issimple; ++k)
                  issimple = (clone.matrix[k] === ((k === 5) || (k === 10) || (k === 15) ? 1 : 0));
               if (issimple) delete clone.matrix;
            }
            if (clone.matrix && (kind === kindEve))  // deepscan-disable-line INSUFFICIENT_NULL_CHECK
               clone.abs_matrix = true;
         }
         if (shape) {
            clone.fDX = shape.fDX;
            clone.fDY = shape.fDY;
            clone.fDZ = shape.fDZ;
            clone.vol = Math.sqrt(shape.fDX**2 + shape.fDY**2 + shape.fDZ**2);
            if (shape.$nfaces === undefined)
               shape.$nfaces = createGeometry(shape, -1);
            clone.nfaces = shape.$nfaces;
            if (clone.nfaces <= 0) clone.vol = 0;
         }

         if (!chlds) continue;

         // in cloned object children is only list of ids
         clone.chlds = new Array(chlds.length);
         for (let k = 0; k < chlds.length; ++k)
            clone.chlds[k] = chlds[k]._refid;
      }

      // remove _refid identifiers from original objects
      for (let n = 0; n < this.origin.length; ++n)
         delete this.origin[n]._refid;

      // do sorting once
      sortarr.sort((a, b) => b.vol - a.vol);

      // remember sort map and also sortid
      this.sortmap = new Array(this.nodes.length);
      for (let n = 0; n < this.nodes.length; ++n) {
         this.sortmap[n] = sortarr[n].id;
         sortarr[n].sortid = n;
      }
   }

   /** @summary Create elementary item with single already existing shape
     * @desc used by details view of geometry shape */
   createClonesForShape(obj) {
      this.origin = [];

      // indicate that just plain shape is used
      this.plain_shape = obj;

      const node = {
            id: 0, sortid: 0, kind: kindShape,
            name: 'Shape',
            nfaces: obj.nfaces,
            fDX: 1, fDY: 1, fDZ: 1, vol: 1,
            vis: true
         };

      this.nodes = [node];
   }

   /** @summary Count all visisble nodes */
   countVisibles() {
      const len = this.nodes?.length || 0;
      let cnt = 0;
      for (let k = 0; k < len; ++k)
          if (this.nodes[k].vis) cnt++;
      return cnt;
   }

   /** @summary Mark visisble nodes.
     * @desc Set only basic flags, actual visibility depends from hierarchy */
   markVisibles(on_screen, copy_bits, hide_top_volume) {
      if (this.plain_shape)
         return 1;
      if (!this.origin || !this.nodes)
         return 0;

      let res = 0;

      for (let n = 0; n < this.nodes.length; ++n) {
         const clone = this.nodes[n], obj = this.origin[n];

         clone.vis = 0; // 1 - only with last level
         delete clone.nochlds;

         if (clone.kind === kindGeo) {
            if (obj.fVolume) {
               if (on_screen) {
                  // on screen bits used always, childs always checked
                  clone.vis = testGeoBit(obj.fVolume, geoBITS.kVisOnScreen) ? 99 : 0;

                  if ((n === 0) && clone.vis && hide_top_volume) clone.vis = 0;

                  if (copy_bits) {
                     setGeoBit(obj.fVolume, geoBITS.kVisNone, false);
                     setGeoBit(obj.fVolume, geoBITS.kVisThis, (clone.vis > 0));
                     setGeoBit(obj.fVolume, geoBITS.kVisDaughters, true);
                     setGeoBit(obj, geoBITS.kVisDaughters, true);
                  }
               } else {
                  clone.vis = !testGeoBit(obj.fVolume, geoBITS.kVisNone) && testGeoBit(obj.fVolume, geoBITS.kVisThis) ? 99 : 0;

                  if (!testGeoBit(obj, geoBITS.kVisDaughters) || !testGeoBit(obj.fVolume, geoBITS.kVisDaughters))
                     clone.nochlds = true;

                  // node with childs only shown in case if it is last level in hierarchy
                  if ((clone.vis > 0) && clone.chlds && !clone.nochlds)
                     clone.vis = 1;

                  // special handling for top node
                  if (n === 0) {
                     if (hide_top_volume) clone.vis = 0;
                     delete clone.nochlds;
                  }
               }
            }
         } else {
            clone.vis = obj.fRnrSelf ? 99 : 0;

            // when the only node is selected, draw it
            if ((n === 0) && (this.nodes.length === 1)) clone.vis = 99;

            this.vislevel = 9999; // automatically take all volumes
         }

         // shape with zero volume or without faces will not be observed
         if ((clone.vol <= 0) || (clone.nfaces <= 0)) clone.vis = 0;

         if (clone.vis) res++;
      }

      return res;
   }

   /** @summary After visibility flags is set, produce idshift for all nodes as it would be maximum level */
   produceIdShifts() {
      for (let k = 0; k < this.nodes.length; ++k)
         this.nodes[k].idshift = -1;

      function scan_func(nodes, node) {
         if (node.idshift < 0) {
            node.idshift = 0;
            if (node.chlds) {
               for (let k = 0; k<node.chlds.length; ++k)
                  node.idshift += scan_func(nodes, nodes[node.chlds[k]]);
            }
         }

         return node.idshift + 1;
      }

      scan_func(this.nodes, this.nodes[0]);
   }

   /** @summary Extract only visibility flags
     * @desc Used to transfer them to the worker */
   getVisibleFlags() {
      const res = new Array(this.nodes.length);
      for (let n=0; n<this.nodes.length; ++n)
         res[n] = { vis: this.nodes[n].vis, nochlds: this.nodes[n].nochlds };
      return res;
   }

   /** @summary Assign only visibility flags, extracted with getVisibleFlags */
   setVisibleFlags(flags) {
      if (!this.nodes || !flags || !flags.length !== this.nodes.length)
         return 0;

      let res = 0;
      for (let n = 0; n < this.nodes.length; ++n) {
         const clone = this.nodes[n];
         clone.vis = flags[n].vis;
         clone.nochlds = flags[n].nochlds;
         if (clone.vis) res++;
      }

      return res;
   }

   /** @summary Set visibility flag for physical node
     * @desc Trying to reimplement functionality in the RGeomViewer */
   setPhysNodeVisibility(stack, on) {
      let do_clear = false;
      if (on === 'clearall') {
         delete this.fVisibility;
         return;
      } else if (on === 'clear') {
         do_clear = true;
         if (!this.fVisibility) return;
      } else
         on = !!on;
      if (!stack) return;

      if (!this.fVisibility)
         this.fVisibility = [];

      for (let indx = 0; indx < this.fVisibility.length; ++indx) {
         const item = this.fVisibility[indx],
             res = compare_stacks(item.stack, stack);

         if (res === 0) {
            if (do_clear) {
               this.fVisibility.splice(indx, 1);
               if (this.fVisibility.length === 0)
                  delete this.fVisibility;
            } else
               item.visible = on;

            return;
         }

         if (res > 0) {
            if (!do_clear)
               this.fVisibility.splice(indx, 0, { visible: on, stack });
            return;
         }
      }

      if (!do_clear)
         this.fVisibility.push({ visible: on, stack });
   }

   /** @summary Get visibility item for physical node */
   getPhysNodeVisibility(stack) {
      if (!stack || !this.fVisibility)
         return null;
      for (let indx = 0; indx < this.fVisibility.length; ++indx) {
         const item = this.fVisibility[indx],
             res = compare_stacks(item.stack, stack);
         if (res === 0)
            return item;
         if (res > 0)
            return null;
      }

      return null;
   }

   /** @summary Scan visible nodes in hierarchy, starting from nodeid
     * @desc Each entry in hierarchy get its unique id, which is not changed with visibility flags */
   scanVisible(arg, vislvl) {
      if (!this.nodes) return 0;

      if (vislvl === undefined) {
         if (!arg) arg = {};

         vislvl = arg.vislvl || this.vislevel || 4; // default 3 in ROOT
         if (vislvl > 88) vislvl = 88;

         arg.stack = new Array(100); // current stack
         arg.nodeid = 0;
         arg.counter = 0; // sequence ID of the node, used to identify it later
         arg.last = 0;
         arg.copyStack = function(factor) {
            const entry = { nodeid: this.nodeid, seqid: this.counter, stack: new Array(this.last) };
            if (factor) entry.factor = factor; // factor used to indicate importance of entry, will be built as first
            for (let n = 0; n < this.last; ++n)
               entry.stack[n] = this.stack[n+1]; // copy stack
            return entry;
         };

         if (arg.domatrix) {
            arg.matrices = [];
            arg.mpool = [new Matrix4()]; // pool of Matrix objects to avoid permanent creation
            arg.getmatrix = function() { return this.matrices[this.last]; };
         }

         if (this.fVisibility?.length) {
            arg.vindx = 0;
            arg.varray = this.fVisibility;
            arg.vstack = arg.varray[arg.vindx].stack;
            arg.testPhysVis = function() {
               if (!this.vstack || (this.vstack?.length !== this.last))
                  return undefined;
               for (let n = 0; n < this.last; ++n) {
                  if (this.vstack[n] !== this.stack[n+1])
                     return undefined;
               }
               const res = this.varray[this.vindx++].visible;
               this.vstack = this.vindx < this.varray.length ? this.varray[this.vindx].stack : null;
               return res;
            };
         }
      }

      const node = this.nodes[arg.nodeid];
      let res = 0;

      if (arg.domatrix) {
         if (!arg.mpool[arg.last+1])
            arg.mpool[arg.last+1] = new Matrix4();

         const prnt = (arg.last > 0) ? arg.matrices[arg.last-1] : new Matrix4();
         if (node.matrix) {
            arg.matrices[arg.last] = arg.mpool[arg.last].fromArray(prnt.elements);
            arg.matrices[arg.last].multiply(arg.mpool[arg.last+1].fromArray(node.matrix));
         } else
            arg.matrices[arg.last] = prnt;
      }

      let node_vis = node.vis, node_nochlds = node.nochlds;

      if ((arg.nodeid === 0) && arg.main_visible)
         node_vis = vislvl + 1;
      else if (arg.testPhysVis) {
         const res = arg.testPhysVis();
         if (res !== undefined) {
            node_vis = res && !node.chlds ? vislvl + 1 : 0;
            node_nochlds = !res;
         }
      }

      if (node_nochlds)
         vislvl = 0;

      if (node_vis > vislvl) {
         if (!arg.func || arg.func(node))
            res++;
      }

      arg.counter++;

      if ((vislvl > 0) && node.chlds) {
         arg.last++;
         for (let i = 0; i < node.chlds.length; ++i) {
            arg.nodeid = node.chlds[i];
            arg.stack[arg.last] = i; // in the stack one store index of child, it is path in the hierarchy
            res += this.scanVisible(arg, vislvl-1);
         }
         arg.last--;
      } else
         arg.counter += (node.idshift || 0);


      if (arg.last === 0) {
         delete arg.last;
         delete arg.stack;
         delete arg.copyStack;
         delete arg.counter;
         delete arg.matrices;
         delete arg.mpool;
         delete arg.getmatrix;
         delete arg.vindx;
         delete arg.varray;
         delete arg.vstack;
         delete arg.testPhysVis;
      }

      return res;
   }

   /** @summary Return node name with given id.
    * @desc Either original object or description is used */
   getNodeName(nodeid) {
      if (this.origin) {
         const obj = this.origin[nodeid];
         return obj ? getObjectName(obj) : '';
      }
      const node = this.nodes[nodeid];
      return node ? node.name : '';
   }

   /** @summary Returns description for provided stack
     * @desc If specified, absolute matrix is also calculated */
   resolveStack(stack, withmatrix) {
      const res = { id: 0, obj: null, node: this.nodes[0], name: this.name_prefix || '' };

      // if (!this.toplevel || (this.nodes.length === 1) || (res.node.kind === 1)) res.name = '';

      if (withmatrix) {
         res.matrix = new Matrix4();
         if (res.node.matrix) res.matrix.fromArray(res.node.matrix);
      }

      if (this.origin)
         res.obj = this.origin[0];

      // if (!res.name)
      //   res.name = this.getNodeName(0);

      if (stack) {
         for (let lvl = 0; lvl < stack.length; ++lvl) {
            res.id = res.node.chlds[stack[lvl]];
            res.node = this.nodes[res.id];

            if (this.origin)
               res.obj = this.origin[res.id];

            const subname = this.getNodeName(res.id);
            if (subname) {
               if (res.name) res.name += '/';
               res.name += subname;
            }

            if (withmatrix && res.node.matrix)
               res.matrix.multiply(new Matrix4().fromArray(res.node.matrix));
         }
      }

      return res;
   }

   /** @summary Provide stack name
     * @desc Stack name includes full path to the physical node which is identified by stack  */
   getStackName(stack) {
      return this.resolveStack(stack).name;
   }

   /** @summary Create stack array based on nodes ids array.
    * @desc Ids list should correspond to existing nodes hierarchy */
   buildStackByIds(ids) {
      if (!ids) return null;

      if (ids[0] !== 0) {
         console.error('wrong ids - first should be 0');
         return null;
      }

      let node = this.nodes[0];
      const stack = [];

      for (let k = 1; k < ids.length; ++k) {
         const nodeid = ids[k];
         if (!node) return null;
         const chindx = node.chlds.indexOf(nodeid);
         if (chindx < 0) {
            console.error(`wrong nodes ids ${ids[k]} is not child of ${ids[k-1]}`);
            return null;
         }

         stack.push(chindx);
         node = this.nodes[nodeid];
      }

      return stack;
   }

   /** @summary Retuns ids array which correspond to the stack */
   buildIdsByStack(stack) {
      if (!stack) return null;
      let node = this.nodes[0];
      const ids = [0];
      for (let k = 0; k < stack.length; ++k) {
         const id = node.chlds[stack[k]];
         ids.push(id);
         node = this.nodes[id];
      }
      return ids;
   }

   /** @summary Retuns node id by stack */
   getNodeIdByStack(stack) {
      if (!stack || !this.nodes)
         return -1;
      let node = this.nodes[0], id = 0;
      for (let k = 0; k < stack.length; ++k) {
         id = node.chlds[stack[k]];
         node = this.nodes[id];
      }
      return id;
   }

   /** @summary Returns true if stack includes at any place provided nodeid */
   isIdInStack(nodeid, stack) {
      if (!nodeid) return true;

      let node = this.nodes[0], id = 0;

      for (let lvl = 0; lvl < stack.length; ++lvl) {
         id = node.chlds[stack[lvl]];
         if (id === nodeid) return true;
         node = this.nodes[id];
      }

      return false;
   }

   /** @summary Find stack by name which include names of all parents */
   findStackByName(fullname) {
      const names = fullname.split('/'), stack = [];
      let currid = 0;

      if (this.getNodeName(currid) !== names[0]) return null;

      for (let n = 1; n < names.length; ++n) {
         const node = this.nodes[currid];
         if (!node.chlds) return null;

         for (let k = 0; k < node.chlds.length; ++k) {
            const chldid = node.chlds[k];
            if (this.getNodeName(chldid) === names[n]) {
               stack.push(k);
               currid = chldid;
               break;
            }
         }

         // no new entry - not found stack
         if (stack.length === n - 1) return null;
      }

      return stack;
   }

   /** @summary Set usage of default ROOT colors */
   setDefaultColors(on) {
      this.use_dflt_colors = on;
      if (this.use_dflt_colors && !this.dflt_table) {
         const dflt = { kWhite: 0, kBlack: 1, kGray: 920,
                      kRed: 632, kGreen: 416, kBlue: 600, kYellow: 400, kMagenta: 616, kCyan: 432,
                      kOrange: 800, kSpring: 820, kTeal: 840, kAzure: 860, kViolet: 880, kPink: 900 },

          nmax = 110, col = [];
         for (let i=0; i<nmax; i++) col.push(dflt.kGray);

         //  here we should create a new TColor with the same rgb as in the default
         //  ROOT colors used below
         col[3] = dflt.kYellow-10;
         col[4] = col[5] = dflt.kGreen-10;
         col[6] = col[7] = dflt.kBlue-7;
         col[8] = col[9] = dflt.kMagenta-3;
         col[10] = col[11] = dflt.kRed-10;
         col[12] = dflt.kGray+1;
         col[13] = dflt.kBlue-10;
         col[14] = dflt.kOrange+7;
         col[16] = dflt.kYellow+1;
         col[20] = dflt.kYellow-10;
         col[24] = col[25] = col[26] = dflt.kBlue-8;
         col[29] = dflt.kOrange+9;
         col[79] = dflt.kOrange-2;

         this.dflt_table = col;
      }
   }

   /** @summary Provide different properties of draw entry nodeid
     * @desc Only if node visible, material will be created */
   getDrawEntryProperties(entry, root_colors) {
      const clone = this.nodes[entry.nodeid];

      if (clone.kind === kindShape) {
         const prop = { name: clone.name, nname: clone.name, shape: null, material: null, chlds: null },
             opacity = entry.opacity || 1, col = entry.color || '#0000FF';
         prop.fillcolor = new Color$1(col[0] === '#' ? col : `rgb(${col})`);
         prop.material = createMaterial(this._cfg, { opacity, color: prop.fillcolor });
         return prop;
      }

      if (!this.origin) {
         console.error('origin not there - kind', clone.kind, entry.nodeid, clone);
         return null;
      }

      const node = this.origin[entry.nodeid];

      if (clone.kind === kindEve) {
         // special handling for EVE nodes

         const prop = { name: getObjectName(node), nname: getObjectName(node), shape: node.fShape, material: null, chlds: null };

         if (node.fElements !== null) prop.chlds = node.fElements.arr;

         {
            const opacity = Math.min(1, node.fRGBA[3]);
            prop.fillcolor = new Color$1(node.fRGBA[0], node.fRGBA[1], node.fRGBA[2]);
            prop.material = createMaterial(this._cfg, { opacity, color: prop.fillcolor });
         }

         return prop;
      }

      const volume = node.fVolume,
            prop = { name: getObjectName(volume), nname: getObjectName(node), volume, shape: volume.fShape, material: null,
                     chlds: volume.fNodes?.arr, linewidth: volume.fLineWidth };

      {
         // TODO: maybe correctly extract ROOT colors here?
         let opacity = 1.0;
         if (!root_colors) root_colors = ['white', 'black', 'red', 'green', 'blue', 'yellow', 'magenta', 'cyan'];

         if (entry.custom_color)
            prop.fillcolor = entry.custom_color;
         else if ((volume.fFillColor > 1) && (volume.fLineColor === 1))
            prop.fillcolor = root_colors[volume.fFillColor];
         else if (volume.fLineColor >= 0)
            prop.fillcolor = root_colors[volume.fLineColor];

         const mat = volume.fMedium?.fMaterial;

         if (mat) {
            const fillstyle = mat.fFillStyle;
            let transparency = (fillstyle >= 3000 && fillstyle <= 3100) ? fillstyle - 3000 : 0;

            if (this.use_dflt_colors) {
               const matZ = Math.round(mat.fZ), icol = this.dflt_table[matZ];
               prop.fillcolor = root_colors[icol];
               if (mat.fDensity < 0.1) transparency = 60;
            }

            if (transparency > 0)
               opacity = (100 - transparency) / 100;
            if (prop.fillcolor === undefined)
               prop.fillcolor = root_colors[mat.fFillColor];
         }
         if (prop.fillcolor === undefined)
            prop.fillcolor = 'lightgrey';

         prop.material = createMaterial(this._cfg, { opacity, color: prop.fillcolor });
      }

      return prop;
   }

   /** @summary Creates hierarchy of Object3D for given stack entry
     * @desc Such hierarchy repeats hierarchy of TGeoNodes and set matrix for the objects drawing
     * also set renderOrder, required to handle transparency */
   createObject3D(stack, toplevel, options) {
      let node = this.nodes[0], three_prnt = toplevel, draw_depth = 0;
      const force = isObject(options) || (options === 'force');

      for (let lvl = 0; lvl <= stack.length; ++lvl) {
         const nchld = (lvl > 0) ? stack[lvl-1] : 0,
               // extract current node
               child = (lvl > 0) ? this.nodes[node.chlds[nchld]] : node;
         if (!child) {
            console.error(`Wrong stack ${JSON.stringify(stack)} for nodes at level ${lvl}, node.id ${node.id}, numnodes ${this.nodes.length}, nchld ${nchld}, numchilds ${node.chlds.length}, chldid ${node.chlds[nchld]}`);
            return null;
         }

         node = child;

         let obj3d;

         if (three_prnt.children) {
            for (let i = 0; i < three_prnt.children.length; ++i) {
               if (three_prnt.children[i].nchld === nchld) {
                  obj3d = three_prnt.children[i];
                  break;
               }
            }
         }

         if (obj3d) {
            three_prnt = obj3d;
            if (obj3d.$jsroot_drawable) draw_depth++;
            continue;
         }

         if (!force) return null;

         obj3d = new Object3D();

         if (this._cfg?.set_names)
            obj3d.name = this.getNodeName(node.id);

         if (this._cfg?.set_origin && this.origin)
            obj3d.userData = this.origin[node.id];

         if (node.abs_matrix) {
            obj3d.absMatrix = new Matrix4();
            obj3d.absMatrix.fromArray(node.matrix);
         } else if (node.matrix) {
            obj3d.matrix.fromArray(node.matrix);
            obj3d.matrix.decompose(obj3d.position, obj3d.quaternion, obj3d.scale);
         }

         // this.accountNodes(obj3d);
         obj3d.nchld = nchld; // mark index to find it again later

         // add the mesh to the scene
         three_prnt.add(obj3d);

         // this is only for debugging - test inversion of whole geometry
         if ((lvl === 0) && isObject(options) && options.scale) {
            if ((options.scale.x < 0) || (options.scale.y < 0) || (options.scale.z < 0)) {
               obj3d.scale.copy(options.scale);
               obj3d.updateMatrix();
            }
         }

         obj3d.updateMatrixWorld();

         three_prnt = obj3d;
      }

      if ((options === 'mesh') || (options === 'delete_mesh')) {
         let mesh = null;
         if (three_prnt) {
            for (let n = 0; (n < three_prnt.children.length) && !mesh; ++n) {
               const chld = three_prnt.children[n];
               if ((chld.type === 'Mesh') && (chld.nchld === undefined)) mesh = chld;
            }
         }

         if ((options === 'mesh') || !mesh) return mesh;

         const res = three_prnt;
         while (mesh && (mesh !== toplevel)) {
            three_prnt = mesh.parent;
            three_prnt.remove(mesh);
            mesh = (three_prnt.children.length === 0) ? three_prnt : null;
         }

         return res;
      }

      if (three_prnt) {
         three_prnt.$jsroot_drawable = true;
         three_prnt.$jsroot_depth = draw_depth;
      }

      return three_prnt;
   }

   /** @summary Create mesh for single physical node */
   createEntryMesh(ctrl, toplevel, entry, shape, colors) {
      if (!shape || !shape.ready)
         return null;

      entry.done = true; // mark entry is created
      shape.used = true; // indicate that shape was used in building

      if (!shape.geom || !shape.nfaces) {
         // node is visible, but shape does not created
         this.createObject3D(entry.stack, toplevel, 'delete_mesh');
         return null;
      }

      const prop = this.getDrawEntryProperties(entry, colors),
            obj3d = this.createObject3D(entry.stack, toplevel, ctrl),
            matrix = obj3d.absMatrix || obj3d.matrixWorld;

      prop.material.wireframe = ctrl.wireframe;

      prop.material.side = ctrl.doubleside ? DoubleSide : FrontSide;

      let mesh;
      if (matrix.determinant() > -0.9)
         mesh = new Mesh(shape.geom, prop.material);
       else
         mesh = createFlippedMesh(shape, prop.material);

      obj3d.add(mesh);

      if (obj3d.absMatrix) {
         mesh.matrix.copy(obj3d.absMatrix);
         mesh.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
         mesh.updateMatrixWorld();
      }

      // keep full stack of nodes
      mesh.stack = entry.stack;
      mesh.renderOrder = this.maxdepth - entry.stack.length; // order of transparency handling

      if (ctrl.set_names)
         mesh.name = this.getNodeName(entry.nodeid);

      if (ctrl.set_origin)
         mesh.userData = prop.volume;

      // keep hierarchy level
      mesh.$jsroot_order = obj3d.$jsroot_depth;

      if (ctrl.info?.num_meshes !== undefined) {
         ctrl.info.num_meshes++;
         ctrl.info.num_faces += shape.nfaces;
      }

      // set initial render order, when camera moves, one must refine it
      // mesh.$jsroot_order = mesh.renderOrder =
      //   this._clones.maxdepth - ((obj3d.$jsroot_depth !== undefined) ? obj3d.$jsroot_depth : entry.stack.length);

      return mesh;
   }

   /** @summary Check if instancing can be used for the nodes */
   createInstancedMeshes(ctrl, toplevel, draw_nodes, build_shapes, colors) {
      if (ctrl.instancing < 0)
         return false;

      // first delete previous data
      const used_shapes = [];
      let max_entries = 1;

      for (let n = 0; n < draw_nodes.length; ++n) {
         const entry = draw_nodes[n];
         if (entry.done) continue;

         /// shape can be provided with entry itself
         const shape = entry.server_shape || build_shapes[entry.shapeid];
         if (!shape || !shape.ready) {
            console.warn(`Problem with shape id ${entry.shapeid} when building`);
            return false;
         }

         // ignore shape without geometry
         if (!shape.geom || !shape.nfaces)
            continue;

         if (shape.instances === undefined) {
            shape.instances = [];
            used_shapes.push(shape);
         }

         const instance = shape.instances.find(i => i.nodeid === entry.nodeid);

         if (instance) {
            instance.entries.push(entry);
            max_entries = Math.max(max_entries, instance.entries.length);
         } else
            shape.instances.push({ nodeid: entry.nodeid, entries: [entry] });
      }

      const make_sense = ctrl.instancing > 0 ? (max_entries > 2) : (draw_nodes.length > 10000) && (max_entries > 10);

      if (!make_sense) {
         used_shapes.forEach(shape => { delete shape.instances; });
         return false;
      }

      used_shapes.forEach(shape => {
         shape.used = true;
         shape.instances.forEach(instance => {
            const entry0 = instance.entries[0],
                prop = this.getDrawEntryProperties(entry0, colors);

            prop.material.wireframe = ctrl.wireframe;

            prop.material.side = ctrl.doubleside ? DoubleSide : FrontSide;

            if (instance.entries.length === 1)
               this.createEntryMesh(ctrl, toplevel, entry0, shape, colors);
            else {
               const arr1 = [], arr2 = [], stacks1 = [], stacks2 = [], names1 = [], names2 = [];

               instance.entries.forEach(entry => {
                  const info = this.resolveStack(entry.stack, true);
                  if (info.matrix.determinant() > -0.9) {
                     arr1.push(info.matrix);
                     stacks1.push(entry.stack);
                     names1.push(this.getNodeName(entry.nodeid));
                  } else {
                     arr2.push(info.matrix);
                     stacks2.push(entry.stack);
                     names2.push(this.getNodeName(entry.nodeid));
                  }
                  entry.done = true;
               });

               if (arr1.length > 0) {
                  const mesh1 = new InstancedMesh(shape.geom, prop.material, arr1.length);

                  mesh1.stacks = stacks1;
                  arr1.forEach((matrix, i) => mesh1.setMatrixAt(i, matrix));

                  toplevel.add(mesh1);

                  mesh1.renderOrder = 1;

                  if (ctrl.set_names) {
                     mesh1.name = names1[0];
                     mesh1.names = names1;
                  }

                  if (ctrl.set_origin)
                     mesh1.userData = prop.volume;

                  mesh1.$jsroot_order = 1;
                  ctrl.info.num_meshes++;
                  ctrl.info.num_faces += shape.nfaces*arr1.length;
               }

               if (arr2.length > 0) {
                  if (shape.geomZ === undefined)
                     shape.geomZ = createFlippedGeom(shape.geom);

                  const mesh2 = new InstancedMesh(shape.geomZ, prop.material, arr2.length);

                  mesh2.stacks = stacks2;
                  const m = new Matrix4().makeScale(1, 1, -1);
                  arr2.forEach((matrix, i) => {
                     mesh2.setMatrixAt(i, matrix.multiply(m));
                  });
                  mesh2._flippedMesh = true;

                  toplevel.add(mesh2);

                  mesh2.renderOrder = 1;
                  if (ctrl.set_names) {
                     mesh2.name = names2[0];
                     mesh2.names = names2;
                  }
                  if (ctrl.set_origin)
                     mesh2.userData = prop.volume;

                  mesh2.$jsroot_order = 1;
                  ctrl.info.num_meshes++;
                  ctrl.info.num_faces += shape.nfaces*arr2.length;
               }
            }
         });

         delete shape.instances;
      });

      return true;
   }

   /** @summary Get volume boundary */
   getVolumeBoundary(viscnt, facelimit, nodeslimit) {
      const result = { min: 0, max: 1, sortidcut: 0 };

      if (!this.sortmap) {
         console.error('sorting map do not exist');
         return result;
      }

      let maxNode, currNode, cnt=0, facecnt=0;

      for (let n = 0; (n < this.sortmap.length) && (cnt < nodeslimit) && (facecnt < facelimit); ++n) {
         const id = this.sortmap[n];
         if (viscnt[id] === 0) continue;
         currNode = this.nodes[id];
         if (!maxNode) maxNode = currNode;
         cnt += viscnt[id];
         facecnt += viscnt[id] * currNode.nfaces;
      }

      if (!currNode) {
         console.error('no volumes selected');
         return result;
      }

      // console.log(`Volume boundary ${currNode.vol}  cnt=${cnt}  faces=${facecnt}`);
      result.max = maxNode.vol;
      result.min = currNode.vol;
      result.sortidcut = currNode.sortid; // latest node is not included
      return result;
   }

   /** @summary Collects visible nodes, using maxlimit
     * @desc One can use map to define cut based on the volume or serious of cuts */
   collectVisibles(maxnumfaces, frustum) {
      // in simple case shape as it is
      if (this.plain_shape)
         return { lst: [{ nodeid: 0, seqid: 0, stack: [], factor: 1, shapeid: 0, server_shape: this.plain_shape }], complete: true };

      const arg = {
         facecnt: 0,
         viscnt: new Array(this.nodes.length), // counter for each node
         vislvl: this.getVisLevel(),
         reset() {
            this.total = 0;
            this.facecnt = 0;
            this.viscnt.fill(0);
         },
         // nodes: this.nodes,
         func(node) {
            this.total++;
            this.facecnt += node.nfaces;
            this.viscnt[node.id]++;
            return true;
         }
      };

      arg.reset();

      let total = this.scanVisible(arg);
      if ((total === 0) && (this.nodes[0].vis < 2) && !this.nodes[0].nochlds) {
         // try to draw only main node by default
         arg.reset();
         arg.main_visible = true;
         total = this.scanVisible(arg);
      }

      const maxnumnodes = this.getMaxVisNodes();

      if (maxnumnodes > 0) {
         while ((total > maxnumnodes) && (arg.vislvl > 1)) {
            arg.vislvl--;
            arg.reset();
            total = this.scanVisible(arg);
         }
      }

      this.actual_level = arg.vislvl; // not used, can be shown somewhere in the gui

      let minVol = 0, maxVol = 0, camVol = -1, camFact = 10, sortidcut = this.nodes.length + 1;

      if (arg.facecnt > maxnumfaces) {
         const bignumfaces = maxnumfaces * (frustum ? 0.8 : 1.0),
               bignumnodes = maxnumnodes * (frustum ? 0.8 : 1.0),
               // define minimal volume, which always to shown
               boundary = this.getVolumeBoundary(arg.viscnt, bignumfaces, bignumnodes);

         minVol = boundary.min;
         maxVol = boundary.max;
         sortidcut = boundary.sortidcut;

         if (frustum) {
             arg.domatrix = true;
             arg.frustum = frustum;
             arg.totalcam = 0;
             arg.func = function(node) {
                if (node.vol <= minVol) {
                    // only small volumes are interesting
                    if (this.frustum.CheckShape(this.getmatrix(), node)) {
                      this.viscnt[node.id]++;
                      this.totalcam += node.nfaces;
                   }
                }

                return true;
             };

            for (let n = 0; n < arg.viscnt.length; ++n)
               arg.viscnt[n] = 0;

             this.scanVisible(arg);

             if (arg.totalcam > maxnumfaces*0.2)
                camVol = this.getVolumeBoundary(arg.viscnt, maxnumfaces*0.2, maxnumnodes*0.2).min;
             else
                camVol = 0;

             camFact = maxVol / ((camVol > 0) ? (camVol > 0) : minVol);

             // console.log(`Limit for camera ${camVol}  faces in camera view ${arg.totalcam}`);
         }
      }

      arg.items = [];

      arg.func = function(node) {
         if (node.sortid < sortidcut)
            this.items.push(this.copyStack());
          else if ((camVol >= 0) && (node.vol > camVol)) {
            if (this.frustum.CheckShape(this.getmatrix(), node))
               this.items.push(this.copyStack(camFact));
         }
         return true;
      };

      this.scanVisible(arg);

      return { lst: arg.items, complete: minVol === 0 };
   }

   /** @summary Merge list of drawn objects
     * @desc In current list we should mark if object already exists
     * from previous list we should collect objects which are not there */
   mergeVisibles(current, prev) {
      let indx2 = 0;
      const del = [];
      for (let indx1 = 0; (indx1 < current.length) && (indx2 < prev.length); ++indx1) {
         while ((indx2 < prev.length) && (prev[indx2].seqid < current[indx1].seqid))
            del.push(prev[indx2++]); // this entry should be removed


         if ((indx2 < prev.length) && (prev[indx2].seqid === current[indx1].seqid)) {
            if (prev[indx2].done) current[indx1].done = true; // copy ready flag
            indx2++;
         }
      }

      // remove rest
      while (indx2 < prev.length)
         del.push(prev[indx2++]);

      return del;
   }

   /** @summary Collect all uniques shapes which should be built
    *  @desc Check if same shape used many times for drawing */
   collectShapes(lst) {
      // nothing else - just that single shape
      if (this.plain_shape)
         return [this.plain_shape];

      const shapes = [];

      for (let i = 0; i < lst.length; ++i) {
         const entry = lst[i],
             shape = this.getNodeShape(entry.nodeid);

         if (!shape) continue; // strange, but avoid misleading

         if (shape._id === undefined) {
            shape._id = shapes.length;

            shapes.push({ id: shape._id, shape, vol: this.nodes[entry.nodeid].vol, refcnt: 1, factor: 1, ready: false });

            // shapes.push( { obj: shape, vol: this.nodes[entry.nodeid].vol });
         } else
            shapes[shape._id].refcnt++;


         entry.shape = shapes[shape._id]; // remember shape used

         // use maximal importance factor to push element to the front
         if (entry.factor && (entry.factor>entry.shape.factor))
            entry.shape.factor = entry.factor;
      }

      // now sort shapes in volume decrease order
      shapes.sort((a, b) => b.vol*b.factor - a.vol*a.factor);

      // now set new shape ids according to the sorted order and delete temporary field
      for (let n = 0; n < shapes.length; ++n) {
         const item = shapes[n];
         item.id = n; // set new ID
         delete item.shape._id; // remove temporary field
      }

      // as last action set current shape id to each entry
      for (let i = 0; i < lst.length; ++i) {
         const entry = lst[i];
         if (entry.shape) {
            entry.shapeid = entry.shape.id; // keep only id for the entry
            delete entry.shape; // remove direct references
         }
      }

      return shapes;
   }

   /** @summary Merge shape lists */
   mergeShapesLists(oldlst, newlst) {
      if (!oldlst) return newlst;

      // set geometry to shape object itself
      for (let n = 0; n < oldlst.length; ++n) {
         const item = oldlst[n];

         item.shape._geom = item.geom;
         delete item.geom;

         if (item.geomZ !== undefined) {
            item.shape._geomZ = item.geomZ;
            delete item.geomZ;
         }
      }

      // take from shape (if match)
      for (let n = 0; n < newlst.length; ++n) {
         const item = newlst[n];

         if (item.shape._geom !== undefined) {
            item.geom = item.shape._geom;
            delete item.shape._geom;
         }

         if (item.shape._geomZ !== undefined) {
            item.geomZ = item.shape._geomZ;
            delete item.shape._geomZ;
         }
      }

      // now delete all unused geometries
      for (let n = 0; n < oldlst.length; ++n) {
         const item = oldlst[n];
         delete item.shape._geom;
         delete item.shape._geomZ;
      }

      return newlst;
   }

   /** @summary Build shapes */
   buildShapes(lst, limit, timelimit) {
      let created = 0;
      const tm1 = new Date().getTime(),
            res = { done: false, shapes: 0, faces: 0, notusedshapes: 0 };

      for (let n = 0; n < lst.length; ++n) {
         const item = lst[n];

         // if enough faces are produced, nothing else is required
         if (res.done) { item.ready = true; continue; }

         if (!item.ready) {
            item._typename = '$$Shape$$'; // let reuse item for direct drawing
            item.ready = true;
            if (item.geom === undefined) {
               item.geom = createGeometry(item.shape);
               if (item.geom) created++; // indicate that at least one shape was created
            }
            item.nfaces = countGeometryFaces(item.geom);
         }

         res.shapes++;
         if (!item.used) res.notusedshapes++;
         res.faces += item.nfaces * item.refcnt;

         if (res.faces >= limit)
            res.done = true;
          else if ((created > 0.01*lst.length) && (timelimit !== undefined)) {
            const tm2 = new Date().getTime();
            if (tm2-tm1 > timelimit) return res;
         }
      }

      res.done = true;

      return res;
   }

   /** @summary Format REveGeomNode data to be able use it in list of clones
     * @private */
   static formatServerElement(elem) {
      elem.kind = 2; // special element for geom viewer, used in TGeoPainter
      elem.vis = 2; // visibility is alwys on
      const m = elem.matr;
      delete elem.matr;
      if (!m?.length) return elem;

      if (m.length === 16)
         elem.matrix = m;
       else {
         const nm = elem.matrix = new Array(16);
         nm.fill(0);
         nm[0] = nm[5] = nm[10] = nm[15] = 1;

         if (m.length === 3) {
            // translation martix
            nm[12] = m[0]; nm[13] = m[1]; nm[14] = m[2];
         } else if (m.length === 4) {
            // scale matrix
            nm[0] = m[0]; nm[5] = m[1]; nm[10] = m[2]; nm[15] = m[3];
         } else if (m.length === 9) {
            // rotation matrix
            nm[0] = m[0]; nm[4] = m[1]; nm[8] = m[2];
            nm[1] = m[3]; nm[5] = m[4]; nm[9] = m[5];
            nm[2] = m[6]; nm[6] = m[7]; nm[10] = m[8];
         } else
            console.error(`wrong number of elements ${m.length} in the matrix`);
      }
      return elem;
   }

}

function createFlippedGeom(geom) {
   let pos = geom.getAttribute('position').array,
       norm = geom.getAttribute('normal').array;
   const index = geom.getIndex();

   if (index) {
      // we need to unfold all points to
      const arr = index.array,
            i0 = geom.drawRange.start;
      let ilen = geom.drawRange.count;
      if (i0 + ilen > arr.length) ilen = arr.length - i0;

      const dpos = new Float32Array(ilen*3), dnorm = new Float32Array(ilen*3);
      for (let ii = 0; ii < ilen; ++ii) {
         const k = arr[i0 + ii];
         if ((k < 0) || (k*3 >= pos.length))
            console.log(`strange index ${k*3} totallen = ${pos.length}`);
         dpos[ii*3] = pos[k*3];
         dpos[ii*3+1] = pos[k*3+1];
         dpos[ii*3+2] = pos[k*3+2];
         dnorm[ii*3] = norm[k*3];
         dnorm[ii*3+1] = norm[k*3+1];
         dnorm[ii*3+2] = norm[k*3+2];
      }

      pos = dpos; norm = dnorm;
   }

   const len = pos.length,
       newpos = new Float32Array(len),
       newnorm = new Float32Array(len);

   // we should swap second and third point in each face
   for (let n = 0, shift = 0; n < len; n += 3) {
      newpos[n] = pos[n+shift];
      newpos[n+1] = pos[n+1+shift];
      newpos[n+2] = -pos[n+2+shift];

      newnorm[n] = norm[n+shift];
      newnorm[n+1] = norm[n+1+shift];
      newnorm[n+2] = -norm[n+2+shift];

      shift+=3; if (shift===6) shift=-3; // values 0,3,-3
   }

   const geomZ = new BufferGeometry();
   geomZ.setAttribute('position', new BufferAttribute(newpos, 3));
   geomZ.setAttribute('normal', new BufferAttribute(newnorm, 3));

   return geomZ;
}


/** @summary Create flipped mesh for the shape
  * @desc When transformation matrix includes one or several inversion of axis,
  * one should inverse geometry object, otherwise three.js cannot correctly draw it
  * @param {Object} shape - TGeoShape object
  * @param {Object} material - material
  * @private */
function createFlippedMesh(shape, material) {
   if (shape.geomZ === undefined)
      shape.geomZ = createFlippedGeom(shape.geom);

   const mesh = new Mesh(shape.geomZ, material);
   mesh.scale.copy(new Vector3(1, 1, -1));
   mesh.updateMatrix();

   mesh._flippedMesh = true;

   return mesh;
}

/** @summary extract code of Box3.expandByObject
  * @desc Major difference - do not traverse hierarchy, support InstancedMesh
  * @private */
function getBoundingBox(node, box3, local_coordinates) {
   if (!node?.geometry) return box3;

   if (!box3) box3 = new Box3().makeEmpty();

   if (node.isInstancedMesh) {
      const m = new Matrix4(), b = new Box3().makeEmpty();

      node.geometry.computeBoundingBox();

      for (let i = 0; i < node.count; i++) {
         node.getMatrixAt(i, m);
         b.copy(node.geometry.boundingBox).applyMatrix4(m);
         box3.union(b);
      }
      return box3;
   }

   if (!local_coordinates) node.updateWorldMatrix(false, false);

   const v1 = new Vector3(), attribute = node.geometry.attributes?.position;

   if (attribute !== undefined) {
      for (let i = 0, l = attribute.count; i < l; i++) {
         // v1.fromAttribute( attribute, i ).applyMatrix4( node.matrixWorld );
         v1.fromBufferAttribute(attribute, i);
         if (!local_coordinates) v1.applyMatrix4(node.matrixWorld);
         box3.expandByPoint(v1);
      }
   }

   return box3;
}

/** @summary Set rendering order for created hierarchy
  * @desc depending from provided method sort differently objects
  * @param toplevel - top element
  * @param origin - camera position used to provide sorting
  * @param method - name of sorting method like 'pnt', 'ray', 'size', 'dflt'  */
function produceRenderOrder(toplevel, origin, method, clones) {
   const raycast = new Raycaster();

   function setdefaults(top) {
      if (!top) return;
      top.traverse(obj => {
         obj.renderOrder = obj.defaultOrder || 0;
         if (obj.material) obj.material.depthWrite = true; // by default depthWriting enabled
      });
   }

   function traverse(obj, lvl, arr) {
      // traverse hierarchy and extract all children of given level
      // if (obj.$jsroot_depth === undefined) return;

      if (!obj.children) return;

      for (let k = 0; k < obj.children.length; ++k) {
         const chld = obj.children[k];
         if (chld.$jsroot_order === lvl) {
            if (chld.material) {
               if (chld.material.transparent) {
                  chld.material.depthWrite = false; // disable depth writing for transparent
                  arr.push(chld);
               } else
                  setdefaults(chld);
            }
         } else if ((obj.$jsroot_depth === undefined) || (obj.$jsroot_depth < lvl))
            traverse(chld, lvl, arr);
      }
   }

   function sort(arr, minorder, maxorder) {
      // resort meshes using ray caster and camera position
      // idea to identify meshes which are in front or behind

      if (arr.length > 1000) {
         // too many of them, just set basic level and exit
         for (let i = 0; i < arr.length; ++i)
            arr[i].renderOrder = (minorder + maxorder)/2;
         return false;
      }

      const tmp_vect = new Vector3();

      // first calculate distance to the camera
      // it gives preliminary order of volumes
      for (let i = 0; i < arr.length; ++i) {
         const mesh = arr[i];
         let box3 = mesh.$jsroot_box3;

         if (!box3)
            mesh.$jsroot_box3 = box3 = getBoundingBox(mesh);

         if (method === 'size') {
            const sz = box3.getSize(new Vector3());
            mesh.$jsroot_distance = sz.x*sz.y*sz.z;
            continue;
         }

         if (method === 'pnt') {
            mesh.$jsroot_distance = origin.distanceTo(box3.getCenter(tmp_vect));
            continue;
         }

         let dist = Math.min(origin.distanceTo(box3.min), origin.distanceTo(box3.max));
         const pnt = new Vector3(box3.min.x, box3.min.y, box3.max.z);

         dist = Math.min(dist, origin.distanceTo(pnt));
         pnt.set(box3.min.x, box3.max.y, box3.min.z);
         dist = Math.min(dist, origin.distanceTo(pnt));
         pnt.set(box3.max.x, box3.min.y, box3.min.z);
         dist = Math.min(dist, origin.distanceTo(pnt));
         pnt.set(box3.max.x, box3.max.y, box3.min.z);
         dist = Math.min(dist, origin.distanceTo(pnt));
         pnt.set(box3.max.x, box3.min.y, box3.max.z);
         dist = Math.min(dist, origin.distanceTo(pnt));
         pnt.set(box3.min.x, box3.max.y, box3.max.z);
         dist = Math.min(dist, origin.distanceTo(pnt));

         mesh.$jsroot_distance = dist;
      }

      arr.sort((a, b) => a.$jsroot_distance - b.$jsroot_distance);

      const resort = new Array(arr.length);

      for (let i = 0; i < arr.length; ++i) {
         arr[i].$jsroot_index = i;
         resort[i] = arr[i];
      }

      if (method === 'ray') {
         for (let i=arr.length - 1; i >= 0; --i) {
            const mesh = arr[i], box3 = mesh.$jsroot_box3;
            let intersects, direction = box3.getCenter(tmp_vect);

            for (let ntry = 0; ntry < 2; ++ntry) {
               direction.sub(origin).normalize();

               raycast.set(origin, direction);

               intersects = raycast.intersectObjects(arr, false) || []; // only plain array
               const unique = [];

               for (let k1 = 0; k1 < intersects.length; ++k1) {
                  if (unique.indexOf(intersects[k1].object) < 0)
                     unique.push(intersects[k1].object);
                  // if (intersects[k1].object === mesh) break; // trace until object itself
               }

               intersects = unique;

               if ((intersects.indexOf(mesh) < 0) && (ntry > 0))
                  console.log(`MISS ${clones?.resolveStack(mesh.stack)?.name}`);

               if ((intersects.indexOf(mesh) >= 0) || (ntry > 0)) break;

               const pos = mesh.geometry.attributes.position.array;

               direction = new Vector3((pos[0]+pos[3]+pos[6])/3, (pos[1]+pos[4]+pos[7])/3, (pos[2]+pos[5]+pos[8])/3);

               direction.applyMatrix4(mesh.matrixWorld);
            }

            // now push first object in intersects to the front
            for (let k1 = 0; k1 < intersects.length - 1; ++k1) {
               const mesh1 = intersects[k1], mesh2 = intersects[k1+1],
                   i1 = mesh1.$jsroot_index, i2 = mesh2.$jsroot_index;
               if (i1 < i2) continue;
               for (let ii = i2; ii < i1; ++ii) {
                  resort[ii] = resort[ii+1];
                  resort[ii].$jsroot_index = ii;
               }
               resort[i1] = mesh2;
               mesh2.$jsroot_index = i1;
            }
         }
      }

      for (let i = 0; i < resort.length; ++i) {
         resort[i].renderOrder = Math.round(maxorder - (i+1) / (resort.length + 1) * (maxorder - minorder));
         delete resort[i].$jsroot_index;
         delete resort[i].$jsroot_distance;
      }

      return true;
   }

   function process(obj, lvl, minorder, maxorder) {
      const arr = [];
      let did_sort = false;

      traverse(obj, lvl, arr);

      if (!arr.length) return;

      if (minorder === maxorder) {
         for (let k = 0; k < arr.length; ++k)
            arr[k].renderOrder = minorder;
      } else {
        did_sort = sort(arr, minorder, maxorder);
        if (!did_sort) minorder = maxorder = (minorder + maxorder) / 2;
      }

      for (let k = 0; k < arr.length; ++k) {
         const next = arr[k].parent;
         let min = minorder, max = maxorder;

         if (did_sort) {
            max = arr[k].renderOrder;
            min = max - (maxorder - minorder) / (arr.length + 2);
         }

         process(next, lvl+1, min, max);
      }
   }

   if (!method || (method === 'dflt'))
      setdefaults(toplevel);
   else
      process(toplevel, 0, 1, 1000000);
}

const clTGeoManager = 'TGeoManager', clTEveGeoShapeExtract = 'TEveGeoShapeExtract',
      clTGeoVolumeAssembly = 'TGeoVolumeAssembly',
      clREveGeoShapeExtract = `${nsREX}REveGeoShapeExtract`;

let $comp_col_cnt = 0;

/** @summary Function used to build hierarchy of elements of composite shapes
  * @private */
function buildCompositeVolume(comp, maxlvl, side) {
   if (maxlvl === undefined) maxlvl = 1;
   if (!side) {
      $comp_col_cnt = 0;
      side = '';
   }

   const vol = create$1(clTGeoVolume);
   setGeoBit(vol, geoBITS.kVisThis, true);
   setGeoBit(vol, geoBITS.kVisDaughters, true);

   if ((side && (comp._typename !== clTGeoCompositeShape)) || (maxlvl <= 0)) {
      vol.fName = side;
      vol.fLineColor = ($comp_col_cnt++ % 8) + 2;
      vol.fShape = comp;
      return vol;
   }

   if (side) side += '/';
   vol.$geoh = true; // workaround, let know browser that we are in volumes hierarchy
   vol.fName = '';

   const node1 = create$1(clTGeoNodeMatrix);
   setGeoBit(node1, geoBITS.kVisThis, true);
   setGeoBit(node1, geoBITS.kVisDaughters, true);
   node1.fName = 'Left';
   node1.fMatrix = comp.fNode.fLeftMat;
   node1.fVolume = buildCompositeVolume(comp.fNode.fLeft, maxlvl-1, side + 'Left');

   const node2 = create$1(clTGeoNodeMatrix);
   setGeoBit(node2, geoBITS.kVisThis, true);
   setGeoBit(node2, geoBITS.kVisDaughters, true);
   node2.fName = 'Right';
   node2.fMatrix = comp.fNode.fRightMat;
   node2.fVolume = buildCompositeVolume(comp.fNode.fRight, maxlvl-1, side + 'Right');

   vol.fNodes = create$1(clTList);
   vol.fNodes.Add(node1);
   vol.fNodes.Add(node2);

   if (!side) $comp_col_cnt = 0;

   return vol;
}

/** @summary Build three.js model for given geometry object
  * @param {Object} obj - TGeo-related object
  * @param {Object} [opt] - options
  * @param {Number} [opt.vislevel] - visibility level like TGeoManager, when not specified - show all
  * @param {Number} [opt.numnodes=1000] - maximal number of visible nodes
  * @param {Number} [opt.numfaces=100000] - approx maximal number of created triangles
  * @param {Number} [opt.instancing=-1] - <0 disable use of InstancedMesh, =0 only for large geometries, >0 enforce usage of InstancedMesh
  * @param {boolean} [opt.doubleside=false] - use double-side material
  * @param {boolean} [opt.wireframe=false] - show wireframe for created shapes
  * @param {boolean} [opt.transparency=0] - make nodes transparent
  * @param {boolean} [opt.dflt_colors=false] - use default ROOT colors
  * @param {boolean} [opt.set_names=true] - set names to all Object3D instances
  * @param {boolean} [opt.set_origin=false] - set TGeoNode/TGeoVolume as Object3D.userData
  * @return {object} Object3D with created model
  * @example
  * import { build } from 'https://root.cern/js/latest/modules/geom/TGeoPainter.mjs';
  * let obj3d = build(obj);
  * // this is three.js object and can be now inserted in the scene
  */
function build(obj, opt) {
   if (!obj) return null;

   if (!opt) opt = {};
   if (!opt.numfaces) opt.numfaces = 100000;
   if (!opt.numnodes) opt.numnodes = 1000;
   if (!opt.frustum) opt.frustum = null;

   opt.res_mesh = opt.res_faces = 0;

   if (opt.instancing === undefined)
      opt.instancing = -1;

   opt.info = { num_meshes: 0, num_faces: 0 };

   let clones = null, visibles = null;

   if (obj.visibles && obj.nodes && obj.numnodes) {
      // case of draw message from geometry viewer

      const nodes = obj.numnodes > 1e6 ? { length: obj.numnodes } : new Array(obj.numnodes);

      obj.nodes.forEach(node => {
         nodes[node.id] = ClonedNodes.formatServerElement(node);
      });

      clones = new ClonedNodes(null, nodes);
      clones.name_prefix = clones.getNodeName(0);

      // normally only need when making selection, not used in geo viewer
      // this.geo_clones.setMaxVisNodes(draw_msg.maxvisnodes);
      // this.geo_clones.setVisLevel(draw_msg.vislevel);
      // TODO: provide from server
      clones.maxdepth = 20;

      const nsegm = obj.cfg?.nsegm || 30;

      for (let cnt = 0; cnt < obj.visibles.length; ++cnt) {
         const item = obj.visibles[cnt], rd = item.ri;

         // entry may be provided without shape - it is ok
         if (rd)
            item.server_shape = rd.server_shape = createServerGeometry(rd, nsegm);
      }

      visibles = obj.visibles;
   } else {
      let shape = null, hide_top = false;

      if (('fShapeBits' in obj) && ('fShapeId' in obj)) {
         shape = obj; obj = null;
      } else if ((obj._typename === clTGeoVolumeAssembly) || (obj._typename === clTGeoVolume))
         shape = obj.fShape;
       else if ((obj._typename === clTEveGeoShapeExtract) || (obj._typename === clREveGeoShapeExtract))
         shape = obj.fShape;
       else if (obj._typename === clTGeoManager) {
         obj = obj.fMasterVolume;
         hide_top = !opt.showtop;
         shape = obj.fShape;
      } else if (obj.fVolume)
         shape = obj.fVolume.fShape;
       else
         obj = null;


      if (opt.composite && shape && (shape._typename === clTGeoCompositeShape) && shape.fNode)
         obj = buildCompositeVolume(shape);

      if (!obj && shape)
         obj = Object.assign(create$1(clTNamed), { _typename: clTEveGeoShapeExtract, fTrans: null, fShape: shape, fRGBA: [0, 1, 0, 1], fElements: null, fRnrSelf: true });

      if (!obj) return null;

      if (obj._typename.indexOf(clTGeoVolume) === 0)
         obj = { _typename: clTGeoNode, fVolume: obj, fName: obj.fName, $geoh: obj.$geoh, _proxy: true };

      clones = new ClonedNodes(obj);
      clones.setVisLevel(opt.vislevel);
      clones.setMaxVisNodes(opt.numnodes);

      if (opt.dflt_colors)
         clones.setDefaultColors(true);

      const uniquevis = opt.no_screen ? 0 : clones.markVisibles(true);
      if (uniquevis <= 0)
         clones.markVisibles(false, false, hide_top);
      else
         clones.markVisibles(true, true, hide_top); // copy bits once and use normal visibility bits

      clones.produceIdShifts();

      // collect visible nodes
      const res = clones.collectVisibles(opt.numfaces, opt.frustum);

      visibles = res.lst;
   }

   if (!opt.material_kind)
      opt.material_kind = 'lambert';
   if (opt.set_names === undefined)
      opt.set_names = true;

   clones.setConfig(opt);

   // collect shapes
   const shapes = clones.collectShapes(visibles);

   clones.buildShapes(shapes, opt.numfaces);

   const toplevel = new Object3D();
   toplevel.clones = clones; // keep reference on JSROOT data

   const colors = getRootColors();

   if (clones.createInstancedMeshes(opt, toplevel, visibles, shapes, colors))
      return toplevel;

   for (let n = 0; n < visibles.length; ++n) {
      const entry = visibles[n];
      if (entry.done) continue;

      const shape = entry.server_shape || shapes[entry.shapeid];
      if (!shape.ready) {
         console.warn('shape marked as not ready when it should');
         break;
      }

      clones.createEntryMesh(opt, toplevel, entry, shape, colors);
   }

   return toplevel;
}

var _rollup_plugin_ignore_empty_module_placeholder = {};

var _rollup_plugin_ignore_empty_module_placeholder$1 = /*#__PURE__*/Object.freeze({
__proto__: null,
default: _rollup_plugin_ignore_empty_module_placeholder
});

export { build, httpRequest, openFile, parse, produceRenderOrder, settings, version };
