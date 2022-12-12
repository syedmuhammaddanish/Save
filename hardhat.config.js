/**
* @type import('hardhat/config').HardhatUserConfig
*/

require('dotenv').config();
require("@nomiclabs/hardhat-ethers");

const { API_URL, PRIVATE_KEY } = process.env;

module.exports = {
   solidity: "0.8.11",
   defaultNetwork: "volta",
   networks: {
      hardhat: {},
      volta: {
         url: API_URL,
         accounts: [`0x${PRIVATE_KEY}`],
         gas: 210000000,
         gasPrice: 800000000000,
      },
      matic: {
         allowUnlimitedContractSize: true,
        url: "https://rpc-mumbai.maticvigil.com",
        accounts: [`0x${PRIVATE_KEY}`],
        gas: 2100000,
         gasPrice: 8000000000
      },
      iotex: {
         url: `https://babel-api.testnet.iotex.io`,
         accounts: [`0x${PRIVATE_KEY}`]
      },
      avax: {
         url: 'https://api.avax-test.network/ext/bc/C/rpc',
         gasPrice: 225000000000,
         chainId: 43113,
         accounts: [`0x${PRIVATE_KEY}`]
      }
   },
}
