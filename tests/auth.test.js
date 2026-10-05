import { test } from 'node:test';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Duplex } from 'node:stream';
import assert from 'node:assert/strict';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createApp } from '../application.js';
import { User } from '../models/User.js';

// Sin conexión a MongoDB: simular sólo la búsqueda de usuarios y los datos.
test('Interfaz pública, login y acceso JWT a las consultas', async () => {
    process.env.API_PREFIX = '/api/test';
    process.env.SECRET = 'test-secret-only-for-automated-checks';
    const passwordHash = await bcrypt.hash('clave-de-prueba', 10);
    const original = User.findOne;
    User.findOne = async ({ email }) => email === 'missing@example.com' ? null : ({
        id: '123', email, passwordHash, isAdmin: email === 'admin@example.com'
    });
    const reviews = express.Router();
    const flights = express.Router();
    reviews.get('/api/test/reviews/mejores-revisores', (req, res) => res.json([{ reviewer_name: 'Ana', total_reviews: 4 }]));
    flights.get('/api/test/flights/aeropuertos-origen', (req, res) => res.json([]));
    const app = createApp({ reviewsRoutes: reviews, flightsRoutes: flights });
    const base = 'http://localhost';
    // Ejecutar Express en memoria: no abrir puertos ni usar una base real.
    const fetch = (url, options = {}) => new Promise((resolve, reject) => {
        const socket = new Duplex({ read() {}, write(chunk, encoding, callback) { callback(); } });
        const req = new IncomingMessage(socket);
        req.method = options.method || 'GET';
        req.url = new URL(url).pathname;
        req.headers = Object.fromEntries(Object.entries(options.headers || {}).map(([key, value]) => [key.toLowerCase(), value]));
        if (options.body) req.headers['content-length'] = String(Buffer.byteLength(options.body));
        const res = new ServerResponse(req);
        const chunks = [];
        res.write = (chunk, encoding, callback) => {
            chunks.push(Buffer.from(chunk));
            if (typeof encoding === 'function') encoding();
            else callback?.();
            return true;
        };
        res.end = chunk => {
            if (chunk) chunks.push(Buffer.from(chunk));
            const text = Buffer.concat(chunks).toString();
            res.emit('finish');
            resolve({ status: res.statusCode, text: async () => text, json: async () => JSON.parse(text) });
        };
        req.on('error', reject);
        app.handle(req, res);
        if (options.body) req.push(options.body);
        req.push(null);
    });
    const login = (email, password) => fetch(`${base}/api/test/users/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
    });
    try {
        const page = await fetch(base);
        assert.equal(page.status, 200);
        assert.match(await page.text(), /login-form/);
        assert.equal((await fetch(`${base}/app.js`)).status, 200);
        assert.deepEqual(await (await fetch(`${base}/config.json`)).json(), { apiPrefix: '/api/test' });
        const blocked = await fetch(`${base}/api/test/reviews/mejores-revisores`);
        assert.equal(blocked.status, 401);
        assert.match((await blocked.json()).error, /sesión/);
        assert.equal((await login('admin@example.com', '')).status, 400);
        assert.equal((await login('missing@example.com', 'clave-de-prueba')).status, 401);
        assert.equal((await login('admin@example.com', 'incorrecta')).status, 401);
        assert.equal((await login('reader@example.com', 'clave-de-prueba')).status, 403);
        const success = await login('admin@example.com', 'clave-de-prueba');
        assert.equal(success.status, 200);
        const { token } = await success.json();
        assert.equal(jwt.verify(token, process.env.SECRET).isAdmin, true);
        const response = await fetch(`${base}/api/test/reviews/mejores-revisores`, { headers: { Authorization: `Bearer ${token}` } });
        assert.deepEqual(await response.json(), [{ reviewer_name: 'Ana', total_reviews: 4 }]);
        const empty = await fetch(`${base}/api/test/flights/aeropuertos-origen`, { headers: { Authorization: `Bearer ${token}` } });
        assert.equal(empty.status, 200);
        assert.deepEqual(await empty.json(), []);
        for (const badToken of [
            jwt.sign({ isAdmin: true }, 'wrong-secret'),
            jwt.sign({ isAdmin: true }, process.env.SECRET, { expiresIn: -1 }),
            jwt.sign({ isAdmin: false }, process.env.SECRET)
        ]) {
            assert.equal((await fetch(`${base}/api/test/reviews/mejores-revisores`, { headers: { Authorization: `Bearer ${badToken}` } })).status, 401);
        }
    } finally {
        User.findOne = original;
    }
});
