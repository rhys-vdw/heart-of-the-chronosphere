// tslint:enable:no-implicit-dependencies dev
import * as webpack from "webpack";
import { resolve, join } from "path";
import * as HtmlWebpackPlugin from "html-webpack-plugin";

const { HotModuleReplacementPlugin } = webpack;
const port = 9000;
const context = __dirname + "/src";

interface WebpackEnvironment {
  NODE_ENV: string;
}

module.exports = (env: WebpackEnvironment, argv: { mode: string }) => {
  const appEntryPoints =
    argv.mode === "production"
      ? ["./index"]
      : [
          `webpack-dev-server/client?http://localhost:${port}`,
          "webpack/hot/only-dev-server",
          "./index"
        ];

  const config: webpack.Configuration = {
    name: "client",
    target: "web",
    context,
    entry: {
      app: appEntryPoints
    },
    output: {
      filename: "[name].js",
      path: resolve(__dirname, "dist")
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js", "jsx"]
    },
    devtool:
      argv.mode === "production" ? "source-map" : "cheap-eval-source-map",
    module: {
      rules: [
        {
          enforce: "pre",
          test: /\.tsx?$/,
          loader: "tslint-loader",
          exclude: /node_modules/,
          options: {
            configFile: resolve(__dirname, "./tslint.json"),
            emitErrors: true,
            failOnHint: true,
            typeCheck: true
          }
        },
        {
          test: /\.tsx?$/,
          loader: "ts-loader",
          exclude: /node_modules/
        },
        {
          test: /\.svg$/,
          loader: "file-loader",
          exclude: /node_modules/,
          options: {
            outputPath: "images"
          }
        },
        {
          test: /\.(woff|woff2)$/,
          loader: "file-loader",
          exclude: /node_modules/,
          options: {
            outputPath: "fonts"
          }
        },
        {
          test: /\.css$/i,
          use: [
            // Doesn't work consistently for some reason...
            // { loader: "style-loader", options: { esModule: true } },
            { loader: "style-loader", options: { esModule: false } },
            {
              loader: "css-loader",
              options: {
                modules:
                  process.env.NODE_ENV === "production"
                    ? true
                    : { localIdentName: "[name]:[local]--[hash:base64:5]" },
                esModule: true
              }
            }
          ]
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: "./index.html",
        hash: true,
        filename: "index.html",
        inject: "body"
      }),
      new HotModuleReplacementPlugin()
    ]
  };

  if (argv.mode === "development") {
    config.devServer = {
      contentBase: join(__dirname, "dist"),
      compress: true,
      port: 9000
    };
  }

  return config;
};
