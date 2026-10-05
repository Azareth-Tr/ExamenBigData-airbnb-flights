import express from 'express';
import { fileURLToPath } from 'node:url';
import authJwt from './middleware/jwt.js';
import userRouter from './routes/UserRouter.js';

export function createApp({ reviewsRoutes, flightsRoutes }) {
    const app = express();
    const apiPrefix = process.env.API_PREFIX;
    if (!apiPrefix || !process.env.SECRET) {
        throw new Error('Configura API_PREFIX y SECRET en tu archivo .env');
    }
    app.use(express.json());
    // La interfaz es pública; los datos permanecen detrás del middleware JWT.
    app.get('/config.json', (req, res) => res.json({ apiPrefix }));
    app.use(express.static(fileURLToPath(new URL('./public/', import.meta.url))));
    app.use(authJwt());
    app.use(`${apiPrefix}/users`, userRouter);
    app.use('/', reviewsRoutes);
    app.use('/', flightsRoutes);
    app.use((error, req, res, next) => {
        if (error.name === 'UnauthorizedError') {
            return res.status(401).json({ error: 'Tu sesión no es válida o expiró. Inicia sesión nuevamente.' });
        }
        if (error.type === 'entity.parse.failed') {
            return res.status(400).json({ error: 'El cuerpo de la petición debe ser JSON válido.' });
        }
        console.error('Error en la petición:', error);
        res.status(500).json({ error: 'No se pudo completar la petición.' });
    });
    return app;
}
