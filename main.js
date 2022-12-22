
const main = async() => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    console.log(provider)
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const account = await provider.send("eth_requestAccounts", [])
    var element = document.getElementById("myPara1");
    element.innerHTML = "Metamask is connected " + account;
    var date = await document.getElementById("d");
    console.log(date.value)
    var p1 = document.getElementById("p1");

    contractAddress = "0x4Cb023bd244D74533B3DcF1dFb604a076DDb2f5F";
    contractAbi = [
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

      
      const StorageContract = new ethers.Contract(contractAddress, contractAbi, signer);
      var newMessage = await StorageContract.GetPlannedData(date.value);
      console.log(newMessage)
      if (newMessage != "") {
        p1.innerHTML = "IPFS hash is: " + newMessage;
      }
      else {
        p1.innerHTML = "The data is not available for this date";
      }

}
