const getIdAndNameConnection = (string) => {
    const stringConnections = string.split('\n').slice(0, -1);
    const connections = stringConnections.reduce((acc, item) => {
        const connectionProps = item.split(' ');
        const idProp = connectionProps.find(prop => prop.indexOf('id=') != -1);
        const id = idProp.split('=')[1];
        const nameProp = connectionProps.find(prop => prop.indexOf('name=') != -1);
        const name = nameProp.split('=')[1];
        const addrProp = connectionProps.find(prop => prop.indexOf('addr=') != -1);
        const addr = addrProp.split('=')[1];
        if (name != '') acc.push({ id, name, addr });
        return acc;
    }, []);

    return connections;
}

module.exports = getIdAndNameConnection;
