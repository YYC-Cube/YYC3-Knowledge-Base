const path = require('path');

module.exports = {
  entry: {
    editor: './src/index.tsx',
    'test-app': './src/TestApp.tsx'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  devServer: {
    static: {
      directory: path.join(__dirname, '.'),
    },
    compress: true,
    port: 9000,
    hot: true,
    devMiddleware: {
      publicPath: '/dist/',
    },
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs'],
    mainFields: ['module', 'main', 'browser'],
    alias: {
      'd3-sankey': path.resolve(__dirname, 'node_modules/d3-sankey/src/index.js'),
    },
    fallback: {
      // Mermaid dependencies fallback
      'fs': false,
      'path': false,
      'tty': false,
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  externals: {
    vscode: 'commonjs vscode',
  },
};
