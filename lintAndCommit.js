let nodegit = require('nodegit');
let fs = require('fs');
let directory = '/Users/benbahrman/Code_Review';
let signature;
let repositoryObj;
let changedFiles;
let logSetting = false;
let branchName;
let lintResultsGlobal;
let formattedResults = [];

nodegit.Repository.open(directory).then((repo) => {
    repositoryObj = repo;
    let changedFileCount = genChangedFiles(repositoryObj);
    changedFileCount.then((count) => {
        if (count > 0) {
            let commitMessagePromise = getCommitMessage();
            let commitOId = lintFilesSimple()
            .then(() => {
                return guidedCommit();
            });
            signature = nodegit.Signature.default(repositoryObj);
            let branchNamePromise = getBranchName();
            branchNamePromise.then((name) => {
               branchName = name;
            });
            let fetchStatusPromise = fetchBranches();
            let parentCommit = repositoryObj.getHeadCommit();
            Promise.all([
                commitOId,
                commitMessagePromise,
                parentCommit,
                branchNamePromise,
                fetchStatusPromise
            ])
            .then((results) => {
                log('Process files and commit promise resolved');
                // commit changes, last three arguments are OID, commit message, and parent commit
                let commit = repositoryObj.createCommit('HEAD', signature, signature,  results[3] + ' - ' + results[1], results[0], [results[2]]);
                let mergePromise = commit.then(() => {
                    // merge remote branch in
                    return repositoryObj.mergeBranches(branchName, 'origin/' + branchName, signature);
                }).catch((err) => {
                    log('Error in promise block commit, branchname, fetch');
                    log(err);
                });
                let masterMergePromise = mergePromise.then(()=>{
                    return repositoryObj.mergeBranches(branchName, 'origin/master', signature);
                });

                let remotePromise = masterMergePromise.then(()=>{
                    return repositoryObj.getRemote('origin');
                });

                let pushPromise = remotePromise.then((remote) =>{
                    return remote.push(["refs/heads/master:refs/heads/master"],{
                        callbacks: {
                            credentials: (url, userName) => {
                                return nodegit.Cred.sshKeyFromAgent(userName);
                            }
                        }
                    });
                });

                pushPromise.then(()=>{
                    console.log('\nProcessing complete');
                    formattedResults.forEach((message) => {
                        console.log(message);
                    });
                });

            })
            .catch((err) => {
                log('Error in promise block, processRules and commitMessagePromise\n' + err)
            });
        } else {
            console.log('No changes to commit')
        }
    });
});

function getBranchName () {
    return new Promise((resolve, reject) => {
        try {
            repositoryObj.getBranch('HEAD').then((reference) => {
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
                   certificateCheck: () => { return 1; },
                   credentials: (url, userName) => {
                       return nodegit.Cred.sshKeyFromAgent(userName);
                   }
               }
               },(success) => {
                   resolve(true);
           });
       } catch (err) {
           reject('Error fetchBranches: ' + err);
       }
    });
}

function createSignature () {
    return new Promise((resolve, reject) => {
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
    return new Promise((genChangedFiles_resolve, genChangedFiles_reject) => {
        try {
            repo.getStatus().then((statuses) => {
                if(statuses.length > 0) {
                    let files = [];
                    let itemsProcessed = 0;

                    statuses.forEach((file) => {
                        if (isChanged(file)) {
                            files.push(directory + '/' + file.path());
                            itemsProcessed++;
                            //log(itemsProcessed + ' files = ' + files.join(','));
                        }
                        if (itemsProcessed === statuses.length) {
                            changedFiles = files;
                            genChangedFiles_resolve(itemsProcessed);
                        }
                    });
                } else {
                    genChangedFiles_resolve(0);
                }
            });
        } catch (err) {
            genChangedFiles_reject('Error genChangedFiles: ' + err);
        }
    });
}

function lintFilesSimple () {
    return new Promise((lintFiles_resolve, lintFiles_reject) => {
        try {
            let CLIEngine = require("eslint").CLIEngine;

            let cli = new CLIEngine({
                useEslintrc: true, fix: true
            });
            // lint myfile.js and all files in lib/
            let report = cli.executeOnFiles(changedFiles);
            lintResultsGlobal = report;
            report.results.forEach((fileResponse, index, map) => {
                formattedResults.push(responseFormat(fileResponse));
                if((report.results.length - 1) === index) {
                    let lastFile = writeFile(fileResponse.filePath, fileResponse.output);
                    lastFile.then(()=>{
                        lintFiles_resolve();
                    });
                } else {
                    writeFile(fileResponse.filePath, fileResponse.output);
                }
            });
        } catch (err) {
            lintFiles_reject('Error lintFilesSimple: ' + err);
        }
    });
}

function isEmptyOrNull (testlet) {
    if (!testlet || testlet == undefined || testlet === 'undefined' || testlet === '' || testlet === null) {
        return true;
    }
    return false;
}

function guidedCommit () {
    return new Promise((guidedCommit_resolve, guidedCommit_reject) => {
        try {
            repositoryObj.refreshIndex().then((index) => {
                let filesAdded = 0;
                changedFiles.forEach((file) => {
                    index.addByPath(file.replace(directory + '/', '')).then((result) => {
                        filesAdded++;
                        if (filesAdded === changedFiles.length) {
                            index.write().then(() => {
                                return index.writeTree();
                            }).then((oid) => {
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
    return new Promise((resolve, reject) => {
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

function writeFile (path, content) {
    return new Promise((resolve, reject) => {
        if (!isEmptyOrNull(content)) {
            fs.writeFile(path, content, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(true);
                }
            });
        } else {
            resolve(true);
        }
    });
}

function responseFormat (fileResult) {
    let value = "";
    value += fileResult.filePath.replace(directory + '/','');
    value += '\n';
    value += 'Errors: ' + fileResult.errorCount + ' Warnings: ' + fileResult.warningCount;
    value += '\n';
    if(fileResult.messages.length > 0) {
        for(let i = 0; i < fileResult.messages.length; i++) {
            let message = fileResult.messages[i];
            value += message.line + ':' + message.column + ' - ' + message.message + '\n';
        }
    }
    value += '\n';
    return value;
}