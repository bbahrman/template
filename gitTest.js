var dirPath = '/Users/benbahrman/Code_Review';

var nodegit = require('nodegit');
var repoObj;

commitCurrentBranch(dirPath);

function logBranch(ref) {
    console.log("On " + ref.shorthand() + " " + ref.target());
}

function commitCurrentBranch (directory) {
    var status;
    var log = '';

    nodegit.Repository.open(directory).then(function (repo) {
        return repo.getCurrentBranch().then(function (ref) {
            status = 'On branch: ' + ref.shorthand() + ' ' + ref.target();
            log += status + '\n';
        });
    }).catch(function (err) {
        return err;
    }).done(function () {
        console.log(status + '\n' + log);
    });
}

