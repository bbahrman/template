var nodegit = require('nodegit');
var fs = require('fs');
var directory = '/Users/benbahrman/Code_Review';
var signature;
// This code shows working directory changes similar to git status

nodegit.Repository.open(directory).then(genChangedFiles);
signature = nodegit.Signature.now('Ben Bahrman', 'benbahrman@gmail.com');

function isChanged (fileObj) {
    if(fileObj.isNew() || fileObj.isModified() || fileObj.isTypechange() || fileObj.isRenamed()){
        return true;
    } else {
        return false;
    }
}


function genChangedFiles(repo) {
    repo.getStatus().then(function(statuses) {
        var files = [];
        var itemsProcessed = 0;

        statuses.forEach(function(file) {
            if (isChanged(file)) {
                console.log(file.path() + ' is changed');
                files.push(directory + '/' + file.path());
                itemsProcessed++;
                //console.log(itemsProcessed + ' files = ' + files.join(','));
            }
            if(itemsProcessed === statuses.length){
                console.log('calling lint files');
                return lintFilesSimple(files, repo);
            }
        });
    });
}

function lintFilesSimple (fileArray, repo) {
    console.log('lintFilesSimple');
    var CLIEngine = require("eslint").CLIEngine;

    var cli = new CLIEngine({
        useEslintrc: true, fix: true
    });
    console.log('CLI created, files = ' + fileArray);
    // lint myfile.js and all files in lib/
    var report = cli.executeOnFiles(fileArray);
    var filesProcessed = 0;
    report.results.forEach(function (fileResponse) {
        if(!isEmptyOrNull(fileResponse.output)) {
            fs.writeFile(fileResponse.filePath, fileResponse.output, function (err) {
                console.log('In callback for write file');
                if (err) {
                    console.log('Error ' + fileResponse.filepath + ': ' + err)
                }
                console.log('File write complete');
                filesProcessed++;
                if (filesProcessed === report.results.length) {
                    return guidedCommit(fileArray, repo);
                }
            });
        } else {
            return guidedCommit(fileArray, repo);
        }
    });
}

function isEmptyOrNull (testVar) {
    if (!testVar || testVar == undefined || testVar === 'undefined' || testVar === '' || testVar === null) {
        return true;
    }
    return false;
}
function guidedCommit (files, repo) {
    repo.refreshIndex()
        .then(function (index) {
            console.log('Index retrieved, file count = ' + files.length);
            var filesAdded = 0;
            files.forEach(function (file) {
                console.log('Adding ' + file.replace(directory, '') + ' to directory');
                index.addByPath(file.replace(directory + '/','')).then(function (result) {
                    console.log('Adding to index');
                    filesAdded++;
                    if(filesAdded === files.length) {
                        console.log('All Files added');
                        var oid;
                        index.write().then(function(){
                            return index.writeTree();
                        }).then(function (oidResult) {
                            oid = oidResult;
                            return nodegit.Reference.nameToId(repo, "HEAD");
                        }).then(function (head) {
                            return repo.getCommit(head);
                        }).then(function (parent) {
                            return repo.createCommit('HEAD', signature, signature,  'Test automated commits', oid, [parent]);
                        }).done(function (commitId) {
                            console.log('New commit: ' + commitId);
                        });
                    }
                })
            });
    });
}