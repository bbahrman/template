var nodegit = require('nodegit');
var fs = require('fs');
var directory = '/Users/benbahrman/Code_Review';
var signature;
var parentCommit;
var repositoryObj;
var changedFiles;
let branchName;
let fetchStatus;
let logSetting = false;

// This code shows working directory changes similar to git status
let commitPromise = getCommitMessage();

nodegit.Repository.open(directory).then(function (repo) {
    repositoryObj = repo;
    repositoryObj.getHeadCommit().then(function (headCommit) {
        parentCommit = headCommit;
        branchName = getBranchName();
        fetchStatus = fetchBranches();
    });
    Promise.all([
        processFiles(),
        commitPromise
    ])
    .then(function (results) {
        log('Process files and commit promise resolved');
        // commit changes, last three arguments are OID, commit message, and parent commit
        let commit = repositoryObj.createCommit('HEAD', signature, signature,  results[1], results[0], [parentCommit]);
        Promise.all([
            commit,
            branchName,
            fetchStatus
        ]).then((results)=>{
            log('fetch complete, branch: ' + results[1]);
            // merge remote branch in
            return repositoryObj.mergeBranches(results[1], 'origin/' + results[1], signature);
        }).catch((err) => {
            log('Error in promise block commit, branchname, fetch');
            log(err);
        });
    })
    .catch(function (err) {
        log('Error in promise block, processFules and commitPromise\n' + err)
    });
});

function getBranchName () {
    return new Promise((resolve, reject) => {
        try {
            repositoryObj.getBranch('HEAD').then(function (reference) {
                resolve(reference.name().replace('refs/heads/', ''))
            });
        } catch (err) {
            reject('Error getBranchName: ' + err);
        }
    });
}

function fetchBranches () {
    return new Promise((resolve, reject) => {
       try {
           repositoryObj.fetch("origin",{
               callbacks: {
                   certificateCheck: function() { return 1; },
                   credentials: function(url, userName) {
                       return nodegit.Cred.sshKeyFromAgent(userName);
                   }
               }
               },(success) => {
                   log('fetchBranches result: ' + success);
                   resolve(true);
           });
       } catch (err) {
           reject('Error fetchBranches: ' + err);
       }
    });
}

// Return OID for commit and set repository obj on global scale
function processFiles(){
    return new Promise(function (resolve, reject) {
        try {
            genChangedFiles(repositoryObj).then(lintFilesSimple).then(guidedCommit).then(function (oid) {
                resolve(oid);
            });
            signature = nodegit.Signature.default(repositoryObj);
        } catch (err) {
            reject('Error processFiles: ' + err);
        }
    });
}

function createSignature () {
    return new Promise(function (resolve, reject) {
       try {
           if(signature){resolve (signature)}
           else (signature.now())
       } catch (err) {
           reject('Error createSignature: ' + err);
       }
    });
}

function isChanged (fileObj) {
    if(fileObj.isNew() || fileObj.isModified() || fileObj.isTypechange() || fileObj.isRenamed()){
        return true;
    } else {
        return false;
    }
}


function genChangedFiles(repo) {
    return new Promise(function (genChangedFiles_resolve, genChangedFiles_reject) {
        try {
            repo.getStatus().then(function (statuses) {
                var files = [];
                var itemsProcessed = 0;

                statuses.forEach(function (file) {
                    if (isChanged(file)) {
                        files.push(directory + '/' + file.path());
                        itemsProcessed++;
                        //log(itemsProcessed + ' files = ' + files.join(','));
                    }
                    if (itemsProcessed === statuses.length) {
                        changedFiles = files;
                        genChangedFiles_resolve();
                    }
                });
            });
        } catch (err) {
            genChangedFiles_reject('Error genChangedFiles: ' + err);
        }
    });
}

function lintFilesSimple () {
    return new Promise(function (lintFiles_resolve, lintFiles_reject) {
        try {
            var CLIEngine = require("eslint").CLIEngine;

            var cli = new CLIEngine({
                useEslintrc: true, fix: true
            });
            // lint myfile.js and all files in lib/
            var report = cli.executeOnFiles(changedFiles);
            var filesProcessed = 0;
            report.results.forEach(function (fileResponse) {
                if (!isEmptyOrNull(fileResponse.output)) {
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
        } catch (err) {
            lintFiles_reject('Error lintFilesSimple: ' + err);
        }
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
        try {
            repositoryObj.refreshIndex().then(function (index) {
                var filesAdded = 0;
                changedFiles.forEach(function (file) {
                    index.addByPath(file.replace(directory + '/', '')).then(function (result) {
                        filesAdded++;
                        if (filesAdded === changedFiles.length) {
                            index.write().then(function () {
                                return index.writeTree();
                            }).then(function (oid) {
                                guidedCommit_resolve(oid)
                            });
                        }
                    })
                });
            });
        } catch (err) {
            guidedCommit_reject('Error guidedCommit: ' + err);
        }
    });
}

function getCommitMessage () {
    return new Promise(function (resolve, reject) {
        try {
            if(!logSetting) {
                const readline = require('readline');
                const rl = readline.createInterface({
                    input: process.stdin, output: process.stdout
                });
                rl.question('Commit message: ', (answer) => {
                    rl.close();
                    resolve(answer)
                });
            } else {
                resolve('Logging on, test value');
            }
        } catch (err) {
            reject('Error getCommitMessage: ' + err)
        }
    });
}

function log (message) {
    if(logSetting) {
        console.log(message);
    }
}