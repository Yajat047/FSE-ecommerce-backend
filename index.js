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

app.use(
  expressSession({
    secret: "node_mongo123!@#",
    resave: true,
    saveUninitialized: true,
  })
);
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", function (req, res) {
  let msg = "";
  if (req.session.msg != undefined && req.session.msg != "") {
    msg = req.session.msg;
  }
  res.render("home", { msg: msg });
});
app.get("/listcategory", async function (req, res) {
  try {
    const category = db.collection("category");
    const catList = await category.find().toArray();
    console.log("Category List:", catList); // Log the category list for debugging
    res.render("category_list_view", { catList: catList });
  } catch (err) {
    console.log(err);
  }
});

app.get("/addcategory", function (req, res) {
  res.render("add_category_view");
});

app.post("/addCategorySubmit", async function (req, res) {
  const category = db.collection("category");
  const result = await category.insertOne({
    catname: req.body.cname,
    cDescription: req.body.cDescription,
    cStatus: req.body.cStatus,
  });

  // console.log("Inserted Category:", result.ops[0]); // Log the inserted category

  if (result.acknowledged === true) {
    req.session.msg = "Category Added";
    res.redirect("/");
  } else {
    req.session.msg = "Cannot add category";
    res.redirect("/");
  }
});

app.get("/delcategory", async function (req, res) {
  let catid = req.query["catid"];
  const category = db.collection("category");

  const result = await category.deleteOne({ _id: new ObjectId(catid) });

  if (result.deletedCount == 1) {
    req.session.msg = "Category Deleted";
  } else {
    req.session.msg = "Can not delete category";
  }
  res.redirect("/");
});

app.get("/editcategory", async function (req, res) {
  const category = db.collection("category");
  const result = await category.findOne({
    _id: new ObjectId(req.query["catid"]),
  });

  res.render("editcategory_view", { catdata: result });
});

app.post("/editCategorySubmit", async function (req, res) {
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
    req.session.msg = "Category updated";
  } else {
    req.session.msg = "Cannot update category";
  }
  res.redirect("/");
});

app.get("/additem", function (req, res) {
  res.render("additem_view");
});
app.post("/addItemSubmit", upload.single("pImage"), async function (req, res) {
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
    req.session.msg = "Product Added";
  } else {
    req.session.msg = "Cannot add product";
  }
  res.redirect("/");
});

app.get("/listitem", async function (req, res) {
  const itemObj = db.collection("item");
  const result = await itemObj.find().toArray();
  res.render("itemlist_view", { itemData: result });
});

app.get("/deleteItem", async function (req, res) {
  let itemid = req.query["itemid"];
  const itemObj = db.collection("item");

  const result = await itemObj.deleteOne({ _id: new ObjectId(itemid) });

  if (result.deletedCount == 1) {
    req.session.msg = "Item Deleted";
  } else {
    req.session.msg = "Can not delete item";
  }
  res.redirect("/");
});

app.get("/editItem", async function (req, res) {
  const itemObj = db.collection("item");
  const result = await itemObj.findOne({
    _id: new ObjectId(req.query["itemid"]),
  });

  res.render("editItem_view", { itemData: result });
});

app.post("/editItemSubmit", upload.single("pImage"), async function (req, res) {
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

  // Only update image if a new one is uploaded
  if (req.file) {
    updateData.pImage = "/uploads/" + req.file.filename;
  }

  const result = await itemObj.updateOne(
    { _id: new ObjectId(req.body.itemid) },
    { $set: updateData }
  );

  if (result.modifiedCount === 1) {
    req.session.msg = "Product updated";
  } else {
    req.session.msg = "Cannot update product";
  }
  res.redirect("/");
});

app.get("/addOrder", function (req, res) {
  res.render("add_order_view");
});

app.get("/listOrders", async function (req, res) {
  try {
    const ordersCollection = db.collection("orders");
    const ordersList = await ordersCollection.find().toArray(); // Fetch orders
    console.log("Orders List:", ordersList); // Log orders to verify
    res.render("orders_list_view", { ordersList: ordersList }); // Pass orders to the template
  } catch (err) {
    console.log(err);
    res.send("Error fetching orders");
  }
});

app.post("/addOrderSubmit", async function (req, res) {
  const ordersCollection = db.collection("orders");
  const result = await ordersCollection.insertOne({
    allProducts: req.body.allProducts,
    user: req.body.user,
    amount: req.body.amount,
    transactionId: req.body.transactionId,
    address: req.body.address,
    phoneNumber: req.body.phoneNumber,
    status: req.body.status,
  });

  if (result.acknowledged === true) {
    req.session.msg = "Order Added";
    res.redirect("/");
  } else {
    req.session.msg = "Cannot add order";
    res.redirect("/");
  }
});

