var _ = require('underscore');
var blobToBuffer = require('blob-to-buffer');
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
    var message = new messy.Message({headers:{'Content-Type': headers['Content-Type']}});

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
            expectedRequestProperties.headers.Host = urlObj.host;
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

function xhrToMockRequest(xhr, expect) {
    var formattedHeaders = formatHeaderObj(xhr.requestHeaders);
    // account for the addition of charset in the sinon fake XHR implementation
    if (formattedHeaders['Content-Type']) {
        var contentType = stripHeaderCharsetSuffix(formattedHeaders['Content-Type']);
        var hasContentTypeSuffix = (formattedHeaders['Content-Type'].length > contentType.length);
        if (hasContentTypeSuffix) {
            formattedHeaders['Content-Type'] = contentType;
        }
    }
    var parsedUrl = urlModule.parse(xhr.url);
    if (parsedUrl.protocol === null) {
        // workaround bad parse on missing protocol by adding and re-parsing
        parsedUrl = urlModule.parse('http:' + xhr.url);
    }
    var isEncrypted = (parsedUrl.protocol === 'https:');

    // set host in the mock request headers
    if (!formattedHeaders.hasOwnProperty('Host')) {
        formattedHeaders.Host = parsedUrl.hostname;
    }

    function createMockRequest(requestBody) {
        if (isTextualHeaders(formattedHeaders)) {
            // make the UInt8Array a Buffer so it is converted by messy
            requestBody = new Buffer(requestBody || []);
        }

        var requestProperties = {
            method: xhr.method,
            encrypted: isEncrypted,
            host: parsedUrl.hostname,
            path: parsedUrl.path,
            protocolName: 'HTTP',
            protocolVersion: '1.1',
            headers: formattedHeaders,
            unchunkedBody: requestBody
        };

        return new messy.HttpRequest(requestProperties);
    }

    var requestBody = xhr.requestBody;

    if (Object.prototype.toString.call(requestBody) === '[object Blob]') {
        return expect.promise.fromNode(function (cb) {
            blobToBuffer(requestBody, cb);
        }).then(function (requestBodyAsBuffer) {
            return createMockRequest(requestBodyAsBuffer);
        });
    } else {
        return expect.promise(function () {
            return createMockRequest(requestBody);
        });
    }
}


module.exports = {
    name: 'unexpected-mxhr',
    version: require('../package.json').version,
    installInto: function (expect) {
        expect.use(require('unexpected-messy'));

        expect
            .addAssertion('<any> with xhr mocked out <object|array> <assertion>', function (expect, subject, requestDescriptions) {
                expect.errorMode = 'nested';
                var mockedXhr = sinon.useFakeXMLHttpRequest();

                if (!Array.isArray(requestDescriptions)) {
                    requestDescriptions = [requestDescriptions];
                } else {
                    // duplicate descriptions to allow array consumption
                    requestDescriptions = requestDescriptions.slice(0);
                }

                return expect.promise(function (resolve, reject) {
                    var httpConversation = new messy.HttpConversation();
                    var httpConversationSatisfySpec = {exchanges: []};

                    var __lastError = null;

                    mockedXhr.onCreate = function (xhr) {
                        var requestDescription = requestDescriptions.shift();

                        setTimeout(function () {
                            var expectedRequestProperties;
                            var mockRequest;

                            expect.promise(function () {
                                return xhrToMockRequest(xhr, expect);
                            }).then(function (createdMockRequest) {
                                mockRequest = createdMockRequest;

                                if (!requestDescription) {
                                    httpConversation.exchanges.push(new messy.HttpExchange({request: mockRequest, response: undefined}));

                                    // XXX this should be some kind of abort
                                    xhr.respond(200);

                                    return resolve([null, httpConversation, httpConversationSatisfySpec]);
                                }

                                expectedRequestProperties = resolveExpectedRequestProperties(requestDescription && requestDescription.request);
                            }).then(function () {
                                var assertionExchange = new messy.HttpExchange({request: mockRequest});

                                expect.errorMode = 'default';
                                return expect(assertionExchange, 'to satisfy', {request: expectedRequestProperties});
                            }).then(function () {
                                var mockResponse = createMockResponse(requestDescription && requestDescription.response);

                                httpConversation.exchanges.push(new messy.HttpExchange({request: mockRequest, response: mockResponse}));
                                httpConversationSatisfySpec.exchanges.push({request: expectedRequestProperties});

                                sendXhrResponse(xhr, mockResponse);
                            }).caught(function (e) {
                                __lastError = e;

                                // XXX this should be some kind of abort
                                xhr.respond(200);
                            });
                        }, 0);
                    };

                    expect.promise(function () {
                        return expect.shift();
                    }).then(function (fulfilmentValue) {
                        if (__lastError) {
                            return reject(__lastError);
                        }

                        var hasRemainingRequestDescriptions = requestDescriptions.length > 0;
                        if (hasRemainingRequestDescriptions) {
                            // exhaust remaining mocks using a promises chain
                            (function nextItem() {
                                var remainingDescription = requestDescriptions.shift();
                                if (remainingDescription) {
                                    var expectedRequestProperties;

                                    return expect.promise(function () {
                                        expectedRequestProperties = resolveExpectedRequestProperties(remainingDescription.request);
                                    }).then(function () {
                                        httpConversationSatisfySpec.exchanges.push({
                                            request: expectedRequestProperties,
                                            response: createMockResponse(remainingDescription.response)
                                        });

                                        return nextItem();
                                    }).caught(reject);
                                } else {
                                    resolve([fulfilmentValue, httpConversation, httpConversationSatisfySpec]);
                                }
                            })();
                        } else {
                            resolve([fulfilmentValue, httpConversation, httpConversationSatisfySpec]);
                        }
                    }).caught(function (e) {
                        if (__lastError) {
                            e = __lastError;
                        }

                        reject(e);
                    });
                }).spread(function (fulfilmentValue, httpConversation, httpConversationSatisfySpec) {
                    expect.errorMode = 'default';
                    return expect(httpConversation, 'to satisfy', httpConversationSatisfySpec).then(function () {
                        return fulfilmentValue;
                    });
                }).finally(function () {
                    mockedXhr.restore();
                });
            });
    }
};
