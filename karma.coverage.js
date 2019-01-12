var puppeteer = require('puppeteer');
process.env.CHROME_BIN = puppeteer.executablePath();

module.exports = function(config) {
  config.set({
    plugins: [
      'karma-chrome-launcher',
      'karma-coverage-istanbul-reporter',
      'karma-mocha'
    ],

    frameworks: ['mocha'],

    files: [
      './node_modules/unexpected/unexpected.js',
      './node_modules/magicpen-prism/magicPenPrism.min.js',
      './node_modules/unexpected-http/unexpectedHttp.min.js',
      './test/unexpectedMxhr.instrumented.js',
      './test/unexpectedMxhr.browser.js'
    ],

    client: {
      mocha: {
        reporter: 'html',
        timeout: 60000
      }
    },

    browsers: ['ChromeHeadless'],

    reporters: ['coverage-istanbul'],

    coverageIstanbulReporter: {
      reports: ['text', 'lcov']
    }
  });
};
