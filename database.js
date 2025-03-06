let { MongoClient } = require('mongodb');

const url = "mongodb://localhost:27017"; 
const clientObj = new MongoClient(url); 

let db; 

try{
	db = clientObj.db("fse_project");
}
catch(err){
	console.log(err);
	throw err;
}

module.exports = db;

