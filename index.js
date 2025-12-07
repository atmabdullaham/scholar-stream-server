const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()


const app = express()
const port = process.env.PORT || 3000;

// middleware
app.use(
  cors()
);
app.use(express.json())


const uri = `mongodb+srv://${process.env.db_admin}:${process.env.db_pass}@cluster0.a41jis3.mongodb.net/?appName=Cluster0`;
app.get('/', (req, res)=>{
    res.send("Hello word")
})
 
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
    try {
      await client.connect();
     const database = client.db('scholar_stream');
     const usersCollection  = database.collection('users');
     

    //  users related apis
    app.post("/users", async(req, res)=>{
        const userInfo = req.body
        userInfo.role = 'student';
        userInfo.createdAt = new Date()
        const email = userInfo.email
        const userExists = await usersCollection.findOne({email})
        if(userExists){
        return res.send({message:"user exist"})
        }
        const result = await usersCollection.insertOne(userInfo);
        res.send(result)
    }) 
    
     
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    
  }
  app.listen(port, ()=>{
    console.log(   `Server is running on port ${port}`);
})
}
run().catch(console.dir);



