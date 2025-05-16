// 导入React Hooks、Web3上下文、ethers库及网络配置
import { useEffect, useState } from 'react';
import { useWeb3 } from '../context/web3/Web3Context';
import { ethers } from 'ethers';
import { NETWORKS } from '../config/networks';

// 定义钱包连接组件
export default function ConnectWallet({ setAccount: externalSetAccount }) {
  // 从Web3上下文中获取provider（区块链连接）、signer（签名者）、network（当前网络）
  const { provider, signer, network } = useWeb3();

  // 组件状态管理：账户地址、余额、加载状态
  const [account, setAccount] = useState('');
  const [balance, setBalance] = useState('');
  const [loading, setLoading] = useState(false);

  // 副作用：当signer或provider变化时，加载账户信息
  useEffect(() => {
    const loadAccount = async () => {
      if (signer && provider) {
        try {
          // 获取当前账户地址
          const address = await signer.getAddress();
          setAccount(address);
          externalSetAccount?.(address);  // ✅ 同步 App 状态
          // 查询账户余额并转换为ETH单位
          const balance = await provider.getBalance(address);
          setBalance(ethers.formatEther(balance)); // 使用ethers工具转换Wei为ETH
        } catch (error) {
          console.error('账户加载失败:', error); // 错误处理
        }
      }
    };
    loadAccount();
  }, [signer, provider]); // 依赖项：signer或provider变化时重新执行

  // 处理钱包连接逻辑
  const handleConnect = async () => {
    setLoading(true); // 进入加载状态
    try {
      // 检查MetaMask是否安装
      if (!window.ethereum) {
        alert('请安装 MetaMask 钱包！');
        window.open('https://metamask.io/download/', '_blank'); // 引导用户安装
        return;
      }

      // 请求用户授权连接钱包
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // 检查provider是否初始化
      if (!provider) throw new Error('区块链提供者未初始化');

      // 获取当前网络信息
      const currentNetwork = await provider.getNetwork();

      // 验证网络是否支持
      if (!NETWORKS[currentNetwork.chainId]) {
        const supportedNetworks = Object.values(NETWORKS).map(n => n.name).join('/');
        alert(`请切换至支持的区块链网络: ${supportedNetworks}`); // 提示用户切换网络
      }
    } catch (error) {
      console.error('连接失败:', error);
      alert(`钱包连接错误: ${error.message}`); // 显示用户友好错误
    } finally {
      setLoading(false); // 无论成功与否，结束加载状态
    }
  };

  // 渲染UI
  return (
    <div className="wallet-card">
      {/* 未连接时显示连接按钮 */}
      {!account ? (
        <button
          onClick={handleConnect}
          disabled={loading} // 加载时禁用按钮
        >
          {loading ? '连接中...' : '连接钱包'}
        </button>
      ) : (
        // 已连接时显示账户信息
        <div className="wallet-info">
          {/* 显示账户地址（前6位+后4位） */}
          <p>账户: {account.slice(0, 6)}...{account.slice(-4)}</p>

          {/* 显示余额（保留4位小数）和代币符号 */}
          <p>余额: {Number(balance).toFixed(4)} {NETWORKS[network?.chainId]?.symbol}</p>

          {/* 显示网络名称，若未识别则显示"未知网络" */}
          <p>网络: {NETWORKS[network?.chainId]?.name || '未知网络'}</p>
        </div>
      )}
    </div>
  );
}
