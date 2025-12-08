const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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

    // get all users 
    app.get('/users',  async(req,res)=>{
    const searchText = req.query.searchText;
    const filter = req.query.filter
    const query = {};
    if(searchText){
      query.displayName = {$regex: searchText, $options:"i"}
    }
    if(filter){
        query.role = filter 
    }
    const cursor = usersCollection.find(query);
    const result = await cursor.toArray()
    res.send(result)
   })

   // update user role
   app.patch('/users/:id/role', async(req,res)=>{
    const id = req.params.id;
    const roleInfo = req.body
    console.log(roleInfo)
    const query = {_id: new ObjectId(id)}
    const updatedDoc = {
      $set:{
        role:roleInfo.role
      }
    }
    const result = await usersCollection.updateOne(query, updatedDoc)
    res.send(result)

   })
//     delete user
   app.delete('/users/:id', async(req, res)=>{
    const id = req.params.id
    const query = {_id: new ObjectId(id)}
    const result = await usersCollection.deleteOne(query)
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



