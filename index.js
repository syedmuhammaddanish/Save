//Load express module with `require` directive
const express = require('express');
const fileUpload = require('express-fileupload');
const app = express();
app.use(
  fileUpload({
    extended: true,
  })
);
app.use(express.json());
const path = require("path");

const st = 'T00:00:00Z';
const et = 'T23:59:59Z';

const starttime = new Date(st);
const endtime = new Date(et);
const {InfluxDB, consoleLogger} = require('@influxdata/influxdb-client')
const {BucketsAPI} = require('@influxdata/influxdb-client-apis')
const ethers = require('ethers')
//Define port
var port = 3000
const org = 'LTE'
//Define request response in root URL (/)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/index.html", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/uploadplan", async (req, res) => {
var date = req.body.datefolder;

let starttime = date.concat(st);
let endtime = date.concat(et);
console.log(starttime)
console.log(endtime)
const token = '0YMSnHfOJdeoKjnQ8CzGVmj_bpP4nFawLGbK8wEqZIfh2Woje5XQHY4qZj9027Jj3efbvH81MHFW78Esz_ImiQ=='
const org = 'LTE'
const client = new InfluxDB({url: 'http://192.168.1.102:8086', token: token})
async function getBuckets() {  
  
// You can generate a Token from the "Tokens Tab" in the UI

  //const bucket = 'N611PH3U1'
  

  console.log('*** Get buckets by name ***')
  const bucketsAPI = new BucketsAPI(client)
  const buckets = await bucketsAPI.getBuckets({orgID: 'aedcb81ffe14d892', limit: 100})
  
  for (var i = 0; i < buckets.buckets.length; i++) {
    //console.log(buckets.buckets[i].name)
    
  }
  //console.log(buckets.buckets.length)
  }

async function queryExample(fluxQuery) {
  var arr = [];
  console.log('\n*** QUERY ***')

  // Getting data from influxDB
  const queryApi = client.getQueryApi(org)
  try {
      const data = await queryApi.collectRows(
      fluxQuery 
     )
     data.forEach((i) => arr.push(JSON.stringify(i._value)))
     console.log('\nData Length: ' + arr.length)
    } catch (e) {
     console.error(e)
     console.log('\nCollect ROWS ERROR')
    }
}
getBuckets()
//|> range(start: 2018-12-10T00:00:00Z, stop: 2018-12-10T23:59:59Z)\
//Defining Query
queryExample(`\
from(bucket:"IEEE13")\
|> range(start: ${starttime} , stop: ${endtime})\
|> filter(fn: (r) => r["_measurement"] == "Total_Consumption_Final")\
|> filter(fn: (r) => r["_field"] == "TotalConsumption")\
|> filter(fn: (r) => r["node"] == ${JSON.stringify(req.body.sector)})\
|> filter(fn: (r) => r["phase"] == ${JSON.stringify(req.body.phase)})\
|> filter(fn: (r) => r["user"] == ${JSON.stringify(req.body.house)})\
`)
});


app.post("/generateaddresses", async (req, res) => {
console.log(req.body)
//Connect to Mongo Database
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var uri = "mongodb://LTE:ET_2021!@192.168.1.102/";

const client = new MongoClient(uri);
async function run() {
  try {
    await client.connect();
    // Get the database
    const db = client.db("simulator");
    // Get the collection (topology of simulation with object ID)
    var cursor = db.collection("topology").find({"_id": new ObjectID("63234545b21dc241195119e1")});
    const allValues = await cursor.toArray(function(err, result) {
    if (err) throw err;
    //Get all keys (sector names e.g. N671) in an array
    var keys = [];
    for (var k in result[0].IEEE13) keys.push(k);
    var addr = result;
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
        houses.push(result[0].IEEE13[keys[i]][j][phase[i][j]]);
      }
    }
    //Sum all houses
    const initialValue = 0;
    const sumWithInitial = houses.reduce(
    (previousValue, currentValue) => previousValue + currentValue,
    initialValue
    );

    //Generate blockchain addresses for each house
    var addresses = [];
    var privatekeys = [];

    for (let i = 0; i < sumWithInitial; i++) {
      const wallet = ethers.Wallet.createRandom()
      addresses.push(wallet.address)
      privatekeys.push(wallet.privateKey)
    }
    // assign blockchain address to each home
    for (let i = 0; i < houses.length; i++) {
      var b = addresses.splice(0,houses[i]);
      p.push(b)
      
    }
    addresses = p;
    console.log(addresses);

    let index = 0
    // Add addresses in topology
    for (let i = 0; i < keys.length; i++) {
      for (let j = 0; j < phase[i].length; j++) {
        result[0].IEEE13[keys[i]][j][phase[i][j]] = addresses[index];
        index = index+1; 
      }
    }
    for (let i = 0; i < keys.length; i++) {
      console.log(result[0].IEEE13[keys[i]]) 
    }
    

  // Storing data in addresses collection
  db.collection('addresses').insert(result, function(error, record){
     if (error) throw error;
    console.log("data saved");
  });
  }); 
    res.send("All is well")

    
   
  } finally {

  }
}
run().catch(console.dir);
});

//Launch listening server on port 3000
app.listen(port, function () {
  console.log('app listening on port 3000!')
})