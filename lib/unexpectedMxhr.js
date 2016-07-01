var _ = require('underscore');
var http = require('http');
var messy = require('messy');
var sinon = require('sinon');
var urlModule = require('url');

function createMockResponse(responseProperties) {
    if (typeof responseProperties === 'object' && responseProperties.body && typeof responseProperties.body === 'string') {
        responseProperties = _.extend({}, responseProperties);
        responseProperties.unchunkedBody = responseProperties.body;
        delete responseProperties.body;
    }
    var mockResponse = new messy.HttpResponse(responseProperties);
    mockResponse.statusCode = mockResponse.statusCode || 200;
    mockResponse.protocolName = mockResponse.protocolName || 'HTTP';
    mockResponse.protocolVersion = mockResponse.protocolVersion || '1.1';
    mockResponse.statusMessage = mockResponse.statusMessage || http.STATUS_CODES[mockResponse.statusCode];
    return mockResponse;
}

function formatHeaderObj(headerObj) {
    var result = {};
    Object.keys(headerObj).forEach(function (headerName) {
        result[messy.formatHeaderName(headerName)] = headerObj[headerName];
    });
    return result;
}

function isTextualHeaders(headers) {
    var message = new messy.Message({headers:{'Content-Type': headers['content-type']}});

    return message.hasTextualContentType;
}

function resolveExpectedRequestProperties(expectedRequestProperties) {
    if (typeof expectedRequestProperties === 'string') {
        expectedRequestProperties = { url: expectedRequestProperties };
    } else if (expectedRequestProperties && typeof expectedRequestProperties === 'object') {
        expectedRequestProperties = _.extend({}, expectedRequestProperties);
    }
    if (expectedRequestProperties) {
        if (typeof expectedRequestProperties.url === 'string') {
            var matchMethod = expectedRequestProperties.url.match(/^([A-Z]+) ([\s\S]*)$/);
            if (matchMethod) {
                expectedRequestProperties.method = expectedRequestProperties.method || matchMethod[1];
                expectedRequestProperties.url = matchMethod[2];
            }
        }
    } else {
        expectedRequestProperties = {};
    }
    if (/^https?:\/\//.test(expectedRequestProperties.url)) {
        var urlObj = urlModule.parse(expectedRequestProperties.url);
        expectedRequestProperties.headers = expectedRequestProperties.headers || {};
        if (Object.keys(expectedRequestProperties.headers).every(function (key) {
            return key.toLowerCase() !== 'host';
        })) {
            expectedRequestProperties.headers.host = urlObj.host;
        }
        expectedRequestProperties.host = expectedRequestProperties.host || urlObj.hostname;
        if (urlObj.port && typeof expectedRequestProperties.port === 'undefined') {
            expectedRequestProperties.port = parseInt(urlObj.port, 10);
        }

        if (urlObj.protocol === 'https:' && typeof expectedRequestProperties.encrypted === 'undefined') {
            expectedRequestProperties.encrypted = true;
        }
        expectedRequestProperties.url = urlObj.path;
    }

    var expectedRequestBody = expectedRequestProperties.body;
    if (Array.isArray(expectedRequestBody) || (expectedRequestBody && typeof expectedRequestBody === 'object')) {
        expectedRequestProperties.headers = expectedRequestProperties.headers || {};
        if (Object.keys(expectedRequestProperties.headers).every(function (key) {
            return key.toLowerCase() !== 'content-type';
        })) {
            expectedRequestProperties.headers['Content-Type'] = 'application/json';
        }
    }
    return expectedRequestProperties;
}

function sendXhrResponse(xhr, mockResponse) {
    var formattedHeaders = formatHeaderObj(mockResponse.headers.valuesByName);
    var responseBody = mockResponse.body;

    if (responseBody && typeof responseBody === 'object') {
        responseBody = JSON.stringify(responseBody);

        if (formattedHeaders['Content-Type'] !== 'application/json') {
            formattedHeaders['Content-Type'] = 'application/json';
        }
    }

    xhr.respond(mockResponse.statusCode, formattedHeaders, responseBody);
}

function stripHeaderCharsetSuffix(headerValue) {
    return headerValue.split(';')[0];
}

function xhrToMockRequest(xhr) {
    var formattedHeaders = formatHeaderObj(xhr.requestHeaders);
    var parsedUrl = urlModule.parse(xhr.url);
    var requestBody = xhr.requestBody;

    if (isTextualHeaders(xhr.requestHeaders)) {
        // make the UInt8Array a Buffer so it is converted by messy
        requestBody = new Buffer(requestBody);
        // account for the addition of charset in the sinon fake XHR implementation
        formattedHeaders['Content-Type'] = stripHeaderCharsetSuffix(formattedHeaders['Content-Type']);
    }

    var requestProperties = {
        method: xhr.method,
        path: parsedUrl.path,
        protocolName: 'HTTP',
        protocolVersion: '1.1',
        headers: formattedHeaders,
        unchunkedBody: requestBody
    };

    return new messy.HttpRequest(requestProperties);
}


module.exports = {
    name: 'unexpected-mxhr',
    version: require('../package.json').version,
    installInto: function (expect) {
        expect.use(require('unexpected-messy'));

        expect
            .addAssertion('<any> with xhr mocked out <object> <assertion>', function (expect, subject, requestDescription) {
                expect.errorMode = 'nested';
                var mockedXhr = sinon.useFakeXMLHttpRequest();
                var expectedRequestProperties;
                var responseProperties = requestDescription && requestDescription.response;

                var requestPromise = expect.promise(function (resolve, reject) {
                    var httpConversation = new messy.HttpConversation();
                    var httpConversationSatisfySpec = {exchanges: []};

                    mockedXhr.onCreate = function (xhr) {
                        setTimeout(function () {
                            var mockRequest = xhrToMockRequest(xhr);
                            var mockResponse = createMockResponse(responseProperties);
                            httpConversation.exchanges.push(new messy.HttpExchange({request: mockRequest, response: mockResponse}));
                            httpConversationSatisfySpec.exchanges.push({request: expectedRequestProperties});

                            expect.promise(function () {
                                expect.errorMode = 'default';
                                return expect(httpConversation, 'to satisfy', httpConversationSatisfySpec);
                            }).caught(reject).then(function () {
                                sendXhrResponse(xhr, mockResponse);
                                resolve();
                            });
                        }, 0);
                    };
                });

                return expect.promise(function () {
                    expectedRequestProperties = resolveExpectedRequestProperties(requestDescription && requestDescription.request);
                }).then(function () {
                    return expect.shift();
                }).then(function () {
                    return requestPromise;
                }).finally(function () {
                    mockedXhr.restore();
                });
            });
    }
};
