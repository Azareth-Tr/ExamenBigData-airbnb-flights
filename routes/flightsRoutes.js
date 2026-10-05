import express from 'express';
import '../config/database.js';
import Flight from '../models/Flight.js';

const router = express.Router();

// Ruta de prueba
router.get('/', (req, res) => {
  res.send('¡Hola desde Express!');
});

// Principales aeropuertos de origen con más pasajeros reservados hacia Alemania.
router.get(process.env.API_PREFIX + '/flights/aeropuertos-origen', async (req, res) => {
    try {
        const resultados = await Flight.aggregate([
            {
                $match: {
                    destination_country: "GERMANY"
                }
            },
            {
                $group: {
                    _id: {
                        country: "$origin_country",
                        airport: "$origin_airport"
                    },
                    total_visitantes: {$sum: "$passengers_booked"},
                    total_vuelos: { $sum: 1}
                }
            },
            {
                $sort: { total_visitantes: -1 }
            },
            {
                $limit: 3
            },
            {
                $project: {
                    _id: 0,
                    pais_origen: "$_id.country",
                    aeropuerto_origen: "$_id.airport",
                    total_visitantes: 1,
                    total_vuelos: 1
                }
            }
        ]).exec();

        res.status(200).json(resultados);
    } catch (error) {
        console.error('Error al consultar los principales aeropuertos de origen:', error);
        res.status(500).json({ error: 'No se pudieron obtener los principales aeropuertos de origen' });
    }
});

// Desempeño mensual de las aerolineas por mes y año
router.get(process.env.API_PREFIX + '/flights/desempeno-mensual', async (req, res) => {
    try {
        const resultados = await Flight.aggregate([
            {
                $group: {
                    _id: {
                        airline: "$airlinename",
                        month: "$departure_month",
                        year: "$departure_year"
                        },
                    total_flights: { $sum: 1 },
                    total_passengers: { $sum: "$passengers_booked" },
                    total_earns: { $sum: "$revenue" },
                    average_load_factor: {$avg: "$load_factor_pct"}
                    }
            },
            {
                $sort: {
                    "_id.year": 1,
                    "_id.month": 1,
                    total_earns: -1
                    }
            },
            {
                $project: {
                    _id: 0,
                    departure_year: "$_id.year",
                    departure_month: "$_id.month",
                    airlinename: "$_id.airline",
                    total_flights: 1,
                    total_passengers: 1,
                    total_earns: 1,
                    average_load_factor: 1
                    }
            }
        ]).exec();
        res.status(200).json(resultados);
    } catch (error) {
        console.error('Error al consultar el desempeño mensual de las aerolineas:', error);
        res.status(500).json({ error: 'No se pudieron obtener el desempeño mensual de las aerolineas' });
    }
});

// Listado de los 50 rutas mas rentables
router.get(process.env.API_PREFIX + '/flights/rutas-mas-rentables', async (req, res) => {
    try {
        const resultados = await Flight.aggregate([
            {
                $group: {
                    _id: {
                        origin_airport: "$origin_airport",
                        destination_airport: "$destination_airport"
                    },
                    total_flights: { $sum: 1},
                    total_passengers: { $sum: "$passengers_booked" },
                    total_earns: { $sum: "$revenue" },
                    avg_earns: { $avg: "$revenue" },
                    average_load_factor: {$avg: "$load_factor_pct"}
                },
            },
            {
                $match: { total_flights: { $gt: 70 } }
            },
            {
                $sort: { total_earns: -1 }
            },
            {
                $limit: 50
            },
            {
                $project: {
                    _id: 0,
                    origin_airport: "$_id.origin_airport",
                    destination_airport: "$_id.destination_airport",
                    total_flights: 1,
                    total_passengers: 1,
                    total_earns: 1,
                    avg_earns: 1,
                    average_load_factor: 1
                }
            }
        ]).exec();
        res.status(200).json(resultados);
    } catch (error) {
        console.error('Error al consultar las rutas más rentables:', error);
        res.status(500).json({ error: 'No se pudieron obtener las rutas más rentables' });
    }
});

// Clasificar las aerlineas por ingreso dentro de cada mes y año
router.get(process.env.API_PREFIX + '/flights/clasificacion-aerolineas', async (req, res) => {
    try {
        const resultados = await Flight.aggregate([
            {
                $group: {
                    _id: {
                        airline: "$airlinename",
                        month: "$departure_month",
                        year: "$departure_year"
                    },
                    total_flights: { $sum: 1 },
                    total_passengers: {$sum: "$passengers_booked"},
                    total_earns: { $sum: "$revenue" },
                }
            },
            {
                $setWindowFields: {
                    partitionBy: {
                        year: "$_id.year",
                        month: "$_id.month"
                    },
                    sortBy: {
                        total_earns: -1
                    },
                    output: {
                        position: {
                            $rank: {}
                        }
                    }
                }
            },
            {
                $match: { position: { $lte: 5 } }
            },
            {
                $project: {
                    airline: "$_id.airline",
                    month: "$_id.month",
                    year: "$_id.year",
                    total_flights: 1,
                    total_passengers: 1,
                    total_earns: 1,
                    position: 1
                }
            },
            {
                $sort: {
                    year: 1,
                    month: 1,
                    position: 1
                }
            }
        ]).exec();
        res.status(200).json(resultados);
    } catch (error) {
        console.error('Error al consultar la clasificación de aerolíneas:', error);
        res.status(500).json({ error: 'No se pudieron obtener la clasificación de aerolíneas' });
    }
});

export default router;