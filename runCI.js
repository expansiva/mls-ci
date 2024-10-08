const { runDownload } = require('./download');
const { runPreCompile } = require('./preCompile');
const { runCompileTs } = require('./compileTs');
const { runCreateFileInfo } = require('./createFileInfo');
const { runCompact } = require('./compact');
const { runCreateTsconfig } = require('./createTsConfig');
const { runCompactSource } = require('./compactSource');
const { runCallWork } = require('./callWork');
const { runGetOrgName } = require('./getOrgName');
const { runProcessCss } = require('./processCSS');
const { runCreateJsonImports } = require('./createJsonImports');

async function runCI() {

    try{

        const { COLLAB_PROJECT, COLLAB_REPO, COLLAB_OWNER, COLLAB_BRANCH, COLLAB_DRIVER } = process.env;
        let lastModify = '';
        let orgNameInCollab = '';

        console.log('----------Start getOrgName------------------');
        orgNameInCollab = await runGetOrgName();
        console.log('----------End getOrgName------------------');

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

        console.log('----------Start processCSS------------------');
        await runProcessCss(COLLAB_PROJECT);
        console.log('----------End processCSS------------------');

        console.log('----------Start compileTs Definition------------------');
        await runCompileTs(true);
        console.log('----------End compileTs Definition------------------');

        console.log('----------Start createFileInfo------------------');
        lastModify = await runCreateFileInfo();
        console.log('----------End createFileInfo------------------');

        console.log('----------Start createJSONImports------------------');
        await runCreateJsonImports();
        console.log('----------End createJSONImports------------------');

        console.log('----------Start compact------------------');
        await runCompact();
        console.log('----------End compact------------------');

        console.log('----------Start compactSource------------------');
        await runCompactSource();
        console.log('----------End compactSource------------------');

        console.log('----------Start callWork------------------');
        await runCallWork(COLLAB_PROJECT, orgNameInCollab, COLLAB_DRIVER, lastModify);
        console.log('----------End callWork------------------');


    }catch(e){
        console.log(e.message);
        process.exit(1);
    }
    

}

module.exports = {runCI};