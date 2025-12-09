const express = require('express');
const cors = require('cors');
const ImageKit = require('@imagekit/nodejs');   
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()


const app = express()
const port = process.env.PORT || 3000;

// middleware
app.use(
  cors()
);
app.use(express.json())


const imgkitClient = new ImageKit(
    {
    publicKey : "public_9ZiMp/MhVuE8NR/DGLRM9LRbiV0=",
    privateKey : process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint : "https://ik.imagekit.io/atm"  
});

// allow cross-origin requests
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", 
    "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


app.get('/auth', function (req, res) {
  // Your application logic to authenticate the user
  // For example, you can check if the user is logged in or has the necessary permissions
  // If the user is not authenticated, you can return an error response
  const { token, expire, signature } = imgkitClient.helper.getAuthenticationParameters();
  res.send({ token, expire, signature, publicKey: process.env.IMAGEKIT_PUBLIC_KEY });
});



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
     const scholarshipsCollection  = database.collection('scholarships');
     
      //$  users related apis
     // _________________________________________________________________________
    // 1. Save user
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
    // 2. get all users 
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
   // 3. update user role
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
   // 4. delete user
   app.delete('/users/:id', async(req, res)=>{
    const id = req.params.id
    const query = {_id: new ObjectId(id)}
    const result = await usersCollection.deleteOne(query)
    res.send(result)
   })

      //$ scholarships related apis
     //__________________________________________________
    // 1.  Save scholarship
    app.post('/scholarships', async(req,res)=>{
        const scholarshipInfo = req.body
        scholarshipInfo.scholarshipPostDate = new Date()
        const result = await scholarshipsCollection.insertOne(scholarshipInfo)
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



