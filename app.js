import 'dotenv/config';
import reviewsRoutes from './routes/reviewsRoutes.js';
import flightsRoutes from './routes/flightsRoutes.js';
import { createApp } from './application.js';

const app = createApp({ reviewsRoutes, flightsRoutes });
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
