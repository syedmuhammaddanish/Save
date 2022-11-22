//Load express module with `require` directive
const express = require('express');
const fileUpload = require('express-fileupload');
const { Web3Storage, getFilesFromPath  } = require('web3.storage');
const fetch = require('node-fetch')
const fsExtra = require('fs-extra');
const { writeFile } = require("fs/promises");
const app = express();
var fs = require('fs');
const util = require('util')
app.use(
  fileUpload({
    extended: true,
  })
);
app.use(express.json());
const path = require("path");

const st = 'T00:00:00Z';
const et = 'T23:59:59Z';
const org = 'Simulations'
const starttime = new Date(st);
const endtime = new Date(et);
const {InfluxDB, consoleLogger} = require('@influxdata/influxdb-client')
const {BucketsAPI} = require('@influxdata/influxdb-client-apis')
const ethers = require('ethers')
//Define port
var port = 3002
//Define request response in root URL (/)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/index.html", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/fincom.html", (req, res) => {
  res.sendFile(path.join(__dirname, "fincom.html"));
});

app.get("/generateaddresses.html", (req, res) => {
  res.sendFile(path.join(__dirname, "generateaddresses.html"));
});

app.get("/updateaddresses.html", (req, res) => {
  res.sendFile(path.join(__dirname, "updateaddresses.html"));
});

