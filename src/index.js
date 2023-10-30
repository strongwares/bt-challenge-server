require('dotenv').config();

const fs = require('fs');
const path = require('path');
const cors = require('@fastify/cors');

let http2https;
if (process.env.HTTP2 === 'true' || process.env.HTTPS === 'true') {
    http2https = require('fastify-http2https');
}

const fastifyOpts = {
    logger: process.env.LOGGER === 'true',
    http2: process.env.HTTP2 === 'true',
};

if (process.env.HTTPS === 'true') {
    fastifyOpts.https = {
        allowHTTP1: process.env.ALLOW_HTTP1 === 'true',
        cert: fs.readFileSync(path.join(__dirname, '../certs/cert.pem')),
        key: fs.readFileSync(path.join(__dirname, '../certs/key.pem')),
    };
    fastifyOpts.serverFactory = http2https();
}

const fastify = require('fastify')(fastifyOpts);

fastify.register(require('@fastify/multipart'), {
    attachFieldsToBody: 'keyValues',
    // attachFieldsToBody: true,
});

fastify.register(cors, {
    credentials: true,
    origin: true,
});

const services = JSON.parse(process.env.SERVICES);
services.forEach((service) => {
    try {
        fastify.log.info(`Registering service ${service}`);
        /* eslint-disable  global-require */
        fastify.register(require(`./services/${service}/`));
    } catch (err) {
        fastify.log.error(`Unable to register service ${service}: ${err}`);
    }
});

const start = async () => {
    try {
        await fastify.listen({
            port: process.env.PORT,
            host: process.env.HOST,
        });
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
