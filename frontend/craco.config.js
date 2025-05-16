const webpack = require('webpack');
const path = require('path');

module.exports = {
    webpack: {
        configure: (webpackConfig) => {
            webpackConfig.resolve.fallback = {
                ...webpackConfig.resolve.fallback,
                process: require.resolve('process/browser.js'),
                crypto: require.resolve('crypto-browserify'),
                buffer: require.resolve('buffer/'),
                stream: require.resolve('stream-browserify'),
                path: require.resolve('path-browserify'),
                assert: require.resolve('assert/'),
                util: require.resolve('util/'),
                vm: require.resolve('vm-browserify'),
                fs: false,
                os: false
            };

            webpackConfig.plugins.push(
                new webpack.ProvidePlugin({
                    process: 'process/browser',
                    Buffer: ['buffer', 'Buffer']
                })
            );

            webpackConfig.module.rules.push({
                test: /\.m?js$/,
                resolve: { fullySpecified: false }
            });

            return webpackConfig;
        }
    },
    devServer: {
        setupMiddlewares: (middlewares, devServer) => {
            if (!devServer) throw new Error('webpack-dev-server未定义');
            return middlewares;
        }
    }
};