app.post("/uploadData", async (req, res) => {
var date = req.body.datefolder;
console.log(date)
// Setup date format for influxDB query
let starttime = date.concat(st);
let endtime = date.concat(et);
const influxToken = 'KrUZPCqJcuNmvbQtfL8TL_ZULcFT0mjGHOLQ4v1ZLNjXaKtq3Pgbke7wpUVjU-j_RnLtOLP_teU1NAG_OUTDnA=='
const org = 'Simulations'
const client = new InfluxDB({url: "http://127.0.0.1:8086", token: influxToken})


//Connect to Mongo Database
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var uri = "mongodb://admin:tesim_mongo@127.0.0.1/";
const clientMongo = new MongoClient(uri);
await clientMongo.connect();
    // Get the database
const db = clientMongo.db("simulations");


async function getTopology () {
  return new Promise(function(resolve, reject) {
     db.collection("addresses").find({"_id": new ObjectID("6369f8ac6b1aa00f8cfb179a")}).toArray( function(err, docs) {
      if (err) {
        // Reject the Promise with an error
        return reject(err)
      }

      // Resolve (or fulfill) the promise with data
      return resolve(docs)
    })
  })
}

async function getMongoData(mongotopology) {
  //console.log(result)
  //Get all keys (sector names e.g. N671) in an array
  var keys = [];
  for (var k in mongotopology[0].IEEE13) keys.push(k);
  // Phase array, get the phases for each sector (N671)

  let arrrr = []
  
  for (let i = 0; i < keys.length; i++) {
    arrrr.push([mongotopology[0].IEEE13[keys[i]]['node'], mongotopology[0].IEEE13[keys[i]]['phase'], mongotopology[0].IEEE13[keys[i]]['users_in_the_node']])
  }

  console.log(arrrr[0][2].length)


  // Making queries for each house and store data in blockchain
  for (var i = 0; i < arrrr.length; i++) {
    for (var j = 0; j < arrrr[i][2].length; j++){
      console.log('Data is being retrieved for ', 'node: ', JSON.stringify(arrrr[i][0]), 'phase: ', JSON.stringify(arrrr[i][1]), 'house: ', JSON.stringify((j+2).toString()), 'address: ', arrrr[i][2][j])
      await queryExample(`\
      from(bucket:"simulation_ieee_13")\
      |> range(start: ${starttime}, stop: ${endtime})\
      |> filter(fn: (r) => r["_measurement"] == "Total_Consumption_Real" or r["_measurement"] == "Total_Consumption_Initial" or r["_measurement"] == "Total_Consumption_Iterations0")\
      |> filter(fn: (r) => r["_field"] == "total_consumption")\
      |> filter(fn: (r) => r["node"] == ${JSON.stringify(arrrr[i][0])})\
      |> filter(fn: (r) => r["phase"] == ${JSON.stringify(arrrr[i][1])})\
      |> filter(fn: (r) => r["user"] == ${JSON.stringify((j+2).toString())})\
      `, arrrr[i][2][j])
      
    }
    
  }

  let hash = await uploaddatatoIPFS();

  await deleteFiles();

  await storeDataInBlockchain(date, hash)

  
}

const topologyResult = await getTopology()

// Gets topology Info

await getMongoData(topologyResult);

res.send("Data uploaded to blockchain")



async function queryExample(fluxQuery, address) {
  var arr = [];
  console.log('\n*** QUERY ***')

  // Getting data from influxDB
  const queryApi = client.getQueryApi(org)

  
  try {
    
    //var startTime = new Date();
    
      const data = await queryApi.collectRows(
      fluxQuery 
     )
     //console.log(data)
     data.forEach((i) => arr.push(JSON.stringify(i._value)))

     var arrays = [], size = 144;
    
    for (let i = 0; i < arr.length; i += size) {
      arrays.push(arr.slice(i, i + size));
    }
    //Putting data in respective variables
    var Total_Consumption_Real = arrays[0].map(function(each_element){
      return Number(each_element).toFixed(3);
    });
  
    var Total_Consumption_Initial = arrays[1].map(function(each_element){
      return Number(each_element).toFixed(3);
    });

    var Total_Consumption_Final = arrays[2].map(function(each_element){
      return Number(each_element).toFixed(3);
    })
    ;
    //console.log(Total_Consumption_Real)
    //console.log(Total_Consumption_Initial)
    //console.log(Total_Consumption_Final)
    //Creating JSON template for decentralized storage
    var dict = {"initial" : Total_Consumption_Initial,
                "final" : Total_Consumption_Final,
                "real" : Total_Consumption_Real,
                "initialprice" : 20,
                "finalprice" : 30};
    var dictstring = JSON.stringify(dict);
    await writeFile(__dirname + `/../Save-main/filefolder/${address}.json`, dictstring, (err) => {});
    
  } catch (e) {
    console.error(e)
    console.log('\nCollect ROWS ERROR')
  }
  
  
}

async function deleteFiles() {
  fsExtra.emptyDirSync(__dirname + '/../Save-main/filefolder/');
}


async function uploaddatatoIPFS() {
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweGYwNTMwNUY1NUJiRjM4MjhjNjE2Q0RhYTk0ZDZGN2YzMDVjQTRjYzUiLCJpc3MiOiJ3ZWIzLXN0b3JhZ2UiLCJpYXQiOjE2NTIxMjY3NTM2MTIsIm5hbWUiOiJTdG9yYWdlU29sIn0.XH1EzxD93lUrJVVnO1uzpzDsmh4XG1PEsdgJdBpVvlk";
  const storage = new Web3Storage({ token: token });
  const files = await getFilesFromPath(__dirname + '/../Save-main/filefolder/');
  console.log(`read ${files.length} file(s) from path`)
  const cid = await storage.put(files)
  console.log(`IPFS CID: ${cid}`)
  return(cid)
  
}

async function storeDataInBlockchain(date, hash) {
  const { ethers } = require("hardhat");
  //Environment variables
  const API_URL = process.env.API_URL;
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const CONTRACT_ADDRESS_1 = process.env.CONTRACT_ADDRESS_STO;
  // Contract ABI
  const { abi } = require("./artifacts/contracts/ConsumptionStorage.sol/ConsumptionStorage.json");
  const provider = new ethers.providers.JsonRpcProvider(API_URL);
  // It calculates the blockchain address from private key
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  //console.log(signer)
  const StorageContract = new ethers.Contract(CONTRACT_ADDRESS_1, abi, signer);
  let _hash = hash.toString();
  let _date = date;

  //Checking if data is already available for certain date and address
  const newMessage = await StorageContract.GetPlannedData(_date);
  if (newMessage == "") {
    console.log("Updating the Energy Data...");
    const tx = await StorageContract.SetPlannedData(_hash, _date);
    await tx.wait();
  }
  else {
    console.log("Data is already stored for this date")
  }
  // Shows the stored hash
  const newMessage1 = await StorageContract.GetPlannedData(_date);
  console.log("The stored hash is: " + newMessage1);
}

//|> range(start: 2018-12-10T00:00:00Z, stop: 2018-12-10T23:59:59Z)\
//Defining Query
//|> filter(fn: (r) => r["_measurement"] == "Total_Consumption_Real" or r["_measurement"] == "Total_Consumption_Initial" or r["_measurement"] == "Total_Consumption_Final")

});


