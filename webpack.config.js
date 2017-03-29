module.exports = {
  entry: {
    main: './src/main.jsx',
    canvasRender: './src/canvas-render.jsx'
  },
  output: {
    path: __dirname,
    publicPath: '/',
    filename: '[name].bundle.js'
  },
  module: {
    loaders: [{
      test: /\.jsx?$/,
      exclude: /node_modules/,
      loaders: ['babel']
    }, {
      test: /\.css$/,
      loader: 'style!css'
    }
  ]},
  devtool:[
      "source-map"
  ],
  resolve: {
    extensions: ['', '.js', '.jsx', '.css']
  }
}
