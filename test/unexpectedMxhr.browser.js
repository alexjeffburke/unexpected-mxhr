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

    it('should allow checking the request body', function () {
        return expect({
            url: 'POST /',
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
});
