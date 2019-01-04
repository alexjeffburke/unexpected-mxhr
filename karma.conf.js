var puppeteer = require('puppeteer');
process.env.CHROME_BIN = puppeteer.executablePath();

module.exports = function (config) {
    config.set({
        frameworks: ['mocha'],

        files: [
            './node_modules/unexpected/unexpected.js',
            './node_modules/magicpen-prism/magicPenPrism.min.js',
            './node_modules/unexpected-http/unexpectedHttp.min.js',
            './unexpectedMxhr.min.js',
            './test/unexpectedMxhr.browser.js'
        ],

        client: {
            mocha: {
                reporter: 'html',
                timeout: 60000
            }
        },

        browsers: ['ChromeHeadless']
    });
};
