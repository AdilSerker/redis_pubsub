const redis = require('redis');
const { v4 } = require('uuid');
const { promisify } = require('util');
const client = redis.createClient();
const pub = redis.createClient();
const sub = redis.createClient();

let lastMessageTimeatamp;

const getConnectionParam = require('./GetIdAndNameConnection');

const connect = promisify(client.on).bind(client);
const setAsync = promisify(client.set).bind(client);
const getAsync = promisify(client.get).bind(client);
const delAsync = promisify(client.del).bind(client);
const clientParam = promisify(client.CLIENT).bind(client);

const NODE_ID = v4();

let MASTER_NODE;

const getErrors = 2;

(async function() {
    await connect('connect');
    if(process.argv[getErrors] === 'getErrors') {
        const errors = JSON.parse(await getAsync('errors'));
        errors && console.log(errors.errors);
        await delAsync('errors');
        process.exit();
    }
    await clientParam('SETNAME', NODE_ID);
    let connections = getConnectionParam(await clientParam('LIST'));
    MASTER_NODE = connections.length === 1 && connections[0] && connections[0].name === NODE_ID
        ? NODE_ID : await getAsync('master');
    await initErrorsDb();
    await setAsync('master', MASTER_NODE);
    updateActivity();
    generateMessages();
    checkAliveMaster();
})();

sub.subscribe('stream');

sub.on('message', async (channel, message) => {
    console.log(message);
    lastMessageTimeatamp = Date.now();
    if (NODE_ID === MASTER_NODE && Math.random()*100 < 50) {
        const { errors } = JSON.parse(await getAsync('errors'));
                
        await setAsync('errors', JSON.stringify({ errors: [...errors, message] }));
    }
});

const initErrorsDb = async () => {
    if (NODE_ID === MASTER_NODE) {
        await setAsync('errors', JSON.stringify({ errors: [] }));
    }
}

const checkAliveMaster = () => {
    setInterval(async () => {
        if (Date.now() - lastMessageTimeatamp > 2000) {
            await newMaster();
        }
    }, 1000);
}

const generateMessages = () => {
    setInterval(() => {
        if (NODE_ID === MASTER_NODE){
            pub.publish('stream', `Message ${v4()}`);
        }
    }, 500);
}

const updateActivity = () => {
    setInterval(async () => await setAsync(NODE_ID, Date.now()), 2000);
}

const newMaster = async () => {
    let connections = getConnectionParam(await clientParam('LIST'));
    for (let connect of connections) {
        const { name } = connect;
        const lastTime = await getAsync(name);
        if (Date.now() - lastTime < 2000) {
            await setAsync('master', name);
            MASTER_NODE = name;
            break;
        }
    }
}
