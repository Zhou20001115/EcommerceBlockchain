// 加载环境变量（.env文件中的配置）
require("dotenv").config();

// 引入依赖库
const express = require("express");
const ethers = require("ethers");
const bodyParser = require("body-parser");
const cors = require("cors");

// 初始化Express应用
const app = express();

// 中间件配置
app.use(bodyParser.json());
app.use(cors());

// ------------------------ 区块链连接配置 ------------------------
const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contractABI = require("./EcommercePrivacy.json");
const contractAddress = process.env.CONTRACT_ADDRESS;
const contract = new ethers.Contract(contractAddress, contractABI, wallet);

// ------------------------ 安全验证中间件 ------------------------
const validateRequest = async (req, res, next) => {
  try {
    // 1. 基础参数校验
    const requiredParams = {
      "/addProduct": ["name", "price", "encryptedDetails", "iv", "encryptedKey", "signature", "publicAddress"],
      "/placeOrder": ["productId", "encryptedData", "iv", "encryptedKey", "signature", "publicAddress"]
    }[req.path];
    
    if (!requiredParams.every(param => req.body[param])) {
      return res.status(400).json({ error: "缺少必要参数" });
    }

    // 2. 签名验证
    const { signature, publicAddress, ...data } = req.body;
    const message = JSON.stringify(data);
    const signer = ethers.verifyMessage(message, signature);
    
    if (signer.toLowerCase() !== publicAddress.toLowerCase()) {
      return res.status(401).json({ error: "签名验证失败" });
    }

    // 3. 时效性验证（防止重放攻击）
    if (Date.now() - data.timestamp > process.env.REQUEST_TIMEOUT) {
      return res.status(408).json({ error: "请求超时" });
    }

    // 4. 解密会话密钥
    req.sessionKey = await wallet.decrypt(data.encryptedKey);
    
    next();
  } catch (error) {
    console.error("安全验证失败:", error);
    res.status(401).json({ error: "安全验证失败" });
  }
};

// ------------------------ 路由定义 ------------------------

// 路由1: 添加商品
app.post("/addProduct", validateRequest, async (req, res) => {
  try {
    const { name, price, encryptedDetails, iv } = req.body;

    // 调用智能合约
    const tx = await contract.addProduct(
      name,
      ethers.parseUnits(price.toString(), "ether"), // 转换价格单位
      encryptedDetails,
      iv
    );

    const receipt = await tx.wait(process.env.CONFIRMATIONS || 2);
    
    res.json({
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      productId: receipt.logs[0].args.productId.toString() // 根据实际合约事件调整
    });

  } catch (error) {
    handleBlockchainError(res, error, "添加商品失败");
  }
});

// 路由2: 下单购买
app.post("/placeOrder", validateRequest, async (req, res) => {
  try {
    const { productId, encryptedData, iv } = req.body;

    // 数据格式验证
    if (!isValidHex(iv) || !isValidBase64(encryptedData)) {
      return res.status(400).json({ error: "无效数据格式" });
    }

    const tx = await contract.placeOrder(
      productId,
      encryptedData,
      iv
    );

    const receipt = await tx.wait(process.env.CONFIRMATIONS || 2);

    res.json({
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      orderId: receipt.logs[0].args.orderId.toString() // 根据实际合约事件调整
    });

  } catch (error) {
    handleBlockchainError(res, error, "下单失败");
  }
});

// ------------------------ 工具函数 ------------------------
const isValidHex = (str) => /^0x[0-9a-fA-F]+$/.test(str);
const isValidBase64 = (str) => /^[A-Za-z0-9+/=]+$/.test(str);

const handleBlockchainError = (res, error, context) => {
  const errorInfo = {
    message: error.reason || error.message,
    code: error.code,
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined
  };

  console.error(`${context}:`, errorInfo);

  res.status(500).json({
    error: `${context}: ${errorInfo.message}`,
    ...(process.env.NODE_ENV === "development" && { details: errorInfo })
  });
};

// ------------------------ 服务器启动 ------------------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
  ███████╗███████╗██████╗ ██╗   ██╗███████╗██████╗ 
  ██╔════╝██╔════╝██╔══██╗██║   ██║██╔════╝██╔══██╗
  █████╗  █████╗  ██████╔╝██║   ██║█████╗  ██████╔╝
  ██╔══╝  ██╔══╝  ██╔══██╗╚██╗ ██╔╝██╔══╝  ██╔══██╗
  ██║     ███████╗██║  ██║ ╚████╔╝ ███████╗██║  ██║
  ╚═╝     ╚══════╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝
  `);
  console.log(`服务运行中 ➤ 端口: ${PORT}`);
  console.log(`区块链网络: ${process.env.BLOCKCHAIN_RPC_URL}`);
  console.log(`合约地址: ${contractAddress}`);
  console.log(`节点版本: ${process.version}`);
  console.log(`运行模式: ${process.env.NODE_ENV || "development"}`);
});