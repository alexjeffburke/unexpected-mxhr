Mock out uses of `XMLHttpRequest` within the browser.

Let's say we've got some XHR code. In the example below we'll use
[unexpected-http](https://github.com/unexpectedjs/unexpected-http/)
to give us a nice syntax for issuing XHR requests, but in practice you'd be
wrapping your client side side e.g. `jQuery.ajax()` calls.

```js#evaluate:false
expect.use(require('unexpected-http'));
```

Mock Responses
--------------

Unexpected-mXHR allows declaratively specifying responses to return for XHR
requests as follows:

```js#evaluate:false
describe('the basics', function () {
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
```

As with `unexpected-mitm`, the request we expected to receive can be checked
against expectations and having succeeded the response we define is returned.

Multiple mocks
==============

An array of mocks can be specified which will be used for each incoming call
in turn. Both too many requests being issued as will any unexercised mocks
(as in the example below).

```js#evaluate:false
describe('multiple mocks', function () {
    expect(
        expect('http://www.google.com/foo', 'with xhr mocked out', [
            {
                request: 'GET /foo',
                response: {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'text/html; charset=UTF-8'
                    },
                    body: '<!DOCTYPE html>\n<html></html>'
                }
            },
            {
                request: 'GET /bar',
                response: {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'text/html; charset=UTF-8'
                    },
                    body: '<!DOCTYPE html>\n<html></html>'
                }
            }
        ], 'to yield response', 200),
        'to be rejected'
    );
});
```
