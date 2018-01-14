var nodegit = require('nodegit');
var fs = require('fs');
var directory = '/Users/benbahrman/Code_Review';
var signature;
var parentCommit;
var repositoryObj;
var changedFiles;
// This code shows working directory changes similar to git status

processFiles();
// Return OID for commit and set repository obj on global scale
function processFiles(){
    return new Promise(function (resolve, reject) {
        nodegit.Repository.open(directory).then(function (repo) {
            repositoryObj = repo;
            genChangedFiles(repo)
                .then(lintFilesSimple)
                .then(guidedCommit)
                .then(function (oid) {
                    resolve(oid);
            });
            repo.getHeadCommit().then(function (headCommit) {
                parentCommit = headCommit;
            });
        });
    });
}


// Get Repo
// Get changed files
// Lint Changed Files
// Commit linted files
// create signature
// get commit message
// fetch remotes
//return repo.createCommit('HEAD', signature, signature,  'Test automated commits', oid, [parentCommit]);

function isChanged (fileObj) {
    if(fileObj.isNew() || fileObj.isModified() || fileObj.isTypechange() || fileObj.isRenamed()){
        return true;
    } else {
        return false;
    }
}


function genChangedFiles(repo) {
    return new Promise(function (genChangedFiles_resolve, genChangedFiles_reject) {
        repo.getStatus().then(function(statuses) {
            var files = [];
            var itemsProcessed = 0;

            statuses.forEach(function(file) {
                if (isChanged(file)) {
                    files.push(directory + '/' + file.path());
                    itemsProcessed++;
                    //console.log(itemsProcessed + ' files = ' + files.join(','));
                }
                if(itemsProcessed === statuses.length){
                    changedFiles = files;
                    genChangedFiles_resolve();
                }
            });
        });
    });
}

function lintFilesSimple () {
    return new Promise(function (lintFiles_resolve, lintFiles_reject) {
        var CLIEngine = require("eslint").CLIEngine;

        var cli = new CLIEngine({
            useEslintrc: true, fix: true
        });
        // lint myfile.js and all files in lib/
        var report = cli.executeOnFiles(changedFiles);
        var filesProcessed = 0;
        report.results.forEach(function (fileResponse) {
            if(!isEmptyOrNull(fileResponse.output)) {
                fs.writeFile(fileResponse.filePath, fileResponse.output, function (err) {
                    if (err) {
                    }
                    filesProcessed++;
                    if (filesProcessed === report.results.length) {
                        lintFiles_resolve();
                    }
                });
            } else {
                lintFiles_resolve();
            }
        });
    });
}

function isEmptyOrNull (testVar) {
    if (!testVar || testVar == undefined || testVar === 'undefined' || testVar === '' || testVar === null) {
        return true;
    }
    return false;
}
function guidedCommit () {
    return new Promise(function (guidedCommit_resolve, guidedCommit_reject) {
        repositoryObj.refreshIndex()
        .then(function (index) {
            var filesAdded = 0;
            changedFiles.forEach(function (file) {
                index.addByPath(file.replace(directory + '/','')).then(function (result) {
                    filesAdded++;
                    if(filesAdded === changedFiles.length) {
                        index.write().then(function(){
                            return index.writeTree();
                        }).then(function (oid) {
                            guidedCommit_resolve(oid)
                        });
                    }
                })
            });
        });
    });
}
