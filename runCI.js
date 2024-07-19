const { runDownload } = require('./download');
const { runPreCompile } = require('./preCompile');
const { runCompileTs } = require('./compileTs');
const { runCreateFileInfo } = require('./createFileInfo');
const { runCompact } = require('./compact');
const { runCreateTsconfig } = require('./createTsConfig');
const { runCompactSource } = require('./compactSource');
const { runCallWork } = require('./callWork');

async function runCI() {

    try{

        const { GITHUB_PROJECT, GITHUB_REPO, GITHUB_OWNER, GITHUB_BRANCH, GITHUB_SECRETS } = process.env;
        let lastModify = '';

        console.log('----------Start download------------------');
        await runDownload();
        console.log('----------End download------------------');

        console.log('----------Start createTsConfig------------------');
        await runCreateTsconfig();
        console.log('----------End createTsConfig------------------');

        console.log('----------Start preCompile------------------');
        await runPreCompile();
        console.log('----------End preCompile------------------');

        console.log('----------Start compileTs------------------');
        await runCompileTs();
        console.log('----------End compileTs------------------');

        console.log('----------Start compileTs Definition------------------');
        await runCompileTs(true);
        console.log('----------End compileTs Definition------------------');

        console.log('----------Start createFileInfo------------------');
        lastModify = await runCreateFileInfo();
        console.log('----------End createFileInfo------------------');

        console.log('----------Start compact------------------');
        await runCompact();
        console.log('----------End compact------------------');

        console.log('----------Start compactSource------------------');
        await runCompactSource();
        console.log('----------End compactSource------------------');

        console.log('----------Start callWork------------------');
        await runCallWork(GITHUB_PROJECT, GITHUB_OWNER, lastModify);
        console.log('----------End callWork------------------');


    }catch(e){
        console.log(e.message);
    }
    

}

module.exports = {runCI};