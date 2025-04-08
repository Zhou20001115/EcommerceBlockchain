cd C:\Users\22801\EcommercePrivacyProject
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.js
npx hardhat run scripts/deploy.js --network localhost 

npx hardhat verify --network sepolia +地址
npx hardhat compile
项目整体架构分为三个主要模块：前端、后端、智能合约。

前端部分（React.js + Web3.js）：

  用户界面：商品展示、钱包连接按钮、购买按钮。

  区块链交互：通过Web3.js连接MetaMask钱包，读取智能合约中的商品信息和用户余额。

  数据加密：在前端使用AES等加密算法对订单数据进行加密，再上传至区块链。

后端部分（Node.js + Express.js）：

  接口服务：提供添加商品、处理订单、验证用户身份等API接口。

  合约交互：连接ethers.js与智能合约，执行商品上链、订单处理等操作。

安全管理：集成.env环境变量管理敏感数据，如私钥、RPC地址等。

智能合约部分（Solidity + Hardhat）：

  商品管理合约：定义商品上链、购买商品等逻辑。

  数据访问控制：设置权限机制，确保只有授权用户才能访问敏感数据。

  加密存储：结合零知识证明、同态加密等技术保障链上数据安全。


sequenceDiagram
    participant User as 用户
    participant Frontend as 前端(React)
    participant Backend as 后端(Node.js)
    participant Contract as EcommercePrivacy合约
    participant Blockchain as 区块链网络

    %% ====== 初始化流程 ======
    Note over Contract: 合约部署
    Contract->>Blockchain: 构造函数初始化
    Contract->>Contract: 赋予部署者ADMIN/SELLER/BUYER角色

    %% ====== 商品上架流程 ======
    User->>Frontend: 填写商品表单（名称、价格、详情）
    Frontend->>Frontend: 加密商品详情（生成AES密钥+IV）
    Frontend->>Backend: POST /products {name, price, encryptedDetails, iv}
    Backend->>Contract: addProduct(name, price, encryptedDetails, iv)
    Contract->>Blockchain: 存储商品数据（含IV）
    Blockchain-->>Contract: 触发ProductAdded事件
    Contract-->>Backend: 返回交易哈希
    Backend-->>Frontend: 返回成功状态
    Frontend->>User: 显示"商品已上架"

    %% ====== 用户购买流程 ======
    User->>Frontend: 点击购买商品
    Frontend->>Frontend: 生成会话密钥+加密订单数据
    Frontend->>MetaMask: 请求签名（含加密数据哈希）
    MetaMask-->>Frontend: 返回数字签名
    Frontend->>Backend: POST /orders {productId, encryptedData, iv, signature}
    Backend->>Backend: 验证签名有效性
    Backend->>Contract: placeOrder(productId, encryptedData, iv)
    Contract->>Blockchain: 校验BUYER角色+存储订单
    Blockchain-->>Contract: 触发OrderPlaced事件
    Contract-->>Backend: 返回交易哈希
    Backend-->>Frontend: 返回订单ID
    Frontend->>User: 显示"订单创建成功"

    %% ====== 订单完成流程 ======
    User->>Frontend: 卖家点击"确认发货"
    Frontend->>Contract: fulfillOrder(orderId)
    Contract->>Blockchain: 校验SELLER角色+更新订单状态
    Blockchain-->>Contract: 状态更新完成
    Contract-->>Frontend: 返回交易确认
    Frontend->>User: 显示"订单已完成"

    %% ====== 数据查询流程 ======
    User->>Frontend: 查看订单详情
    Frontend->>Contract: getOrderIV(orderId)
    Contract-->>Frontend: 返回订单IV
    Frontend->>Frontend: 结合本地密钥解密数据
    Frontend->>User: 显示明文订单详情