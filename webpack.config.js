const path = require('path');
const webpack = require('webpack');

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';
    
    return {
        entry: {
            app: './public/app.js',
            auth: './public/auth.js'
        },
        output: {
            path: path.resolve(__dirname, 'public/dist'),
            filename: isProduction ? '[name].[contenthash].js' : '[name].js',
            clean: true,
        },
        module: {
            rules: [
                {
                    test: /\.css$/i,
                    use: ['style-loader', 'css-loader'],
                }
            ],
        },
        optimization: {
            splitChunks: {
                chunks: 'all',
            },
        },
        plugins: [
            new webpack.DefinePlugin({
                'process.env.NODE_ENV': JSON.stringify(argv.mode)
            })
        ],
        mode: argv.mode,
        devtool: isProduction ? 'source-map' : 'eval-source-map'
    };
};
