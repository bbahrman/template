var nodegit = require('nodegit');
var fs = require('fs');
var directory = '/Users/benbahrman/Code_Review';
var signature;
var parentCommit;
let repositoryObject;
var changedFiles;
// This code shows working directory changes similar to git status

/*

signature = nodegit.Signature.now('Ben Bahrman', 'benbahrman@gmail.com');
*/
commitAndLint();

function isChanged (fileObj) {
    if(fileObj.isNew() || fileObj.isModified() || fileObj.isTypechange() || fileObj.isRenamed()){
        return true;
    } else {
        return false;
    }
}


function getCommitId(repo) {
    console.log('getCommitId');

}

function lintFilesSimple (fileArray, repo) {
    console.log('lintFilesSimple');

}

function isEmptyOrNull (testVar) {
    if (!testVar || testVar == undefined || testVar === 'undefined' || testVar === '' || testVar === null) {
        return true;
    }
    return false;
}

function getCommit (files, repo) {

}

function commitAndLint () {
    Promise.all([
    // GET REPO -> Generate commit
    commitCreation(),
    // generate signature for commit
        signatureCreation()
    // GET COMMIT MESSAGE
    //commitMessage
    ]).then((values) => {
        console.log('All complete');
        console.log('commit id = ' + values[0] + ' signature = ' + values[1]); //+ ' commit message = ' + values[2]);
        // return repo.createCommit('HEAD', signature, signature,  'Test automated commits', oid, [parentCommit]);
    }).catch(reason => {
        throw reason;
    });

}

function testAsync(){
    return new Promise(function (resolve, reject) {
       resolve('test');
    });
}

function getRepo(resolve, reject) {
    
}
function commitCreation () {
    return new Promise(function (resolve, reject) {
        try {
            let lintPromise;
            let oidPromise;

            // load repo
            nodegit.Repository
            .open(directory)
            .then(function (repo) {
                // set global repo object
                repositoryObject = repo;
                // get head commit
                repo.getHeadCommit().then(function (headCommit) {
                    // set global parent
                    parentCommit = headCommit;
                });

                const filePromise = new Promise(function (resolve, reject) {
                    try {
                        repo.getStatus().then(function (statuses) {
                            var files = [];
                            var itemsProcessed = 0;

                            statuses.forEach(function (file) {
                                if (isChanged(file)) {
                                    files.push(directory + '/' + file.path());
                                    itemsProcessed++;
                                }
                                if (itemsProcessed === statuses.length) {
                                    changedFiles = files;
                                    resolve(files);
                                }
                            });
                        });
                    } catch (err) {
                        reject(err);
                    }
                });

                // generate changed file array
                filePromise.then((fileArray) => {
                    changedFiles = fileArray;
                })
                .then(() => {
                    lintPromise = new Promise((resolve, reject) => {
                        const CLIEngine = require("eslint").CLIEngine;

                        const cli = new CLIEngine({
                            useEslintrc: true, fix: true
                        });
                        // lint myfile.js and all files in lib/
                        const report = cli.executeOnFiles(changedFiles);
                        let filesProcessed = 0;
                        report.results.forEach(function (fileResponse) {
                            if (!isEmptyOrNull(fileResponse.output)) {
                                fs.writeFile(fileResponse.filePath, fileResponse.output, function (err) {
                                    console.log('In callback for write file');
                                    if (err) {
                                        console.log('Error ' + fileResponse.filepath + ': ' + err)
                                    }
                                    console.log('File write complete');
                                    filesProcessed++;
                                    if (filesProcessed === report.results.length) {
                                        resolve(); // todo resolve with results
                                    }
                                });
                            } else {
                                resolve(); // todo resolve with results
                            }
                        });
                    });
                    // lint changed files
                    lintPromise.then(function() {
                        oidPromise = new Promise((resolve, reject)=> {
                            repo.refreshIndex()
                            .then(function (index) {
                                var filesAdded = 0;
                                changedFiles.forEach(function (file) {
                                    index.addByPath(file.replace(directory + '/','')).then(function (result) {
                                        filesAdded++;
                                        if(filesAdded === files.length) {
                                            index.write().then(function(){
                                                return index.writeTree();
                                            }).then(function (oid) {
                                                resolve(oid);
                                            });
                                        }
                                    });
                                });
                            });
                        });
                    });
                });
            });
        } catch (err) {
            reject(err)
        }
    });
}

function signatureCreation () {
    return new Promise(function (resolve, reject) {
        try {
            resolve('test');
        } catch (err) {
            reject(err);
        }
    });
}


function getCommitMessage (resolve, reject) {
    try {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin, output: process.stdout
        });
        rl.question('Commit message: ', (answer) => {
            rl.close();
            resolve(answer)
        });
    } catch (err) {
        reject(err)
    }
}