app.post("/financialcalculation", async (req, res) => {
  var date = req.body.datefolder;
  const chain_id = 73799
  //Connect to Mongo Database
  var MongoClient = require('mongodb').MongoClient;
  var ObjectID = require('mongodb').ObjectID;
  var uri = "mongodb://admin:tesim_mongo@127.0.0.1/";
  const clientMongo = new MongoClient(uri);
  await clientMongo.connect();
      // Get the database
  const db = clientMongo.db("simulations");

  
  async function getTopology () {
    return new Promise(function(resolve, reject) {
       db.collection("addresses").find({"_id": new ObjectID("6369f8ac6b1aa00f8cfb179a")}).toArray( function(err, docs) {
        if (err) {
          // Reject the Promise with an error
          return reject(err)
        }
  
        // Resolve (or fulfill) the promise with data
        return resolve(docs)
      })
    })
  }
  
  async function Calculation(topology, dateupload) {
    var keys = [];
    for (var k in topology[0].IEEE13) keys.push(k);
    let initialprice = 0
    let finalprice = 0
    var houses = []
    console.log(keys.length)
    for (let i = 0; i < keys.length; i++) {
      houses.push(topology[0].IEEE13[keys[i]]['users_in_the_node'])   
    }
    houses = houses.flat()
    
    const { ethers } = require("hardhat");
    const API_URL = process.env.API_URL;
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    const CONTRACT_ADDRESS_1 = process.env.CONTRACT_ADDRESS_STO;
    const CONTRACT_ADDRESS_2 = process.env.CONTRACT_ADDRESS_FIN;
    let nonce = await provider.getTransactionCount(signer.address)
    //Fetching the data from blockchain using Storage Contract address and abi
    const contract1 = require("./artifacts/contracts/ConsumptionStorage.sol/ConsumptionStorage.json");  
    const provider = new ethers.providers.JsonRpcProvider(API_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const PlannedStorageContract = new ethers.Contract(CONTRACT_ADDRESS_1, contract1.abi, signer);
    const newMessage = await PlannedStorageContract.GetPlannedData(dateupload);
    if (newMessage != "") {
      console.log("Retreiving the planned consumption data hash");
      var newMessage1 = newMessage;
      console.log(newMessage)

      for (var i=0; i < houses.length; i++) {
        let response1 = await fetch(`https://${newMessage1}.ipfs.w3s.link/filefolder/${houses[i]}.json`)
        obj1 = await response1.json();
        initial_consumption = obj1.initial
        final_consumption = obj1.final;
        real_consumption = obj1.real;
        initialprice = obj1.initialprice;
        finalprice = obj1.finalprice;
      
    
        var initscfloat = initial_consumption.map(x => x * 1000);
        var finalscfloat = final_consumption.map(x => x * 1000);
        var realscfloat = real_consumption.map(x => x * 1000);
      
        var initsc = initscfloat.map(function(each_element){
            return Number(each_element).toFixed(0);
        });
  
        var finalsc = finalscfloat.map(function(each_element){
            return Number(each_element).toFixed(0);
        });
  
        var realsc = realscfloat.map(function(each_element){
           return Number(each_element).toFixed(0);
        });
        }

        tx(initsc, finalsc, realsc, initialprice, finalprice, nonce, houses[i])
      }


      else {
        console.log("Data is not available for this date")
        newMessage1 = '';
    }

    

  }

  async function tx(initsc, finalsc, realsc, initialprice, finalprice, nonce, house) {
    const { ethers } = require("hardhat");
    const API_URL = process.env.API_URL;
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    const CONTRACT_ADDRESS_2 = process.env.CONTRACT_ADDRESS_FIN;  
    const provider = new ethers.providers.JsonRpcProvider(API_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract2 = require("./artifacts/contracts/FinancialCom.sol/FinancialCom.json");
    const FinancialCom = new ethers.Contract(CONTRACT_ADDRESS_2, contract2.abi, signer);
    const newMessage3 = await FinancialCom.TotalPrice(date, house);
    if (newMessage3 == 0) {
      console.log("Calculating the financial compensation");
      const estimatedGasLimit1 = await FinancialCom.estimateGas.FinancialCalculation(initsc, finalsc, realsc, initialprice, finalprice, date, house); // approves 1 USDT
      const approveTxUnsigned1 = await FinancialCom.populateTransaction.FinancialCalculation(initsc, finalsc, realsc, initialprice, finalprice, date, house);
      approveTxUnsigned1.chainId = chain_id; // chainId 1 for Ethereum mainnet
      approveTxUnsigned1.gasLimit = estimatedGasLimit1;
      approveTxUnsigned1.gasPrice = await provider.getGasPrice();
      approveTxUnsigned1.nonce = nonce;
    
      const approveTxSigned1 = await signer.signTransaction(approveTxUnsigned1);
      const submittedTx1 = await provider.sendTransaction(approveTxSigned1);
      const approveReceipt1 = await submittedTx1.wait();
      if (approveReceipt1.status === 0)
        throw new Error("Approve transaction failed");
      else {
        console.log(`Transaction Approved with transaction hash: ${submittedTx1.hash}`)
      }
    }
    else {
      console.log("The financial compensation is already calculated for this date and user");
    }
  }
 
  async function financialCalculation(result, dateupload) {
    //customerDID = '0x9e823dDAd833195d30944eDA6CE14F41396cae48'
    //console.log(result)
    //Get all keys (sector names e.g. N671) in an array
    var keys = [];
    for (var k in result[0].IEEE13) keys.push(k);
    // Phase array, get the phases for each sector (N671)
    var p = []
    var phase = []
    for (let i = 0; i < keys.length; i++) {
      for (let j = 0; j < result[0].IEEE13[keys[i]].length; j++) {
        p.push(Object.keys(result[0].IEEE13[keys[i]][j]).toString())
      }
      phase.push(p);
      p = []
    }
    // Get houses in each phase
    var houses = []
    for (let i = 0; i < keys.length; i++) {
      for (let j = 0; j < phase[i].length; j++) {
        //console.log(result[0].IEEE13[keys[i]][j][phase[i][j]][0])
        houses.push(result[0].IEEE13[keys[i]][j][phase[i][j]]);
      }
    }
    var housesnew = [].concat.apply([], houses);

    //console.log(housesnew)
    const { ethers } = require("hardhat");
    const API_URL = process.env.API_URL;
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    const CONTRACT_ADDRESS_1 = process.env.CONTRACT_ADDRESS_STO;
    const CONTRACT_ADDRESS_2 = process.env.CONTRACT_ADDRESS_FIN;
    
    //Fetching the data from blockchain using Storage Contract address and abi
    const contract1 = require("./artifacts/contracts/ConsumptionStorage.sol/ConsumptionStorage.json");  
    const provider = new ethers.providers.JsonRpcProvider(API_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const PlannedStorageContract = new ethers.Contract(CONTRACT_ADDRESS_1, contract1.abi, signer);
    var fintime = []


    for (var i=0; i < housesnew.length; i++) {
      var startTime = new Date();
      const newMessage = await PlannedStorageContract.GetPlannedData(dateupload, housesnew[i]);
      if (newMessage != "") {
        console.log("Retreiving the planned consumption data for: ", housesnew[i]);
        var newMessage1 = newMessage;
        console.log(newMessage)
      }
      else {
        console.log("Data is not available for this date or customer ID")
        newMessage1 = '';
      }
      //console.log(newMessage1);
      //Fetching the data from decentralized storage using hash
      let response1 = await fetch(`https://${newMessage1}.ipfs.w3s.link/data.json`)
      obj1 = await response1.json();
    
      //storing data in variables
      initial_consumption = obj1.initial
      final_consumption = obj1.final;
      real_consumption = obj1.real;
      let initialprice = obj1.initialprice;
      let finalprice = obj1.finalprice;
      
      //Converting data to integers
  
      //console.log(initial_consumption)
      //console.log(final_consumption)
      //console.log(real_consumption)
    
      var initscfloat = initial_consumption.map(x => x * 100);
      var finalscfloat = final_consumption.map(x => x * 100);
      var realscfloat = real_consumption.map(x => x * 100);
      
      var initsc = initscfloat.map(function(each_element){
        return Number(each_element).toFixed(0);
      });
  
      var finalsc = finalscfloat.map(function(each_element){
        return Number(each_element).toFixed(0);
      });
  
      var realsc = realscfloat.map(function(each_element){
        return Number(each_element).toFixed(0);
      });
  
      console.log("Initial Consumption: ", initsc)
      console.log("Initial Consumption: ", finalsc)
      //console.log(realsc)
      const contract2 = require("./artifacts/contracts/FinancialCom.sol/FinancialCom.json");
      const FinancialCom = new ethers.Contract(CONTRACT_ADDRESS_2, contract2.abi, signer);
      const newMessage3 = await FinancialCom.TotalPrice(dateupload, housesnew[i]);
      if (newMessage3 == 0) {
        console.log("Calculating the financial compensation");
        const tx = await FinancialCom.FinancialCalculation(initsc, finalsc, realsc, initialprice, finalprice, dateupload, housesnew[i]);
        await tx.wait();
      }
      else {
        console.log("The financial compensation is already calculated for this date and user");
      }
    
      const newMessage4 = await FinancialCom.TotalPrice(dateupload, housesnew[i]);
      console.log("The calculated financial compensation is: " + (newMessage4/100000));

      var endTime = new Date() - startTime;
      fintime.push(endTime)
      console.log(fintime)
    }
    
    return(fintime)
  
  }
 
  
  
 

  const topologyResult = await getTopology()
  
  //const average = array => array.reduce((a, b) => a + b) / array.length;
  const finArr = await Calculation(topologyResult, req.body.datefolder);

 //console.log("Average time to retrieve data and financial calculation is:", average(finArr)/1000, "seconds")

  res.send("Financial Calculations Completed")
  
  //|> range(start: 2018-12-10T00:00:00Z, stop: 2018-12-10T23:59:59Z)\
  //Defining Query
  //|> filter(fn: (r) => r["_measurement"] == "Total_Consumption_Real" or r["_measurement"] == "Total_Consumption_Initial" or r["_measurement"] == "Total_Consumption_Final")
  
  });


app.post("/generateaddresses", async (req, res) => {
//Connect to Mongo Database
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var uri = "mongodb://admin:tesim_mongo@127.0.0.1/";

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    // Get the database
    const db = client.db("simulations");

     // Get Collection Names

    const collections = await db.listCollections().toArray()
    collectionNames = []
    collections.forEach((col) => {
      collectionNames.push(col.name);
    });
    //console.log(collectionNames);

    // Get the collection (topology of simulation with object ID)
    //var cursor1 = db.collection("topology_ieee_13").find({"_id": new ObjectID("6369f8ac6b1aa00f8cfb179a")});
    
    //console.log(cursor1)


    async function getTopology () {
      return new Promise(function(resolve, reject) {
        db.collection("topology_ieee_13").find({"_id": new ObjectID("6369f8ac6b1aa00f8cfb179a")}).toArray( function(err, docs) {
          if (err) {
            // Reject the Promise with an error
            return reject(err)
          }
    
          // Resolve (or fulfill) the promise with data
          return resolve(docs)
        })
      })
    }
    async function generateAddresses(result) {
      var keys = [];
      for (var k in result[0].IEEE13) keys.push(k);
      var addresses = [];
      var privatekeys = [];
  
      
      for (let i = 0; i < keys.length; i++) {
        for (let j = 0; j < result[0].IEEE13[keys[i]]['users_in_the_node']; j++) {
          const wallet = ethers.Wallet.createRandom()
          addresses.push(wallet.address)
          privatekeys.push(wallet.privateKey)
        }
        result[0].IEEE13[keys[i]]['users_in_the_node'] = addresses
        addresses = []
      }
      
      if (collectionNames.includes('addresses'))
      {
        db.collection('addresses').drop(function(err, delOK) {
          if (err) throw err;
          if (delOK) console.log("Collection deleted");
        });
      }
  
      console.log("Creating Collections Addresses")
      db.collection('addresses').insert(result, function(error, record){
        if (error) throw error;
        console.log("Data Saved");
       });

    }


    var startTime = new Date();
    const topologyResult = await getTopology();
    await generateAddresses(topologyResult);
    //console.log(topologyResult)
    // It generated addresses based on topology defined in MongoDB topology
    
    
    var endTime = new Date() - startTime;

    console.log("Total time to generate addresses is: " , endTime/1000, "seconds")

    res.send("Addresses generated")
  
  } finally {

  }
}
run().catch(console.dir);



});


// To update the address from topology



app.post("/updateaddresses", async (req, res) => {
  //Connect to Mongo Database
  //Connect to Mongo Database
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var uri = "mongodb://admin:tesim_mongo@127.0.0.1/";
const clientMongo = new MongoClient(uri);
await clientMongo.connect();
    // Get the database
const db = clientMongo.db("simulations");
const collections = await db.listCollections().toArray()
    collectionNames = []
    collections.forEach((col) => {
      collectionNames.push(col.name);
});

  async function getAddresses () {
    return new Promise(function(resolve, reject) {
      db.collection("addresses").find({"_id": new ObjectID("6369f8ac6b1aa00f8cfb179a")}).toArray( function(err, docs) {
        if (err) {
          // Reject the Promise with an error
          return reject(err)
        }

        // Resolve (or fulfill) the promise with data
        return resolve(docs)
      })
    })
  }

  async function getTopology () {
    return new Promise(function(resolve, reject) {
      db.collection("topology").find({"_id": new ObjectID("6369f8ac6b1aa00f8cfb179a")}).toArray( function(err, docs) {
        if (err) {
          // Reject the Promise with an error
          return reject(err)
        }
  
        // Resolve (or fulfill) the promise with data
        return resolve(docs)
      })
    })
  }

  async function testing(oldtopology, newtopology) {
    var oldkeys = [];
    for (var k in oldtopology[0].IEEE13) oldkeys.push(k);

    var newkeys = [];
    for (var k in newtopology[0].IEEE13) newkeys.push(k);

    // Check for new sectors, i.e., N761 
    let unique1 = oldkeys.filter((o) => newkeys.indexOf(o) === -1);
    let unique2 = newkeys.filter((o) => oldkeys.indexOf(o) === -1);

    const unique = unique1.concat(unique2);

    for (let i = 0; i < oldkeys.length; i++) {
      var hsold = oldtopology[0].IEEE13[oldkeys[i]]['users_in_the_node'].length
      var hsnew = newtopology[0].IEEE13[oldkeys[i]]['users_in_the_node']
      if(hsnew != hsold) {
        for (let j = 0; j < (hsnew - hsold); j++) {
          const wallet = ethers.Wallet.createRandom()
          oldtopology[0].IEEE13[oldkeys[i]]['users_in_the_node'].push(wallet.address)
        }
      newtopology[0].IEEE13[oldkeys[i]]['users_in_the_node'] = oldtopology[0].IEEE13[oldkeys[i]]['users_in_the_node']

      }
      
      newtopology[0].IEEE13[oldkeys[i]]['users_in_the_node'] = oldtopology[0].IEEE13[oldkeys[i]]['users_in_the_node']
      
    }

    if(unique.length>0) {
      //Generate blockchain addresses for each house
      var addresses = [];
      var privatekeys = [];
  
      for (let i = 0; i < unique.length; i++) {
        for (let j = 0; j < newtopology[0].IEEE13[unique[i]]['users_in_the_node']; j++) {
          const wallet = ethers.Wallet.createRandom()
          addresses.push(wallet.address)
          privatekeys.push(wallet.privateKey)
        }
        newtopology[0].IEEE13[unique[i]]['users_in_the_node'] = addresses
        addresses = []
      }
      // assign blockchain address to each home
     

      for (let i = 0; i < oldkeys.length; i++) {
        newtopology[0].IEEE13[oldkeys[i]]['users_in_the_node'] = oldtopology[0].IEEE13[oldkeys[i]]['users_in_the_node']
        
      }

      
    }
    console.log(util.inspect(newtopology, false, null, true /* enable colors */))
    
    
  }

  var oldtopology = await getAddresses()
  
  var newtopology = await getTopology()

  await testing(oldtopology, newtopology)

  res.send("Function completed")
  

  });

    

//Launch listening server on port 3000
app.listen(port, function () {
  console.log('app listening on port 3002!')
})
