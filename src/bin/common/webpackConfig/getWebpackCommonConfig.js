import { join } from 'path';
import webpack from 'webpack';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import FilterWarningsPlugin from 'webpack-filter-warnings-plugin';
import CaseSensitivePathsPlugin from 'case-sensitive-paths-webpack-plugin';
import FriendlyErrorsWebpackPlugin from 'friendly-errors-webpack-plugin';
import ParallelUglifyPlugin from 'webpack-parallel-uglify-plugin';
import ThemeColorReplacer from 'webpack-theme-color-replacer';
import HardSourceWebpackPlugin from 'hard-source-webpack-plugin';
import chalk from 'chalk';
import getBabelCommonConfig from './getBabelCommonConfig';
import getTSCommonConfig from './getTSCommonConfig';
import colorPalette from '../utils/colorPalette';
import context from '../context';

const jsFileName = 'dis/[name].[hash:8].js';
const jsChunkFileName = 'dis/chunks/[name].[chunkhash:5].chunk.js';
const cssFileName = 'dis/[name].[contenthash:8].css';
const cssColorFileName = 'dis/theme-colors.css';
const assetFileName = 'dis/assets/[name].[hash:8].[ext]';
let processTimer;
const baseColor = '#3f51b5';


function getAssetLoader(env, mimetype, limit = 10000) {
  return {
    loader: 'url-loader',
    options: {
      limit,
      mimetype,
      name: assetFileName,
    },
  };
}

export default function getWebpackCommonConfig(mode, env) {
  const { isDev, choerodonConfig: { masterName: masterName = 'master' } } = context;
  const babelOptions = getBabelCommonConfig(mode, env);
  const tsOptions = getTSCommonConfig();

  const plugins = [
    new FilterWarningsPlugin({
      exclude: /.*@choerodon.*/,
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      minChunks: Infinity,
    }),
    new ExtractTextPlugin({
      filename: cssFileName,
      disable: false,
      allChunks: true,
    }),
    new CaseSensitivePathsPlugin(),
    new webpack.ProgressPlugin((percentage, msg, addInfo) => {
      const stream = process.stderr;
      if (stream.isTTY) {
        if (stream.isTTY && percentage < 0.71) {
          stream.cursorTo(0);
          stream.write(`📦  ${chalk.magenta(msg)} (${chalk.magenta(addInfo)})`);
          stream.clearLine(1);
        } else if (percentage === 1) {
          // eslint-disable-next-line no-console
          console.log(chalk.green('\nwebpack: bundle build is now finished.'));
        }
      } else {
        const outputStr = '📦  bundleing!';
        if (percentage !== 1 && !processTimer) {
          // eslint-disable-next-line no-console
          console.log(`📦  bundleing!  ${new Date()}`);
          processTimer = setInterval(() => {
            // eslint-disable-next-line no-console
            console.log(`📦  bundleing!  ${new Date()}`);
          }, 1000 * 30);
        } else if (percentage === 1) {
          // eslint-disable-next-line no-console
          console.log(chalk.green('\nwebpack: bundle build is now finished.'));
          if (processTimer) {
            clearInterval(processTimer);
          }
        }
      }
    }),
    new FriendlyErrorsWebpackPlugin(),
    new webpack.ProvidePlugin({
      Choerodon: isDev
        ? join(process.cwd(), `node_modules/@choerodon/${masterName}/lib/containers/common`)
        : join(__dirname, `../../../${masterName}/lib/containers/common`),
    }),
    new ThemeColorReplacer({
      fileName: cssColorFileName,
      matchColors: [
        colorPalette(baseColor, 1),
        colorPalette(baseColor, 2),
        colorPalette(baseColor, 3),
        colorPalette(baseColor, 4),
        colorPalette(baseColor, 5),
        baseColor,
        colorPalette(baseColor, 7),
        colorPalette(baseColor, 8),
        colorPalette(baseColor, 9),
        colorPalette(baseColor, 10),
        '#303f9f', // 左上角颜色
        '140, 158, 255, 0.12', // menu-item背景
        '140, 158, 255, 0.16', // 左侧菜单menu-item背景
      ],
      injectCss: true,
      isJsUgly: env !== 'development',
    }),

  ];

  if (env === 'production') {
    plugins.push(
      // 这个会使ThemeColorReplacer无法替换rgba颜色，先去掉测试测试
      // new webpack.LoaderOptionsPlugin({
      //   minimize: true,
      // }),
      new ParallelUglifyPlugin({
        uglifyJS: {
          output: {
            comments: false,
            beautify: false,
          },
          warnings: false,
          compress: {
            drop_console: true,
            collapse_vars: true,
            reduce_vars: true,
          },
        },
      }),
    );
  } else {
    plugins.push(
      new webpack.HotModuleReplacementPlugin(),
      new HardSourceWebpackPlugin(),
    );
  }
  return {
    output: {
      filename: jsFileName,
      chunkFilename: jsChunkFileName,
    },
    resolve: {
      modules: ['node_modules', join(__dirname, '../../node_modules')],
      extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.ts', '.tsx', '.js', '.jsx', '.json'],
    },
    resolveLoader: {
      modules: ['node_modules', join(__dirname, '../../node_modules')],
    },
    node: {
      fs: 'empty',
    },
    module: {
      noParse: [/moment.js/],
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          loader: 'babel-loader',
          options: babelOptions,
        },
        {
          test: /\.jsx$/,
          loader: 'babel-loader',
          options: babelOptions,
        },
        {
          test: /\.tsx?$/,
          use: [{
            loader: 'babel-loader',
            options: babelOptions,
          }, {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              compilerOptions: tsOptions,
            },
          }],
        },
        {
          test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
          use: getAssetLoader(env, 'application/font-woff'),
        },
        {
          test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
          use: getAssetLoader(env, 'application/font-woff'),
        },
        {
          test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
          use: getAssetLoader(env, 'application/octet-stream'),
        },
        {
          test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
          use: getAssetLoader(env, 'application/vnd.ms-fontobject'),
        },
        {
          test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
          use: getAssetLoader(env, 'image/svg+xml'),
        },
        {
          test: /\.(png|jpg|jpeg|gif)(\?v=\d+\.\d+\.\d+)?$/i,
          use: getAssetLoader(env),
        },
        {
          test: /\.json$/,
          loader: 'json-loader',
        },
      ],
    },
    plugins,
  };
}
