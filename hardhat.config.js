const { ProxyAgent, setGlobalDispatcher } = require("undici");
const proxyAgent = new ProxyAgent("http://127.0.0.1:7897");
setGlobalDispatcher(proxyAgent);
require("@nomicfoundation/hardhat-toolbox");
require("@chainlink/env-enc").config(); // 读取 .env 文件
require("dotenv").config();
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    sepolia: {
      url: process.env.BLOCKCHAIN_RPC_URL,  // 你的 Infura RPC
      accounts: [process.env.PRIVATE_KEY], // 你的私钥（确保是测试账户）
      // timeout: 60000, // 增加超时时间到 60 秒
      chainId: 11155111
    }
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY,  // 确保这里是正确的
    },
  },
}
