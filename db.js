const { MongoClient } = require('mongodb');

let dbConnection
const uri = 'mongodb+srv://bosschien:Mg112358@monthlyus.lhdggfm.mongodb.net/?retryWrites=true&w=majority';
module.exports = {
    connectToDb: (cb) => {
        MongoClient.connect(uri)
        .then((client) => {
            dbConnection = client.db('monthly_us')
            return cb()
        })
        .catch(err => {
            console.log(err)
        })
    },
    getDb: () => dbConnection
}