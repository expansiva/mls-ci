
async function runCallWork(project, orgName, lastModify, secrets) {

    try {

        const collabToken = secrets;//process.env.COLLAB_TOKEN; // secret configured in the gitHub or gitLab Actions secrets
        console.log('Secret:' + collabToken +' prj:'+project+' orgName:'+orgName +' lastModify:'+lastModify);
        if (!collabToken) return false;
        return true;

        if(!project || !orgName || !lastModify){
            console.log('Undefined parameters in runCallWork');
            return false;
        }

        const GITHUBBRAND = 'GitHub';
        const response = await fetch('https://collab.codes/exec', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: "onProjectUpdated",
                project,
                orgName,
                projectDriver: GITHUBBRAND,
                lastModify, // ex: "2024-07-18T19:07:22.238Z"
                secret: collabToken,
            })
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        console.log('Ok to call update work');
        return true;

    } catch (e) {
        console.log(e.message)
    }

}

module.exports = {runCallWork}