/* global expect:true */
describe('unexpectedMxhr', function () {

    function issueGetAndConsume(url, cb) {
        expect('GET ' + url, 'to yield response', 200).then(function () {
            setTimeout(cb, 0);
        }).caught(cb);
    }

    it('should mock out a status code', function () {
        return expect('GET /', 'with xhr mocked out', {
            response: {
                statusCode: 201
            }
        }, 'to yield response', 201);
    });

    it('should mock out a simple request', function () {
        return expect('http://www.google.com/', 'with xhr mocked out', {
            request: 'GET /',
            response: {
                statusCode: 200,
                headers: {
                    'Content-Type': 'text/html; charset=UTF-8'
                },
                body: '<!DOCTYPE html>\n<html></html>'
            }
        }, 'to yield response', {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/html; charset=UTF-8'
            },
            body: '<!DOCTYPE html>\n<html></html>'
        });
    });

    it('should mock out an inferred JSON body', function () {
        return expect('http://www.google.com/', 'with xhr mocked out', {
            request: 'GET /',
            response: {
                body: {
                    foo: 'bar'
                }
            }
        }, 'to yield response', {
            statusCode: 200,
            body: {
                foo: 'bar'
            }
        });
    });

    it('should mock out an explicit JSON body', function () {
        return expect('http://www.google.com/', 'with xhr mocked out', {
            request: 'GET /',
            response: {
                headers: {
                    'Content-Type': 'application/json'
                },
                body: {
                    bar: 'baz'
                }
            }
        }, 'to yield response', {
            statusCode: 200,
            body: {
                bar: 'baz'
            }
        });
    });

    it('should mock out JSON supplied as a string', function () {
        return expect('http://www.google.com/', 'with xhr mocked out', {
            request: 'GET /',
            response: {
                headers: {
                    'Content-Type': 'application/json'
                },
                body: '{"foo":\n123\n}'
            }
        }, 'to yield response', {
            statusCode: 200,
            body: {
                foo: 123
            }
        });
    });

    it('should allow checking the request', function () {
        return expect('GET /', 'with xhr mocked out', {
            request: {
                method: 'GET'
            },
            response: {
                statusCode: 201
            }
        }, 'to yield response', 201);
    });

    it('should allow checking the request headers', function () {
        return expect({
            url: 'HEAD /',
            headers: {
                'X-Is-Test': 'yes'
            }
        }, 'with xhr mocked out', {
            request: {
                method: 'HEAD',
                headers: {
                    'X-Is-Test': 'yes'
                }
            },
            response: {
                statusCode: 201
            }
        }, 'to yield response', 201);
    });

    it('should allow checking an inferred request host', function () {
        return expect('GET http://www.google.com/', 'with xhr mocked out', {
            request: 'GET http://www.google.com/',
            response: 200
        }, 'to yield response', 200);
    });

    it('should allow checking a specified request host', function () {
        return expect('GET http://quux.example.com/foo', 'with xhr mocked out', {
            request: {
                method: 'GET',
                host: 'quux.example.com',
                path: '/foo'
            },
            response: 200
        }, 'to yield response', 200);
    });

    it('should allow checking a JSON request body', function () {
        return expect({
            url: 'POST /',
            body: {
                foo: 'bar'
            }
        }, 'with xhr mocked out', {
            request: {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: {
                    foo: 'bar'
                }
            },
            response: {
                statusCode: 201
            }
        }, 'to yield response', 201);
    });

    it('should allow checking a textual request body', function () {
        return expect({
            url: 'POST /',
            body: 'quux & xuuq'
        }, 'with xhr mocked out', {
            request: {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain'
                },
                body: 'quux & xuuq'
            },
            response: 201
        }, 'to yield response', 201);
    });

    it('should error on mismatching status code', function () {
        return expect(
            expect('GET /', 'with xhr mocked out', {
                request: {
                    method: 'GET'
                },
                response: {
                    statusCode: 202
                }
            }, 'to yield response', 201),
            'to be rejected'
        );
    });

    it('should error with a mismatch when JSON was inferred', function () {
        return expect(
            expect({
                url: 'POST /',
                headers: {
                    'Content-Type': 'application/something'
                },
                body: {
                    foo: 'bar'
                }
            }, 'with xhr mocked out', {
                request: {
                    method: 'POST',
                    body: {
                        foo: 'bar'
                    }
                },
                response: {
                    statusCode: 201
                }
            }, 'to yield response', 201),
            'to be rejected'
        );
    });

    it('should error with a rejection from the delegated assertion', function () {
        return expect(
            expect(function () {
                return expect.promise(function (resolve, reject) {
                    setTimeout(function () {
                        reject(new Error('NAH'));
                    }, 0);
                });
            }, 'with xhr mocked out', {
                request: {
                    method: 'GET'
                },
                response: {
                    statusCode: 202
                }
            }, 'not to error'),
            'when rejected to have message',
            "expected\n" +
            "function () {\n" +
            "  return expect.promise(function (resolve, reject) {\n" +
            "    setTimeout(function () {\n" +
            "      reject(new Error('NAH'));\n" +
            "    }, 0);\n" +
            "  });\n" +
            "}\n" +
            "with xhr mocked out { request: { method: 'GET' }, response: { statusCode: 202 } } not to error\n" +
            "  expected function not to error\n" +
            "    returned promise rejected with: Error('NAH')"
        );
    });

    it('should error preferring a "to satisfy" rejection over the delegated assertion', function () {
        return expect(
            expect({
                url: 'PUT /'
            }, 'with xhr mocked out', {
                request: {
                    method: 'PUT'
                },
                response: 202
            }, 'to yield response', 201),
            'when rejected to have message',
            "expected { url: 'PUT /' }\n" +
            "with xhr mocked out { request: { method: 'PUT' }, response: 202 } to yield response 201\n" +
            '\n' +
            'PUT / HTTP/1.1\n' +
            'Content-Length: 0\n' +
            '\n' +
            'HTTP/1.1 202 Accepted // should be 201 Created\n'
        );
    });

    describe('with multiple mocks specified', function () {
        it('should succeed with \'to call the callback without error\'', function () {
            return expect(function (cb) {
                issueGetAndConsume('http://www.google.com/', function () {
                    issueGetAndConsume('http://www.google.com/', cb);
                });
            }, 'with xhr mocked out', [
                {
                    request: 'GET http://www.google.com/',
                    response: {
                        headers: {
                            'Content-Type': 'text/plain'
                        },
                        body: 'hello'
                    }
                },
                {
                    request: 'GET http://www.google.com/',
                    response: {
                        headers: {
                            'Content-Type': 'text/plain'
                        },
                        body: 'world'
                    }
                }
            ], 'to call the callback without error');
        });

        it('should succeed with \'not to error\'', function () {
            return expect(function () {
                return expect.promise(function (run) {
                    issueGetAndConsume('http://www.google.com/', run(function () {
                        issueGetAndConsume('http://www.google.com/', run(function () {}));
                    }));
                });
            }, 'with xhr mocked out', [
                {
                    request: 'GET http://www.google.com/',
                    response: {
                        headers: {
                            'Content-Type': 'text/plain'
                        },
                        body: 'hello'
                    }
                },
                {
                    request: 'GET http://www.google.com/',
                    response: {
                        headers: {
                            'Content-Type': 'text/plain'
                        },
                        body: 'world'
                    }
                }
            ], 'not to error');
        });

        it('should error if more requests are issues than are mocked out', function () {
            return expect(
                expect('http://www.google.com/foo', 'with xhr mocked out', [], 'to yield response', 200),
                'when rejected to have message',
                "expected 'http://www.google.com/foo' with xhr mocked out [] to yield response 200\n" +
                '\n' +
                '// should be removed:\n' +
                '// GET /foo HTTP/1.1\n' +
                '// Host: www.google.com\n' +
                '//\n' +
                '// <no response>'
            );
        });

        it('should error if the request is unexpected and a textual body', function () {
            return expect(
                expect({
                    url: 'POST http://www.google.com/foo',
                    headers: {
                        'Content-Type': 'text/plain'
                    },
                    body: 'quux & xuuq'
                }, 'with xhr mocked out', [], 'to yield response', 200),
                'when rejected to have message',
                "expected\n" +
                "{\n" +
                "  url: 'POST http://www.google.com/foo',\n" +
                "  headers: { 'Content-Type': 'text/plain' },\n" +
                "  body: 'quux & xuuq'\n" +
                "}\n" +
                'with xhr mocked out [] to yield response 200\n' +
                '\n' +
                '// should be removed:\n' +
                '// POST /foo HTTP/1.1\n' +
                '// Content-Type: text/plain\n' +
                '// Host: www.google.com\n' +
                '//\n' +
                '// quux & xuuq\n' +
                '//\n' +
                '// <no response>'
            );
        });

        it('should error if a mocked request is not exercised', function () {
            return expect(
                expect('http://www.google.com/foo', 'with xhr mocked out', [
                    {
                        request: 'GET /foo',
                        response: 200
                    },
                    {
                        request: 'GET /foo',
                        response: 200
                    }
                ], 'to yield response', 200),
                'when rejected to have message',
                "expected 'http://www.google.com/foo' with xhr mocked out\n" +
                '[\n' +
                "  { request: 'GET /foo', response: 200 },\n" +
                "  { request: 'GET /foo', response: 200 }\n" +
                '] to yield response 200\n' +
                '\n' +
                'GET /foo HTTP/1.1\n' +
                'Host: www.google.com\n' +
                '\n' +
                'HTTP/1.1 200 OK\n' +
                '\n' +
                '// missing:\n' +
                '// GET /foo\n' +
                '//\n' +
                '// HTTP/1.1 200 OK'
            );
        });

        it('should error if a mocked request is not exercised', function () {
            return expect(
                expect('http://www.google.com/foo', 'with xhr mocked out', [
                    {
                        request: 'GET /foo',
                        response: 200
                    },
                    {
                        request: {
                            url: 'POST /foo',
                            headers: {
                                'Content-Type': 'text/plain'
                            },
                            body: 'quux & xuuq'
                        },
                        response: 200
                    }
                ], 'to yield response', 200),
                'when rejected to have message',
                "expected 'http://www.google.com/foo' with xhr mocked out\n" +
                '[\n' +
                "  { request: 'GET /foo', response: 200 },\n" +
                "  {\n" +
                "    request: { url: 'POST /foo', headers: ..., body: 'quux & xuuq' },\n" +
                "    response: 200\n" +
                "  }\n" +
                '] to yield response 200\n' +
                '\n' +
                'GET /foo HTTP/1.1\n' +
                'Host: www.google.com\n' +
                '\n' +
                'HTTP/1.1 200 OK\n' +
                '\n' +
                '// missing:\n' +
                '// POST /foo\n' +
                '// Content-Type: text/plain\n' +
                '//\n' +
                '// quux & xuuq\n' +
                '//\n' +
                '// HTTP/1.1 200 OK'
            );
        });
    });

    describe('https', function () {
        it('should mock out a simple request', function () {
            return expect('https://www.google.com/', 'with xhr mocked out', {
                request: {
                    url: 'GET /',
                    encrypted: true
                },
                response: {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'text/html; charset=UTF-8'
                    },
                    body: '<!DOCTYPE html>\n<html></html>'
                }
            }, 'to yield response', {
                statusCode: 200,
                headers: {
                    'Content-Type': 'text/html; charset=UTF-8'
                },
                body: '<!DOCTYPE html>\n<html></html>'
            });
        });

        it('should mock out an inferred encrypted request', function () {
            return expect('https://www.google.com/', 'with xhr mocked out', {
                request: {
                    url: 'https://www.google.com/',
                    method: 'GET'
                },
                response: {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'text/html; charset=UTF-8'
                    },
                    body: '<!DOCTYPE html>\n<html></html>'
                }
            }, 'to yield response', {
                statusCode: 200,
                headers: {
                    'Content-Type': 'text/html; charset=UTF-8'
                },
                body: '<!DOCTYPE html>\n<html></html>'
            });
        });
    });

    (!window.XMLHttpRequest ? describe.skip : describe)('using XHR directly', function () {
        it('should error on missing body with a textual GET', function () {
            return expect(function (cb) {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', 'http://example.com/foo');
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.onload = function () {
                    cb();
                };
                xhr.send();
            }, 'with xhr mocked out', {
                request: 'GET http://example.com/foo',
                response: 200
            }, 'to call the callback without error');
        });

        it('should error on payload being supplied to a GET', function () {
            return expect(
                expect(function (cb) {
                    var xhr = new XMLHttpRequest();
                    xhr.open('GET', 'http://example.com/foo');
                    xhr.setRequestHeader('Content-Type', 'application/json');
                    xhr.onload = function () {
                        cb();
                    };
                    xhr.send({ foo: true });
                }, 'with xhr mocked out', {
                    request: 'GET http://example.com/foo',
                    response: 200
                }, 'to call the callback without error'),
                'to be rejected with',
                new Error('unexpected-mxhr: GET requests do not support a payload to send().')
            );
        });
    });
});
