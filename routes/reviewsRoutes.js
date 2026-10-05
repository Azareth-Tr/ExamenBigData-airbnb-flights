import express from 'express';
import '../config/database.js';
import Review from '../models/Review.js';

const router = express.Router();

// Ruta de prueba
router.get('/', (req, res) => {
  res.send('¡Hola desde Express!');
});

// Precio medio por propiedad
router.get(process.env.API_PREFIX + '/reviews/precio-medio-propiedad', async (req, res) => {
    try {
            const resultados = await Review.aggregate([
            {
                $group: {
                    _id: "$property_type",
                    avg_price: { $avg: "$price" },
                    listings: { $sum: 1 }
                }
            },
            {
                $sort: { avg_price: -1 }
            },
            {
                $project: {
                    _id: 0,
                    property_type: "$_id",
                    avg_price: 1,
                    listings: 1
                }
            }
        ]).exec();

        res.status(200).json(resultados);
    } catch (error) {
        console.error('Error al consultar los precios medios de las propiedades:', error);
        res.status(500).json({ error: 'No se pudieron obtener los precios medios de las propiedades' });
    }
});

// Anuncios con mas comodidades y calificacion mayor a 90
router.get(process.env.API_PREFIX + '/reviews/anuncios-mas-comodidades', async (req, res) => {
    try {
        const resultados = await Review.aggregate([
            {
                $match: {
                    $expr: {
                        $gt: [ { $size: "$amenities" }, 5 ]
                        },
                    "review_scores.review_scores_rating": { $gte: 90}
                    }
            },
            {
                $sort: { "review_scores.review_scores_rating": -1 }
            },
            {
                $project: {
                    _id: 0,
                    name: 1,
                    amenities: 1,
                    review_scores_rating: "$review_scores.review_scores_rating"
                }
            }
        ]).exec();
        res.status(200).json(resultados);
    } catch (error) {
        console.error('Error al consultar los anuncios con más comodidades:', error);
        res.status(500).json({ error: 'No se pudieron obtener los anuncios con más comodidades' });
    }
});

// 5 mejores revisores por cantidad de reviews
router.get(process.env.API_PREFIX + '/reviews/mejores-revisores', async (req, res) => {
    try {
        const resultados = await Review.aggregate([
            {
                $unwind: "$reviews"
            },
            {
                $group: {
                    _id: "$reviews.reviewer_name",
                    total_reviews: { $sum: 1 }
                }
            },
            {
                $sort: {total_reviews: -1}
            },
            {
                $limit: 5
            },
            {
                $project: {
                    _id: 0,
                    reviewer_name: "$_id",
                    total_reviews: 1
                }
            }
        ]).exec();
        res.status(200).json(resultados);
    }
    catch (error) {
        console.error('Error al consultar los mejores revisores:', error);
        res.status(500).json({ error: 'No se pudieron obtener los mejores revisores' });
    }
});

// Anuncios que mencionen el texto "Great Location" en los reviews
router.get(process.env.API_PREFIX + '/reviews/anuncios-great-location', async (req, res) => {
    try {
        const resultados = await Review.aggregate([
            {
                $unwind: "$reviews"
            },
            {
                $match: {
                    "reviews.comments": {
                        $regex: "Great Location",
                        $options: "i"
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    name: "$_id",
                    reviewer_name: "$reviews.reviewer_name",
                    comments: "$reviews.comments"
                }
            }         
        ]).exec();
        res.status(200).json(resultados);
    } catch (error) {
        console.error('Error al consultar los anuncios que mencionen "Great Location":', error);
        res.status(500).json({ error: 'No se pudieron obtener los anuncios que mencionen "Great Location"' });
    }
});

export default router;
