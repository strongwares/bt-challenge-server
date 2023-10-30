// require('dotenv').config();
import 'dotenv/config';

// const fs = require('fs');
// const path = require('path');
// const cors = require('@fastify/cors');
// import * as fs from 'fs';
//  import * as path from 'path';
import cors from '@fastify/cors';
/*
const http2https = 'fas'
if (process.env.HTTP2 === 'true' || process.env.HTTPS === 'true') {
    http2https = import 'fastify-http2https';
}
*/

const fastifyOpts = {
    logger: process.env.LOGGER === 'true',
    // http2: process.env.HTTP2 === 'true',
};

/*
if (process.env.HTTPS === 'true') {
    fastifyOpts.https = {
        allowHTTP1: process.env.ALLOW_HTTP1 === 'true',
        cert: fs.readFileSync(path.join(__dirname, '../certs/pub-cert.pem')),
        key: fs.readFileSync(path.join(__dirname, '../certs/priv-key.pem')),
    };
    fastifyOpts.serverFactory = http2https();
}
*/

// const fastify = require('fastify')(fastifyOpts);
// const fastify = require('fastify')(fastifyOpts);
import Fastify from 'fastify';
const fastify = Fastify(fastifyOpts);

fastify.register(cors, {});

const services = JSON.parse(process.env.SERVICES);
services.forEach((service) => {
    try {
        fastify.log.info(`Registering service ${service}`);
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
