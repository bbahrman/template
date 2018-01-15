let nodegit = require('nodegit');
let fs = require('fs');
let directory = '/Users/benbahrman/Code_Review';
let signature;
let repositoryObj;
let changedFiles;
let branchName;
let fetchStatus;
let logSetting = false;

let commitMessagePromise = getCommitMessage();

nodegit.Repository.open(directory).then((repo) => {
    repositoryObj = repo;
    branchName = getBranchName();
    fetchStatus = fetchBranches();
    let parentCommit = repositoryObj.getHeadCommit();
    Promise.all([
        processFiles(),
        commitMessagePromise,
        parentCommit,
        branchName
    ])
    .then((results) => {
        log('Process files and commit promise resolved');
        // commit changes, last three arguments are OID, commit message, and parent commit
        let commit = repositoryObj.createCommit('HEAD', signature, signature,  results[3] + ' - ' + results[1], results[0], [results[2]]);
        Promise.all([
            commit,
            branchName,
            fetchStatus
        ]).then((results) => {
            log('fetch complete, branch: ' + results[1]);
            // merge remote branch in
            return repositoryObj.mergeBranches(results[1], 'origin/' + results[1], signature);
        }).catch((err) => {
            log('Error in promise block commit, branchname, fetch');
            log(err);
        });
    })
    .catch((err) => {
        log('Error in promise block, processFules and commitMessagePromise\n' + err)
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
    return new Promise((resolve, reject) => {
        try {
            genChangedFiles(repositoryObj).then(lintFilesSimple).then(guidedCommit).then((oid) => {
                resolve(oid);
            });
            signature = nodegit.Signature.default(repositoryObj);
        } catch (err) {
            reject('Error processFiles: ' + err);
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
    return new Promise((lintFiles_resolve, lintFiles_reject) => {
        try {
            let CLIEngine = require("eslint").CLIEngine;

            let cli = new CLIEngine({
                useEslintrc: true, fix: true
            });
            // lint myfile.js and all files in lib/
            let report = cli.executeOnFiles(changedFiles);
            let filesProcessed = 0;
            report.results.forEach((fileResponse) => {
                if (!isEmptyOrNull(fileResponse.output)) {
                    fs.writeFile(fileResponse.filePath, fileResponse.output, (err) => {
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