var express = require("express");
const multer = require("multer");
const path = require("path");
const app = express();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif|webp|svg/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb("Error: Images only!");
    }
  },
});

// Serve static files from uploads directory
app.use("/uploads", express.static("uploads"));

let bodyParser = require("body-parser");
let expressSession = require("express-session");

let { ObjectId } = require("mongodb");
let db = require("./database.js");

// Import auth middleware
const { auth, isAdmin } = require('./middleware/auth');

app.use(
  expressSession({
    secret: "node_mongo123!@#",
    resave: true,
    saveUninitialized: true,
  })
);
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

// Auth routes
const authRoutes = require('./routes/auth')(db);
app.use('/', authRoutes);

// Login and register page routes
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.get('/register', (req, res) => {
    res.render('register', { error: null });
});

// Protected routes
app.get("/", auth, function (req, res) {
    let msg = "";
    if (req.session.msg != undefined && req.session.msg != "") {
        msg = req.session.msg;
    }
    res.render("home", { msg: msg, user: req.user });
});

// Admin-only routes
app.get("/listcategory", auth, isAdmin, async function (req, res) {
    try {
        const category = db.collection("category");
        const catList = await category.find().toArray();
        res.render("category_list_view", { catList: catList, user: req.user });
    } catch (err) {
        console.log(err);
    }
});

app.get("/addcategory", auth, isAdmin, function (req, res) {
    res.render("add_category_view", { user: req.user });
});

app.post("/addCategorySubmit", auth, isAdmin, async function (req, res) {
    const category = db.collection("category");
    const result = await category.insertOne({
        catname: req.body.cname,
        cDescription: req.body.cDescription,
        cStatus: req.body.cStatus,
    });

    if (result.acknowledged === true) {
        res.redirect('/?message=' + encodeURIComponent('Category added successfully!') + '&type=success');
    } else {
        res.redirect('/?message=' + encodeURIComponent('Failed to add category') + '&type=error');
    }
});

app.get("/delcategory", auth, isAdmin, async function (req, res) {
    let catid = req.query["catid"];
    const category = db.collection("category");

    const result = await category.deleteOne({ _id: new ObjectId(catid) });

    if (result.deletedCount == 1) {
        res.redirect('/?message=' + encodeURIComponent('Category deleted successfully!') + '&type=success');
    } else {
        res.redirect('/?message=' + encodeURIComponent('Failed to delete category') + '&type=error');
    }
});

app.get("/editcategory", auth, isAdmin, async function (req, res) {
    const category = db.collection("category");
    const result = await category.findOne({
        _id: new ObjectId(req.query["catid"]),
    });

    res.render("editcategory_view", { catdata: result, user: req.user });
});

app.post("/editCategorySubmit", auth, isAdmin, async function (req, res) {
    const category = db.collection("category");
    const result = await category.updateOne(
        { _id: new ObjectId(req.body.catid) },
        {
            $set: {
                catname: req.body.catname,
                cDescription: req.body.cDescription,
                cStatus: req.body.cStatus,
            },
        }
    );

    if (result.modifiedCount === 1) {
        res.redirect('/?message=' + encodeURIComponent('Category updated successfully!') + '&type=success');
    } else {
        res.redirect('/?message=' + encodeURIComponent('Failed to update category') + '&type=error');
    }
});

// Admin-only product management routes
app.get("/additem", auth, isAdmin, function (req, res) {
    res.render("additem_view", { user: req.user });
});

app.post("/addItemSubmit", auth, isAdmin, upload.single("pImage"), async function (req, res) {
    const itemObj = db.collection("item");
    const result = await itemObj.insertOne({
        pName: req.body.pName,
        pDescription: req.body.pDescription,
        pPrice: req.body.pPrice,
        pSold: req.body.pSold,
        pQuantity: req.body.pQuantity,
        pCategory: req.body.pCategory,
        pOffer: req.body.pOffer,
        pRating: req.body.pRating,
        pStatus: req.body.pStatus,
        pImage: req.file ? "/uploads/" + req.file.filename : null,
    });

    if (result.acknowledged === true) {
        res.redirect('/?message=' + encodeURIComponent('Product added successfully!') + '&type=success');
    } else {
        res.redirect('/?message=' + encodeURIComponent('Failed to add product') + '&type=error');
    }
});

