/* global expect:true */
describe('unexpectedMxhr', function () {
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

    it('should allow checking the request body', function () {
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
            'HTTP/1.1 202 Accepted // should be 201 Created\n' +
            '                      //\n' +
            '                      // -HTTP/1.1 202 Accepted\n' +
            '                      // +HTTP/1.1 201 Created\n'
        );
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
});
