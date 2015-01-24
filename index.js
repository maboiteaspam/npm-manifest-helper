
var fs = require('fs');
var npm = require('npm');
var pathExtra = require('path-extra');
var request = require('request-json-light');
var nodeHelper = require('node-helper-shorthand');

module.exports = function( initialWd ){


  var npmHelper = {

    /**
     * initial working directory of the spawner
     */
    initialWd: (initialWd || process.cwd()),


    /**
     * View package information from Npm.
     *
     * @param {String} options NPM options.
     * @param {String} app App to fetch from NPM.
     * @param {Function} callback Callback to run once work is done.
     */
    view: function (options, app, callback) {
      if (options.silent !== false ) {
        options.silent  = true;
      }
      npm.load(options, function () {
        npm.commands.view([app], true, callback);
      });

    },

    /**
     * View package information from github repo.
     *
     * @param {String} options Options.
     * @param {String} repo Repo to fetch from github.
     * @param {Function} callback Callback to run once work is done.
     */
    viewGitHub: function (options, repo, callback) {

      var client = request.newClient('https://raw.githubusercontent.com/');

      var fileName = options.fileName || 'package.json';
      var manifestUrl = repo + '/master/' + fileName;

      client.get(manifestUrl, function (err, res, manifest) {
        if (err) {
          nodeHelper.invoke(callback, err);
        } else if (res.statusCode !== 200) {
          nodeHelper.invoke(callback, err);
        } else {
          nodeHelper.invoke(callback, err, manifest);
        }
      });

    },

    /**
     * View package information from file system.
     *
     * @param {String} options Options.
     * @param {String} path Path to the module.
     * @param {Function} callback Callback to run once work is done.
     */
    viewFileSystem: function (options, path, callback) {
      var appPath = pathExtra.resolve(npmHelper.initialWd, path);

      var fileName = options.fileName || 'package.json';
      var manifestPath = pathExtra.join(appPath, fileName);
      if (fs.existsSync(appPath) && fs.existsSync(manifestPath) ) {
        fs.readFile(manifestPath, function (err, manifest) {
          nodeHelper.invoke(callback, err, JSON.parse(manifest));
        });
      } else {
        nodeHelper.invoke(callback, true);
      }

    },

    /**
     * Fetch a manifest from an url or a path
     *
     * @param {Object} options Options passed to NPM.
     * @param {String} app App or Plugin name to fetch from url or path.
     * @param {Function} callback Termination.
     */
    fetchManifest: function (options, app, callback) {

      options.fileName = 'package.json';

      npmHelper.viewFileSystem(options, app, function(fsErr, fsManifest){
        if (!fsErr) {
          nodeHelper.invoke(callback, fsErr, fsManifest, 'file');
        } else {
          npmHelper.viewGitHub(options, app, function(gitErr, gitManifest){
            if (!gitErr) {
              nodeHelper.invoke(callback, gitErr, gitManifest, 'url');
            } else {
              npmHelper.view(options, app, function(npmErr, npmManifest){
                if (!npmErr) {
                  npmManifest = npmManifest[Object.keys(npmManifest)[0]];
                  nodeHelper.invoke(callback, npmErr, npmManifest, 'url');
                } else {
                  nodeHelper.invoke(callback, npmErr);
                }
              });
            }
          });
        }
      });

    }
  };

  return npmHelper;
};
