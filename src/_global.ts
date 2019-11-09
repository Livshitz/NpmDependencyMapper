// Deps & deps config
global.libx = require("libx.js/bundles/essentials.js"); // libx is a global helper module
libx.node = require('libx.js/node');
// libx.node.catchErrors();
libx.log.isShowStacktrace = false;
libx.log.isShowTime = false;
require('libx.js/modules/network'); // registers network module in libx.di (Dependency Injector)