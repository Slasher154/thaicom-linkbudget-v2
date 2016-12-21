/**
 * Created by thana on 9/15/2016.
 */

Template.contours.viewmodel({
    displayedContour() {
        return {
            "type": "FeatureCollection",
            "features": []
        }
    },
    satellites: [
        { id: 'Thaicom 4', name: 'Thaicom 4' },
        { id: 'Thaicom 5', name: 'Thaicom 5' },
        { id: 'Thaicom 6', name: 'Thaicom 6' },
    ],
    selectedSatellite: '',
    selectedValueToDisplay: '',
    selectedValueType: '',
    contours: '',
    contourSubmitted(event) {
        event.preventDefault();
        
        let self = this;
        let satellite = self.selectedSatellite();
        let parameter = self.selectedValueToDisplay();
        let valueType = self.selectedValueType();
        let contours = convertContoursTableToObject(self.contours());

        if (!satellite) {
            Bert.alert('Please select a satellite', 'danger', 'fixed-top');
        }
        else if (!parameter) {
            Bert.alert('Please select either EIRP or G/T', 'danger', 'fixed-top');
        }
        else if (!valueType) {
            Bert.alert('Please select either absolute value or relative from peak value', 'danger', 'fixed-top');
        }
        else if (!contours) {
            Bert.alert('Please put contours in the correct format', 'danger', 'fixed-top');
        }

        else {
            let options = {
                satellite: satellite,
                parameter: parameter,
                valueType: valueType,
                contours: contours,
            };
            Meteor.call('findContoursToPlot', options, (error, result) => {
                if (error) {
                    Bert.alert(error.reason, 'danger', 'fixed-top');
                }
                else {
                    $('.map-container').empty();
                    Blaze.renderWithData(Template.geojsonPreview, {
                        geojsonData: result.resultContour,
                    }, $('.map-container')[0]);
                    if(result.notFoundMessages && result.notFoundMessages.length > 0) {
                        self.logMessages(result.notFoundMessages);
                    } else {
                        self.logMessages([]);
                    }
                }
            });

        }

        function convertContoursTableToObject(contours) {
            console.log(contours);
            let rows = contours.split('\n');
            console.log('rows = ' + rows);
            let formattedContours = [];

            // Remove the last row if it is blank. This happens when paste from excel and the cursor enter a new line
            if (rows[rows.length-1].length == 0) {
                rows.pop();
            }
            rows.forEach((row) => {
                let columns = row.split('\t');

                if (columns.length < 2 || columns.length > 3) {
                    return false;
                }
                let contourLine = {};

                // 1st column = beam name
                if (!columns[0]) return false;
                contourLine.name = columns[0];

                // 2nd column = path (fwd, rtn) for HTS, = value for conventional
                if (columns.length == 3) { // HTS
                    let path = columns[1].toLowerCase();
                    console.log('Path = ' + path);
                    if(_.contains(['forward','fwd'], path)) {
                        path = 'forward';
                    }
                    else if (_.contains(['return', 'rtn'], path)) {
                        path = 'return';
                    }
                    else return false;
                    contourLine.path = path;

                    let value = columns[2];
                    if(isNaN(value)) {
                        return false;
                    }
                    contourLine.value = +value;
                }

                // 2nd column = path (fwd, rtn) for HTS, = value for conventional
                if (columns.length == 2) { // Conventional
                    let value = columns[1];
                    if(isNaN(value)) {
                        return false;
                    }
                    contourLine.value = +value;
                }
                formattedContours.push(contourLine);
            });
            return formattedContours;
        }


    },
    logMessages: [],
});