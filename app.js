const express = require('express');
const cors = require('cors');
const { connectToDb, getDb } = require('./db');
const { MongoClient, ObjectId } = require('mongodb');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(cors());
let db;

connectToDb((err) => {
    if (!err) {
        db = getDb();
        app.listen(3000, () => {
            console.log('app listening on port 3000');
        });
    }
})


app.get('/api/budgets', async (req, res) => {
    const collection = db.collection('budgets');
    const period = parseInt(req.query.period);
    const result = await collection.aggregate([
        {
            $match: {period: period}
        },
        {
            $lookup: {
                from: "categories",
                localField: "categoryId",
                foreignField: "_id",
                as: "category"
            }
        },
        {
            $unwind: '$category'
        },
        {
            $lookup: {
                from: "transactions",
                localField: "_id",
                foreignField: "budgetId",
                as: "transaction"
            }
        },
        {
            $unwind: {
                path: '$transaction',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $group: {
                _id: "$_id",
                amount: {$first: "$amount"},
                period: {$first: "$period"},
                used: {$sum: { $ifNull: [ "$transaction.amount", 0 ] }},
                category: {$first: "$category.name"},
            }
        },
        {
            $addFields: {
                remain: {$subtract: ["$amount", "$used"]}
            }
        },
        {
            $project: {
              _id: 1,
              amount: 1,
              period: 1,
              used: 1,
              remain: 1,
              category: 1
            }
        },
        { $sort: { category : 1 } }
    ]).toArray();
    res.status(200).json(result);

});

app.get('/api/transactions', async (req, res) => {
    const collection = db.collection('transactions');
    const budgetId = req.query.budgetId;

    const result = await collection.find({budgetId: new ObjectId(budgetId)}).sort({time : 1}).toArray();
    const formatResult = result.map(doc => {
        const formattedDoc = new Date(doc.time).toLocaleString();
        return { ...doc, time: formattedDoc };
    })

    res.status(200).json(formatResult);
});

app.post('/api/transactions', (req, res) => {
    const collection = db.collection('transactions');
    const newTransaction = {
        amount: req.body.amount,
        budgetId: new ObjectId(req.body.budgetId),
        description: req.body.description,
        reason: req.body.reason,
        time: new Date(Date.parse(req.body.time))
    }
    collection.insertOne(newTransaction, function(err, result){
        if (err) {
            res.status(500).json({error: 'Error creating transaction'});
            return;
        }
    
        res.status(201).json(result.ops[0]);
    })
})