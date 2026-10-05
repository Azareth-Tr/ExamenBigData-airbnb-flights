import mongoose from 'mongoose';

// Cada reseña está guardada dentro del arreglo reviews de un alojamiento.
const embeddedReviewSchema = new mongoose.Schema({
    // Mixed permite leer identificadores existentes de tipo string u ObjectId.
    _id: mongoose.Schema.Types.Mixed,
    date: Date,
    reviewer_id: String,
    reviewer_name: String,
    comments: String
}, { _id: false });

// Este modelo representa un alojamiento de Airbnb con sus reseñas.
const reviewSchema = new mongoose.Schema({
    _id: mongoose.Schema.Types.Mixed,
    name: String,
    property_type: String,
    price: mongoose.Schema.Types.Decimal128,
    amenities: [String],
    review_scores: {
        review_scores_rating: Number
    },
    reviews: [embeddedReviewSchema]
}, {
    collection: 'Airbnb',
    autoCreate: false,
    autoIndex: false
});

export const Review = mongoose.model('Review', reviewSchema);
export default Review;
