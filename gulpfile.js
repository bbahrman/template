var gulp = require('gulp');
var config = {
    'jsRoot': 'SuiteScripts/',
    'tsRoot': 'TypeScript_SuiteScript/'
};
var Git = require('nodegit');
var repoName = 'Code_Review';
var repoURL = 'https://github.com/bbahrman/Code_Review';
var branchName = 'SC-1234';
var dirPath = '/Users/benbahrman/Code_Review';
var repoObj;

var user = {
    'name': 'Ben Bahrman',
    'email': 'ben@bahrman.org'
}


const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


gulp.task('tsc', function () {
   return gulp.src(config.tsRoot + '/*.ts')
   .pipe()
       .pipe(gulp.dest(destinationRoot + '/'))
});


gulp.task('gitTest',function () {
   return gitTestFunc();
});

function gitTestFunc (){
    Git.Clone(repoURL, repoName).then(function (repository) {
        // find head on branch
        // make commit
        // edit comments
    });
}

// referencing http://radek.io/2015/10/27/nodegit/
function gitCommit () {
    if(!dirPath) {
        /*rl.question('Path to repo (null): ', function (answer) {
            if (answer) {
                dirPath = answer;
            } else {
                console.log('Check out repo');
            }
        });
        rl.close();*/
        console.log('Directory not defined');
    } else if (!repoObj) {
        Git.Repository.open(dirPath).then(function (repo) {
            console.log('Opened ' + repo.path());
            repoObj = repo;
            commitOnRepo(repoObj);
        });
    } else {
        commitOnRepo(repoObj);
    }
}

function commitOnRepo (repo, message) {
    var date = new Date();
    var signature = Git.Signature.create(user.name, user.email, date.getTime(), date.getTimezoneOffset());
    Git.Commit.create(repo, update_ref, signature, signature, null, message, tree, parent_count, parents).then(function(oid) {
        // Use oid
    });
}
