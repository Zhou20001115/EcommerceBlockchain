const express = require("express");
const ethers = require("ethers");
const EthCrypto = require("eth-crypto");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();
const crypto = require('crypto');

const app = express();
app.use(bodyParser.json());
app.use(cors({ origin: "*" }));
// 实现AES解密方法
function decryptAES(ciphertext, keyHex, ivHex) {
  const key = Buffer.from(keyHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
// 区块链连接配置
const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// 合约实例
const contractABI = require("./EcommercePrivacy.json");
const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
const contract = new ethers.Contract(contractAddress, contractABI.abi, wallet);

// 公钥接口
app.get("/public-key", (req, res) => {
  try {
    const publicKey = wallet.signingKey.publicKey;
    res.json({
      publicKey,
      format: "0x04开头未压缩ECDSA公钥",
    });
  } catch (error) {
    console.error("公钥获取失败:", error);
    res.status(500).json({ error: "服务器内部错误" });
  }
});

// 安全验证中间件
const validateRequest = async (req, res, next) => {
  try {
    const { signature, publicAddress, encryptedKey, ...data } = req.body;
    const message = JSON.stringify(data);

    const signer = ethers.verifyMessage(message, signature);
    if (signer.toLowerCase() !== publicAddress.toLowerCase()) {
      return res.status(401).json({ error: "签名不匹配" });
    }

    const encryptedObject = EthCrypto.cipher.parse(encryptedKey);
    const decryptedKeyHex = await EthCrypto.decryptWithPrivateKey(
      wallet.privateKey,
      encryptedObject
    );

    req.sessionKey = decryptedKeyHex;
    next();
  } catch (error) {
    console.error("安全验证失败:", error);
    res.status(401).json({
      error: "请求验证失败",
      details: error.message,
    });
  }
};

// 修改 placeOrder 接口
app.post("/placeOrder", validateRequest, async (req, res) => {
  try {
    const { productId, encryptedData, iv } = req.body;

    // 解密用户数据（示例）
    const decryptedData = decryptAES(
      encryptedData,
      req.sessionKey,
      iv
    );
    console.log("解密后的用户数据:", decryptedData);

    // 返回必要数据（不直接操作合约）
    res.json({
      success: true,
      decryptedData // 仅示例，实际应处理敏感数据
    });
  } catch (error) {
    console.error("订单处理失败:", error);
    res.status(500).json({ error: error.message });
  }
});

// 新增商品详情解密接口
app.post("/decryptProduct", async (req, res) => {
  try {
    const { productId, encryptedKey } = req.body;

    // 解密会话密钥
    const encryptedObject = EthCrypto.cipher.parse(encryptedKey);
    const sessionKey = await EthCrypto.decryptWithPrivateKey(
      process.env.PRIVATE_KEY,
      encryptedObject
    );
    if (!sessionKey.match(/^0x[0-9a-fA-F]{64}$/)) {
      throw new Error("Invalid session key format");
    }

    // 获取商品数据
    const product = await contract.products(productId);
    const details = decryptAES(product.encryptedDetails, sessionKey.replace(/^0x/, ''), product.iv);

    res.json({ details });
  } catch (error) {
    res.status(500).json({ error: "解密失败" });
  }
});

// 获取商品列表（合约读取）
app.get("/products", async (req, res) => {
  try {
    let items = [];
    for (let i = 1; i <= 100; i++) {
      try {
        const p = await contract.products(i);
        if (p.name) items.push(p);
      } catch (_) {
        break;
      }
    }
    res.json(items);
  } catch (error) {
    console.error("获取商品失败:", error);
    res.status(500).json({ error: error.message });
  }
});

// 启动服务
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`✅ 服务运行中: http://localhost:${PORT}`);
  console.log(`🔗 合约地址: ${contractAddress}`);
  console.log(`🌐 RPC 地址: ${process.env.BLOCKCHAIN_RPC_URL}`);
  console.log(`🔑 服务账户地址: ${wallet.address}`);

  try {
    const balance = await provider.getBalance(wallet.address);
    console.log(`💰 当前账户余额: ${ethers.formatEther(balance)} ETH`);
  } catch (err) {
    console.error("💥 获取余额失败:", err.message);
  }
});