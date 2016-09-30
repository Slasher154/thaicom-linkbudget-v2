/**
 * Created by thana on 9/30/2016.
 */
import glob from 'glob';

Template.uploadContours.viewmodel({
    onRendered() {

    },
    onCreated() {

    },
    filePath: '',
    showDownloadLink: false,
    downloadLink: '',
    handleFileChanged(event) {
        _checkFileApiSupport();
        let filelist = event.target.files;

        let files = [];
        // Convert Filelist object into an array
        for (let i = 0, f; f = filelist[i]; i++) {
            files.push(f);
        }

        var textFilePath = null;

        // Create an array of promises of readfile function
        // Source: https://strongloop.com/strongblog/how-to-compose-node-js-promises-with-q/
        let promises = files.map((file) => {
            return readFileContent(file);
        });

        // When all promises are fulfilled (all files are successfully read), perform the merge operation on the read contents
        Q.all(promises).then((results) => {

            // Create blob to write the contents into >> http://jsfiddle.net/UselessCode/qm5AG/
            // Merge the results into one file
            var data = new Blob([results.join('\n')], { type: 'text/plain' });

            // If we are replacing a previously generated file we need to
            // manually revoke the object URL to avoid memory leaks.
            if (textFilePath !== null) {
                window.URL.revokeObjectURL(textFilePath);
            }

            // Generate a URL to download the file
            textFilePath = window.URL.createObjectURL(data);

            // Show the download link and set href attribute to the URL we just created
            this.showDownloadLink(true);
            this.downloadLink(textFilePath);

        }).catch((error) => {
            Bert.alert(error, 'danger', 'fixed-top')
        }).done();

        function readFileContent (file) {
            return new Promise((resolve, reject) => {
                // Read the .dat file
                var reader = new FileReader();
                reader.onload = (event) => {
                    var contents = event.target.result;
                    resolve(contents);
                };
                reader.readAsText(file);
            });
        };
    },
});

let _checkFileApiSupport = () => {
    // Check for the various File API support.
    if (window.File && window.FileReader && window.FileList && window.Blob) {
        //do your stuff!
    } else {
        Bert.alert('The File APIs are not fully supported by your browser.', 'danger', 'fixed-top');
    }
};

