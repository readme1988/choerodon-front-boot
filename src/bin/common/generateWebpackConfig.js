import fs from 'fs';
import { join } from 'path';
import webpack from 'webpack';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import context from './context';
import getStyleLoadersConfig from './webpackConfig/getStyleLoadersConfig';
import getWebpackCommonConfig from './webpackConfig/getWebpackCommonConfig';
import getDefaultTheme from './webpackConfig/getDefaultTheme';

const choerodonLib = join(__dirname, '..', '..');

function getFilePath(file) {
  const { isDev } = context;
  const filePath = join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    return filePath;
  } else if (isDev) {
    return join(process.cwd(), 'src', file);
  } else {
    return join(__dirname, '..', file);
  }
}

export default function updateWebpackConfig(mode, env) {
  const { choerodonConfig } = context;
  const {
    theme, output, root, enterPoints, server, webSocketServer, local, master,
    postcssConfig, entryName, titlename, htmlTemplate, favicon, menuTheme,
    emailBlackList, clientid, dashboard, resourcesLevel, apimGateway, uiConfigure, outward,
  } = choerodonConfig;
  
  const webpackConfig = getWebpackCommonConfig(mode, env);

  // if (typeof master === 'object' && master.exportPath) {
  //   webpackConfig.resolve.alias = {
  //     '@': 
  //   };
  // }
  
  const styleLoadersConfig = getStyleLoadersConfig(postcssConfig, {
    sourceMap: mode === 'start',
    modifyVars: Object.assign({}, getDefaultTheme(env), theme),
  });

  let defaultEnterPoints;
  webpackConfig.entry = {};
  if (mode === 'start') {
    webpackConfig.output.publicPath = '/';
    webpackConfig.devtool = 'cheap-module-eval-source-map';
    webpackConfig.watch = true;
    styleLoadersConfig.forEach((config) => {
      webpackConfig.module.rules.push({
        test: config.test,
        use: ['style-loader', ...config.use],
      });
    });
    defaultEnterPoints = {
      API_HOST: server,
      AUTH_HOST: `${server}/oauth`,
      CLIENT_ID: clientid,
      LOCAL: local,
      VERSION: '本地',
      TITLE_NAME: titlename,
      WEBSOCKET_SERVER: webSocketServer,
    };
  } else if (mode === 'build') {
    webpackConfig.output.publicPath = root;
    webpackConfig.output.path = join(process.cwd(), output);
    styleLoadersConfig.forEach((config) => {
      webpackConfig.module.rules.push({
        test: config.test,
        use: ExtractTextPlugin.extract({
          use: config.use,
        }),
      });
    });
    defaultEnterPoints = {};
  }
  const mergedEnterPoints = {
    NODE_ENV: env,
    RESOURCES_LEVEL: Array.isArray(resourcesLevel) ? resourcesLevel.join(',') : resourcesLevel,
    OUTWARD: outward,
    ...defaultEnterPoints,
    ...enterPoints(mode, env),
  };
  const defines = Object.keys(mergedEnterPoints).reduce((obj, key) => {
    obj[`process.env.${key}`] = JSON.stringify(process.env[key] || mergedEnterPoints[key]);
    return obj;
  }, {});
  const customizedWebpackConfig = choerodonConfig.webpackConfig(webpackConfig, webpack);

  if (customizedWebpackConfig.entry[entryName]) {
    throw new Error(`Should not set \`webpackConfig.entry.${entryName}\`!`);
  }
  const entryPath = join(choerodonLib, '..', 'tmp', `entry.${entryName}.js`);
  customizedWebpackConfig.entry[entryName] = entryPath;
  customizedWebpackConfig.plugins.push(
    new webpack.DefinePlugin(defines),
    new HtmlWebpackPlugin({
      title: process.env.TITLE_NAME || titlename,
      template: getFilePath(htmlTemplate),
      inject: true,
      // chunks: ['vendor', entryName],
      favicon: getFilePath(favicon),
      env: './env-config.js',
      minify: {
        html5: true,
        collapseWhitespace: true,
        removeComments: true,
        removeTagWhitespace: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
      },
    }),
  );
  return customizedWebpackConfig;
}