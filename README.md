# Atlas: Flights & Reviews

Interfaz con login JWT y tablas para las ocho consultas existentes.

## Iniciar

1. Ejecuta `npm install` si faltan dependencias.
2. Configura en `.env`: `CONN_STRING`, `DB_NAME`, `SECRET`, `API_PREFIX` (por ejemplo `/api/v1`) y `PORT` (por ejemplo `3000`). No publiques este archivo ni el valor de `SECRET`.
3. Ejecuta `npm start`.
4. Abre `http://localhost:3000` (o el puerto configurado).
5. Inicia sesión con un usuario existente cuyo `isAdmin` sea `true`, de acuerdo con la regla JWT del proyecto.

La interfaz obtiene únicamente `API_PREFIX` de `/config.json`. Envía las credenciales a `POST <API_PREFIX>/users/login` y usa `Authorization: Bearer <token>` para las consultas. El token se conserva en `sessionStorage` de la pestaña; cerrar sesión lo elimina de la interfaz. El servidor valida firma, vencimiento y permiso en cada petición. Cerrar sesión no revoca un JWT ya emitido en el servidor.

## Archivos

- `public/index.html`: login y panel adaptable a móvil.
- `public/app.js`: sesión, selección de consultas y tablas.
- `public/styles.css`: estilos básicos de respaldo.
- `application.js`: interfaz pública, configuración y rutas protegidas.
- `middleware/jwt.js`: validación del token y excepciones para login y registro.

Tailwind se carga mediante el Play CDN para desarrollo local y necesita conexión a internet. Para publicar, genera un archivo CSS con Tailwind CLI y reemplaza el script CDN por el CSS compilado: https://tailwindcss.com/docs/installation/tailwind-cli.

## Verificar

`npm test` ejecuta las pruebas de autenticación en Express y del flujo de la interfaz sin abrir puertos ni conectar a MongoDB. Los usuarios y resultados están simulados; verifica también con tu base real desde el navegador.
