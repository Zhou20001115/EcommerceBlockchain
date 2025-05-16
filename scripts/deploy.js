const hre = require("hardhat");
const path = require("path");
const fs = require("fs");
async function main() {
    console.log("🚀 开始部署合约...");

    const contractName = "EcommercePrivacy";

    try {
        const ContractFactory = await hre.ethers.getContractFactory(contractName);
        console.log("✅ 合约工厂已加载");

        const contract = await ContractFactory.deploy();
        console.log("⏳ 正在部署合约...");
        await contract.waitForDeployment();

        const contractAddress = await contract.getAddress();
        console.log(`🎉 合约已部署成功: ${contractAddress}`);

        const deployTx = contract.deploymentTransaction();
        console.log(`🔗 部署交易哈希: ${deployTx.hash}`);

        // ------------------------ 写入 frontend/src/deployments/sepolia.json ------------------------
        const frontendDeployPath = path.join(__dirname, "../frontend/src/deployments/sepolia.json");
        ensureDirectoryExists(path.dirname(frontendDeployPath));

        fs.writeFileSync(
            frontendDeployPath,
            JSON.stringify(
                {
                    latest: contractAddress,
                    timestamp: Date.now(),
                },
                null,
                2
            )
        );
        console.log("📁 合约地址已写入 frontend/src/deployments/sepolia.json");

        // ------------------------ 写入 backend/.env ------------------------
        const backendEnvPath = path.join(__dirname, "../backend/.env");
        updateEnvFile(backendEnvPath, "REACT_APP_CONTRACT_ADDRESS", contractAddress);
        console.log("📄 合约地址已同步到 backend/.env");

        // ------------------------ ✅ 写入 frontend/.env（用于 React 环境变量） ------------------------
        const frontendEnvPath = path.join(__dirname, "../frontend/.env");
        updateEnvFile(frontendEnvPath, "REACT_APP_CONTRACT_ADDRESS", contractAddress);
        console.log("📄 合约地址已同步到 frontend/.env");

        // ------------------------ 可选：同步到根目录 .env ------------------------
        const rootEnvPath = path.join(__dirname, "../.env");
        if (fs.existsSync(rootEnvPath)) {
            updateEnvFile(rootEnvPath, "REACT_APP_CONTRACT_ADDRESS", contractAddress);
            console.log("📄 合约地址已同步到根目录 .env");
        }

        // ------------------------ 拷贝 ABI ------------------------
        const abiSrcPath = path.join(__dirname, `../artifacts/contracts/${contractName}.sol/${contractName}.json`);
        const abiDestBackend = path.join(__dirname, "../backend/EcommercePrivacy.json");
        const abiDestFrontend = path.join(__dirname, "../frontend/src/config/ContractABI.json");

        if (fs.existsSync(abiSrcPath)) {
            ensureDirectoryExists(path.dirname(abiDestBackend));
            fs.copyFileSync(abiSrcPath, abiDestBackend);
            console.log("📦 ABI 已复制到 backend");

            ensureDirectoryExists(path.dirname(abiDestFrontend));
            fs.copyFileSync(abiSrcPath, abiDestFrontend);
            console.log("📦 ABI 已复制到 frontend/src/config/ContractABI.json");
        } else {
            console.warn("⚠️ 未找到 ABI 文件，请确认合约已成功编译");
        }

        // ------------------------ 验证合约 ------------------------
        console.log("⏳ 等待 5 个区块确认...");
        await deployTx.wait(5);

        console.log("🔎 正在验证合约...");
        await verifyContract(contractAddress);

    } catch (error) {
        console.error("❌ 部署失败:", error.message);
        process.exit(1);
    }
}

// 保证目录存在
function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// 更新或添加 key=value 到 .env
function updateEnvFile(envPath, key, value) {
    let content = "";
    if (fs.existsSync(envPath)) {
        content = fs.readFileSync(envPath, "utf8");
        const regex = new RegExp(`^${key}=.*$`, "m");
        if (regex.test(content)) {
            content = content.replace(regex, `${key}=${value}`);
        } else {
            content += `\n${key}=${value}`;
        }
    } else {
        content = `${key}=${value}`;
    }
    fs.writeFileSync(envPath, content.trim() + "\n");
}

// 智能重试合约验证
async function verifyContract(address, retries = 3) {
    try {
        await hre.run("verify:verify", {
            address,
            constructorArguments: [],
        });
        console.log("✅ 合约验证成功！");
    } catch (error) {
        if (retries > 0) {
            console.warn(`⚠️ 验证失败，剩余重试次数：${retries}`);
            await new Promise((resolve) => setTimeout(resolve, 15000));
            return verifyContract(address, retries - 1);
        }
        throw new Error(`验证失败: ${error.message}`);
    }
}

main();
