var treeify = require('treeify');
var bowerJson = require('bower-json');
var fs = require('fs');
var _ = require('underscore');
var npmLicense = require('npm-license');
var packageLicense = require('package-license');
var path = require('path');

var output = {};
exports.init = function(options, callback){
    var production = options.production;
    options = _.extend({}, options, {directory: 'bower_components'});
    // read .bowerrc
    if (fs.existsSync('.bowerrc')){
        try {options = JSON.parse(fs.readFileSync('.bowerrc'))}
        catch(e){}
    }
    // check each bower package recursively
    if (!fs.existsSync(options.directory)){
        throw 'Run bower install first';        
    }
    
    var productionDependencies;
    if (production && fs.existsSync('bower.json')) {
        var bowerFile = JSON.parse(fs.readFileSync('bower.json'));
        productionDependencies = _.keys(bowerFile.dependencies);
    }
    
    var packages = productionDependencies || fs.readdirSync(options.directory);
    packages.forEach(function(package){
        var moduleInfo = {licenses: []};
        var files = ['.bower.json', 'bower.json', 'component.json'];
        var completed = [];
        _.forEach(files, function(filename) {
            bowerJson.find(path.resolve(options.directory, package), [filename], function(err, filename){
                function next() {
                    completed.push(filename);
                    if (completed.length === files.length) {
                        // enhance with npm-license
                        npmLicense.init({start: path.resolve(options.directory, package)}, function(npmData){
                            if (moduleInfo.name && moduleInfo.version) {
                                output[moduleInfo.name + '@' + moduleInfo.version] = moduleInfo;
                            } else {
                                output[package] = moduleInfo;
                            }
        
                            for (var packageName in npmData){
                                if (moduleInfo.licenses.length === 0 && npmData[packageName].licenses && npmData[packageName].licenses !== 'UNKNOWN')
                                    moduleInfo.licenses = moduleInfo.licenses.concat(npmData[packageName].licenses);
                                if (npmData[packageName].repository)
                                    moduleInfo.repository = npmData[packageName].repository;
                            }

                            if (moduleInfo.licenses.length === 0) {
                                // enhance with package-license
                                var licenseFromFS = packageLicense(path.resolve(options.directory, package));
                                if (licenseFromFS) moduleInfo.licenses = licenseFromFS;
                            }
        
                            if (moduleInfo.licenses.length === 0) moduleInfo.licenses = 'UNKNOWN';
                            moduleInfo.path = path.join(options.directory, package);
        
                            if (Object.keys(output).length === packages.length){
                                callback(output);
                            }
                        });
                    }
                }
                
                if (!filename){
                    next();
                    return;
                }
                bowerJson.read(filename, function(err, bowerData) {
                    if (bowerData.license && _.last(moduleInfo.licenses) !== bowerData.license) {
                        moduleInfo.licenses.push(bowerData.license);
                    }
                    if (bowerData.repository) moduleInfo.repository = bowerData.repository;
                    if (bowerData.homepage) moduleInfo.homepage = bowerData.homepage;
                    if (bowerData.name) moduleInfo.name = bowerData.name;
                    if (bowerData.version) moduleInfo.version = bowerData.version;
                    next();
                });
            });
        });
    });
}
exports.printTree = function(sorted){
    console.log(treeify.asTree(sorted, true));
}
exports.printJson = function(sorted){
    console.log(JSON.stringify(sorted, null, 2));
}
