import mongoose from 'mongoose';

// Campos utilizados por las consultas de vuelos.
const flightSchema = new mongoose.Schema({
    origin_country: String,
    origin_airport: String,
    destination_country: String,
    destination_airport: String,
    airlinename: String,
    departure_month: Number,
    departure_year: Number,
    passengers_booked: Number,
    revenue: Number,
    load_factor_pct: Number
}, {
    collection: 'Flights', // Respetar el nombre y las mayúsculas de tu colección.
    autoCreate: false,
    autoIndex: false
});

export const Flight = mongoose.model('Flight', flightSchema);
export default Flight;
