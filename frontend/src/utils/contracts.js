// utils/contracts.js

import { ethers } from 'ethers';
import contractJSON from '../config/ContractABI.json';
import deployment from '../deployments/sepolia.json';

// 获取合约地址（从部署文件中读取）
export const getContractAddress = () => {
  return deployment.latest;
};

// 获取合约实例
export const getContractInstance = (signerOrProvider) => {
  const address = getContractAddress();
  const abi = contractJSON.abi;

  // 创建合约对象并返回
  return new ethers.Contract(address, abi, signerOrProvider);
};
