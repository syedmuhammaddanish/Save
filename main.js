

contractAddress_sto = "0xc1eF6fAF87Ec6ac336C9b289F06734D7e95BCa8A";
contractAbi_sto = [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_date",
          "type": "string"
        }
      ],
      "name": "GetPlannedData",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_hash",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "_date",
          "type": "string"
        }
      ],
      "name": "SetPlannedData",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];


contractAddress_fin = "0xB707bB1E47cD3b233bF3E7a4DDe56F23b01F6Ce4"
contractAbi_fin = [
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "date",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "customer",
        "type": "address"
      }
    ],
    "name": "CalculatedBalance",
    "outputs": [
      {
        "internalType": "int256",
        "name": "",
        "type": "int256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "int256[]",
        "name": "initialcon",
        "type": "int256[]"
      },
      {
        "internalType": "int256[]",
        "name": "finalcon",
        "type": "int256[]"
      },
      {
        "internalType": "int256[]",
        "name": "realcon",
        "type": "int256[]"
      },
      {
        "internalType": "int256",
        "name": "initialprice",
        "type": "int256"
      },
      {
        "internalType": "int256",
        "name": "finalprice",
        "type": "int256"
      },
      {
        "internalType": "string",
        "name": "date",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "customer",
        "type": "address"
      }
    ],
    "name": "FinancialCalculation",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "int256",
        "name": "value",
        "type": "int256"
      },
      {
        "internalType": "string",
        "name": "date",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "customer",
        "type": "address"
      }
    ],
    "name": "TotalPriceCheck",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "date",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "customer",
        "type": "address"
      }
    ],
    "name": "VerifiedBalance",
    "outputs": [
      {
        "internalType": "int256",
        "name": "",
        "type": "int256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "int256[]",
        "name": "value",
        "type": "int256[]"
      },
      {
        "internalType": "address[]",
        "name": "customer",
        "type": "address[]"
      },
      {
        "internalType": "string",
        "name": "date",
        "type": "string"
      }
    ],
    "name": "storeBill",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const main1 = async() => {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      console.log(provider)
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const account = await provider.send("eth_requestAccounts", [])
      address_new = await signer.getAddress();
      console.log(address_new)
      var element = document.getElementById("myPara1");
      element.innerHTML = "Metamask is connected " + account;
      var date = await document.getElementById("d");
      console.log(date.value)
      var p1 = document.getElementById("p1");
      var p2 = document.getElementById("p2");
      var p3 = document.getElementById("p3");
      var p4 = document.getElementById("p4");
      const StorageContract = new ethers.Contract(contractAddress_sto, contractAbi_sto, signer);
      const FinancialContract = new ethers.Contract(contractAddress_fin, contractAbi_fin, signer);
      var newMessage = await StorageContract.GetPlannedData(date.value);
      console.log(newMessage)
      if (newMessage != "") {
        p1.innerHTML = "IPFS hash is: " + newMessage;
        let response1 = await fetch(`https://${newMessage}.ipfs.w3s.link/filefolder/${address_new}.json`);
        obj1 = await response1.json();
        p2.innerHTML = "Fetching data from IPFS, please wait...";
        let initial_consumption = obj1.initial;
        let final_consumption = obj1.final;
        let real_consumption = obj1.real;
        let initialprice = obj1.initialprice;
        let finalprice = obj1.finalprice;

        p3.innerHTML = "Calculating the customer's balance, please wait...";
        
        let sum = 0;
        
        for(let i = 0; i < 144; i++){
          if (real_consumption[i] >= initial_consumption[i]) {
          sum += initialprice*final_consumption[i];
          }
        else if (real_consumption[i] <= final_consumption[i]) {
          sum += finalprice*final_consumption[i];
        }
        else {
          sum += ((((initialprice - finalprice)*1000)/(initial_consumption[i]-final_consumption[i])) * (real_consumption[i]-final_consumption[i])) + (finalprice*1000);
        }
      }

      p4.innerHTML = "The calculated sum is: " + sum;

      

      
      const newMessage2 = await FinancialContract.CalculatedBalance(date.value, address_new);
      p5.innerHTML = "The stored value in blockchain is: " + newMessage2;

      if (sum == newMessage2) {
        p6.innerHTML = "Verification Passed. The function has been calculated correctly"
      }

      }

      else {
        p1.innerHTML = "The data is not available for this date";
      }

}




const main2 = async() => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    console.log(provider)
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const account = await provider.send("eth_requestAccounts", [])
    address_new = await signer.getAddress();
    console.log(address_new)
    var element = document.getElementById("myPara2");
    element.innerHTML = "Metamask is connected " + account;
    var date = await document.getElementById("d2");
    console.log(date.value)
    var p1 = document.getElementById("p11");
    var p2 = document.getElementById("p12");
    var p3 = document.getElementById("p13");
    var p4 = document.getElementById("p14");
    var p5 = document.getElementById("p15");
    var p6 = document.getElementById("p16");
    const StorageContract = new ethers.Contract(contractAddress_sto, contractAbi_sto, signer);
    const FinancialContract = new ethers.Contract(contractAddress_fin, contractAbi_fin, signer);
    var newMessage = await StorageContract.GetPlannedData(date.value);
    console.log(newMessage)
    if (newMessage != "") {
      p1.innerHTML = "IPFS hash is: " + newMessage;
      let response1 = await fetch(`https://${newMessage}.ipfs.w3s.link/filefolder/${address_new}.json`);
      obj1 = await response1.json();
      p2.innerHTML = "Fetching data from IPFS, please wait...";
      let initial_consumption = obj1.initial;
      let final_consumption = obj1.final;
      let real_consumption = obj1.real;
      let initialprice = obj1.initialprice;
      let finalprice = obj1.finalprice;

      const newMessage2 = await FinancialContract.CalculatedBalance(date.value, address_new);
      if (newMessage2 != 0) {
        
        var newMessage3 = await FinancialContract.VerifiedBalance(date.value, address_new);
        if (newMessage3 == 0) {
          p3.innerHTML = "Calculating the customer's balance, please wait...";
          const tx = await FinancialContract.FinancialCalculation(initial_consumption, final_consumption, real_consumption, initialprice, finalprice, date.value, address_new);
          await tx.wait();
          var newMessage3 = await FinancialContract.VerifiedBalance(date.value, address_new);
          p4.innerHTML = "The calculated balance for verification is: " + newMessage3;

          p5.innerHTML = "The stored value in blockchain is: " + newMessage2;  
          if (newMessage3 == newMessage2) {
            p6.innerHTML = "On-Chain Verification Passed. The function has been calculated correctly"
          }
        }
        else {
          p3.innerHTML = "The online verification is already performed for this customer"
        }
      }
      else {
        p4.innerHTML = `The balance is not calculated for this user for the date ${date.value}`;
      }

      

    }

    else {
      p1.innerHTML = "The data is not available for this date";
    }

}
