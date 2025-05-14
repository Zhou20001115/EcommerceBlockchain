const webpack = require('webpack');

module.exports = {
    webpack: {
        configure: (webpackConfig) => {
            // Fallback 配置以解决对 process 的引用问题
            webpackConfig.resolve.fallback = {
                process: require.resolve('process/browser'),
                crypto: require.resolve('crypto-browserify'),
                buffer: require.resolve('buffer'),
                stream: require.resolve('stream-browserify'),
                path: require.resolve('path-browserify'),
                assert: require.resolve('assert'),
                util: require.resolve('util'),
                vm: require.resolve('vm-browserify'),
            };

            // 在所有地方使用 `process` 和 `Buffer` 时，自动提供它们
            webpackConfig.plugins.push(
                new webpack.ProvidePlugin({
                    process: 'process/browser',
                    Buffer: ['buffer', 'Buffer'],
                })
            );

            return webpackConfig;
        },
    },
};
