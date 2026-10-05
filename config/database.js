import 'dotenv/config';
import mongoose from 'mongoose';

try {
    await mongoose.connect(process.env.CONN_STRING, {
        dbName: process.env.DB_NAME
    });
    console.log("Mongoose connected successfully...");


} catch (error) {
    console.error("Database connection error:");
    console.log(error);
    // Evitar iniciar el servidor sin una conexión disponible.
    throw error;
}

export default mongoose.connection;
