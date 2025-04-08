const hre = require("hardhat");

async function main() {
    console.log("开始部署合约...");

    // 获取合约工厂
    const EcommercePrivacy = await hre.ethers.getContractFactory("EcommercePrivacy");
    console.log("合约工厂已加载");

    // 部署合约
    console.log("正在部署合约...");
    const ecommercePrivacy = await EcommercePrivacy.deploy();
    console.log("合约部署交易已发送，等待确认...");

    // 等待合约部署完成
    await ecommercePrivacy.waitForDeployment();

    // **获取合约地址（正确写法）**
    const contractAddress = ecommercePrivacy.target;  // ✅ 获取合约地址
    console.log(`✅ 合约已部署，地址: ${contractAddress}`);
    // 获取交易哈希
    const deployTransaction = ecommercePrivacy.deploymentTransaction();  // ✅ 获取部署交易对象
    const transactionHash = deployTransaction.hash;  // ✅ 获取交易哈希
    console.log(`✅ 部署交易哈希: ${transactionHash}`);
    
    
    
    // 等待 Etherscan 同步合约
    console.log("⏳ 等待 Etherscan 同步合约字节码...");
    await new Promise(resolve => setTimeout(resolve, 60000)); // 等待60秒

    // 验证合约
    console.log("🔎 开始验证合约...");
    try {
        await hre.run("verify:verify", {
            address: contractAddress,
            constructorArguments: [], // 如果你的构造函数有参数，写在这里
        });
        console.log("✅ 合约验证成功！");
    } catch (error) {
        console.error("❌ 合约验证失败:", error.message);
    }
}

// 运行 main()，捕获可能的错误
main().catch((error) => {
    console.error("部署失败:", error);
    process.exitCode = 1;
});
