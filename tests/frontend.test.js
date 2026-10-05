import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

class Element {
    hidden = false;
    disabled = false;
    value = '';
    textContent = '';
    children = [];
    events = {};
    setAttribute() {}
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    addEventListener(name, fn) { this.events[name] = fn; }
    focus() {}
}
test('Login de la interfaz, consultas con Bearer, resultados vacíos y cierre de sesión', async () => {
    const elements = new Map();
    const element = id => {
        if (!elements.has(id)) elements.set(id, new Element());
        return elements.get(id);
    };
    const storage = new Map();
    const requests = [];
    let queryStatus = 200;
    let rows = [{ reviewer_name: '<script>alert(1)</script>', total_reviews: 3 }];
    const token = `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.signature`;
    const context = vm.createContext({
        document: { getElementById: element, createElement: () => new Element(), createDocumentFragment: () => new Element() },
        sessionStorage: { setItem: (key, value) => storage.set(key, value), getItem: key => storage.get(key), removeItem: key => storage.delete(key) },
        atob: value => Buffer.from(value, 'base64').toString(),
        AbortController, Intl, setTimeout: () => 1, clearTimeout() {},
        fetch: async (url, options = {}) => {
            requests.push({ url, options });
            const data = url === '/config.json' ? { apiPrefix: '/api/custom' } : url.endsWith('/login') ? { token, user: 'admin@example.com' } : queryStatus === 401 ? { error: 'Sesión inválida' } : rows;
            return { ok: queryStatus === 200 || url.endsWith('/login') || url === '/config.json', status: queryStatus, json: async () => data, text: async () => JSON.stringify(data) };
        }
    });
    const settle = () => new Promise(resolve => setImmediate(resolve));
    vm.runInContext(await readFile(new URL('../public/app.js', import.meta.url), 'utf8'), context);
    await settle();
    assert.equal(element('login-button').disabled, false);
    element('email').value = 'admin@example.com';
    element('password').value = 'secret';
    await element('login-form').events.submit({ preventDefault() {} });
    assert.equal(element('dashboard-view').hidden, false);
    assert.equal(element('password').value, '');
    assert.equal(JSON.parse(requests.at(-1).options.body).password, 'secret');
    element('query-cards').children[2].events.click();
    await settle();
    assert.equal(requests.at(-1).url, '/api/custom/reviews/mejores-revisores');
    assert.equal(requests.at(-1).options.headers.Authorization, `Bearer ${token}`);
    assert.equal(element('table-container').hidden, false);
    assert.equal(element('table-body').children[0].children[0].children[0].textContent, '<script>alert(1)</script>');
    rows = [];
    element('refresh-button').events.click();
    await settle();
    assert.match(element('result-status').textContent, /No hay resultados/);
    element('flights-tab').events.click();
    element('query-cards').children[0].events.click();
    await settle();
    assert.equal(requests.at(-1).url, '/api/custom/flights/aeropuertos-origen');
    queryStatus = 401;
    element('refresh-button').events.click();
    await settle();
    assert.equal(element('dashboard-view').hidden, true);
    assert.equal(storage.size, 0);
    assert.match(element('login-error').textContent, /expiró/);
});