app.get("/editOrder", async function (req, res) {
  try {
    const orderId = req.query["orderid"]; // Get order ID from the query parameters
    const ordersCollection = db.collection("orders");
    const orderData = await ordersCollection.findOne({
      _id: new ObjectId(orderId),
    }); // Fetch the order data

    if (orderData) {
      res.render("edit_order_view", { orderData: orderData }); // Pass order data to the template
    } else {
      req.session.msg = "Order not found";
      res.redirect("/listOrders");
    }
  } catch (err) {
    console.log(err);
    res.send("Error fetching order data");
  }
});

app.post("/editOrderSubmit", async function (req, res) {
  try {
    const orderId = req.body.orderId; // Get order ID from the hidden input
    const ordersCollection = db.collection("orders");

    const updatedOrder = {
      allProducts: req.body.allProducts,
      user: req.body.user,
      amount: parseFloat(req.body.amount),
      transactionId: req.body.transactionId,
      address: req.body.address,
      phoneNumber: req.body.phoneNumber,
      status: req.body.status,
    };

    const result = await ordersCollection.updateOne(
      { _id: new ObjectId(orderId) },
      { $set: updatedOrder }
    );

    if (result.modifiedCount === 1) {
      req.session.msg = "Order updated successfully";
    } else {
      req.session.msg = "No changes made to the order";
    }
    res.redirect("/listOrders");
  } catch (err) {
    console.log(err);
    res.send("Error updating order");
  }
});

app.get("/deleteOrder", async function (req, res) {
  const ordersCollection = db.collection("orders");
  const result = await ordersCollection.deleteOne({
    _id: new ObjectId(req.query["orderid"]),
  });

  if (result.deletedCount === 1) {
    req.session.msg = "Order Deleted";
  } else {
    req.session.msg = "Cannot delete order";
  }
  res.redirect("/");
});
app.get("/addUser", function (req, res) {
  res.render("add_user_view");
});

app.post("/addUserSubmit", async function (req, res) {
  const usersCollection = db.collection("users");
  const result = await usersCollection.insertOne({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    userRole: req.body.userRole,
    phoneNumber: req.body.phoneNumber,
    userImage: req.body.userImage, // URL or path to the user image
    verified: req.body.verified === "on", // Assume checkbox returns 'on'
    secretKey: req.body.secretKey,
    history: req.body.history.split(","), // Assuming history is a comma-separated string
  });

  if (result.acknowledged === true) {
    req.session.msg = "User Added";
    res.redirect("/");
  } else {
    req.session.msg = "Cannot add user";
    res.redirect("/");
  }
});
app.get("/listUsers", async function (req, res) {
  try {
    const usersCollection = db.collection("users");
    const usersList = await usersCollection.find().toArray();
    res.render("users_list_view", { usersList: usersList });
  } catch (err) {
    console.log(err);
    res.send("Error fetching users");
  }
});
app.get("/editUser", async function (req, res) {
  try {
    const userId = req.query["userid"];
    const usersCollection = db.collection("users");
    const userData = await usersCollection.findOne({
      _id: new ObjectId(userId),
    });

    if (userData) {
      res.render("edit_user_view", { userData: userData });
    } else {
      req.session.msg = "User not found";
      res.redirect("/listUsers");
    }
  } catch (err) {
    console.log(err);
    res.send("Error fetching user data");
  }
});
app.post("/editUserSubmit", async function (req, res) {
  try {
    const userId = req.body.userId;
    const usersCollection = db.collection("users");

    const updatedUser = {
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      userRole: req.body.userRole,
      phoneNumber: req.body.phoneNumber,
      userImage: req.body.userImage,
      verified: req.body.verified === "on",
      secretKey: req.body.secretKey,
      history: req.body.history.split(","),
    };

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: updatedUser }
    );

    if (result.modifiedCount === 1) {
      req.session.msg = "User updated successfully";
    } else {
      req.session.msg = "No changes made to the user";
    }
    res.redirect("/listUsers");
  } catch (err) {
    console.log(err);
    res.send("Error updating user");
  }
});
app.get("/deleteUser", async function (req, res) {
  try {
    const userId = req.query["userid"];
    const usersCollection = db.collection("users");
    const result = await usersCollection.deleteOne({
      _id: new ObjectId(userId),
    });

    if (result.deletedCount === 1) {
      req.session.msg = "User deleted successfully";
    } else {
      req.session.msg = "User not found";
    }
    res.redirect("/listUsers");
  } catch (err) {
    console.log(err);
    res.send("Error deleting user");
  }
});

app.listen(8000, () => console.log("Server running at http://localhost:8000/"));
