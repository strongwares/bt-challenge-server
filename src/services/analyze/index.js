const fetch = require('node-fetch');

const PATH = '/analyze/v1';

const URL = 'https://fusion.someplace.com';
const PROVIDER = 'someprovider';
const BULK_CLUSTER_SUMMARY_ALL = `bulk/${PROVIDER}/cluster/summary/all`;

const API_KEY_OWNER = 'you are not authorized';

let logger;
/* eslint-disable-next-line no-unused-vars */
let server;

const test404 = false;
const testTimeout = false;
const testFake = false;

// Test an async request taking longer than the UI user can stand waiting:
async function testTakeTooLong(req, resp) {
    const stop = new Date().getTime();
    const time = 30000;
    while (new Date().getTime() < stop + time) {}
}

// Test sending back fake data
function testFakeData(body, resp) {
    const { addressList, addressType } = body;

    let balanceAmt = 100;
    let sentAmt = 200;
    let receivedAmt = 300;
    let risk = 1;
    resp.send({
        message: 'Success',
        results: addressList.map((addr) => {
            balanceAmt += 100;
            sentAmt += 200;
            receivedAmt += 300;
            risk += 1;
            return {
                id: addr,
                address: addr,
                addressName: `Name: ${addr}`,
                addressType,
                balance: balanceAmt,
                totalSent: sentAmt,
                totalReceived: receivedAmt,
                riskScore: risk,
            };
        }),
    });
}

function sendFusionResult(fusionResult, status, resp) {
    resp.code(status);
    if (status !== 200) {
        resp.send({ message: fusionResult.message });
        return;
    }

    const payload = {
        message: 'Success',
        results: fusionResult.map((row) => {
            const { address, summary } = row;
            const {
                balance,
                name: addressName,
                score: riskScore,
                totalReceivedAmount: totalReceived,
                totalSentAmount: totalSent,
                type: addressType,
            } = summary;
            return {
                id: address,
                address,
                addressName,
                addressType,
                balance,
                totalSent,
                totalReceived,
                riskScore,
            };
        }),
    };

    resp.send(payload);
}

async function askFusion(body, resp) {
    const { addressList: addresses, addressType, apiKey, randomNumbers } = body;

    const url = `${URL}/${BULK_CLUSTER_SUMMARY_ALL}?type=${addressType}`;

    if (!apiKey) {
        resp.code(404);
        resp.send({
            message: 'Missing the API Key',
        });
        return;
    }

    if (!randomNumbers) {
        resp.code(404);
        resp.send({
            message: 'Missing Random Numbers',
        });
        return;
    }

    if (randomNumbers.toLowerCase() !== API_KEY_OWNER) {
        resp.code(404);
        resp.send({
            message: 'Wrong Random Numbers',
        });
        return;
    }

    await fetch(url, {
        method: 'POST',
        body: JSON.stringify({ addresses }),
        headers: {
            api_key: apiKey,
            'Content-type': 'application/json; charset=UTF-8',
        },
    })
        .then(async (response) => {
            const { status } = response;
            const text = await response.text();
            const json = text && text.length ? JSON.parse(text) : {};

            sendFusionResult(json, status, resp);
        })
        .catch((err) => {
            logger.error(`Fusion response server error: ${err}`);
            resp.code(500);
            resp.send({
                message: `Fusion request server error: ${err}`,
            });
        });
}

async function doAnalyzeRequest(req, resp) {
    const { body } = req;

    try {
        if (test404) {
            resp.code(404);
            resp.send({
                message: 'This is a 404 failure',
            });
            return;
        }

        if (testTimeout) {
            await testTakeTooLong(req, resp);
            return;
        }

        if (testFake) {
            testFakeData(body, resp);
            return;
        }

        await askFusion(body, resp);

        return;
    } catch (error) {
        resp.code(500);
        resp.send({ message: `Address analyze request error: ${error}` });
    }
}

const routes = [
    {
        method: 'POST',
        url: PATH,
        handler: doAnalyzeRequest,
    },
];

function plugItIn(fastify, options, done) {
    logger = fastify.log;
    server = fastify;
    routes.forEach((route) => fastify.route(route));
    done();
}

module.exports = plugItIn;