// Public product listing route (accessible to all authenticated users)
app.get("/listitem", auth, async function (req, res) {
    const itemObj = db.collection("item");
    const result = await itemObj.find().toArray();
    res.render("itemlist_view", { itemData: result, user: req.user });
});

// Admin-only product management routes
app.get("/deleteItem", auth, isAdmin, async function (req, res) {
    let itemid = req.query["itemid"];
    const itemObj = db.collection("item");

    const result = await itemObj.deleteOne({ _id: new ObjectId(itemid) });

    if (result.deletedCount == 1) {
        res.redirect('/?message=' + encodeURIComponent('Product deleted successfully!') + '&type=success');
    } else {
        res.redirect('/?message=' + encodeURIComponent('Failed to delete product') + '&type=error');
    }
});

app.get("/editItem", auth, isAdmin, async function (req, res) {
    const itemObj = db.collection("item");
    const result = await itemObj.findOne({
        _id: new ObjectId(req.query["itemid"]),
    });

    res.render("editItem_view", { itemData: result, user: req.user });
});

app.post("/editItemSubmit", auth, isAdmin, upload.single("pImage"), async function (req, res) {
    const itemObj = db.collection("item");
    const updateData = {
        pName: req.body.pName,
        pDescription: req.body.pDescription,
        pPrice: req.body.pPrice,
        pSold: req.body.pSold,
        pQuantity: req.body.pQuantity,
        pCategory: req.body.pCategory,
        pOffer: req.body.pOffer,
        pRating: req.body.pRating,
        pStatus: req.body.pStatus,
    };

    if (req.file) {
        updateData.pImage = "/uploads/" + req.file.filename;
    }

    const result = await itemObj.updateOne(
        { _id: new ObjectId(req.body.itemid) },
        { $set: updateData }
    );

    if (result.modifiedCount === 1) {
        res.redirect('/?message=' + encodeURIComponent('Product updated successfully!') + '&type=success');
    } else {
        res.redirect('/?message=' + encodeURIComponent('Failed to update product') + '&type=error');
    }
});

// Order routes (accessible to all authenticated users)
app.get("/addOrder", auth, function (req, res) {
    res.render("add_order_view", { user: req.user });
});

app.get("/listOrders", auth, async function (req, res) {
    try {
        const ordersCollection = db.collection("orders");
        let ordersList;
        
        // If admin, show all orders. If user, show only their orders
        if (req.user.role === 'admin') {
            ordersList = await ordersCollection.find().toArray();
        } else {
            ordersList = await ordersCollection.find({ user: req.user.username }).toArray();
        }
        
        res.render("orders_list_view", { ordersList: ordersList, user: req.user });
    } catch (err) {
        console.log(err);
        res.send("Error fetching orders");
    }
});

app.post("/addOrderSubmit", auth, async function (req, res) {
    const ordersCollection = db.collection("orders");
    const result = await ordersCollection.insertOne({
        allProducts: req.body.allProducts,
        user: req.user.username,
        amount: req.body.amount,
        transactionId: req.body.transactionId,
        address: req.body.address,
        phoneNumber: req.body.phoneNumber,
        status: req.body.status,
        createdAt: new Date()
    });

    if (result.acknowledged === true) {
        res.redirect('/?message=' + encodeURIComponent('Order placed successfully!') + '&type=success');
    } else {
        res.redirect('/?message=' + encodeURIComponent('Failed to place order') + '&type=error');
    }
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port http://localhost:${port}`);
});
