
---

## 🛠 技术栈

- **智能合约部署**：Solidity + Hardhat + Sepolia 测试网
- **加密算法**：
  - `crypto` + `aes-256-gcm`：订单数据加密
  - `eccrypto-js`：前端 ECIES 密钥加密（支持 uncompressed 公钥）
- **前端**：React + Web3.js
- **后端**（可选）：Express + ECIES 解密处理
- **链上数据验证**：Etherscan 合约验证、交易存证

---

## ✨ 项目特色

- ✅ 前端连接钱包（MetaMask）
- 🔐 AES-GCM 加密订单数据
- 🔐 ECIES 加密会话密钥传输
- 📦 商品链上存储 & 用户加密下单
- ⛓️ 合约调用交易上链
- 🔍 支持 Etherscan 验证

---

## 📲 快速开始

### 1. 克隆项目并安装依赖

```bash

cd EcommercePrivacyProject
npm install             # 安装根目录依赖（如 Hardhat）
cd frontend
npm install             # 安装前端依赖
