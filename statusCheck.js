var nodegit = require('nodegit');
var fs = require('fs');
var directory = '/Users/benbahrman/Code_Review';
// This code shows working directory changes similar to git status

nodegit.Repository.open(directory).then(genChangedFiles);

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
                lintFilesSimple(files);
            }
        });
    });
}

function lintFilesSimple (fileArray) {
    console.log('lintFilesSimple');
    var CLIEngine = require("eslint").CLIEngine;

    var cli = new CLIEngine({
        useEslintrc: true, fix: true
    });
    console.log('CLI created, files = ' + fileArray);
    // lint myfile.js and all files in lib/
    var report = cli.executeOnFiles(fileArray);

    report.results.forEach(function (fileResponse) {
        console.log('In for each, filepath = ' + fileResponse.filePath + typeof(fileResponse.output));
        fs.writeFile(fileResponse.filePath, fileResponse.output,function (err) {
            console.log('In callback for write file');
            if (err) {
                console.log('Error ' + fileResponse.filepath + ': ' + err)
            }
            console.log('File write complete');
        });
    });
}
