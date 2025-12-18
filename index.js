const express = require('express');
const cors = require('cors');
const ImageKit = require('@imagekit/nodejs');   
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET)


const app = express()
const port = process.env.PORT || 3000;

// middleware
app.use(
  cors()
);
app.use(express.json())


const imgkitClient = new ImageKit(
    {
    publicKey : process.env.IMAGEKIT_PUBLIC_KEY,
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
     const applicationsCollection = database.collection('applications')
     const reviewsCollection = database.collection('reviews')
    
     

 



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
  //  5. get role
   app.get('/users/:email/role', async(req, res)=>{
    const email = req.params.email;
    const query = {email};
    const user = await usersCollection.findOne(query);
    res.send(user)
  })

      //$ scholarships related apis
     //___________________________________________________________________________
    // 1. Scholarship Save to Database
    app.post('/scholarships', async(req,res)=>{
        const scholarshipInfo = req.body
        scholarshipInfo.reviews = []
        scholarshipInfo.scholarshipPostDate = new Date()
        const result = await scholarshipsCollection.insertOne(scholarshipInfo)
        res.send(result)
    })
    // 2. Scholarships get all from db
    app.get("/scholarships", async (req, res) => {
  try {
    let {
      limit = 12,
      skip = 0,
      sort = "createdAt",
      order = "desc",
      search = "",
      category = "",
      degree = ""  
    } = req.query;

    limit = Number(limit);
    skip = Number(skip);

    // BUILD QUERY
    let query = {};

    // CATEGORY FILTER
    if (category) {
      query.scholarshipCategory = category;
    }
    if(degree){
        query.degree = degree
    }

    // TEXT SEARCH
    if (search) {
      query.$or = [
        { scholarshipName: { $regex: search, $options: "i" } },
        { universityName: { $regex: search, $options: "i" } },
        { degree : { $regex: search, $options: "i" } }
      ];
    }

    // SORT
    const sortOption = {};
    sortOption[sort] = order === "asc" ? 1 : -1;

    // DATA FETCH
    const data = await scholarshipsCollection
      .find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await scholarshipsCollection.countDocuments(query);

    res.send({
      success: true,
      data,
      total,
      limit,
      currentPage: skip / limit,
      totalPage: Math.ceil(total / limit)
    });

  } catch (error) {
    console.log("API ERROR:", error);
    res.status(500).send({ success: false, error: "Server error" });
  }
        });  
    // 3. Scholarship Delete
    app.delete("/scholarships/:id", async(req, res)=>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await scholarshipsCollection.deleteOne(query)
        res.send(result)
    })
    // 4. get one scholarship
    app.get("/scholarships/:id", async(req, res)=>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await scholarshipsCollection.findOne(query)
        res.send(result)
    })
    // 5. Update one scholarship 
    app.patch("/scholarships/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;   
       try {
        const query = { _id: new ObjectId(id) };
        const updatedDoc = {
            $set: data, 
            };
        const result = await scholarshipsCollection.updateOne(query, updatedDoc);
        res.send(result);
      } catch (err) {
        res.status(500).send({ message: "Update failed", error: err });
        }
    });



        // $ payment related api
       //  ___________________________________________________________________
      //1. create payment session
   


    // paymet checkout session link
    //1. create payment session
          app.post("/create-checkout-session", async(req, res)=>{
               const applicationInfo = req.body;
               let applicationId = "";
               if(!applicationInfo._id){
               const userEmail = applicationInfo.userEmail;
               const userQuery = {email: userEmail};
               const userResult = await usersCollection.findOne(userQuery);
               applicationInfo.userId = userResult._id.toString();
               applicationInfo.userName = userResult.displayName;
               applicationInfo.applicationStatus = "pending";
               applicationInfo.paymentStatus = "unpaid";
               applicationInfo.applicationDate = new Date()
               applicationInfo.feedback = ""
              //  a conditin needed to prevent send it database, reather a message send to front that you already applied for this application
               if(!applicationId){
                const saveApplicationInfo = await applicationsCollection.insertOne(applicationInfo)
                applicationId = saveApplicationInfo.insertedId.toString()
               }
               }
               if(applicationInfo._id){
                applicationId = applicationInfo._id.toString()
               }
              
               const totalPayable =  Number(applicationInfo.applicationFees) + Number(applicationInfo.serviceCharge)
               const amount = parseInt(totalPayable)*100;
              //  creating Sessions if unpaid or new application
               const session = await stripe.checkout.sessions.create({
         line_items: [
          {
            price_data:{
            currency:'usd',
            unit_amount:amount,
              product_data: {
              name: `Please pay, to apply for:${applicationInfo.degree} in ${applicationInfo.universityName}`
              }
            },
           quantity: 1,
          },
        ],
        mode: 'payment',
        metadata: {
          applicationId,
          universityName: applicationInfo.universityName,
          scholarshipCategory: applicationInfo.scholarshipCategory,
          degree: applicationInfo.degree
        },
        customer_email: applicationInfo.userEmail,
        success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.SITE_DOMAIN}/dashboard/payment-cancelled?universityName=${applicationInfo.universityName}&scholarshipCategory=${applicationInfo.scholarshipCategory}&degree=${applicationInfo.degree}`,
      })
      res.send({url:session.url})
    }) 

    // 2. payment success update the payment status unpaid to paid.
    app.patch("/application-payment-success", async(req,res)=>{
      const sessionId = req.query.session_id;
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items']
    });
    const amountPaid = session.amount_total;  
    const currency = session.currency;     
      const scholarshipDetails = session.metadata;
      const transactionId = session.payment_intent;
      const paymentExist = await applicationsCollection.findOne({ transactionId });
      
    if (paymentExist) {
      return res.send({
        message: "already exists",
        transactionId,
        trackingId: paymentExist.trackingId,
      });
    }

    if (session.payment_status !== "paid") {
      return res.send({ success: false });
    }

    // Update application payment status
    const applicationId = session.metadata.applicationId;
    const result = await applicationsCollection.updateOne(
      { _id: new ObjectId(applicationId) },
      { $set: { 
             paymentStatus: "paid",
             transactionId: transactionId,
             paidAt: new Date()
            } }
    );

   

    return res.send({
      success: true,
      transactionId,
      result,
      scholarshipDetails,
      amountPaid,
      currency
    });
      res.send({success: false})
    })

         //$ application management
        // 1. applications get all from db
    app.get("/applications", async (req, res) => {
  try {
    let {
      limit = 12,
      skip = 0,
      sort = "createdAt",
      order = "desc",
      search = "",
      applicationStatus = "",
      degree = "" ,
      email = ""
    } = req.query;

    limit = Number(limit);
    skip = Number(skip);

    // BUILD QUERY
    let query = {};

    // CATEGORY FILTER
    if (applicationStatus) {
      query.applicationStatus = applicationStatus;
    }
    if(degree){
        query.degree = degree
    }
    
    if(email){
      query.userEmail = email
      console.log(email)
    }

    // TEXT SEARCH
    if (search) {
      query.$or = [
        { universityName: { $regex: search, $options: "i" } },
        { degree : { $regex: search, $options: "i" } }
      ];
    }

    // SORT
    const sortOption = {};
    sortOption[sort] = order === "asc" ? 1 : -1;

    // DATA FETCH
    const data = await applicationsCollection
      .find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await applicationsCollection.countDocuments(query);

    res.send({
      success: true,
      data,
      total,
      limit,
      currentPage: skip / limit,
      totalPage: Math.ceil(total / limit)
    });

  } catch (error) {
    console.log("API ERROR:", error);
    res.status(500).send({ success: false, error: "Server error" });
  }
        });

        // 2. Update application
        app.patch("/applications/:id", async(req, res)=>{
          const id = req.params.id;
          const updateInfo = req.body;
          const query = {_id: new ObjectId(id)}
          const updatedDoc = {
            $set: 
              updateInfo
            
          }

          const result = await applicationsCollection.updateOne(query, updatedDoc)
          res.send(result)
        })
        // 3. my application 
        app.get("/my-applications/:email", async (req, res) => {
          try {
            const email = req.params.email;
            const result = await applicationsCollection.aggregate([
              {
                $match: {
                  userEmail: email,
                },
              },
              {
                $addFields: {
                  scholarshipObjectId: {
                    $toObjectId: "$scholarshipId",
                  },
                },
              },
              {
                $lookup: {
                  from: "scholarships",
                  localField: "scholarshipObjectId",
                  foreignField: "_id",
                  as: "scholarshipDetails",
                },
              },
              {
                $unwind: {
                  path: "$scholarshipDetails",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $project: {
                  scholarshipObjectId: 0,
                },
              },
            ]).toArray();
            res.send(result);
          } catch (error) {
            console.log("API ERROR:", error);
            res.status(500).send({ success: false, error: "Server error" });
          }
        });
        // 4. delete my applications
        app.delete("/my-applications/:id", async(req,res)=>{
          const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await applicationsCollection.deleteOne(query)
        res.send(result)
        })


        // ________________________________________________
        // submit review
        app.post("/reviews", async(req, res)=>{
          const reviewInfo = req.body;
          reviewInfo.reviewDate = new Date()
          const existReviewForScholarship = await reviewsCollection.findOne({scholarshipId: reviewInfo.scholarshipId})
            if (existReviewForScholarship) {
              return res.status(409).send({
              message: "You have already reviewed this scholarship",
                   });
           }
          const result = await reviewsCollection.insertOne(reviewInfo)
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



