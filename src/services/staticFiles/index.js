const fastifyStatic = require('@fastify/static');
const path = require('path');

function plugItIn(fastify, options, done) {
    fastify.register(fastifyStatic, {
        root: path.join(__dirname, 'public'),
        prefix: '/',
    });
    done();
}

module.exports = plugItIn;
