// 导入React核心库和ethers区块链交互库 
import { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

// ✅ 导入 ABI JSON 文件
import contractJSON from '../../config/ContractABI.json';
const contractABI = contractJSON.abi;

// ✅ 从 .env 文件读取合约地址（你已配置 REACT_APP_CONTRACT_ADDRESS=xxx）
const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;

// 创建Web3上下文容器（区块链连接全局状态）
const Web3Context = createContext();

// Web3上下文提供者组件（包裹整个应用）
export const Web3Provider = ({ children }) => {
  // 定义核心状态
  const [provider, setProvider] = useState(null);  
  const [signer, setSigner] = useState(null);      
  const [network, setNetwork] = useState(null);    
  const [contract, setContract] = useState(null);  // ✅ 新增合约实例

  useEffect(() => {
    const initProvider = async () => {
      if (window.ethereum) {
        const ethProvider = new ethers.BrowserProvider(window.ethereum);
        setProvider(ethProvider);
        
        try {
          const network = await ethProvider.getNetwork();
          setNetwork(network);

          const signer = await ethProvider.getSigner();
          setSigner(signer);

          // ✅ 实例化合约（需要 signer，否则无法写入）
          const contractInstance = new ethers.Contract(
            contractAddress,
            contractABI,
            signer
          );
          setContract(contractInstance);  // ✅ 保存合约对象

        } catch (error) {
          console.error('初始化失败:', error);
        }
      }
    };
    
    initProvider();
    window.ethereum?.on('chainChanged', initProvider);
    
    return () => {
      window.ethereum?.removeListener('chainChanged', initProvider);
    };
  }, []);

  return (
    <Web3Context.Provider 
      value={{ 
        provider, 
        signer, 
        network, 
        contract // ✅ 将合约实例注入上下文
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

// 快捷 hook
export const useWeb3 = () => useContext(Web3Context);
