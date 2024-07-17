const { runDownload } = require('./download');
const { runPreCompile } = require('./preCompile');
const { runCompileTs } = require('./compileTs');
const { runCreateFileInfo } = require('./createFileInfo');
const { runCompact } = require('./compact');
const { runCreateTsconfig } = require('./createTsConfig');

async function runCI() {

    try{

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
        await runCreateFileInfo();
        console.log('----------End createFileInfo------------------');

        console.log('----------Start compact------------------');
        await runCompact();
        console.log('----------End compact------------------');



    }catch(e){
        console.log(e.message);
    }
    

}

module.exports = {runCI};