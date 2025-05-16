import React from 'react';
import ReactDOM from 'react-dom/client';
import { Web3Provider } from './context/web3/Web3Context'; // 调整路径
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Web3Provider>
      <App />
    </Web3Provider>
  </React.StrictMode>
);